"""
AURA Exp-0013 Multi-Split Empirical Evaluator (Phase 12C)
Evaluates the trained Exp-0013 LoRA checkpoint across all 5 evaluation splits:
1. train (dataset-v0.4-250.json)
2. validation (dataset-v0.4-250.json)
3. blind_test (dataset-v0.3.json)
4. hard_test (dataset-v0.3.json)
5. real_world_test (dataset-v0.3.json)
Outputs detailed predictions and metrics to training/runs/garment-exp-0013/evaluations/
"""

import os
import sys
import json
import torch
from typing import Dict, Any, List
from evaluate_model import evaluate_split

def run_exp0013_all_evaluations():
    print("=" * 75)
    print("  AURA EXP-0013 MULTI-SPLIT EMPIRICAL EVALUATION (LoRA)")
    print("=" * 75)

    ckpt_path = "training/runs/garment-exp-0013/checkpoint/best_model.pt"
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"Checkpoint not found at {ckpt_path}")

    taxonomy_path = "data/garment/metadata/canonical_taxonomy.json"
    manifest_250_path = "data/garment/metadata/dataset-v0.4-250.json"
    manifest_v03_path = "data/garment/metadata/dataset-v0.3.json"
    eval_out_dir = "training/runs/garment-exp-0013/evaluations"
    os.makedirs(eval_out_dir, exist_ok=True)

    splits_to_eval = [
        {"name": "train", "manifest": manifest_250_path},
        {"name": "validation", "manifest": manifest_250_path},
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

    print("\n" + "=" * 75)
    print("  EXP-0013 MULTI-SPLIT EVALUATION SUMMARY")
    print("=" * 75)
    for s_name, res in all_results.items():
        m = res.get("metrics", {})
        print(f"[{s_name.upper()}] (N={res.get('sample_size')}): Top-1 Category={m.get('category_top1_accuracy')*100:.1f}%, Color={m.get('color_accuracy')*100:.1f}%, Fit={m.get('fit_accuracy')*100:.1f}%, Silhouette={m.get('silhouette_accuracy')*100:.1f}%, Material={m.get('material_accuracy')*100:.1f}%, Pattern={m.get('pattern_accuracy')*100:.1f}% | Macro F1={m.get('macro_f1')*100:.1f}% | Refusal={m.get('unknown_refusal_rate')*100:.1f}%")

    return all_results

if __name__ == "__main__":
    run_exp0013_all_evaluations()
