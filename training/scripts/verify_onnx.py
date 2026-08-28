#!/usr/bin/env python3
"""
AURA — ONNX Numerical Parity Verifier
Executes inference on identical input tensors across PyTorch and ONNX Runtime.
Calculates maximum absolute difference (L_inf) and confirms parity against threshold L_inf < 1e-4.
"""

import os
import sys
import json
import argparse
import numpy as np

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import torch
import onnxruntime as ort
from train_garment_classifier import AuraGarmentClassifier, load_json, compute_file_sha256


def verify_parity(checkpoint_path: str, onnx_path: str):
    print("============================================================")
    print("     AURA — ONNX Runtime Parity & Inference Verifier        ")
    print("============================================================")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"PyTorch checkpoint not found: {checkpoint_path}")
    if not os.path.exists(onnx_path):
        raise FileNotFoundError(f"ONNX model not found: {onnx_path}")

    print(f"[*] PyTorch Checkpoint: {checkpoint_path}")
    print(f"[*] ONNX Artifact: {onnx_path} ({os.path.getsize(onnx_path):,} bytes)")

    # 1. Initialize PyTorch Model
    taxonomy = load_json("data/garment/metadata/canonical_taxonomy.json")
    model = AuraGarmentClassifier(taxonomy).cpu()
    saved_state = torch.load(checkpoint_path, map_location="cpu")
    model.load_state_dict(saved_state["model_state_dict"])
    model.eval()

    # 2. Initialize ONNX Runtime Session
    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])

    # 3. Create deterministic dummy input
    np.random.seed(42)
    dummy_input_np = np.random.randn(1, 3, 384, 384).astype(np.float32)
    dummy_input_pt = torch.from_numpy(dummy_input_np)

    # 4. PyTorch Forward Pass
    with torch.no_grad():
        pt_outputs = model(dummy_input_pt)

    # 5. ONNX Runtime Forward Pass
    onnx_inputs = {"pixel_values": dummy_input_np}
    ort_outputs = session.run(None, onnx_inputs)

    # Output head names in order
    output_names = [
        "category_logits",
        "fit_logits",
        "silhouette_logits",
        "color_logits",
        "pattern_logits",
        "material_logits",
        "formality_score"
    ]

    print("\n[*] Measuring Numerical Differences per Output Head:")
    max_diff_overall = 0.0

    for i, name in enumerate(output_names):
        pt_tensor = pt_outputs[name].detach().cpu().numpy()
        ort_tensor = ort_outputs[i]
        diff = np.abs(pt_tensor - ort_tensor).max()
        max_diff_overall = max(max_diff_overall, float(diff))
        print(f"  - Head '{name}': Max Delta = {diff:.6e}")

    print(f"\n[+] Maximum L_inf Delta Across All Heads: {max_diff_overall:.6e}")
    parity_passed = max_diff_overall < 1e-4

    if parity_passed:
        print("[+] ONNX Parity Status: PASSED (L_inf < 1e-4 threshold satisfied)")
    else:
        print("[!] ONNX Parity Status: FAILED (Exceeds 1e-4 threshold)")

    return {
        "checkpoint_path": checkpoint_path,
        "onnx_path": onnx_path,
        "onnx_sha256": compute_file_sha256(onnx_path),
        "max_linf_delta": max_diff_overall,
        "parity_threshold": 1e-4,
        "parity_status": "PASSED" if parity_passed else "FAILED"
    }


def main():
    parser = argparse.ArgumentParser(description="Verify ONNX Runtime numerical parity")
    parser.add_argument("--checkpoint", type=str, default="training/runs/garment-exp-0006/checkpoint/best_model.pt", help="Path to checkpoint")
    parser.add_argument("--onnx-path", type=str, default="training/runs/garment-exp-0006/checkpoint/aura-garment-v1.onnx", help="Path to ONNX file")
    args = parser.parse_args()

    verify_parity(args.checkpoint, args.onnx_path)


if __name__ == "__main__":
    main()
