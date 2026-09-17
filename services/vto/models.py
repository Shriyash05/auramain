from typing import Optional, Literal, Dict, Any, List
from pydantic import BaseModel, Field, field_validator

class LicenseAuditDetail(BaseModel):
    component: str
    license_type: str
    commercial_status: Literal["COMMERCIALLY_PERMITTED", "NON_COMMERCIAL_RESTRICTED", "UNCERTAIN"]
    details: str

class HealthCheckResponse(BaseModel):
    status: Literal["healthy", "degraded", "unavailable"]
    engine: str = "Aura-VTO-Service"
    version: str = "1.0.0"
    cuda_available: bool
    gpu_name: Optional[str] = None
    vram_gb: float
    vram_required_gb: float = 8.0
    hardware_status: Literal["COMPLIANT", "VRAM_INSUFFICIENT", "NO_CUDA"]
    license_status: Literal["COMMERCIALLY_PERMITTED", "DEPENDENCY_RESTRICTED", "EVALUATION_ONLY"]
    blockers: List[str] = Field(default_factory=list)
    license_audit: List[LicenseAuditDetail] = Field(default_factory=list)
    message: str

class TryOnRequestSchema(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    person_image: str = Field(..., description="Base64 data URI or image payload")
    garment_image: str = Field(..., description="Base64 data URI of isolated garment")
    category: Literal["tops", "bottoms", "shoes", "outerwear", "one-piece"]
    outfit_name: Optional[str] = Field(default="Selected Garment", max_length=100)
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("person_image", "garment_image")
    @classmethod
    def validate_image_payload(cls, v: str) -> str:
        if not v or len(v) < 20:
            raise ValueError("Image payload is too short or empty")
        # Max base64 payload length: ~15MB base64 corresponds to ~11MB binary
        if len(v) > 16 * 1024 * 1024:
            raise ValueError("Image payload exceeds maximum limit of 10MB")
        return v

class TryOnResponseSchema(BaseModel):
    id: str
    status: Literal["completed", "engine_unavailable", "failed"]
    result_image: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    latency_ms: float = 0.0
    memory_usage_mb: float = 0.0
