"""
RAG (Retrieval-Augmented Generation) Service Module

Provides document processing and contextual question-answering using:
1. LM Studio (Local Qwen 3 8B / Gemma 3 4B via OpenAI-compatible server)
2. Groq Cloud (llama-3.1-8b-instant)
3. Google Gemini Embeddings / Local Fast Hash Embedding
4. Pinecone / In-Memory Cosine Vector Store
"""

import os
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import requests
import numpy as np
from pydantic import BaseModel, Field
from pypdf import PdfReader
import hashlib
import time
import re
from config import Config

# Pinecone import
try:
    from pinecone.grpc import PineconeGRPC as Pinecone
    from pinecone import ServerlessSpec
    HAS_PINECONE = True
except ImportError:
    try:
        from pinecone import Pinecone, ServerlessSpec
        HAS_PINECONE = True
    except ImportError:
        HAS_PINECONE = False
        Pinecone = None
        ServerlessSpec = None

# Groq import
try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

# DOCX support
try:
    from docx import Document as DocxDocument
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

class RAGRequest(BaseModel):
    """Request model for RAG queries."""
    question: str
    document_path: Optional[str] = None
    chunk_size: int = 1000
    chunk_overlap: int = 200

class RAGResponse(BaseModel):
    """Response model for RAG queries."""
    success: bool
    answer: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RAGService:
    """Universal RAG Service supporting LM Studio, Groq, Gemini, and local in-memory search."""
    
    def __init__(self):
        self.api_key = Config.GOOGLE_API_KEY
        self.groq_api_key = Config.GROQ_API_KEY
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_client = None
        self.groq_client = None
        self.index = None
        self.index_name = "financial-docs"
        self.initialized = True
        self.documents = []  # In-memory document chunk store
        
        if HAS_GROQ and self.groq_api_key:
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
            except Exception as e:
                print(f"RAG: Groq init warning: {e}")

    def initialize(self, api_key: Optional[str] = None, pinecone_api_key: Optional[str] = None, groq_api_key: Optional[str] = None):
        """Initialize or update RAG credentials."""
        self.api_key = api_key or Config.GOOGLE_API_KEY
        self.pinecone_api_key = pinecone_api_key or os.getenv("PINECONE_API_KEY")
        self.groq_api_key = groq_api_key or Config.GROQ_API_KEY
        
        if HAS_GROQ and self.groq_api_key:
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
            except Exception as e:
                print(f"RAG: Groq init warning: {e}")
                
        self.initialized = True
        return True

    def _is_lmstudio_available(self) -> bool:
        """Check if LM Studio local server is active."""
        try:
            url = f"{Config.LMSTUDIO_BASE_URL.rstrip('/')}/models"
            res = requests.get(url, timeout=1.5)
            return res.status_code == 200
        except Exception:
            return False

    def _call_lmstudio(self, prompt: str) -> Optional[str]:
        """Generate answer using LM Studio local server."""
        try:
            url = f"{Config.LMSTUDIO_BASE_URL.rstrip('/')}/chat/completions"
            payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are CAG (Contextual AI Guide), an expert financial analyst. Answer questions clearly and accurately based strictly on the provided document context."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "model": Config.LMSTUDIO_MODEL,
                "temperature": 0.2,
                "max_tokens": 2048
            }
            res = requests.post(url, json=payload, timeout=60)
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"]
            return None
        except Exception as e:
            print(f"LM Studio generation error: {e}")
            return None

    def _generate_content(self, prompt: str, top_docs: List[Dict[str, Any]]) -> str:
        """Generate with the configured provider; cloud fallback is never implicit."""
        # Qwen 3 8B is the default local model. Use Gemma 3 4B by changing LMSTUDIO_MODEL.
        if Config.LLM_PROVIDER == "lmstudio" and self._is_lmstudio_available():
            print("Generating RAG answer with LM Studio local LLM...")
            ans = self._call_lmstudio(prompt)
            if ans:
                return ans

        # Cloud generation is opt-in through LLM_PROVIDER=groq.
        if Config.LLM_PROVIDER == "groq" and self.groq_client:
            try:
                print("Generating RAG answer with Groq (llama-3.1-8b-instant)...")
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    max_tokens=2048,
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                print(f"Groq generation error: {e}")

        # Deterministic local fallback keeps the API usable when the local server is down.
        print("No active LLM server found. Generating direct contextual synthesis.")
        bullets = []
        for i, doc in enumerate(top_docs[:3]):
            excerpt = doc['content'].strip().replace("\n", " ")
            if len(excerpt) > 300:
                excerpt = excerpt[:297] + "..."
            bullets.append(f"- **Key Passage {i+1}**: {excerpt}")
            
        synthesis = (
            "### Document Insights (Offline Mode)\n\n"
            + "\n".join(bullets)
            + "\n\n> *Tip: Start LM Studio with Qwen 3 8B or Gemma 3 4B on port 1234 to enable conversational natural language answers.*"
        )
        return synthesis

    def _get_local_embedding(self, text: str, dim: int = 256) -> List[float]:
        """Compute fast, deterministic normalized n-gram hash vector (pure NumPy, zero network)."""
        words = re.findall(r'\w+', text.lower())
        vec = np.zeros(dim, dtype=np.float32)
        if not words:
            return vec.tolist()
            
        for w in words:
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % dim
            vec[h] += 1.0
            
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.tolist()

    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding using Gemini if key exists, otherwise local hash vector."""
        if self.api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.api_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text[:2000]}]}
            }
            try:
                response = requests.post(url, json=payload, timeout=10)
                if response.status_code == 200:
                    return response.json()["embedding"]["values"]
            except Exception as e:
                print(f"Gemini embedding fallback: {e}")
                
        # Default local embedding
        return self._get_local_embedding(text)

    def _split_text(self, text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
        """Split text into manageable chunks with overlap."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - chunk_overlap
            if start >= len(text):
                break
        return chunks if chunks else [text]

    def add_text(self, text: str, source: str = "Uploaded Document"):
        """Directly index text into RAG in-memory storage."""
        if not text or not text.strip():
            return
            
        chunks = self._split_text(text)
        doc_id = hashlib.md5(text[:100].encode('utf-8')).hexdigest()[:8]
        
        # Keep recent documents, avoiding infinite growth
        if len(self.documents) > 200:
            self.documents = self.documents[-100:]
            
        for chunk in chunks:
            emb = self._get_embedding(chunk)
            self.documents.append({
                "content": chunk,
                "embedding": np.array(emb, dtype=np.float32),
                "source": source,
                "doc_id": doc_id
            })
        print(f"Indexed {len(chunks)} chunks from '{source}' into RAG store.")

    def process_document(self, document_path: Union[str, Path]) -> bool:
        """Process a document file into RAG index."""
        path = Path(document_path)
        ext = path.suffix.lower()
        text = ""
        
        if ext == ".pdf":
            reader = PdfReader(str(path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext == ".txt":
            text = path.read_text(encoding="utf-8", errors="ignore")
        elif ext in [".docx", ".doc"] and HAS_DOCX:
            doc = DocxDocument(str(path))
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            text = path.read_text(encoding="utf-8", errors="ignore")
            
        self.add_text(text, source=path.name)
        return True

    def query(self, question: str, top_k: int = 3) -> RAGResponse:
        """Query the RAG system."""
        if not self.documents:
            return RAGResponse(
                success=False,
                error="No documents currently indexed. Please upload a document to begin querying."
            )
            
        try:
            q_emb = np.array(self._get_embedding(question), dtype=np.float32)
            q_norm = np.linalg.norm(q_emb)
            if q_norm == 0:
                q_norm = 1.0

            similarities = []
            for doc in self.documents:
                d_emb = doc["embedding"]
                d_norm = np.linalg.norm(d_emb)
                if d_norm == 0:
                    d_norm = 1.0
                sim = float(np.dot(d_emb, q_emb) / (d_norm * q_norm))
                similarities.append((sim, doc))

            similarities.sort(key=lambda x: x[0], reverse=True)
            top_matches = similarities[:top_k]
            
            top_docs = [
                {
                    "content": doc["content"],
                    "source": doc["source"],
                    "score": round(sim, 3)
                }
                for sim, doc in top_matches
            ]

            context = "\n\n".join(
                f"[Source: {doc['source']}]\n{doc['content']}"
                for doc in top_docs
            )

            prompt = (
                "You are CAG (Contextual AI Guide), an expert financial document assistant. "
                "Answer the user question based strictly on the context provided below.\n\n"
                f"Context:\n{context}\n\n"
                f"Question: {question}\n\n"
                "Answer:"
            )

            answer = self._generate_content(prompt, top_docs)

            return RAGResponse(
                success=True,
                answer=answer,
                metadata={
                    "sources_used": list(set(d["source"] for d in top_docs)),
                    "num_sources": len(top_docs),
                    "relevance_scores": [d["score"] for d in top_docs]
                }
            )

        except Exception as e:
            return RAGResponse(
                success=False,
                error=f"RAG query error: {str(e)}"
            )

# Singleton instance
rag_service = RAGService()

def initialize_rag_service(api_key: Optional[str] = None, pinecone_api_key: Optional[str] = None, groq_api_key: Optional[str] = None) -> bool:
    return rag_service.initialize(api_key, pinecone_api_key, groq_api_key)

def query_rag(question: str, document_path: Optional[str] = None) -> RAGResponse:
    if document_path:
        rag_service.process_document(document_path)
    return rag_service.query(question)