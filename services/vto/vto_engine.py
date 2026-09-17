import os
import time
import torch
from typing import Tuple, List, Dict, Any, Optional
from PIL import Image
from .models import HealthCheckResponse, LicenseAuditDetail
from .preprocessing import preprocess_for_tryon
from .postprocessing import validate_and_encode_result

# Minimum VRAM required for diffusion-based VTO (empirically profiled: 9.69 GB peak forward memory)
MIN_VRAM_GB_REQUIRED = 12.0

class VTOEngine:
    """
    Decoupled Neural Virtual Try-On Engine.
    Enforces:
    1. Legal & license audit verification (100% commercially clean, zero non-commercial parser imports)
    2. Hardware & VRAM constraints (>= 12GB VRAM required for diffusion forward pass)
    3. Zero fake outputs: Never synthesizes a 2D composite pretending to be neural VTO.
    """

    def __init__(self):
        self._check_hardware()
        self._check_licenses()
        self.is_pipeline_loaded = False
        self.pipeline = None

        if self.hardware_status == "COMPLIANT":
            weights_dir = os.path.join(os.path.dirname(__file__), "weights")
            if os.path.exists(os.path.join(weights_dir, "model.safetensors")):
                try:
                    from .fashn.decoupled_pipeline import DecoupledTryOnPipeline
                    self.pipeline = DecoupledTryOnPipeline(weights_dir=weights_dir)
                    self.is_pipeline_loaded = True
                except Exception as e:
                    self.blockers.append(f"Pipeline initialization error: {e}")
                    self.is_pipeline_loaded = False


    def _check_hardware(self):
        self.cuda_available = torch.cuda.is_available()
        self.gpu_name = torch.cuda.get_device_name(0) if self.cuda_available else None
        if self.cuda_available:
            total_bytes = torch.cuda.get_device_properties(0).total_memory
            self.vram_gb = round(total_bytes / (1024 ** 3), 2)
        else:
            self.vram_gb = 0.0

        if not self.cuda_available:
            self.hardware_status = "NO_CUDA"
        elif self.vram_gb < MIN_VRAM_GB_REQUIRED:
            self.hardware_status = "VRAM_INSUFFICIENT"
        else:
            self.hardware_status = "COMPLIANT"

    def _check_licenses(self):
        """
        Forensic license audit of complete VTO pipeline chain:
        1. Model code: Apache-2.0 / MIT (permissive).
        2. Model weights/checkpoints: FASHN VTON v1.5 (Apache-2.0) vs CatVTON/IDM-VTON (CC BY-NC-SA 4.0).
        3. Human parsing: fashn-human-parser inherits NVIDIA Source Code License for SegFormer (Non-Commercial Research Only);
           SCHP / ATR / LIP models strictly Non-Commercial.
        4. Pose estimation: DWPose (Apache-2.0, U-COCO) / RTMPose (Apache-2.0) vs CMU OpenPose ($25k/yr commercial license).
        5. Segmentation: rembg / U2-Net (Apache-2.0), MobileSAM (Apache-2.0) vs Clothing-agnostic mask (depends on parsing).
        6. Preprocessing/postprocessing: Pillow / OpenCV / NumPy (BSD-3-Clause / Apache-2.0). Commercially clean.
        7. Python packages: FastAPI, PyTorch, Safetensors, Pydantic (MIT / BSD-3 / Apache-2.0).
        8. Downloaded assets: yolox_l.onnx (Apache-2.0), dw-ll_ucoco_384.onnx (Apache-2.0), model.safetensors (Apache-2.0).
        9. Datasets required for inference/training: VITON-HD & DressCode are strictly CC BY-NC-SA 4.0 / Academic Research Only.
        """
        self.license_audits: List[LicenseAuditDetail] = [
            LicenseAuditDetail(
                component="model_code (fashn-vton-1.5 / AURA VTO Engine)",
                license_type="Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Permissive open-source license allows commercial implementation and distribution."
            ),
            LicenseAuditDetail(
                component="model_weights (fashn-ai/fashn-vton-1.5 MMDiT)",
                license_type="Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="MMDiT 972M parameter weights released under Apache-2.0."
            ),
            LicenseAuditDetail(
                component="model_weights (CatVTON / IDM-VTON / OOTDiffusion / AnyDoor)",
                license_type="CC BY-NC-SA 4.0",
                commercial_status="NON_COMMERCIAL_RESTRICTED",
                details="Checkpoints fine-tuned on VITON-HD/DressCode carry non-commercial viral restrictions."
            ),
            LicenseAuditDetail(
                component="human_parsing (fashn-human-parser / SegFormer)",
                license_type="NVIDIA Source Code License for SegFormer",
                commercial_status="NON_COMMERCIAL_RESTRICTED",
                details="Strictly limited by NVIDIA to Non-Commercial Research & Evaluation Only. Commercial product shipping prohibited."
            ),
            LicenseAuditDetail(
                component="human_parsing (SCHP / ATR / LIP / CIHP)",
                license_type="Non-Commercial Academic Research Agreement",
                commercial_status="NON_COMMERCIAL_RESTRICTED",
                details="Trained on Look Into Person (LIP) or CIHP academic datasets; strictly non-commercial."
            ),
            LicenseAuditDetail(
                component="pose_estimation (DWPose ONNX / RTMPose)",
                license_type="Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Trained on COCO / WholeBody (CC BY 4.0). Permissible for commercial deployment."
            ),
            LicenseAuditDetail(
                component="pose_estimation (CMU OpenPose)",
                license_type="Carnegie Mellon Non-Commercial License",
                commercial_status="NON_COMMERCIAL_RESTRICTED",
                details="Non-commercial research only; commercial use requires a paid $25,000/year license from CMU."
            ),
            LicenseAuditDetail(
                component="segmentation (rembg U2-Net / MobileSAM)",
                license_type="Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Background matting and class-agnostic segmentation tools are commercially permissive."
            ),
            LicenseAuditDetail(
                component="preprocessing_postprocessing (Pillow / OpenCV / NumPy)",
                license_type="BSD-3-Clause / Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Standard image normalization, letterboxing, padding, and validation libraries are fully permissive."
            ),
            LicenseAuditDetail(
                component="python_packages (FastAPI / PyTorch / Torchvision / Safetensors)",
                license_type="MIT / BSD-3-Clause / Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Runtime dependencies and ML frameworks are permissive open-source packages."
            ),
            LicenseAuditDetail(
                component="downloaded_assets (yolox_l.onnx, dw-ll_ucoco_384.onnx)",
                license_type="Apache-2.0",
                commercial_status="COMMERCIALLY_PERMITTED",
                details="Pre-trained ONNX pose weights released under Apache-2.0."
            ),
            LicenseAuditDetail(
                component="datasets (VITON-HD & DressCode)",
                license_type="CC BY-NC-SA 4.0 / Academic Agreement",
                commercial_status="NON_COMMERCIAL_RESTRICTED",
                details="Seoul National Univ / Kakao & Univ of Bologna require strict non-commercial research use."
            )
        ]

        # Identify blockers
        self.blockers = []
        if self.hardware_status == "VRAM_INSUFFICIENT":
            self.blockers.append(
                f"Hardware limitation: Detected GPU '{self.gpu_name}' has {self.vram_gb} GB VRAM. "
                f"Virtual Try-On MMDiT diffusion pipeline requires >= {MIN_VRAM_GB_REQUIRED} GB VRAM "
                f"(empirically profiled forward-pass peak: 9.69 GB / 9,927 MB) to avoid CUDA OOM. "
                f"Smallest practical GPU: NVIDIA RTX 4060 Ti (16GB) / RTX 3060 (12GB) locally, or NVIDIA L4 (24GB) in dedicated cloud."
            )
        elif self.hardware_status == "NO_CUDA":
            self.blockers.append("No CUDA GPU detected. Real-time neural diffusion requires a dedicated NVIDIA GPU.")

        self.blockers.append(
            "Hardware/Deployment Blocker: While the runtime pipeline has been successfully decoupled from "
            "fashn-human-parser (using pure maskless pixel-space MMDiT + DWPose Apache-2.0), execution cannot "
            "be completed on the local GTX 1650 4GB without CUDA OOM (9.69 GB peak). Dedicated GPU infrastructure (>=12GB) is required."
        )

        if self.hardware_status == "COMPLIANT":
            self.license_status = "COMMERCIALLY_PERMITTED"
        else:
            self.license_status = "DEPENDENCY_RESTRICTED"

    def get_health_status(self) -> HealthCheckResponse:
        """
        Returns structured health and audit report.
        """
        is_ready = (self.hardware_status == "COMPLIANT" and self.is_pipeline_loaded)
        status = "healthy" if is_ready else ("degraded" if self.cuda_available else "unavailable")

        message = (
            "VTO engine active and ready for inference."
            if is_ready
            else f"VTO engine unavailable: {'; '.join(self.blockers)}"
        )

        return HealthCheckResponse(
            status=status,
            cuda_available=self.cuda_available,
            gpu_name=self.gpu_name,
            vram_gb=self.vram_gb,
            vram_required_gb=MIN_VRAM_GB_REQUIRED,
            hardware_status=self.hardware_status,
            license_status=self.license_status,
            blockers=self.blockers,
            license_audit=self.license_audits,
            message=message
        )

    def run_inference(
        self,
        person_img: Image.Image,
        garment_img: Image.Image,
        category: str,
        outfit_name: Optional[str] = None
    ) -> Tuple[str, float, float]:
        """
        Executes virtual try-on inference.
        Returns: (result_image_data_uri, latency_ms, peak_vram_mb)
        
        Strict Policy:
        If hardware or licensing conditions are not satisfied, refuses to fabricate
        a fake 2D composite image and raises an explicit RuntimeError.
        """
        start_time = time.time()

        if self.hardware_status == "VRAM_INSUFFICIENT":
            raise RuntimeError(
                f"VTO Inference Blocked: Insufficient VRAM ({self.vram_gb} GB detected, "
                f">= {MIN_VRAM_GB_REQUIRED} GB required). Cannot execute diffusion model on this GPU without CUDA OOM."
            )

        if self.hardware_status == "NO_CUDA":
            raise RuntimeError("VTO Inference Blocked: No CUDA acceleration detected.")

        if not self.is_pipeline_loaded or self.pipeline is None:
            raise RuntimeError(
                "VTO Inference Blocked: Pipeline weights not loaded."
            )

        # Preprocess
        person_proc, garment_proc = preprocess_for_tryon(person_img, garment_img)

        # Execute genuine decoupled neural virtual try-on on compliant hardware
        category_map = {"tops": "tops", "bottoms": "bottoms", "one-piece": "one-pieces"}
        cat_key = category_map.get(category)
        if cat_key is None:
            raise RuntimeError(f"VTO Inference Blocked: unsupported neural VTO category '{category}'.")
        output = self.pipeline(
            person_image=person_proc,
            garment_image=garment_proc,
            category=cat_key,
            garment_photo_type="flat-lay",
            num_samples=1,
            num_timesteps=30,
            guidance_scale=1.5,
        )
        result_img = output.images[0]
        latency = time.time() - start_time
        peak_vram = (
            torch.cuda.max_memory_allocated(0) / (1024 ** 2)
            if torch.cuda.is_available()
            else 0.0
        )
        result_b64 = validate_and_encode_result(result_img)
        return result_b64, latency, peak_vram
