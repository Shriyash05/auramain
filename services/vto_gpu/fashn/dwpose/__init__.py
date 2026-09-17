"""
AURA VTO GPU - DWPose compatibility module
==========================================
Re-exports services.vto.fashn.dwpose members to support both:
- services.vto.fashn.dwpose.*
- services.vto_gpu.fashn.dwpose.*
"""
from services.vto.fashn.dwpose.dwpose import DWposeDetector, draw_pose
from services.vto.fashn.dwpose.wholebody import Wholebody

__all__ = ["DWposeDetector", "draw_pose", "Wholebody"]
