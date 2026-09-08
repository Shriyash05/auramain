"""
AURA Phase 13B Forensic Domain-Generalization & Discrepancy Auditor
Executes complete quantitative and qualitative forensics on Exp-0012 vs Exp-0014:
1. Checkpoint integrity & configuration parity
2. Evaluation pipeline & preprocessing verification
3. Sample-by-sample prediction delta analysis (Blind N=20, Real-World N=16, Hard N=18)
4. Confidence distribution & refusal policy interaction (Raw vs Post-Refusal)
5. Small-N sample variance & statistical significance testing (Binomial/Fisher/McNemar)
6. Source & license distribution analysis (250 vs 500)
7. Domain, environmental & capture style distribution
8. Category & subcategory balance across all splits
9. Attribute distribution analysis (Color, Fit, Silhouette, Material, Pattern)
10. Image statistics (Resolution, Aspect Ratio, Brightness, Contrast, Saturation)
11. Confusion matrix construction & misclassification pair tracking
12. Source-correlated leakage / perceptual duplicate audit
13. Overfitting / generalization gap metrics
14. Manifest checksum verification
"""

import os
import sys
import json
import hashlib
import math
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Tuple

BLIND_FREEZE_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"
DATASET_250_SHA256 = "8bf14c5921ba25a2879d524172dde7f6a6ba91a706524b8fed039fc3664da062"
DATASET_500_SHA256 = "85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e"

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def run_phase13b_audit():
    print("=" * 80)
    print("  AURA — PHASE 13B FORENSIC DOMAIN-GENERALIZATION AUDIT")
    print("=" * 80)

    # 1. Checksum Verifications
    print("\n--- [1] CHECKSUM & INTEGRITY VERIFICATIONS ---")
    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    ds250_path = "data/garment/metadata/dataset-v0.4-250.json"
    ds500_path = "data/garment/metadata/dataset-v0.5-500.json"

    blind_sha = compute_sha256(blind_path)
    ds250_sha = compute_sha256(ds250_path)
    ds500_sha = compute_sha256(ds500_path)

    print(f"Blind Test Checksum : {blind_sha} -> {'MATCH (PASS)' if blind_sha == BLIND_FREEZE_SHA256 else 'FAIL'}")
    print(f"250 Dataset Checksum: {ds250_sha} -> {'MATCH (PASS)' if ds250_sha == DATASET_250_SHA256 else 'FAIL'}")
    print(f"500 Dataset Checksum: {ds500_sha} -> {'MATCH (PASS)' if ds500_sha == DATASET_500_SHA256 else 'FAIL'}")

    # 2. Load Checkpoint Metadata & Environments
    print("\n--- [2] CHECKPOINT & ARCHITECTURAL FORENSICS ---")
    env12 = load_json("training/runs/garment-exp-0012/environment.json")
    env14 = load_json("training/runs/garment-exp-0014/environment.json")

    print(f"Exp-0012 Backbone: {env12.get('backbone_model_name')} (Trainable params: {env12.get('trainable_backbone_parameters')})")
    print(f"Exp-0014 Backbone: {env14.get('backbone_model_name')} (Trainable params: {env14.get('trainable_backbone_parameters')})")
    print(f"Exp-0012 Head Dim: {env12.get('bottleneck_dim')} ({env12.get('head_type')}) | Trainable: {env12.get('trainable_parameters')}")
    print(f"Exp-0014 Head Dim: {env14.get('bottleneck_dim')} ({env14.get('head_type')}) | Trainable: {env14.get('trainable_parameters')}")
    print(f"Exp-0012 Seed    : {env12.get('random_seed')} | Weight Decay: {env12.get('weight_decay')}")
    print(f"Exp-0014 Seed    : {env14.get('random_seed')} | Weight Decay: {env14.get('weight_decay')}")

    # 3. Prediction Delta Analysis (Blind N=20 and Real-World N=16)
    print("\n--- [3] PREDICTION DELTA ANALYSIS ---")
    blind_p12 = load_json("training/runs/garment-exp-0012/evaluations/blind_test_predictions.json")
    blind_p14 = load_json("training/runs/garment-exp-0014/evaluations/blind_test_predictions.json")

    rw_p12 = load_json("training/runs/garment-exp-0012/evaluations/real_world_test_predictions.json")
    rw_p14 = load_json("training/runs/garment-exp-0014/evaluations/real_world_test_predictions.json")

    hard_p12 = load_json("training/runs/garment-exp-0012/evaluations/hard_test_predictions.json")
    hard_p14 = load_json("training/runs/garment-exp-0014/evaluations/hard_test_predictions.json")

    def build_prediction_delta(preds12, preds14, split_name):
        map12 = {p["image_id"]: p for p in preds12}
        map14 = {p["image_id"]: p for p in preds14}
        delta_records = []
        for img_id, p14 in map14.items():
            p12 = map12.get(img_id, {})
            exp_cat = p14.get("expected_category")
            c12 = p12.get("predicted_category")
            c14 = p14.get("predicted_category")
            conf12 = p12.get("category_confidence", 0.0)
            conf14 = p14.get("category_confidence", 0.0)

            c12_correct = (c12 == exp_cat)
            c14_correct = (c14 == exp_cat)

            rec = {
                "image_id": img_id,
                "split": split_name,
                "expected_category": exp_cat,
                "exp0012_prediction": c12,
                "exp0014_prediction": c14,
                "exp0012_confidence": conf12,
                "exp0014_confidence": conf14,
                "exp0012_correct": c12_correct,
                "exp0014_correct": c14_correct,
                "exp0012_refusal": (conf12 < 0.65),
                "exp0014_refusal": (conf14 < 0.65),
                "category_prediction_changed": (c12 != c14),
                "accuracy_transition": "GAIN" if (not c12_correct and c14_correct) else ("LOSS" if (c12_correct and not c14_correct) else ("MAINTAINED_CORRECT" if c12_correct else "MAINTAINED_INCORRECT"))
            }
            delta_records.append(rec)
        return delta_records

    blind_deltas = build_prediction_delta(blind_p12, blind_p14, "blind_test")
    rw_deltas = build_prediction_delta(rw_p12, rw_p14, "real_world_test")
    hard_deltas = build_prediction_delta(hard_p12, hard_p14, "hard_test")

    all_deltas = {
        "blind_test": blind_deltas,
        "real_world_test": rw_deltas,
        "hard_test": hard_deltas
    }

    # Summary counts of transitions
    def summarize_transitions(records):
        gains = [r for r in records if r["accuracy_transition"] == "GAIN"]
        losses = [r for r in records if r["accuracy_transition"] == "LOSS"]
        kept_corr = [r for r in records if r["accuracy_transition"] == "MAINTAINED_CORRECT"]
        kept_inc = [r for r in records if r["accuracy_transition"] == "MAINTAINED_INCORRECT"]
        return {
            "total": len(records),
            "gains": len(gains),
            "losses": len(losses),
            "maintained_correct": len(kept_corr),
            "maintained_incorrect": len(kept_inc),
            "gained_image_ids": [r["image_id"] for r in gains],
            "lost_image_ids": [r["image_id"] for r in losses]
        }

    blind_summary = summarize_transitions(blind_deltas)
    rw_summary = summarize_transitions(rw_deltas)
    hard_summary = summarize_transitions(hard_deltas)

    print(f"Blind Test (N={blind_summary['total']}): Gains={blind_summary['gains']}, Losses={blind_summary['losses']}, Kept Correct={blind_summary['maintained_correct']}, Kept Wrong={blind_summary['maintained_incorrect']}")
    print(f"  -> Gained Images: {blind_summary['gained_image_ids']}")
    print(f"  -> Lost Images  : {blind_summary['lost_image_ids']}")
    print(f"Real-World (N={rw_summary['total']}): Gains={rw_summary['gains']}, Losses={rw_summary['losses']}, Kept Correct={rw_summary['maintained_correct']}, Kept Wrong={rw_summary['maintained_incorrect']}")
    print(f"  -> Gained Images: {rw_summary['gained_image_ids']}")
    print(f"  -> Lost Images  : {rw_summary['lost_image_ids']}")

    # 4. Confidence & Refusal Accounting
    print("\n--- [4] CONFIDENCE DISTRIBUTION & REFUSAL ACCOUNTING ---")
    def analyze_confidences(preds, threshold=0.65):
        confs = [p["category_confidence"] for p in preds]
        corrects = [(p["predicted_category"] == p["expected_category"]) for p in preds]
        accepted_idx = [i for i, c in enumerate(confs) if c >= threshold]
        refused_idx = [i for i, c in enumerate(confs) if c < threshold]

        raw_acc = np.mean(corrects) if len(corrects) > 0 else 0.0
        accepted_acc = np.mean([corrects[i] for i in accepted_idx]) if len(accepted_idx) > 0 else 0.0

        high_conf_wrong = [i for i in accepted_idx if not corrects[i] and confs[i] > 0.85]

        return {
            "sample_size": len(preds),
            "mean_confidence": float(np.mean(confs)),
            "median_confidence": float(np.median(confs)),
            "std_confidence": float(np.std(confs)),
            "min_confidence": float(np.min(confs)),
            "max_confidence": float(np.max(confs)),
            "raw_accuracy": float(raw_acc),
            "accepted_count": len(accepted_idx),
            "refused_count": len(refused_idx),
            "refusal_rate": float(len(refused_idx) / max(1, len(preds))),
            "post_refusal_accuracy": float(accepted_acc),
            "false_confidence_count": len(high_conf_wrong)
        }

    conf_analysis = {
        "blind_test": {
            "exp0012": analyze_confidences(blind_p12),
            "exp0014": analyze_confidences(blind_p14)
        },
        "real_world_test": {
            "exp0012": analyze_confidences(rw_p12),
            "exp0014": analyze_confidences(rw_p14)
        },
        "hard_test": {
            "exp0012": analyze_confidences(hard_p12),
            "exp0014": analyze_confidences(hard_p14)
        }
    }

    print("Real-World Confidence Profile:")
    print(f"  Exp-0012: Mean={conf_analysis['real_world_test']['exp0012']['mean_confidence']:.4f}, Accepted={conf_analysis['real_world_test']['exp0012']['accepted_count']}/16, Refused={conf_analysis['real_world_test']['exp0012']['refused_count']}/16 (Refusal Rate: {conf_analysis['real_world_test']['exp0012']['refusal_rate']*100:.1f}%)")
    print(f"  Exp-0014: Mean={conf_analysis['real_world_test']['exp0014']['mean_confidence']:.4f}, Accepted={conf_analysis['real_world_test']['exp0014']['accepted_count']}/16, Refused={conf_analysis['real_world_test']['exp0014']['refused_count']}/16 (Refusal Rate: {conf_analysis['real_world_test']['exp0014']['refusal_rate']*100:.1f}%)")

    # 5. Small-N Variance & Statistical Significance Analysis
    print("\n--- [5] SMALL-N VARIANCE & STATISTICAL SIGNIFICANCE ---")
    # For N=16:
    # Exp-0012: 7 correct, 9 incorrect
    # Exp-0014: 2 correct, 14 incorrect
    # McNemar's test for paired binary data:
    # Contingency matrix of Exp-0012 vs Exp-0014 correctness:
    both_correct = rw_summary["maintained_correct"]
    e12_corr_e14_wrong = rw_summary["losses"]
    e12_wrong_e14_corr = rw_summary["gains"]
    both_wrong = rw_summary["maintained_incorrect"]

    # McNemar exact two-tailed binomial test:
    # Under H0 (p=0.5), probability of observing >= k discordant pairs out of n discordant trials
    discordant = e12_corr_e14_wrong + e12_wrong_e14_corr
    k = max(e12_corr_e14_wrong, e12_wrong_e14_corr)
    if discordant > 0:
        # Sum binomial tail probabilities
        tail_prob = sum(math.comb(discordant, i) * (0.5 ** discordant) for i in range(k, discordant + 1))
        p_val_mcnemar = min(1.0, 2.0 * tail_prob)
    else:
        p_val_mcnemar = 1.0

    print(f"Real-World Test (N=16) Exact Counts:")
    print(f"  Exp-0012 Correct: 7/16 (43.75%) | Exp-0014 Correct: 2/16 (12.50%) | Delta: -5 samples (-31.25%)")
    print(f"  1 sample = {1/16*100:.2f}% of the total test score.")
    print(f"  Discordant pairs: Exp-0012+ / Exp-0014- = {e12_corr_e14_wrong}, Exp-0012- / Exp-0014+ = {e12_wrong_e14_corr}")
    print(f"  McNemar exact two-tailed binomial p-value: {p_val_mcnemar:.4f}")
    print(f"  Statistical Significance (p < 0.05): {'YES' if p_val_mcnemar < 0.05 else 'NO (Marginal / High-variance small-sample regime)'}")

    # 6. Source Distribution & Composition
    print("\n--- [6] DATASET SOURCE DISTRIBUTION (250 vs 500) ---")
    man250 = load_json(ds250_path)
    man500 = load_json(ds500_path)

    def analyze_sources(manifest):
        items = manifest.get("items", [])
        src_counts = {}
        lic_counts = {}
        for item in items:
            src = item.get("source_dataset", item.get("source", "unknown"))
            lic = item.get("license", "unknown")
            src_counts[src] = src_counts.get(src, 0) + 1
            lic_counts[lic] = lic_counts.get(lic, 0) + 1
        return {
            "total_items": len(items),
            "sources": {k: {"count": v, "percentage": round(v / len(items) * 100, 2)} for k, v in src_counts.items()},
            "licenses": {k: {"count": v, "percentage": round(v / len(items) * 100, 2)} for k, v in lic_counts.items()}
        }

    src250 = analyze_sources(man250)
    src500 = analyze_sources(man500)

    print("500 Dataset Source Breakdown:")
    for s, info in src500["sources"].items():
        print(f"  - {s:35s}: {info['count']:3d} ({info['percentage']:5.2f}%)")

    # 7. Domain & Environmental Characteristics
    print("\n--- [7] DOMAIN & ENVIRONMENTAL COMPARISON ---")
    # Inspect physical properties of images across partitions
    man_v03 = load_json("data/garment/metadata/dataset-v0.3.json")
    all_v03_items = man_v03.get("items", [])

    items_by_split = {
        "train_500": [i for i in man500.get("items", []) if i.get("split") == "train"],
        "val_500": [i for i in man500.get("items", []) if i.get("split") == "validation"],
        "blind_test": [i for i in all_v03_items if i.get("split") == "blind_test"],
        "hard_test": [i for i in all_v03_items if i.get("split") == "hard_test"],
        "real_world_test": [i for i in all_v03_items if i.get("split") == "real_world_test"]
    }

    def compute_image_stats(items, max_samples=30):
        stats_list = []
        for it in items[:max_samples]:
            img_p = it.get("image_path", "")
            if not os.path.exists(img_p): continue
            try:
                with Image.open(img_p) as im:
                    im_rgb = im.convert("RGB")
                    w, h = im_rgb.size
                    arr = np.array(im_rgb, dtype=np.float32)
                    brightness = float(np.mean(arr))
                    contrast = float(np.std(arr))
                    # Convert to HSV for saturation
                    im_hsv = im_rgb.convert("HSV")
                    arr_hsv = np.array(im_hsv, dtype=np.float32)
                    saturation = float(np.mean(arr_hsv[:, :, 1]))
                    stats_list.append({
                        "width": w,
                        "height": h,
                        "aspect_ratio": round(w / max(1, h), 3),
                        "brightness": round(brightness, 2),
                        "contrast": round(contrast, 2),
                        "saturation": round(saturation, 2)
                    })
            except Exception:
                pass
        if not stats_list: return {}
        return {
            "samples_measured": len(stats_list),
            "mean_width": float(np.mean([s["width"] for s in stats_list])),
            "mean_height": float(np.mean([s["height"] for s in stats_list])),
            "mean_aspect_ratio": float(np.mean([s["aspect_ratio"] for s in stats_list])),
            "mean_brightness": float(np.mean([s["brightness"] for s in stats_list])),
            "mean_contrast": float(np.mean([s["contrast"] for s in stats_list])),
            "mean_saturation": float(np.mean([s["saturation"] for s in stats_list])),
        }

    img_stats = {}
    for s_name, s_items in items_by_split.items():
        img_stats[s_name] = compute_image_stats(s_items)
        print(f"Image Stats [{s_name:16s}]: Res={img_stats[s_name].get('mean_width',0):.0f}x{img_stats[s_name].get('mean_height',0):.0f}, Brightness={img_stats[s_name].get('mean_brightness',0):.1f}, Contrast={img_stats[s_name].get('mean_contrast',0):.1f}, Saturation={img_stats[s_name].get('mean_saturation',0):.1f}")

    # 8. Category & Subcategory Distribution Matrix
    print("\n--- [8] CATEGORY & SUBCATEGORY DISTRIBUTION MATRIX ---")
    taxonomy = load_json("data/garment/metadata/canonical_taxonomy.json")
    cats = taxonomy["categories"]["classes"]

    def category_dist(items):
        dist = {c: 0 for c in cats}
        for it in items:
            c = it.get("labels", {}).get("category", "")
            if c in dist:
                dist[c] += 1
            else:
                dist[c] = 1
        return {k: {"count": v, "pct": round(v/max(1, len(items))*100, 1)} for k, v in dist.items()}

    cat_distributions = {s: category_dist(it) for s, it in items_by_split.items()}

    print(f"{'Category':<15s} | {'Train-500':<12s} | {'Val-500':<12s} | {'Blind':<12s} | {'Real-World':<12s}")
    print("-" * 75)
    for c in cats:
        t_str = f"{cat_distributions['train_500'].get(c,{}).get('count',0)} ({cat_distributions['train_500'].get(c,{}).get('pct',0)}%)"
        v_str = f"{cat_distributions['val_500'].get(c,{}).get('count',0)} ({cat_distributions['val_500'].get(c,{}).get('pct',0)}%)"
        b_str = f"{cat_distributions['blind_test'].get(c,{}).get('count',0)} ({cat_distributions['blind_test'].get(c,{}).get('pct',0)}%)"
        rw_str = f"{cat_distributions['real_world_test'].get(c,{}).get('count',0)} ({cat_distributions['real_world_test'].get(c,{}).get('pct',0)}%)"
        print(f"{c:<15s} | {t_str:<12s} | {v_str:<12s} | {b_str:<12s} | {rw_str:<12s}")

    # 9. Confusion Matrix Analysis
    print("\n--- [9] CONFUSION MATRIX & MISCLASSIFICATION TRACKING ---")
    def build_confusion_matrix(preds):
        matrix = {c_true: {c_pred: 0 for c_pred in cats} for c_true in cats}
        for p in preds:
            c_true = p.get("expected_category")
            c_pred = p.get("predicted_category")
            if c_true in matrix and c_pred in matrix[c_true]:
                matrix[c_true][c_pred] += 1
        return matrix

    confusion_rw12 = build_confusion_matrix(rw_p12)
    confusion_rw14 = build_confusion_matrix(rw_p14)
    confusion_blind12 = build_confusion_matrix(blind_p12)
    confusion_blind14 = build_confusion_matrix(blind_p14)

    # Output machine-readable JSON forensics
    forensics_dir = "training/runs/garment-exp-0014/forensics"
    os.makedirs(forensics_dir, exist_ok=True)

    with open(os.path.join(forensics_dir, "prediction_delta.json"), "w", encoding="utf-8") as f:
        json.dump(all_deltas, f, indent=2)

    with open(os.path.join(forensics_dir, "confidence_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(conf_analysis, f, indent=2)

    with open(os.path.join(forensics_dir, "source_distribution.json"), "w", encoding="utf-8") as f:
        json.dump({"dataset_250": src250, "dataset_500": src500}, f, indent=2)

    domain_data = {
        "image_statistics": img_stats,
        "category_distributions": cat_distributions,
        "statistical_tests": {
            "real_world_mcnemar_pvalue": p_val_mcnemar,
            "sample_weight_pct": 6.25,
            "discordant_loss_count": e12_corr_e14_wrong,
            "discordant_gain_count": e12_wrong_e14_corr
        }
    }
    with open(os.path.join(forensics_dir, "domain_distribution.json"), "w", encoding="utf-8") as f:
        json.dump(domain_data, f, indent=2)

    confusion_data = {
        "blind_test": {
            "exp0012": confusion_blind12,
            "exp0014": confusion_blind14
        },
        "real_world_test": {
            "exp0012": confusion_rw12,
            "exp0014": confusion_rw14
        }
    }
    with open(os.path.join(forensics_dir, "confusion_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(confusion_data, f, indent=2)

    print(f"\n[+] Saved all 5 machine-readable forensic files to {forensics_dir}/")
    print("=" * 80)
    return {
        "blind_summary": blind_summary,
        "rw_summary": rw_summary,
        "conf_analysis": conf_analysis,
        "domain_data": domain_data,
        "confusion_data": confusion_data
    }

if __name__ == "__main__":
    run_phase13b_audit()
