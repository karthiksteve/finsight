"""
Application configuration with environment validation.
Selects between local (development) and managed-identity (production) providers at startup.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class AppConfig(BaseSettings):
    """Application configuration loaded from environment."""
    
    # Execution environment
    AZURE_FUNCTIONS_ENVIRONMENT: str = Field(default="Development")
    
    # Database configuration
    DATABASE_URL: str = Field(default="postgresql://finsight:finsight@localhost:5432/finsight")
    DATABASE_POOL_SIZE: int = Field(default=10)
    DATABASE_MAX_OVERFLOW: int = Field(default=20)
    
    # Blob Storage configuration
    STORAGE_CONNECTION_STRING: str = Field(default="UseDevelopmentStorage=true")
    STORAGE_ACCOUNT_NAME: str = Field(default="devstoreaccount1")
    STORAGE_CONTAINER: str = Field(default="finsight-documents")
    
    # LLM Provider selection
    LLM_PROVIDER: str = Field(default="lmstudio")  # 'lmstudio', 'groq', 'gemini', 'rules'
    
    # LM Studio configuration (local)
    LMSTUDIO_BASE_URL: str = Field(default="http://localhost:1234/v1")
    LMSTUDIO_API_KEY: str = Field(default="lm-studio")
    LMSTUDIO_MODEL: str = Field(default="qwen3-8b")
    
    # Google Gemini configuration
    GOOGLE_API_KEY: Optional[str] = Field(default=None)
    HUGGINGFACE_API_KEY: Optional[str] = Field(default=None)
    
    # Groq configuration
    GROQ_API_KEY: Optional[str] = Field(default=None)
    
    # Pinecone configuration
    PINECONE_API_KEY: Optional[str] = Field(default=None)
    PINECONE_INDEX_NAME: str = Field(default="finsight-documents")
    PINECONE_ENVIRONMENT: Optional[str] = Field(default=None)
    
    # File upload configuration
    MAX_FILE_SIZE_BYTES: int = Field(default=50 * 1024 * 1024)  # 50MB
    ALLOWED_FILE_EXTENSIONS: str = Field(default=".pdf,.txt,.html,.docx,.doc")
    
    # Security
    JWT_SECRET_KEY: str = Field(default="dev-secret-key-change-in-production")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRATION_HOURS: int = Field(default=24)
    
    # CORS configuration
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://localhost:3000")
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True)
    CORS_ALLOW_METHODS: str = Field(default="GET,POST,PUT,DELETE,OPTIONS")
    CORS_ALLOW_HEADERS: str = Field(default="*")
    
    # Model paths
    NER_MODEL_PATH: str = Field(default="models/ner_model/model-best")
    FINBERT_MODEL: str = Field(default="ProsusAI/finbert")
    SPACY_MODEL: str = Field(default="en_core_web_sm")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @field_validator('ALLOWED_FILE_EXTENSIONS')
    @classmethod
    def validate_extensions(cls, v: str) -> set:
        """Convert extension string to set."""
        return {ext.strip() for ext in v.split(",")}
    
    @field_validator('CORS_ORIGINS')
    @classmethod
    def validate_origins(cls, v: str) -> list:
        """Convert origins string to list."""
        return [origin.strip() for origin in v.split(",")]
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.AZURE_FUNCTIONS_ENVIRONMENT.lower() in ("development", "local")
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return not self.is_development()


class Config:
    # Backward compatibility wrapper
    # Base paths
    BASE_DIR = Path(__file__).parent
    UPLOADS_DIR = BASE_DIR / "uploads"
    OUTPUTS_DIR = BASE_DIR / "outputs"
    MODELS_DIR = BASE_DIR / "models"
    
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    # Model paths
    NER_MODEL_NAME = "en_core_web_sm"  # Default spaCy model to use
    NER_MODEL_PATH = MODELS_DIR / "ner_model" / "model-best"  # Custom model path (if available)
    
    # Ensure the model path exists
    if not NER_MODEL_PATH.exists():
        print(f"Warning: NER model not found at {NER_MODEL_PATH}")
        # Try to create the directory structure if it doesn't exist
        NER_MODEL_PATH.mkdir(parents=True, exist_ok=True)
    
    # API Keys (set from environment)
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
    
    # LM Studio Local LLM settings (OpenAI-compatible server)
    LMSTUDIO_BASE_URL = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    LMSTUDIO_API_KEY = os.getenv("LMSTUDIO_API_KEY", "lm-studio")
    # Qwen 3 8B is the default for financial/legal reasoning and structured extraction.
    # Set this to the exact model id returned by LM Studio's /v1/models endpoint.
    LMSTUDIO_MODEL = os.getenv("LMSTUDIO_MODEL", "qwen3-8b")
    
    # Local inference is the default. Cloud providers must be explicitly selected.
    # Supported values: 'lmstudio', 'groq', 'gemini', 'rules'
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "lmstudio").lower()
    
    # LangExtract settings
    LANGEXTRACT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]
    
    # FinBERT settings
    FINBERT_MODEL = "ProsusAI/finbert"
    
    # File size limits
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {".pdf", ".txt", ".html", ".docx", ".doc"}
    
    # Sentiment colors
    SENTIMENT_COLORS = {
        "very positive": "#bbf7d0",  # Light Green
        "positive": "#dcfce7",       # Very Light Green
        "neutral": "#f3f4f6",        # Very Light Gray
        "negative": "#fee2e2",       # Very Light Red
        "very negative": "#fecaca"   # Light Red
    }
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories"""
        cls.UPLOADS_DIR.mkdir(exist_ok=True)
        cls.OUTPUTS_DIR.mkdir(exist_ok=True)
        cls.MODELS_DIR.mkdir(exist_ok=True)
        
    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validate configuration and return status"""
        issues = []
        
        if not cls.GOOGLE_API_KEY:
            issues.append("GOOGLE_API_KEY not set")
            
        if not cls.NER_MODEL_PATH.exists():
            issues.append(f"NER model not found at {cls.NER_MODEL_PATH}")
            
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
