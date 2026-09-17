"""AURA GPU VTO Service FastAPI application alias."""
from services.vto_gpu.app import app, Service, JobCreate, lifespan, current_user

__all__ = ["app", "Service", "JobCreate", "lifespan", "current_user"]
