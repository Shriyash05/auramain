import gc
import os
import uuid
import time
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import HealthCheckResponse, TryOnRequestSchema, TryOnResponseSchema
from .vto_engine import VTOEngine
from .preprocessing import decode_image_payload

app = FastAPI(
    title="AURA Virtual Try-On Service",
    description="Standalone Neural Try-On & Diagnostic Service for AURA",
    version="1.0.0"
)

# CORS configuration
allowed_origins = [origin.strip() for origin in os.getenv("AURA_VTO_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    # Deliberately disabled until the deployer supplies explicit origins.  This
    # service receives biometric images and must not be browser-accessible by
    # arbitrary origins.
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global engine instance
vto_engine = VTOEngine()

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    # Enforce request body size limit (< 15MB)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 15 * 1024 * 1024:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Payload exceeds maximum allowed size of 15MB"}
        )

    response: Response = await call_next(request)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Prevent leaking internal stack traces
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal processing error in VTO service"}
    )

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Returns the real-time health status, hardware capabilities, VRAM, and license audit details.
    """
    return vto_engine.get_health_status()

@app.get("/license-audit")
async def get_license_audit():
    """
    Returns detailed forensic audit of VTO candidate models and dependencies.
    """
    return {
        "engine": "Aura-VTO-Service",
        "license_status": vto_engine.license_status,
        "audits": [a.model_dump() for a in vto_engine.license_audits],
        "blockers": vto_engine.blockers
    }

@app.post("/tryon", response_model=TryOnResponseSchema)
async def execute_tryon(request: TryOnRequestSchema):
    """
    Executes neural virtual try-on.
    Safely validates payload, decodes images in memory without disk persistence,
    runs the inference pipeline, and returns the result.
    """
    request_id = f"vto_{uuid.uuid4().hex[:12]}"
    start_time = time.time()

    person_img = None
    garment_img = None

    try:
        # 1. Decode payloads safely
        try:
            person_img = decode_image_payload(request.person_image)
            garment_img = decode_image_payload(request.garment_image)
        except ValueError as e:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid image payload: {str(e)}"
            )

        # 2. Execute inference through engine
        try:
            result_b64, latency, peak_vram = vto_engine.run_inference(
                person_img=person_img,
                garment_img=garment_img,
                category=request.category,
                outfit_name=request.outfit_name
            )

            return TryOnResponseSchema(
                id=request_id,
                status="completed",
                result_image=result_b64,
                latency_ms=round(latency * 1000, 2),
                memory_usage_mb=round(peak_vram, 2)
            )

        except RuntimeError as err:
            # Report honest blocker reason
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "id": request_id,
                    "status": "engine_unavailable",
                    "error_code": "VTO_BLOCKED",
                    "error_message": str(err),
                    "latency_ms": latency_ms,
                    "memory_usage_mb": 0.0,
                    "blockers": vto_engine.blockers
                }
            )

    finally:
        # Privacy & Security: Explicitly release image objects and trigger garbage collection
        if person_img is not None:
            del person_img
        if garment_img is not None:
            del garment_img
        gc.collect()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
