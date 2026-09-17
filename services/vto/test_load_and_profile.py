"""
Controlled Profile & Single Inference Test Harness
==================================================

Tests loading the DecoupledTryOnPipeline with Apache-2.0 weights.
Measures:
- Static model load VRAM and RAM
- Peak VRAM during a single-step or forward check
- Catches OutOfMemoryError cleanly and records exact memory metrics
"""

import os
import sys
import time
import torch
from PIL import Image

sys.path.insert(0, '.')
from services.vto.fashn.decoupled_pipeline import DecoupledTryOnPipeline

def run_profile():
    print("=" * 60)
    print("AURA VTO — CONTROLLED PROFILING & INFERENCE HARNESS")
    print("=" * 60)

    weights_dir = os.path.abspath("services/vto/weights")
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    total_vram_gb = (torch.cuda.get_device_properties(0).total_memory / (1024**3)) if cuda_avail else 0.0

    print(f"CUDA Available: {cuda_avail}")
    print(f"Device Name: {device_name}")
    print(f"Total Physical VRAM: {total_vram_gb:.3f} GB")

    if cuda_avail:
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        allocated_start = torch.cuda.memory_allocated(0) / (1024**2)
        reserved_start = torch.cuda.memory_reserved(0) / (1024**2)
        print(f"Initial VRAM Allocated: {allocated_start:.2f} MB, Reserved: {reserved_start:.2f} MB")

    # Step 1: Initialize Pipeline
    t0 = time.time()
    try:
        pipeline = DecoupledTryOnPipeline(weights_dir=weights_dir)
        load_time = time.time() - t0
        print(f"Pipeline initialized successfully in {load_time:.2f}s!")

        if cuda_avail:
            allocated_loaded = torch.cuda.memory_allocated(0) / (1024**2)
            reserved_loaded = torch.cuda.memory_reserved(0) / (1024**2)
            print(f"Post-Load VRAM Allocated: {allocated_loaded:.2f} MB, Reserved: {reserved_loaded:.2f} MB")

    except Exception as e:
        print(f"FAILED TO LOAD PIPELINE: {type(e).__name__}: {e}")
        return False

    # Step 2: Test Inputs
    person_path = "assets/figma_curated/editorial/editorial_4.png"
    garment_path = "assets/garments/isolated/cashmere_sweater.png"

    if not os.path.exists(person_path) or not os.path.exists(garment_path):
        print(f"Error: Missing input files: {person_path} or {garment_path}")
        return False

    person_img = Image.open(person_path).convert("RGB")
    garment_img = Image.open(garment_path).convert("RGB")
    print(f"Person Image: {person_img.size} {person_img.mode}")
    print(f"Garment Image: {garment_img.size} {garment_img.mode}")

    # Step 3: Run Exactly ONE controlled inference (minimal steps to profile memory)
    print("\nAttempting 1 controlled neural try-on inference...")
    t1 = time.time()
    try:
        # Run with 15 timesteps to test memory feasibility
        output = pipeline(
            person_image=person_img,
            garment_image=garment_img,
            category="tops",
            garment_photo_type="flat-lay",
            num_samples=1,
            num_timesteps=15,
            guidance_scale=1.5,
        )
        inference_time = time.time() - t1
        print(f"INFERENCE SUCCESSFUL in {inference_time:.2f}s!")

        if cuda_avail:
            peak_vram = torch.cuda.max_memory_allocated(0) / (1024**2)
            print(f"Peak VRAM during inference: {peak_vram:.2f} MB ({peak_vram/1024:.2f} GB)")

        # Save result
        os.makedirs("services/vto/outputs", exist_ok=True)
        out_path = "services/vto/outputs/trial_result.png"
        output.images[0].save(out_path)
        print(f"Saved real try-on output to: {out_path}")
        return True

    except torch.cuda.OutOfMemoryError as oom:
        inference_time = time.time() - t1
        print(f"\nCUDA OUT OF MEMORY ERROR after {inference_time:.2f}s!")
        print(f"Detailed OOM: {oom}")
        if cuda_avail:
            peak_vram = torch.cuda.max_memory_allocated(0) / (1024**2)
            print(f"Peak VRAM before OOM: {peak_vram:.2f} MB ({peak_vram/1024:.2f} GB)")
        return "CUDA_OOM"

    except Exception as e:
        print(f"INFERENCE FAILED: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    res = run_profile()
    print("RESULT:", res)
