#!/usr/bin/env python3
"""
AURA — aura-garment-v1 ONNX Model Exporter
Converts PyTorch Multi-Task Fashion Taxonomy model checkpoint to optimized ONNX graph.
"""

import os
import sys
import json
import argparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import torch
from train_garment_classifier import AuraGarmentClassifier, load_json, compute_file_sha256


def export_to_onnx(config_path: str, checkpoint_path: str, output_path: str):
    print("============================================================")
    print("       AURA — aura-garment-v1 ONNX Model Exporter           ")
    print("============================================================")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"PyTorch checkpoint not found: {checkpoint_path}")

    taxonomy = load_json("data/garment/metadata/canonical_taxonomy.json")
    model = AuraGarmentClassifier(taxonomy)

    device = torch.device("cpu") # Export on CPU for generic runtime compatibility
    saved_state = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(saved_state["model_state_dict"])
    model.eval()

    dummy_input = torch.zeros((1, 3, 384, 384), dtype=torch.float32)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"[*] Checkpoint: {checkpoint_path}")
    print(f"[*] Exporting to ONNX: {output_path}...")

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["pixel_values"],
        output_names=[
            "category_logits",
            "fit_logits",
            "silhouette_logits",
            "color_logits",
            "pattern_logits",
            "material_logits",
            "formality_score"
        ],
        dynamic_axes={
            "pixel_values": {0: "batch_size"},
            "category_logits": {0: "batch_size"},
            "fit_logits": {0: "batch_size"},
            "silhouette_logits": {0: "batch_size"},
            "color_logits": {0: "batch_size"},
            "pattern_logits": {0: "batch_size"},
            "material_logits": {0: "batch_size"},
            "formality_score": {0: "batch_size"},
        }
    )

    onnx_size = os.path.getsize(output_path)
    onnx_sha = compute_file_sha256(output_path)
    print(f"[+] Successfully exported ONNX model to: {output_path} ({onnx_size:,} bytes, SHA-256: {onnx_sha[:16]}...)")


def main():
    parser = argparse.ArgumentParser(description="Export PyTorch model to ONNX")
    parser.add_argument("--config", type=str, default="training/configs/siglip_so400m_garment_v1.yaml", help="Path to config")
    parser.add_argument("--checkpoint", type=str, default="training/runs/garment-exp-0006/checkpoint/best_model.pt", help="Path to checkpoint")
    parser.add_argument("--output", type=str, default="training/runs/garment-exp-0006/checkpoint/aura-garment-v1.onnx", help="Output ONNX path")
    args = parser.parse_args()

    export_to_onnx(args.config, args.checkpoint, args.output)


if __name__ == "__main__":
    main()
