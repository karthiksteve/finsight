"""
Service interfaces (abstract base classes) defining contracts for all backend services.
This ensures services can be swapped (local/production) without changing handler code.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, AsyncGenerator
from datetime import datetime
from .schemas import (
    Entity,
    NERResult,
    Clause,
    LangExtractResult,
    SentimentResult,
    RAGSource,
    DocumentMetadata,
    ProcessingJob,
    ProcessingStatus,
)


class LLMProvider(ABC):
    """Interface for LLM service providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from a prompt."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available."""
        pass
    
    @abstractmethod
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model."""
        pass


class EmbeddingProvider(ABC):
    """Interface for embedding service providers."""
    
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate embedding for text."""
        pass
    
    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available."""
        pass


class VectorStore(ABC):
    """Interface for vector store backends (Pinecone, local, etc)."""
    
    @abstractmethod
    async def store(self, vectors: List[Dict[str, Any]]) -> bool:
        """Store vectors with metadata."""
        pass
    
    @abstractmethod
    async def search(self, query_vector: List[float], top_k: int = 5) -> List[RAGSource]:
        """Search for similar vectors."""
        pass
    
    @abstractmethod
    async def delete_all(self) -> bool:
        """Delete all stored vectors."""
        pass
    
    @abstractmethod
    async def get_document_count(self) -> int:
        """Get total number of stored documents."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the vector store is available."""
        pass


class DocumentProcessor(ABC):
    """Interface for document processing services."""
    
    @abstractmethod
    async def extract_text(self, file_path: str) -> str:
        """Extract text from a document."""
        pass
    
    @abstractmethod
    async def get_supported_formats(self) -> List[str]:
        """Get list of supported file formats."""
        pass


class NERService(ABC):
    """Interface for Named Entity Recognition service."""
    
    @abstractmethod
    async def extract_entities(self, text: str) -> NERResult:
        """Extract entities from text."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if NER model is available."""
        pass
    
    @abstractmethod
    async def get_model_status(self) -> Dict[str, Any]:
        """Get NER model status and info."""
        pass


class LangExtractService(ABC):
    """Interface for clause/language extraction service."""
    
    @abstractmethod
    async def extract_clauses(self, text: str) -> LangExtractResult:
        """Extract clauses and key terms from text."""
        pass


class SentimentAnalysisService(ABC):
    """Interface for sentiment analysis (FinBERT) service."""
    
    @abstractmethod
    async def analyze_sentiment(self, text: str) -> SentimentResult:
        """Analyze sentiment of text."""
        pass


class BlobStorageService(ABC):
    """Interface for blob storage (documents, artifacts, exports)."""
    
    @abstractmethod
    async def upload(self, file_path: str, blob_name: str) -> bool:
        """Upload a file to blob storage."""
        pass
    
    @abstractmethod
    async def download(self, blob_name: str, local_path: str) -> bool:
        """Download a blob to local file."""
        pass
    
    @abstractmethod
    async def delete(self, blob_name: str) -> bool:
        """Delete a blob."""
        pass
    
    @abstractmethod
    async def exists(self, blob_name: str) -> bool:
        """Check if a blob exists."""
        pass
    
    @abstractmethod
    async def get_metadata(self, blob_name: str) -> Optional[Dict[str, Any]]:
        """Get blob metadata."""
        pass
    
    @abstractmethod
    async def list_blobs(self, prefix: str = "") -> List[str]:
        """List blobs with optional prefix."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if storage is available."""
        pass


class DatabaseService(ABC):
    """Interface for persistent database (PostgreSQL)."""
    
    @abstractmethod
    async def get_connection(self):
        """Get database connection."""
        pass
    
    @abstractmethod
    async def execute_query(self, query: str, params: Optional[List] = None) -> Any:
        """Execute a database query."""
        pass
    
    @abstractmethod
    async def save_document_metadata(self, metadata: DocumentMetadata) -> bool:
        """Save document metadata."""
        pass
    
    @abstractmethod
    async def get_document_metadata(self, document_id: str) -> Optional[DocumentMetadata]:
        """Retrieve document metadata."""
        pass
    
    @abstractmethod
    async def save_processing_job(self, job: ProcessingJob) -> bool:
        """Save processing job status."""
        pass
    
    @abstractmethod
    async def get_processing_job(self, job_id: str) -> Optional[ProcessingJob]:
        """Get processing job status."""
        pass
    
    @abstractmethod
    async def save_audit_record(self, record: Dict[str, Any]) -> bool:
        """Save audit log record."""
        pass
    
    @abstractmethod
    async def list_documents(self, limit: int = 50, offset: int = 0) -> List[DocumentMetadata]:
        """List documents with pagination."""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if database is available."""
        pass
    
    @abstractmethod
    async def transaction(self):
        """Context manager for database transactions."""
        pass


class AuthenticationService(ABC):
    """Interface for user authentication and session management."""
    
    @abstractmethod
    async def create_account(self, email: str, password: str) -> Dict[str, Any]:
        """Create a new user account."""
        pass
    
    @abstractmethod
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return session token."""
        pass
    
    @abstractmethod
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode session token."""
        pass
    
    @abstractmethod
    async def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token."""
        pass
    
    @abstractmethod
    async def logout(self, token: str) -> bool:
        """Invalidate session token."""
        pass


class ServiceRegistry(ABC):
    """Registry for accessing all backend services."""
    
    @abstractmethod
    def get_llm_provider(self) -> LLMProvider:
        """Get LLM provider instance."""
        pass
    
    @abstractmethod
    def get_embedding_provider(self) -> EmbeddingProvider:
        """Get embedding provider instance."""
        pass
    
    @abstractmethod
    def get_vector_store(self) -> VectorStore:
        """Get vector store instance."""
        pass
    
    @abstractmethod
    def get_document_processor(self) -> DocumentProcessor:
        """Get document processor instance."""
        pass
    
    @abstractmethod
    def get_ner_service(self) -> NERService:
        """Get NER service instance."""
        pass
    
    @abstractmethod
    def get_langextract_service(self) -> LangExtractService:
        """Get LangExtract service instance."""
        pass
    
    @abstractmethod
    def get_sentiment_service(self) -> SentimentAnalysisService:
        """Get sentiment analysis service instance."""
        pass
    
    @abstractmethod
    def get_blob_storage(self) -> BlobStorageService:
        """Get blob storage instance."""
        pass
    
    @abstractmethod
    def get_database(self) -> DatabaseService:
        """Get database service instance."""
        pass
    
    @abstractmethod
    def get_auth_service(self) -> AuthenticationService:
        """Get authentication service instance."""
        pass
