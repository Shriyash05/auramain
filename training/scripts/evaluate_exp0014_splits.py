"""
AURA Exp-0014 Multi-Split Empirical Evaluator (Phase 13A)
Evaluates the trained Exp-0014 Frozen SigLIP Control checkpoint across all 5 splits:
1. train (dataset-v0.5-500.json, N=459)
2. validation (dataset-v0.5-500.json, N=41)
3. blind_test (dataset-v0.3.json, N=20)
4. hard_test (dataset-v0.3.json, N=18)
5. real_world_test (dataset-v0.3.json, N=16)
Outputs detailed predictions and metrics to training/runs/garment-exp-0014/evaluations/
"""

import os
import sys
import json
import torch
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(__file__))
from evaluate_model import evaluate_split

def run_exp0014_all_evaluations():
    print("=" * 75)
    print("  AURA EXP-0014 MULTI-SPLIT EMPIRICAL EVALUATION (500 DATASET CONTROL)")
    print("=" * 75)

    ckpt_path = "training/runs/garment-exp-0014/checkpoint/best_model.pt"
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"Checkpoint not found at {ckpt_path}")

    taxonomy_path = "data/garment/metadata/canonical_taxonomy.json"
    manifest_500_path = "data/garment/metadata/dataset-v0.5-500.json"
    manifest_v03_path = "data/garment/metadata/dataset-v0.3.json"
    eval_out_dir = "training/runs/garment-exp-0014/evaluations"
    os.makedirs(eval_out_dir, exist_ok=True)

    splits_to_eval = [
        {"name": "train", "manifest": manifest_500_path},
        {"name": "validation", "manifest": manifest_500_path},
        {"name": "blind_test", "manifest": manifest_v03_path},
        {"name": "hard_test", "manifest": manifest_v03_path},
        {"name": "real_world_test", "manifest": manifest_v03_path}
    ]

    all_results = {}
    for s in splits_to_eval:
        s_name = s["name"]
        s_man = s["manifest"]
        print(f"\n[*] Evaluating Split: '{s_name}' from '{s_man}'...")
        res = evaluate_split(
            manifest_path=s_man,
            split_name=s_name,
            taxonomy_path=taxonomy_path,
            checkpoint_path=ckpt_path,
            output_dir=eval_out_dir
        )
        all_results[s_name] = res

    # Consolidated Multi-Split Evaluation Summary
    summary_path = os.path.join(eval_out_dir, "multi_split_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    print(f"\n[+] Multi-Split Evaluation Summary saved to: {summary_path}")
    print("\n" + "=" * 75)
    print("  EXP-0014 EVALUATION RESULTS SUMMARY")
    print("=" * 75)
    for s_name, r in all_results.items():
        accs = r.get("accuracies", {})
        macro = r.get("macro_f1", 0.0)
        n = r.get("sample_size", 0)
        print(f"Split: {s_name:<16s} (N={n:3d}) | Macro F1: {macro*100:5.2f}% | Cat: {accs.get('category', 0)*100:5.2f}% | Col: {accs.get('color_family', 0)*100:5.2f}% | Fit: {accs.get('fit', 0)*100:5.2f}% | Mat: {accs.get('material', 0)*100:5.2f}%")

    return all_results

if __name__ == "__main__":
    run_exp0014_all_evaluations()
