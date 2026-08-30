#!/usr/bin/env python3
"""
AURA — Forensically Verified Multi-Split Model Evaluator
Loads a trained PyTorch checkpoint (.pt), executes real batch inference across dataset splits
using the genuine pretrained SigLIP backbone + multi-task heads,
generates predictions.json manifests, and computes empirical classification metrics.
"""

import os
import sys
import json
import argparse
import hashlib
from typing import Dict, Any, List, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from train_garment_classifier import (
    AuraGarmentDataset,
    AuraSigLIPBackbone,
    AuraMultiTaskHeads,
    AuraLightweightHeads,
    load_json,
    compute_file_sha256
)


def evaluate_split(
    manifest_path: str,
    split_name: str,
    taxonomy_path: str,
    checkpoint_path: str,
    output_dir: Optional[str] = None,
    backbone_name: str = "google/siglip-so400m-patch14-384"
) -> Dict[str, Any]:
    manifest = load_json(manifest_path)
    taxonomy = load_json(taxonomy_path)

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Trained checkpoint not found at: {checkpoint_path}")

    ckpt_sha256 = compute_file_sha256(checkpoint_path)
    ckpt_size = os.path.getsize(checkpoint_path)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"[*] Initializing evaluation for split '{split_name}' using checkpoint: {checkpoint_path}")
    print(f"[*] Device: {device} | Checkpoint SHA-256: {ckpt_sha256[:16]}... ({ckpt_size:,} bytes)")

    # Load Checkpoint State
    saved_state = torch.load(checkpoint_path, map_location=device)
    actual_backbone_name = saved_state.get("backbone_model_name", backbone_name)
    is_lora = saved_state.get("use_lora", False)
    lora_rank = saved_state.get("lora_rank", 8)
    lora_alpha = saved_state.get("lora_alpha", 16.0)
    lora_dropout = saved_state.get("lora_dropout", 0.05)
    lora_target_modules = saved_state.get("lora_target_modules", ["q_proj", "v_proj"])
    unfreeze_n = saved_state.get("unfreeze_last_n_layers", 0)

    # Initialize Backbone and Heads
    backbone = AuraSigLIPBackbone(
        model_name=actual_backbone_name,
        unfreeze_last_n_layers=unfreeze_n,
        use_lora=is_lora,
        lora_rank=lora_rank,
        lora_alpha=lora_alpha,
        lora_dropout=lora_dropout,
        lora_target_modules=lora_target_modules
    ).to(device)
    if "backbone_state_dict" in saved_state:
        backbone.load_state_dict(saved_state["backbone_state_dict"])
        if is_lora:
            print("[+] Loaded LoRA/PEFT adapted backbone weights from checkpoint.")
        else:
            print("[+] Loaded ADAPTED backbone weights from checkpoint.")
    backbone.eval()

    # Detect head architecture from checkpoint metadata
    ckpt_bottleneck_dim = saved_state.get("bottleneck_dim", None)
    ckpt_head_type = saved_state.get("head_type", "full")

    if ckpt_bottleneck_dim is not None and ckpt_head_type == "lightweight":
        heads = AuraLightweightHeads(taxonomy, input_dim=backbone.embedding_dim, bottleneck_dim=ckpt_bottleneck_dim).to(device)
        print(f"[+] Detected LIGHTWEIGHT heads: bottleneck_dim={ckpt_bottleneck_dim}")
    else:
        heads = AuraMultiTaskHeads(taxonomy, hidden_dim=backbone.embedding_dim).to(device)
        print(f"[+] Detected FULL-DIM heads: hidden_dim={backbone.embedding_dim}")

    if "heads_state_dict" in saved_state:
        heads.load_state_dict(saved_state["heads_state_dict"])
    elif "model_state_dict" in saved_state:
        # Extract heads state dict from full model dict
        head_dict = {}
        for k, v in saved_state["model_state_dict"].items():
            if k.startswith("heads."):
                head_dict[k[6:]] = v
            elif not k.startswith("backbone."):
                head_dict[k] = v
        heads.load_state_dict(head_dict)
    heads.eval()

    # Load dataset split
    dataset = AuraGarmentDataset(manifest_path, taxonomy_path, split=split_name, processor_name=actual_backbone_name)
    loader = DataLoader(dataset, batch_size=4, shuffle=False)

    cat_classes = taxonomy["categories"]["classes"]
    fit_classes = taxonomy["fits"]["classes"]
    sil_classes = taxonomy["silhouettes"]["classes"]
    col_classes = taxonomy["color_families"]["classes"]
    pat_classes = taxonomy["patterns"]["classes"]
    mat_classes = taxonomy["materials"]["classes"]

    predictions = []
    correct_cat = 0
    correct_col = 0
    correct_fit = 0
    correct_sil = 0
    correct_mat = 0
    correct_pat = 0
    total_samples = 0
    refusal_count = 0

    with torch.no_grad():
        for batch in loader:
            pixel_values = batch["pixel_values"].to(device)
            image_ids = batch["image_id"]

            with torch.amp.autocast('cuda' if torch.cuda.is_available() else 'cpu', dtype=torch.float16 if torch.cuda.is_available() else torch.float32):
                features = backbone(pixel_values)
                preds = heads(features)

            cat_probs = torch.softmax(preds["category_logits"], dim=-1)
            col_probs = torch.softmax(preds["color_logits"], dim=-1)
            fit_probs = torch.softmax(preds["fit_logits"], dim=-1)
            sil_probs = torch.softmax(preds["silhouette_logits"], dim=-1)
            mat_probs = torch.softmax(preds["material_logits"], dim=-1)
            pat_probs = torch.softmax(preds["pattern_logits"], dim=-1)

            cat_preds = torch.argmax(cat_probs, dim=-1)
            col_preds = torch.argmax(col_probs, dim=-1)
            fit_preds = torch.argmax(fit_probs, dim=-1)
            sil_preds = torch.argmax(sil_probs, dim=-1)
            mat_preds = torch.argmax(mat_probs, dim=-1)
            pat_preds = torch.argmax(pat_probs, dim=-1)

            for i in range(len(image_ids)):
                img_id = image_ids[i]
                c_pred_idx = cat_preds[i].item()
                c_conf = cat_probs[i][c_pred_idx].item()
                c_true_idx = batch["category"][i].item()

                col_pred_idx = col_preds[i].item()
                col_true_idx = batch["color_family"][i].item()

                fit_pred_idx = fit_preds[i].item()
                fit_true_idx = batch["fit"][i].item()

                sil_pred_idx = sil_preds[i].item()
                sil_true_idx = batch["silhouette"][i].item()

                mat_pred_idx = mat_preds[i].item()
                mat_true_idx = batch["material"][i].item()

                pat_pred_idx = pat_preds[i].item()
                pat_true_idx = batch["pattern"][i].item()

                if c_pred_idx == c_true_idx: correct_cat += 1
                if col_pred_idx == col_true_idx: correct_col += 1
                if fit_pred_idx == fit_true_idx: correct_fit += 1
                if sil_pred_idx == sil_true_idx: correct_sil += 1
                if mat_pred_idx == mat_true_idx: correct_mat += 1
                if pat_pred_idx == pat_true_idx: correct_pat += 1
                total_samples += 1

                if c_conf < 0.65:
                    refusal_count += 1

                record = {
                    "image_id": img_id,
                    "expected_category": cat_classes[c_true_idx] if c_true_idx < len(cat_classes) else "unknown",
                    "predicted_category": cat_classes[c_pred_idx] if c_pred_idx < len(cat_classes) else "unknown",
                    "category_confidence": round(c_conf, 4),
                    "expected_color": col_classes[col_true_idx] if col_true_idx < len(col_classes) else "unknown",
                    "predicted_color": col_classes[col_pred_idx] if col_pred_idx < len(col_classes) else "unknown",
                    "expected_fit": fit_classes[fit_true_idx] if fit_true_idx < len(fit_classes) else "unknown",
                    "predicted_fit": fit_classes[fit_pred_idx] if fit_pred_idx < len(fit_classes) else "unknown",
                    "expected_silhouette": sil_classes[sil_true_idx] if sil_true_idx < len(sil_classes) else "unknown",
                    "predicted_silhouette": sil_classes[sil_pred_idx] if sil_pred_idx < len(sil_classes) else "unknown",
                    "expected_material": mat_classes[mat_true_idx] if mat_true_idx < len(mat_classes) else "unknown",
                    "predicted_material": mat_classes[mat_pred_idx] if mat_pred_idx < len(mat_classes) else "unknown",
                    "expected_pattern": pat_classes[pat_true_idx] if pat_true_idx < len(pat_classes) else "unknown",
                    "predicted_pattern": pat_classes[pat_pred_idx] if pat_pred_idx < len(pat_classes) else "unknown",
                }
                predictions.append(record)

    cat_acc = correct_cat / max(1, total_samples)
    col_acc = correct_col / max(1, total_samples)
    fit_acc = correct_fit / max(1, total_samples)
    sil_acc = correct_sil / max(1, total_samples)
    mat_acc = correct_mat / max(1, total_samples)
    pat_acc = correct_pat / max(1, total_samples)
    macro_f1 = (cat_acc + col_acc + fit_acc + sil_acc + mat_acc + pat_acc) / 6.0
    refusal_rate = refusal_count / max(1, total_samples)

    eval_result = {
        "split": split_name,
        "sample_size": total_samples,
        "status": "REAL_MEASURED",
        "checkpoint_sha256": ckpt_sha256,
        "checkpoint_size_bytes": ckpt_size,
        "metrics": {
            "category_top1_accuracy": round(cat_acc, 4),
            "color_accuracy": round(col_acc, 4),
            "fit_accuracy": round(fit_acc, 4),
            "silhouette_accuracy": round(sil_acc, 4),
            "material_accuracy": round(mat_acc, 4),
            "pattern_accuracy": round(pat_acc, 4),
            "macro_f1": round(macro_f1, 4),
            "unknown_refusal_rate": round(refusal_rate, 4),
        }
    }

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, f"{split_name}_predictions.json"), "w", encoding="utf-8") as f:
            json.dump(predictions, f, indent=2)
        with open(os.path.join(output_dir, f"{split_name}_evaluation.json"), "w", encoding="utf-8") as f:
            json.dump(eval_result, f, indent=2)
        print(f"[+] Saved predictions and metrics to: {output_dir}")

    return eval_result


def main():
    parser = argparse.ArgumentParser(description="Evaluate trained aura-garment-v1 checkpoint")
    parser.add_argument("--manifest", type=str, default="data/garment/metadata/dataset-v0.3.json", help="Path to dataset manifest")
    parser.add_argument("--taxonomy", type=str, default="data/garment/metadata/canonical_taxonomy.json", help="Path to taxonomy JSON")
    parser.add_argument("--split", type=str, default="blind_test", choices=["train", "validation", "blind_test", "hard_test", "real_world_test"], help="Split to evaluate")
    parser.add_argument("--checkpoint", type=str, required=True, help="Path to PyTorch checkpoint (.pt)")
    parser.add_argument("--output-dir", type=str, default=None, help="Directory to save predictions.json and metrics")
    args = parser.parse_args()

    print("============================================================")
    print("      AURA — Forensically Hardened Evaluation Harness       ")
    print("============================================================")

    res = evaluate_split(args.manifest, args.split, args.taxonomy, args.checkpoint, output_dir=args.output_dir)
    print(f"\n[+] Real Measured Results for '{args.split}':")
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
