"""
Pydantic models for request/response validation and standardized data structures.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class PipelineStage(str, Enum):
    """Available pipeline processing stages."""
    TEXT_EXTRACTION = "text_extraction"
    NER = "ner"
    LANGEXTRACT = "langextract"
    FINBERT = "finbert"
    RAG_INDEX = "rag_index"


class ProcessingStatus(str, Enum):
    """Document processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REVIEW_NEEDED = "review_needed"


class EntityType(str, Enum):
    """Financial entity types recognized by NER."""
    ORGANIZATION = "ORGANIZATION"
    PERSON = "PERSON"
    LOCATION = "LOCATION"
    DATE = "DATE"
    TERM = "TERM"
    MONEY = "MONEY"
    PERCENTAGE = "PERCENTAGE"
    QUANTITY = "QUANTITY"
    DURATION = "DURATION"


class SentimentLabel(str, Enum):
    """Sentiment analysis labels."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


# Request models

class ProcessDocumentRequest(BaseModel):
    """Request model for document processing."""
    stages: List[PipelineStage] = Field(
        default=[
            PipelineStage.TEXT_EXTRACTION,
            PipelineStage.NER,
            PipelineStage.LANGEXTRACT,
            PipelineStage.FINBERT,
            PipelineStage.RAG_INDEX,
        ],
        description="Pipeline stages to execute"
    )
    include_annotations: bool = Field(
        default=False,
        description="Include entity annotations in output"
    )
    store_results: bool = Field(
        default=True,
        description="Store results in backend storage"
    )


class ProcessTextRequest(BaseModel):
    """Request model for text processing."""
    text: str = Field(..., min_length=1, max_length=1_000_000)
    stages: List[PipelineStage] = Field(
        default=[PipelineStage.NER, PipelineStage.LANGEXTRACT, PipelineStage.FINBERT],
        description="Pipeline stages to execute"
    )


class RAGQueryRequest(BaseModel):
    """Request model for RAG queries."""
    question: str = Field(..., min_length=1, max_length=5000)
    top_k: int = Field(default=5, ge=1, le=20)
    include_scores: bool = Field(default=False)


class ExportRequest(BaseModel):
    """Request model for exporting results."""
    format: str = Field(..., regex="^(json|csv|txt)$")
    include_metadata: bool = Field(default=True)


# Response models

class Entity(BaseModel):
    """Extracted entity model."""
    text: str
    entity_type: EntityType
    confidence: float = Field(..., ge=0.0, le=1.0)
    start_char: Optional[int] = None
    end_char: Optional[int] = None


class NERResult(BaseModel):
    """NER processing result."""
    entities: List[Entity]
    model_path: str
    processing_time_ms: float


class Clause(BaseModel):
    """Extracted clause model."""
    text: str
    clause_type: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class LangExtractResult(BaseModel):
    """LangExtract processing result."""
    clauses: List[Clause]
    language: Optional[str] = None


class SentimentResult(BaseModel):
    """Sentiment analysis result."""
    label: SentimentLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    scores: Optional[Dict[str, float]] = None


class RAGSource(BaseModel):
    """RAG retrieval source document."""
    filename: str
    chunk: str
    similarity_score: Optional[float] = None


class RAGQueryResponse(BaseModel):
    """RAG query response."""
    answer: str
    sources: List[RAGSource]
    processing_time_ms: float


class FileInfo(BaseModel):
    """Uploaded file information."""
    filename: str
    size_bytes: int
    mime_type: str
    upload_timestamp: datetime


class ProcessingJob(BaseModel):
    """Processing job status and results."""
    job_id: str
    status: ProcessingStatus
    file_info: Optional[FileInfo] = None
    stages_completed: List[PipelineStage] = []
    stages_failed: List[PipelineStage] = []
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completion_percentage: int = Field(default=0, ge=0, le=100)


class PipelineStatusResponse(BaseModel):
    """Pipeline capability status response."""
    ner: Dict[str, Any] = Field(..., description="NER model availability")
    llm_provider: Optional[Dict[str, Any]] = None
    vector_store: Optional[Dict[str, Any]] = None
    database: Optional[Dict[str, Any]] = None


class ProcessDocumentResponse(BaseModel):
    """Response model for document processing."""
    success: bool
    file_info: Optional[FileInfo] = None
    text_extraction: Optional[str] = None
    ner: Optional[NERResult] = None
    langextract: Optional[LangExtractResult] = None
    finbert: Optional[SentimentResult] = None
    rag_indexed: bool = False
    summary: Optional[str] = None


class ProcessTextResponse(BaseModel):
    """Response model for text processing."""
    success: bool
    text_info: Dict[str, Any] = Field(default_factory=dict)
    pipeline_steps: List[PipelineStage] = []
    ner: Optional[NERResult] = None
    langextract: Optional[LangExtractResult] = None
    finbert: Optional[SentimentResult] = None


class HealthCheckResponse(BaseModel):
    """Health check response."""
    status: str
    message: str
    timestamp: datetime
    services: Optional[Dict[str, Dict[str, Any]]] = None


class DocumentMetadata(BaseModel):
    """Document metadata for storage/retrieval."""
    document_id: str
    filename: str
    upload_timestamp: datetime
    file_size_bytes: int
    content_hash: Optional[str] = None
    indexed_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)


class WorkspaceDocumentSummary(BaseModel):
    """Summary of a document in the workspace."""
    document_id: str
    filename: str
    pipeline_stages: List[PipelineStage] = []
    last_updated: datetime
    status: ProcessingStatus
