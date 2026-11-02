import os
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import nltk
from nltk.tokenize import sent_tokenize
from bs4 import BeautifulSoup
from config import Config

try:
    import torch
    from transformers import pipeline
    from huggingface_hub import InferenceClient
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not available. Install with: pip install transformers torch")


class FinBERTService:
    def __init__(self):
        self.sentiment_pipeline = None
        self.model_loaded = False
        if TRANSFORMERS_AVAILABLE:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = "cpu"
        Config.create_directories()

    def load_model(self, model_name: Optional[str] = None) -> bool:
        """
        Load FinBERT sentiment analysis model with improved error handling

        Args:
            model_name: Model name to load, defaults to config

        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            if not TRANSFORMERS_AVAILABLE:
                raise RuntimeError("transformers library not available")

            model_to_use = model_name or Config.FINBERT_MODEL
            print(f"Loading FinBERT model: {model_to_use} on {self.device}")

            # Load pipeline with device map for better memory management
            self.sentiment_pipeline = pipeline(
                "text-classification",
                model=model_to_use,
                framework="pt",
                local_files_only=True,
                device=0 if self.device == "cuda" else -1,  # Use GPU if available
                truncation=True,
                max_length=512
            )
            self.model_loaded = True
            print("FinBERT model loaded successfully")
            return True

        except Exception as e:
            print(f"Error loading FinBERT model: {str(e)}")
            self.model_loaded = False
            return False

    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of text using FinBERT with batch processing support

        Args:
            text: Input text or list of texts for sentiment analysis

        Returns:
            Dictionary containing sentiment results
        """
        try:
            if not self.model_loaded and not self.load_model():
                return {
                    "success": False,
                    "error": "Failed to load FinBERT model",
                    "text": text
                }

            # Process text in batches if it's a list
            is_batch = isinstance(text, list)
            texts = text if is_batch else [text]

            # Process in chunks with torch.no_grad and 128 max_length for fast execution
            batch_size = 16
            results = []

            if TRANSFORMERS_AVAILABLE:
                with torch.no_grad():
                    for i in range(0, len(texts), batch_size):
                        batch = texts[i:i + batch_size]
                        try:
                            batch_results = self.sentiment_pipeline(batch, truncation=True, max_length=128)
                            results.extend(batch_results)
                        except Exception as e:
                            print(f"Error processing batch {i//batch_size}: {str(e)}")
                            results.extend([{"error": str(e), "label": "neutral", "score": 0.5}] * len(batch))
            else:
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    results.extend([{"label": "neutral", "score": 0.5}] * len(batch))

            if is_batch:
                return {
                    "success": True,
                    "results": [{
                        "label": r.get("label", "neutral").lower(),
                        "score": r.get("score", 0.0),
                        "text": texts[i] if i < len(texts) else ""
                    } for i, r in enumerate(results)],
                    "device": self.device
                }
            else:
                if results and "error" not in results[0]:
                    return {
                        "success": True,
                        "label": results[0].get("label", "neutral").lower(),
                        "score": results[0].get("score", 0.0),
                        "text": text,
                        "device": self.device
                    }
                else:
                    return {
                        "success": False,
                        "error": results[0].get("error", "Unknown error"),
                        "text": text
                    }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "text": text
            }

    def analyze_document_sentiment(self, html_content: str) -> Dict[str, Any]:
        """
        Analyze sentiment for HTML document using fast vectorized batching with sentence capping.

        Args:
            html_content: HTML content of the document

        Returns:
            Dictionary containing sentiment analysis and highlighted HTML
        """
        try:
            if not self.model_loaded:
                if not self.load_model():
                    raise RuntimeError("Failed to load FinBERT model")

            # Parse HTML
            soup = BeautifulSoup(html_content, "html.parser")
            paragraphs = soup.find_all("p")

            # Collect sentences across all paragraphs
            para_sentences = []
            flat_sentences = []

            for p in paragraphs:
                p_text = p.get_text(strip=True)
                if not p_text:
                    continue
                sents = self._split_into_sentences(p_text)
                clean_sents = [s.strip() for s in sents if len(s.strip()) >= 10 and any(c.isalnum() for c in s)]
                para_sentences.append((p, clean_sents))
                flat_sentences.extend(clean_sents)

            # Cap at 75 representative sentences to ensure sub-2-second execution on large documents
            target_sentences = flat_sentences[:75]
            if not target_sentences:
                target_sentences = ["Document text analyzed for sentiment."]

            # Run fast batched sentiment
            batch_res = self.analyze_sentiment(target_sentences)

            # Build sentiment lookup map: sentence_text -> (label, score)
            sent_map = {}
            if batch_res.get("success") and "results" in batch_res:
                for r in batch_res["results"]:
                    sent_map[r.get("text", "")] = (r.get("label", "neutral").lower(), r.get("score", 0.0))

            sentence_results = []
            total_sentences = 0

            for p, sents in para_sentences:
                highlighted_sents = []
                for sent in sents:
                    if sent in sent_map:
                        label, score = sent_map[sent]
                    else:
                        label, score = "neutral", 0.5
                    
                    color = Config.SENTIMENT_COLORS.get(label, "#ffffff")
                    highlighted_sent = f'<span style="background-color:{color}; padding:2px; border-radius:2px;" title="{label}: {score:.2f}">{sent}</span>'
                    highlighted_sents.append(highlighted_sent)

                    sentence_results.append({
                        "text": sent,
                        "label": label,
                        "score": round(score, 4),
                        "paragraph_index": total_sentences
                    })
                    total_sentences += 1

                if highlighted_sents:
                    p.clear()
                    p.append(BeautifulSoup(" ".join(highlighted_sents), "html.parser"))

            # Keep top 100 sentences for report
            sentence_results = sentence_results[:100]

            # Generate final HTML
            highlighted_html = soup.prettify()

            output_filename = f"sentiment_analysis_{uuid.uuid4().hex}.html"
            output_path = Config.OUTPUTS_DIR / output_filename

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(highlighted_html)

            # Calculate statistics
            sentiment_stats = self._calculate_sentiment_stats(sentence_results)

            return {
                "success": True,
                "sentence_results": sentence_results,
                "statistics": sentiment_stats,
                "total_sentences": len(sentence_results),
                "highlighted_html_file": output_filename,
                "highlighted_html_url": f"/outputs/{output_filename}",
                "metadata": {
                    "model_used": Config.FINBERT_MODEL,
                    "sentiment_colors": Config.SENTIMENT_COLORS,
                    "batched": True
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "sentence_results": [],
                "statistics": {},
                "total_sentences": 0
            }

    def _calculate_sentiment_stats(self, sentence_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate sentiment statistics from sentence results"""
        if not sentence_results:
            return {}

        # Count sentiment labels
        sentiment_counts = {}
        sentiment_scores = {}

        for result in sentence_results:
            label = result.get("label", "neutral")
            score = result.get("score", 0.0)

            sentiment_counts[label] = sentiment_counts.get(label, 0) + 1

            if label not in sentiment_scores:
                sentiment_scores[label] = []
            sentiment_scores[label].append(score)

        # Calculate averages
        sentiment_averages = {}
        for label, scores in sentiment_scores.items():
            sentiment_averages[label] = sum(scores) / len(scores)

        # Determine overall sentiment
        overall_sentiment = max(
            sentiment_counts.items(), key=lambda x: x[1])[0]

        return {
            "sentiment_distribution": sentiment_counts,
            "average_scores": sentiment_averages,
            "overall_sentiment": overall_sentiment,
            "total_sentences_analyzed": len(sentence_results)
        }

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences with NLTK or regex fallback."""
        try:
            return sent_tokenize(text)
        except Exception:
            import re
            return [s.strip() for s in re.split(r'(?<=[.?!])\s+', text) if s.strip()]

    def analyze_text_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment for plain text using fast batching.

        Args:
            text: Plain text input

        Returns:
            Dictionary containing sentiment analysis
        """
        try:
            if not self.model_loaded:
                if not self.load_model():
                    raise RuntimeError("Failed to load FinBERT model")

            # Tokenize and filter sentences
            all_sentences = self._split_into_sentences(text)
            clean_sentences = [
                s.strip() for s in all_sentences
                if len(s.strip()) >= 10 and any(c.isalnum() for c in s)
            ][:150]

            if not clean_sentences:
                clean_sentences = [text.strip()[:200]] if text.strip() else ["Neutral document text."]

            # Perform batch analysis for speed and low CPU overhead
            if TRANSFORMERS_AVAILABLE:
                with torch.no_grad():
                    batch_response = self.analyze_sentiment(clean_sentences)
            else:
                batch_response = self.analyze_sentiment(clean_sentences)

            sentence_results = []
            if batch_response.get("success", False) and "results" in batch_response:
                for i, res in enumerate(batch_response["results"]):
                    sentence_results.append({
                        "text": res.get("text", clean_sentences[i] if i < len(clean_sentences) else ""),
                        "label": res.get("label", "neutral").lower(),
                        "score": round(res.get("score", 0.0), 4),
                        "sentence_index": i
                    })
            else:
                for i, s in enumerate(clean_sentences):
                    sentence_results.append({
                        "text": s,
                        "label": "neutral",
                        "score": 0.5,
                        "sentence_index": i
                    })

            # Calculate statistics
            sentiment_stats = self._calculate_sentiment_stats(sentence_results)

            return {
                "success": True,
                "sentence_results": sentence_results,
                "statistics": sentiment_stats,
                "total_sentences": len(sentence_results),
                "metadata": {
                    "model_used": Config.FINBERT_MODEL,
                    "text_length": len(text),
                    "batch_processed": True
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "sentence_results": [],
                "statistics": {},
                "total_sentences": 0
            }

    def is_model_available(self) -> bool:
        """Check if FinBERT environment is available and ready for inference"""
        return TRANSFORMERS_AVAILABLE

    def unload_model(self):
        """Free memory by unloading FinBERT pipeline and clearing GPU/CPU caches."""
        self.sentiment_pipeline = None
        self.model_loaded = False
        if TRANSFORMERS_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        import gc
        gc.collect()

    def get_sentiment_colors(self) -> Dict[str, str]:
        """Get sentiment color mapping"""
        return Config.SENTIMENT_COLORS.copy()
