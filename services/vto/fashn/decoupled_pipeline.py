"""
AURA Decoupled FASHN VTON v1.5 Pipeline
======================================

Commercially clean, maskless Virtual Try-On pipeline.
Eliminates the runtime dependency on `fashn-human-parser` (SegFormer NVIDIA Source Code License)
by utilizing the native pixel-space maskless configuration of FASHN VTON v1.5 with DWPose (Apache-2.0)
and isolated garment flat-lays.

License: Apache-2.0
"""

import logging
import os
import traceback
from dataclasses import dataclass
from typing import List, Literal, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from tqdm.auto import tqdm

from .dwpose import DWposeDetector, draw_pose
from .preprocessing.transforms import AspectPreserveResize, ResizePad
from .tryon_mmdit import TryOnModel
from .utils import (
    get_dummy_dw_keypoints,
    get_rf_schedule,
    load_checkpoint,
    normalize_uint8_to_neg1_1,
    numpy_to_torch,
    setup_logger,
    tensor_to_pil,
)


def log_gpu_memory(stage: str):
    """Prints current CUDA GPU memory usage across all detected GPUs."""
    if torch.cuda.is_available():
        infos = []
        for i in range(torch.cuda.device_count()):
            alloc = torch.cuda.memory_allocated(i) / (1024 ** 2)
            res = torch.cuda.memory_reserved(i) / (1024 ** 2)
            total = torch.cuda.get_device_properties(i).total_memory / (1024 ** 2)
            name = torch.cuda.get_device_name(i)
            infos.append(f"GPU {i} ({name}): Allocated={alloc:.2f} MiB | Reserved={res:.2f} MiB | Total={total:.2f} MiB")
        print(f"[GPU MEMORY] [{stage}] " + " | ".join(infos), flush=True)
    else:
        print(f"[GPU MEMORY] [{stage}] CUDA not available (CPU mode)", flush=True)


@dataclass
class DecoupledPipelineOutput:
    """Pipeline output container."""
    images: List[Image.Image]


class DecoupledTryOnPipeline:
    """
    Decoupled TryOn inference pipeline for AURA.
    
    100% Commercially Permissive:
    - Model: MMDiT 972M (Apache-2.0)
    - Pose: DWPose ONNX / U-COCO (Apache-2.0)
    - Garment input: Pure RGB flat-lay (Apache-2.0 / Rembg U2-Net)
    - Person input: Pure RGB maskless pixel-space representation (Apache-2.0)
    - Zero human parser imports or execution
    """

    CATEGORY_TO_LABEL = {"tops": 1, "bottoms": 2, "one-pieces": 3}

    def __init__(
        self,
        weights_dir: str,
        device: Optional[str] = None,
        input_shape: Optional[tuple[int, int]] = None,
        logger: Optional[logging.Logger] = None,
    ):
        self.weights_dir = os.path.abspath(weights_dir)
        self.logger = logger or setup_logger("DecoupledTryOnPipeline", level=logging.INFO)

        # Setup device
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        self.logger.info(f"Using device: {self.device}")

        # Setup inference dtype
        self.inference_dtype = torch.float32
        if self.device.type == "cuda" and torch.cuda.is_bf16_supported():
            self.inference_dtype = torch.bfloat16
        self.logger.info(f"Using dtype: {self.inference_dtype}")

        # Validate weights exist
        self._validate_weights()

        # Load models
        self._setup_tryon_model(input_shape=input_shape)
        self._setup_pose_model()
        # NOTICE: self._setup_hp_model() is completely removed

        # Setup transforms (derived from model input shape)
        h, w = self.tryon_model.input_shape
        max_dim = max(h, w)
        self.pre_resize = AspectPreserveResize(target_size=(max_dim, max_dim), mode="fit", backend="pil")
        self.resize_pad_fn = ResizePad((w, h), backend="opencv")

    def _validate_weights(self):
        """Check that required weight files exist and log resolved paths."""
        tryon_path = os.path.abspath(os.path.join(self.weights_dir, "model.safetensors"))
        dwpose_dir = os.path.abspath(os.path.join(self.weights_dir, "dwpose"))
        yolox_path = os.path.abspath(os.path.join(dwpose_dir, "yolox_l.onnx"))
        dwpose_path = os.path.abspath(os.path.join(dwpose_dir, "dw-ll_ucoco_384.onnx"))

        print(f"[VTO INIT] Resolving and validating model weight paths in: {self.weights_dir}", flush=True)
        print(f"  - Resolved MMDiT Checkpoint Path: {tryon_path} (exists={os.path.exists(tryon_path)})", flush=True)
        print(f"  - Resolved YOLOX ONNX Path:       {yolox_path} (exists={os.path.exists(yolox_path)})", flush=True)
        print(f"  - Resolved DWPose ONNX Path:      {dwpose_path} (exists={os.path.exists(dwpose_path)})", flush=True)

        missing = []
        if not os.path.exists(tryon_path):
            missing.append(tryon_path)
        if not os.path.exists(yolox_path):
            missing.append(yolox_path)
        if not os.path.exists(dwpose_path):
            missing.append(dwpose_path)

        if missing:
            err_msg = (
                "Missing model weights at resolved absolute paths:\n"
                + "\n".join(f"  - {p}" for p in missing)
                + f"\n\nPlease ensure weights are placed in: {self.weights_dir}"
            )
            print(f"[VTO ERROR] {err_msg}", flush=True)
            raise FileNotFoundError(err_msg)

    def _setup_tryon_model(self, input_shape: Optional[tuple[int, int]] = None):
        """Load the TryOn (MMDiT) model."""
        print("=" * 60, flush=True)
        print("[VTO INIT] >>> Beginning MMDiT initialization <<<", flush=True)
        model_path = os.path.abspath(os.path.join(self.weights_dir, "model.safetensors"))
        print(f"[VTO INIT] MMDiT weight path resolution: {model_path}", flush=True)

        if not os.path.exists(model_path):
            err_msg = f"MMDiT weight file not found at resolved absolute path: {model_path}"
            print(f"[VTO ERROR] {err_msg}", flush=True)
            raise FileNotFoundError(err_msg)

        size_mb = os.path.getsize(model_path) / (1024 ** 2)
        print(f"[VTO INIT] MMDiT weight file verified: exists=True, size={size_mb:.2f} MiB", flush=True)
        log_gpu_memory("Before MMDiT loading started")

        print(f"[VTO INIT] MMDiT loading started onto device={self.device}, dtype={self.inference_dtype}...", flush=True)
        try:
            self.tryon_model = TryOnModel(input_shape=input_shape) if input_shape else TryOnModel()
            state_dict = load_checkpoint(model_path, device=str(self.device))
            self.tryon_model.load_state_dict(state_dict)
            self.tryon_model.to(self.device, dtype=self.inference_dtype).eval()
            print("[VTO INIT] >>> MMDiT loading completed <<<", flush=True)
            log_gpu_memory("After MMDiT loading completed")
        except torch.cuda.OutOfMemoryError:
            print(f"[VTO ERROR] CUDA OUT OF MEMORY during MMDiT loading:\n{traceback.format_exc()}", flush=True)
            log_gpu_memory("CUDA OOM during MMDiT loading")
            raise
        except Exception:
            print(f"[VTO ERROR] Exception during MMDiT loading:\n{traceback.format_exc()}", flush=True)
            raise

    def _setup_pose_model(self):
        """Load DWPose model."""
        print("=" * 60, flush=True)
        print("[VTO INIT] >>> Beginning DWPose initialization <<<", flush=True)
        dwpose_dir = os.path.abspath(os.path.join(self.weights_dir, "dwpose"))
        yolox_path = os.path.abspath(os.path.join(dwpose_dir, "yolox_l.onnx"))
        dwpose_path = os.path.abspath(os.path.join(dwpose_dir, "dw-ll_ucoco_384.onnx"))
        print(f"[VTO INIT] DWPose weight path resolution:", flush=True)
        print(f"  - DWPose Directory:  {dwpose_dir}", flush=True)
        print(f"  - YOLOX ONNX Path:   {yolox_path}", flush=True)
        print(f"  - DWPose ONNX Path:  {dwpose_path}", flush=True)

        for p, name in [(yolox_path, "yolox_l.onnx"), (dwpose_path, "dw-ll_ucoco_384.onnx")]:
            if not os.path.exists(p):
                err_msg = f"DWPose model file '{name}' not found at resolved absolute path: {p}"
                print(f"[VTO ERROR] {err_msg}", flush=True)
                raise FileNotFoundError(err_msg)
            size_mb = os.path.getsize(p) / (1024 ** 2)
            print(f"[VTO INIT] Verified {name}: exists=True, size={size_mb:.2f} MiB", flush=True)

        dwpose_device = f"cuda:{self.device.index or 0}" if self.device.type == "cuda" else "cpu"
        log_gpu_memory("Before DWPose loading started")
        print(f"[VTO INIT] DWPose loading started onto device={dwpose_device}...", flush=True)
        try:
            self.pose_model = DWposeDetector(checkpoints_dir=dwpose_dir, device=dwpose_device)
            print("[VTO INIT] >>> DWPose loading completed <<<", flush=True)
            log_gpu_memory("After DWPose loading completed")
        except torch.cuda.OutOfMemoryError:
            print(f"[VTO ERROR] CUDA OUT OF MEMORY during DWPose loading:\n{traceback.format_exc()}", flush=True)
            log_gpu_memory("CUDA OOM during DWPose loading")
            raise
        except Exception:
            print(f"[VTO ERROR] Exception during DWPose loading:\n{traceback.format_exc()}", flush=True)
            raise

    @torch.inference_mode()
    def _sample(
        self,
        *,
        ca_images: torch.Tensor,
        garment_images: torch.Tensor,
        person_poses: torch.Tensor,
        garment_poses: torch.Tensor,
        garment_categories: torch.Tensor,
        num_timesteps: int = 30,
        time_shift_mu: float = 1.5,
        guidance_scale: float = 1.5,
        skip_cfg_last_n_steps: int = 1,
        use_tqdm: bool = True,
    ) -> List[Image.Image]:
        """Euler sampling with CFG."""
        device, dtype = ca_images.device, ca_images.dtype
        batch_size = ca_images.shape[0]

        # Init noisy images
        c, h, w = self.tryon_model.channels_in, *self.tryon_model.input_shape
        images = torch.randn((batch_size, c, h, w), dtype=dtype, device=device)

        # Time schedule (from 0 -> 1)
        timesteps = get_rf_schedule(num_steps=num_timesteps, mu=time_shift_mu)

        model_kwargs = {
            "person_poses": person_poses,
            "garment_poses": garment_poses,
            "ca_images": ca_images,
            "garment_images": garment_images,
            "garment_categories": garment_categories,
        }

        # Euler sampling loop
        for step_idx, (t_curr, t_prev) in enumerate(
            tqdm(
                zip(timesteps[:-1], timesteps[1:]),
                desc="Sampling",
                total=len(timesteps) - 1,
                disable=not use_tqdm,
            )
        ):
            dt = t_prev - t_curr
            t_vec = torch.full((batch_size,), t_curr, dtype=dtype, device=device)

            pred = self.tryon_model.forward_for_cfg(images, t_vec, **model_kwargs)
            v_c, v_u = pred["v_c"], pred["v_u"]

            # Skip CFG at final steps to prevent color saturation
            if skip_cfg_last_n_steps > 0 and step_idx >= num_timesteps - skip_cfg_last_n_steps:
                v_guided = v_c
            else:
                v_guided = v_u + guidance_scale * (v_c - v_u)

            images = images + dt * v_guided

        images = images.to(dtype=torch.float).clamp_(-1.0, 1.0)
        return [tensor_to_pil(img, unnormalize=True) for img in images]

    @torch.inference_mode()
    def __call__(
        self,
        person_image: Image.Image,
        garment_image: Image.Image,
        category: Literal["tops", "bottoms", "one-pieces"],
        garment_photo_type: Literal["model", "flat-lay"] = "flat-lay",
        num_samples: int = 1,
        num_timesteps: int = 30,
        guidance_scale: float = 1.5,
        skip_cfg_last_n_steps: int = 1,
        seed: int = 42,
    ) -> DecoupledPipelineOutput:
        """
        Run decoupled virtual try-on inference.
        Zero human-parser dependency. Pure maskless pixel-space generation.
        """
        # Set seed
        torch.manual_seed(seed)
        if self.device.type == "cuda":
            torch.cuda.manual_seed_all(seed)
        np.random.seed(seed)

        # Pre-resize for pose detection quality
        person_image = self.pre_resize(person_image, allow_upsampling=False)
        garment_image = self.pre_resize(garment_image, allow_upsampling=False)

        person_image_np = np.array(person_image)
        garment_image_np = np.array(garment_image)

        # Pose detection (DWPose expects BGR)
        person_pose = self.pose_model(person_image_np[..., ::-1])
        garment_pose = (
            get_dummy_dw_keypoints()
            if garment_photo_type == "flat-lay"
            else self.pose_model(garment_image_np[..., ::-1])
        )

        person_pose_img = draw_pose(person_pose, person_image_np.shape[0], person_image_np.shape[1], grayscale=True)
        garment_pose_img = draw_pose(garment_pose, garment_image_np.shape[0], garment_image_np.shape[1], grayscale=True)

        # Decoupled Maskless Path:
        # In segmentation-free flat-lay mode, ca_image is the RGB person image,
        # and garment_image_processed is the isolated RGB garment flat-lay.
        # No human parsing model is imported or executed.
        ca_image = person_image_np.copy()
        garment_image_processed = garment_image_np.copy()

        # Resize/pad for model input
        ca_image = self.resize_pad_fn(ca_image, mem_padding=True)
        garment_image_processed = self.resize_pad_fn(garment_image_processed)
        person_pose_img = self.resize_pad_fn(person_pose_img, interpolation=cv2.INTER_NEAREST_EXACT)
        garment_pose_img = self.resize_pad_fn(garment_pose_img, interpolation=cv2.INTER_NEAREST_EXACT)

        # Prepare tensors
        def prepare_tensor(img: np.ndarray) -> torch.Tensor:
            t = numpy_to_torch(img).unsqueeze(0)
            t = normalize_uint8_to_neg1_1(t)
            t = t.to(self.device).repeat(num_samples, 1, 1, 1)
            return t

        ca_tensor = prepare_tensor(ca_image)
        garment_tensor = prepare_tensor(garment_image_processed)
        person_pose_tensor = prepare_tensor(person_pose_img)
        garment_pose_tensor = prepare_tensor(garment_pose_img)

        garment_categories = (
            torch.tensor(self.CATEGORY_TO_LABEL[category]).unsqueeze(0).repeat(num_samples).to(self.device)
        )

        # Cast to inference dtype
        ca_tensor = ca_tensor.to(dtype=self.inference_dtype)
        garment_tensor = garment_tensor.to(dtype=self.inference_dtype)
        person_pose_tensor = person_pose_tensor.to(dtype=self.inference_dtype)
        garment_pose_tensor = garment_pose_tensor.to(dtype=self.inference_dtype)

        # Run sampling
        self.logger.info(f"Running decoupled neural try-on with {num_timesteps} timesteps...")
        images = self._sample(
            ca_images=ca_tensor,
            garment_images=garment_tensor,
            person_poses=person_pose_tensor,
            garment_poses=garment_pose_tensor,
            garment_categories=garment_categories,
            num_timesteps=num_timesteps,
            guidance_scale=guidance_scale,
            skip_cfg_last_n_steps=skip_cfg_last_n_steps,
        )

        # Unpad outputs
        images = [self.resize_pad_fn.unpad(img) for img in images]
        self.logger.info(f"Generated {len(images)} try-on images")

        return DecoupledPipelineOutput(images=images)
