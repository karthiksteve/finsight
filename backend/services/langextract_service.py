import os
import uuid
import requests
import re
import json
from typing import Dict, Any, List, Optional
from config import Config

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

class LangExtractService:
    """Service for extracting financial and legal clauses using LM Studio, Groq, or local rules."""
    
    def __init__(self):
        self.initialized = True
        self.groq_api_key = Config.GROQ_API_KEY
        self.groq_client = None
        self.examples = []
        self.prompt = (
            "Extract financial and legal clauses such as payment terms, "
            "termination, confidentiality, interest, governing law, liability, "
            "and force majeure from the provided text. Return JSON with the "
            "most relevant clause sentences and their attributes."
        )
        
        if HAS_GROQ and self.groq_api_key:
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
                print("LangExtract: Groq client initialized.")
            except Exception as e:
                print(f"LangExtract: Failed to initialize Groq client: {e}")
        
        Config.create_directories()
        
        # Define clause patterns and extraction metadata
        self.clause_types = {
            "payment_clause": {
                "keywords": ["payment", "pay", "payable", "invoice", "fee", "charge", "amount due", "net 30", "net 60"],
                "description": "Clauses related to payment terms, amounts, and schedules",
                "risk": "Medium"
            },
            "interest_clause": {
                "keywords": ["interest", "interest rate", "apr", "per annum", "accrued interest"],
                "description": "Clauses specifying interest rates and calculations",
                "risk": "High"
            },
            "termination_clause": {
                "keywords": ["terminate", "termination", "cancel", "cancellation", "end agreement", "material breach", "notice period"],
                "description": "Clauses defining termination conditions and procedures",
                "risk": "Critical"
            },
            "confidentiality_clause": {
                "keywords": ["confidential", "non-disclosure", "proprietary", "secret", "confidentiality"],
                "description": "Clauses protecting confidential information",
                "risk": "Medium"
            },
            "liability_clause": {
                "keywords": ["liability", "liable", "responsible", "damages", "indemnify", "indemnification", "hold harmless"],
                "description": "Clauses defining liability, limits, and indemnities",
                "risk": "Critical"
            },
            "governing_law_clause": {
                "keywords": ["governing law", "jurisdiction", "arbitration", "dispute", "courts of"],
                "description": "Clauses specifying legal jurisdiction and dispute resolution",
                "risk": "Low"
            },
            "force_majeure_clause": {
                "keywords": ["force majeure", "act of god", "unforeseen circumstances", "earthquake", "pandemic"],
                "description": "Clauses addressing unforeseen circumstances",
                "risk": "Low"
            },
            "renewal_clause": {
                "keywords": ["renewal", "renew", "extend", "extension", "automatic renewal"],
                "description": "Clauses related to contract renewal and extension",
                "risk": "Medium"
            }
        }

    def _is_lmstudio_available(self) -> bool:
        """Check if LM Studio local server is responding."""
        try:
            url = f"{Config.LMSTUDIO_BASE_URL.rstrip('/')}/models"
            res = requests.get(url, timeout=1.5)
            return res.status_code == 200
        except Exception:
            return False

    def _call_lmstudio_api(self, prompt: str) -> Optional[str]:
        """Call LM Studio local server (OpenAI-compatible) with prompt."""
        try:
            url = f"{Config.LMSTUDIO_BASE_URL.rstrip('/')}/chat/completions"
            payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert financial and legal contract analyst. Extract clauses accurately strictly as valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "model": Config.LMSTUDIO_MODEL,
                "temperature": 0.1,
                "max_tokens": 4096
            }
            res = requests.post(url, json=payload, timeout=60)
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"LM Studio API returned status {res.status_code}: {res.text}")
                return None
        except Exception as e:
            print(f"LM Studio connection error: {e}")
            return None

    def _call_groq_api(self, prompt: str) -> Optional[str]:
        """Call Groq API with the given prompt."""
        if not self.groq_client:
            return None
            
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"}
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API error: {e}")
            return None

    def _calculate_char_intervals(self, full_text: str, extraction_text: str) -> Dict[str, int]:
        """Find start and end positions of extracted text in full text."""
        try:
            start = full_text.find(extraction_text)
            if start != -1:
                return {"start_pos": start, "end_pos": start + len(extraction_text)}
            
            # Fuzzy match by leading words
            words = extraction_text.split()
            if len(words) >= 3:
                snippet = " ".join(words[:3])
                start = full_text.find(snippet)
                if start != -1:
                    return {"start_pos": start, "end_pos": start + len(extraction_text)}
            
            return {"start_pos": -1, "end_pos": -1}
        except Exception:
            return {"start_pos": -1, "end_pos": -1}

    def _extract_clauses_with_rules(self, text: str, document_id: str) -> Dict[str, Any]:
        """Deterministic local rule-based extractor using keyword and sentence boundary detection."""
        sentences = re.split(r'(?<=[.?!])\s+', text)
        extractions = []
        idx = 1
        
        seen_clauses = set()
        
        for sentence in sentences:
            clean_sent = sentence.strip()
            if len(clean_sent) < 15:
                continue
                
            sent_lower = clean_sent.lower()
            
            for c_class, c_meta in self.clause_types.items():
                if any(kw in sent_lower for kw in c_meta["keywords"]):
                    if clean_sent in seen_clauses:
                        continue
                    seen_clauses.add(clean_sent)
                    
                    interval = self._calculate_char_intervals(text, clean_sent)
                    
                    # Extract attributes based on patterns
                    attributes = {
                        "risk_level": c_meta["risk"],
                        "confidence": "high" if any(kw in sent_lower for kw in c_meta["keywords"][:3]) else "medium"
                    }
                    
                    # Detect numbers, percentages, or days
                    days_match = re.search(r'(\d+)\s*(?:business\s*)?days', sent_lower)
                    if days_match:
                        attributes["timeframe"] = f"{days_match.group(1)} days"
                        
                    rate_match = re.search(r'(\d+(?:\.\d+)?)\s*%', sent_lower)
                    if rate_match:
                        attributes["rate"] = f"{rate_match.group(1)}%"
                        
                    money_match = re.search(r'(?:USD|EUR|GBP|INR|\$|€|£|₹)\s*[\d,]+(?:\.\d+)?', clean_sent)
                    if money_match:
                        attributes["amount"] = money_match.group(0)
                        
                    extractions.append({
                        "extraction_class": c_class,
                        "extraction_text": clean_sent,
                        "alignment_status": "match_exact" if interval["start_pos"] != -1 else "match_fuzzy",
                        "extraction_index": idx,
                        "group_index": 0,
                        "char_interval": interval,
                        "attributes": attributes
                    })
                    idx += 1
                    break

        highlighted_html_url = self._generate_highlighted_html(text, extractions, document_id)
        
        return {
            "success": True,
            "results": {
                "local_rule_engine": {
                    "success": True,
                    "extractions": extractions
                }
            },
            "clauses": extractions,
            "text": text,
            "highlighted_html_url": highlighted_html_url,
            "metadata": {
                "text_length": len(text),
                "models_used": ["local_rule_engine"],
                "total_clauses": len(extractions),
                "engine": "local_rules"
            }
        }

    def _generate_highlighted_html(self, text: str, extractions: List[Dict[str, Any]], document_id: str) -> str:
        """Generate HTML with highlighted clauses."""
        colors = {
            "Payment Clause": "#e0f2fe",
            "Interest Clause": "#fef9c3",
            "Termination Clause": "#fee2e2",
            "Confidentiality Clause": "#f3e8ff",
            "Liability Clause": "#ffedd5",
            "Governing Law Clause": "#dcfce7",
            "Force Majeure Clause": "#f1f5f9",
            "Renewal Clause": "#cffafe",
            "General Clause": "#e2e8f0"
        }

        valid_extractions = [
            e for e in extractions 
            if e.get("char_interval", {}).get("start_pos", -1) != -1
        ]
        valid_extractions.sort(key=lambda x: x["char_interval"]["start_pos"])

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Clause Extraction Analysis</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; max-width: 900px; margin: 0 auto; background: #fafafa; }}
        .highlight {{ padding: 2px 6px; border-radius: 4px; position: relative; border-bottom: 2px solid rgba(0,0,0,0.15); font-weight: 500; }}
        .legend {{ margin-bottom: 24px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
        .legend-item {{ display: inline-flex; align-items: center; margin-right: 18px; margin-bottom: 8px; font-size: 13px; }}
        .color-box {{ width: 14px; height: 14px; border-radius: 4px; margin-right: 8px; border: 1px solid rgba(0,0,0,0.1); }}
        h1 {{ font-size: 22px; margin-bottom: 16px; color: #0f172a; }}
        .content {{ background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; white-space: pre-wrap; }}
    </style>
</head>
<body>
    <h1>Financial & Legal Clause Extraction Analysis</h1>
    <div class="legend">
        <strong>Identified Clause Categories:</strong><br><br>
        {''.join(f'<span class="legend-item"><span class="color-box" style="background:{c}"></span>{k}</span>' for k, c in colors.items())}
    </div>
    <div class="content">"""

        current_pos = 0
        for ext in valid_extractions:
            start = ext["char_interval"]["start_pos"]
            end = ext["char_interval"]["end_pos"]
            
            if start > current_pos:
                html_content += text[current_pos:start].replace("\n", "<br>")
            
            clause_type = ext.get("extraction_class", "General Clause").replace("_", " ").title()
            color_key = next((k for k in colors.keys() if k.lower() in clause_type.lower()), "General Clause")
            color = colors.get(color_key, "#e2e8f0")
            
            clause_text = text[start:end].replace("\n", "<br>")
            html_content += f'<span class="highlight" style="background-color: {color}" title="{clause_type}">{clause_text}</span>'
            
            current_pos = end

        if current_pos < len(text):
            html_content += text[current_pos:].replace("\n", "<br>")

        html_content += """
    </div>
</body>
</html>"""

        filename = f"clause_highlight_{document_id}.html"
        output_dir = Config.OUTPUTS_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        file_path = output_dir / filename
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return f"/outputs/{filename}"

    def extract_clauses(self, text: str, models: Optional[List[str]] = None,
                    api_key: Optional[str] = None, document_id: Optional[str] = None,
                    user_instruction: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract clauses with multi-provider hierarchy:
        1. LM Studio (Local server: Qwen 3 8B / Gemma 3 4B)
        2. Groq Cloud (llama-3.1-8b-instant)
        3. Deterministic Local Rule Matcher (100% reliable fallback)
        """
        if not document_id:
            document_id = f"doc_{uuid.uuid4().hex[:8]}"

        # Check if LM Studio is active
        use_lmstudio = Config.LLM_PROVIDER == "lmstudio" and self._is_lmstudio_available()
        # Request-level keys are intentionally ignored; cloud access is server configuration only.
        use_groq = Config.LLM_PROVIDER == "groq" and bool(self.groq_client)

        if not use_lmstudio and not use_groq:
            print("No active LLM detected (LM Studio not running on port 1234, no Groq key). Using local rule-based extractor.")
            return self._extract_clauses_with_rules(text, document_id)

        prompt = f"""Analyze the following financial/legal document and extract key clauses.
Strictly return a JSON object with:
{{
    "extractions": [
        {{
            "extraction_class": "payment_clause | interest_clause | termination_clause | confidentiality_clause | liability_clause | governing_law_clause | force_majeure_clause | renewal_clause",
            "extraction_text": "exact sentence or clause text from document",
            "attributes": {{
                "risk_level": "Critical | High | Medium | Low",
                "summary": "brief summary of condition or terms"
            }}
        }}
    ]
}}

User Custom Request (if any): {user_instruction or 'None'}

Document Text:
{text[:8000]}
"""

        response_text = None
        engine_used = "rules"

        if use_lmstudio:
            print("Using LM Studio Local Server for clause extraction...")
            response_text = self._call_lmstudio_api(prompt)
            engine_used = f"lmstudio_{Config.LMSTUDIO_MODEL}"

        if not response_text and use_groq:
            print("Using Groq API for clause extraction...")
            response_text = self._call_groq_api(prompt)
            engine_used = "groq_llama-3.1"

        if not response_text:
            print("LLM call failed or returned empty response. Falling back to local rules.")
            return self._extract_clauses_with_rules(text, document_id)

        try:
            # Clean markdown formatting if present
            cleaned = response_text
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
                
            data = json.loads(cleaned)
            extractions = data.get("extractions", [])

            for i, ext in enumerate(extractions):
                ext_text = ext.get("extraction_text", "")
                interval = self._calculate_char_intervals(text, ext_text)
                ext["char_interval"] = interval
                ext["alignment_status"] = "match_exact" if interval["start_pos"] != -1 else "match_fuzzy"
                ext["extraction_index"] = i + 1
                ext["group_index"] = 0
                if "attributes" not in ext:
                    ext["attributes"] = {}
                if "risk_level" not in ext["attributes"]:
                    ext["attributes"]["risk_level"] = "Medium"

            highlighted_html_url = self._generate_highlighted_html(text, extractions, document_id)

            return {
                "success": True,
                "results": {
                    engine_used: {
                        "success": True,
                        "extractions": extractions
                    }
                },
                "clauses": extractions,
                "text": text,
                "highlighted_html_url": highlighted_html_url,
                "metadata": {
                    "text_length": len(text),
                    "models_used": [engine_used],
                    "total_clauses": len(extractions),
                    "engine": engine_used
                }
            }

        except Exception as e:
            print(f"Error parsing LLM response: {e}. Falling back to rule-based extraction.")
            return self._extract_clauses_with_rules(text, document_id)

    def is_available(self) -> bool:
        return True

    def update_prompt(self, prompt: str) -> bool:
        if not prompt or not prompt.strip():
            return False
        self.prompt = prompt.strip()
        return True

    def add_example(self, text: str, extraction_class: str, extraction_text: str, attributes: Dict[str, Any]) -> bool:
        if not text or not extraction_class or not extraction_text:
            return False
        self.examples.append({
            "text": text,
            "extraction_class": extraction_class,
            "extraction_text": extraction_text,
            "attributes": attributes,
        })
        return True
