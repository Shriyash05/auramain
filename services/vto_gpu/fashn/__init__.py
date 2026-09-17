"""
AURA VTO GPU - FASHN compatibility module
=========================================
Re-exports services.vto.fashn modules to support both import conventions:
- services.vto.fashn.*
- services.vto_gpu.fashn.*
"""
from services.vto.fashn.decoupled_pipeline import DecoupledTryOnPipeline
from services.vto.fashn.tryon_mmdit import TryOnModel

__all__ = ["DecoupledTryOnPipeline", "TryOnModel"]
