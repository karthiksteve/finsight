"""
Standardized error handling with structured error responses.
All API errors follow the format: { error: { code, message, details } }
"""

from enum import Enum
from typing import Any, Optional, Dict
from fastapi import HTTPException, status
from pydantic import BaseModel


class ErrorCode(str, Enum):
    """Typed error codes for consistent error handling."""
    
    # Validation errors (400)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_FILE = "INVALID_FILE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    
    # Authentication/Authorization errors (401, 403)
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # Resource errors (404, 409)
    NOT_FOUND = "NOT_FOUND"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE"
    
    # Processing errors (422)
    UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    
    # Service errors (503)
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    STORAGE_ERROR = "STORAGE_ERROR"
    
    # Server errors (500)
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class ErrorDetail(BaseModel):
    """Structured error detail model."""
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response structure: { error: { code, message, details } }"""
    error: ErrorDetail


class AppException(Exception):
    """Base application exception with structured error response."""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
    
    def to_response(self) -> ErrorResponse:
        """Convert to structured error response."""
        return ErrorResponse(
            error=ErrorDetail(
                code=self.code,
                message=self.message,
                details=self.details,
            )
        )
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_response().model_dump(),
        )


class ValidationException(AppException):
    """Validation error (400)."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class InvalidFileException(AppException):
    """Invalid file error (400)."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.INVALID_FILE,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class FileTooLargeException(AppException):
    """File too large error (400)."""
    
    def __init__(self, message: str, max_size: Optional[int] = None):
        super().__init__(
            code=ErrorCode.FILE_TOO_LARGE,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"max_size_bytes": max_size} if max_size else None,
        )


class UnsupportedFormatException(AppException):
    """Unsupported file format error (400)."""
    
    def __init__(self, message: str, supported_formats: Optional[list] = None):
        super().__init__(
            code=ErrorCode.UNSUPPORTED_FORMAT,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"supported_formats": supported_formats} if supported_formats else None,
        )


class UnauthorizedException(AppException):
    """Authentication error (401)."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            code=ErrorCode.UNAUTHORIZED,
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenException(AppException):
    """Authorization error (403)."""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            code=ErrorCode.FORBIDDEN,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class NotFoundException(AppException):
    """Resource not found error (404)."""
    
    def __init__(self, message: str, resource_type: Optional[str] = None, resource_id: Optional[str] = None):
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "resource_type": resource_type,
                "resource_id": resource_id,
            } if resource_type or resource_id else None,
        )


class ConflictException(AppException):
    """Resource conflict error (409)."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.RESOURCE_CONFLICT,
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ProcessingException(AppException):
    """Processing failed error (422)."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.PROCESSING_FAILED,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ServiceUnavailableException(AppException):
    """Service unavailable error (503)."""
    
    def __init__(self, service_name: str, message: Optional[str] = None):
        msg = message or f"{service_name} service is temporarily unavailable"
        super().__init__(
            code=ErrorCode.SERVICE_UNAVAILABLE,
            message=msg,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"service": service_name},
        )


class ProviderUnavailableException(AppException):
    """Provider (e.g., LLM, embedding service) unavailable error (503)."""
    
    def __init__(self, provider_name: str, message: Optional[str] = None):
        msg = message or f"{provider_name} provider is unavailable"
        super().__init__(
            code=ErrorCode.PROVIDER_UNAVAILABLE,
            message=msg,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"provider": provider_name},
        )


class DatabaseException(AppException):
    """Database error (503)."""
    
    def __init__(self, message: str = "Database error occurred"):
        super().__init__(
            code=ErrorCode.DATABASE_ERROR,
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class StorageException(AppException):
    """Storage error (503)."""
    
    def __init__(self, message: str = "Storage error occurred"):
        super().__init__(
            code=ErrorCode.STORAGE_ERROR,
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class InternalServerException(AppException):
    """Internal server error (500)."""
    
    def __init__(self, message: str = "An internal server error occurred", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )
