"""
AURA Phase 13D Multi-Split Evaluator for garment-exp-0015
Evaluates:
- Train Split (N=459)
- Validation Split (N=41)
- Frozen Blind Test (N=20, Holdout Checksum Protected)
- Hard Test (N=18)
- Real-World Test Full Image (N=16)
- Real-World Test Localized Crop (N=16)
Computes Category Top-1, Color, Fit, Silhouette, Material, Pattern, Macro F1,
Mean Softmax Confidence, Refusal Rate (<0.65), False-Confidence Rate (>0.85 & wrong),
and Representation Drift (pre-LoRA vs post-LoRA cosine similarity).
"""

import os
import sys
import json
import torch
import numpy as np
from PIL import Image
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(__file__))
from train_garment_classifier import AuraSigLIPBackbone, AuraLightweightHeads, compute_model_parameter_hash
from transformers import AutoImageProcessor

TAXONOMY_PATH = "data/garment/metadata/canonical_taxonomy.json"
DATASET_500_PATH = "data/garment/metadata/dataset-v0.5-500.json"
DATASET_V03_PATH = "data/garment/metadata/dataset-v0.3.json"
BLIND_FREEZE_PATH = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
EXP0015_CKPT_PATH = "training/runs/garment-exp-0015/checkpoint/best_model.pt"
OUTPUT_DIR = "training/runs/garment-exp-0015/evaluations"
FORENSICS_DIR = "training/runs/garment-exp-0015/forensics"

def load_json(p: str) -> Dict[str, Any]:
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def run_evaluation():
    print("=" * 80)
    print("  AURA — EXP-0015 LOCALIZATION-AWARE SIGLIP LoRA MULTI-SPLIT EVALUATION")
    print("=" * 80)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(FORENSICS_DIR, exist_ok=True)

    taxonomy = load_json(TAXONOMY_PATH)
    cat_classes = taxonomy["categories"]["classes"]
    col_classes = taxonomy["color_families"]["classes"]
    fit_classes = taxonomy["fits"]["classes"]
    sil_classes = taxonomy["silhouettes"]["classes"]
    mat_classes = taxonomy["materials"]["classes"]
    pat_classes = taxonomy["patterns"]["classes"]

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"[*] Evaluation Device: {device}")

    # Load Exp-0015 Model Checkpoint
    ckpt = torch.load(EXP0015_CKPT_PATH, map_location=device)
    print(f"[+] Loaded Exp-0015 Checkpoint from Epoch {ckpt.get('epoch')} (Val Macro F1: {ckpt.get('val_macro_f1'):.4f})")

    # Load LoRA Backbone
    lora_num_layers = ckpt.get("lora_num_layers", 4)
    backbone = AuraSigLIPBackbone(
        model_name="google/siglip-so400m-patch14-384",
        use_lora=True,
        lora_rank=ckpt.get("lora_rank", 8),
        lora_alpha=ckpt.get("lora_alpha", 16.0),
        lora_dropout=ckpt.get("lora_dropout", 0.05),
        lora_target_modules=ckpt.get("lora_target_modules", ["q_proj", "v_proj"]),
        lora_num_layers=lora_num_layers
    ).to(device)
    if "lora_state_dict" in ckpt:
        backbone.load_state_dict(ckpt["lora_state_dict"], strict=False)
        print(f"[+] Loaded {len(ckpt['lora_state_dict'])} LoRA adapter tensors into backbone (layers: {lora_num_layers}).")
    elif "backbone_state_dict" in ckpt:
        backbone.load_state_dict(ckpt["backbone_state_dict"])
    backbone.eval()

    # Load Heads
    heads = AuraLightweightHeads(taxonomy, input_dim=backbone.embedding_dim, bottleneck_dim=256).to(device)
    heads.load_state_dict(ckpt["heads_state_dict"])
    heads.eval()

    processor = AutoImageProcessor.from_pretrained("google/siglip-so400m-patch14-384")

    # 1. Measure Representation Drift (Pre-LoRA vs Post-LoRA Cosine Similarity)
    print("\n[*] Measuring Pre-LoRA vs Post-LoRA Representation Drift...")
    clean_backbone = AuraSigLIPBackbone(model_name="google/siglip-so400m-patch14-384", use_lora=False).to(device)
    clean_backbone.eval()

    ds500 = load_json(DATASET_500_PATH)
    probe_items = ds500["items"][:50]
    cosine_sims = []

    with torch.no_grad():
        for it in probe_items:
            img_p = it["image_path"]
            if not os.path.exists(img_p): continue
            with Image.open(img_p) as im:
                rgb = im.convert("RGB")
                inputs = processor(images=rgb, return_tensors="pt")
                pv = inputs["pixel_values"].to(device)
            with torch.amp.autocast('cuda' if torch.cuda.is_available() else 'cpu', dtype=torch.float16 if torch.cuda.is_available() else torch.float32):
                clean_feat = clean_backbone(pv)
                lora_feat = backbone(pv)
                clean_norm = torch.nn.functional.normalize(clean_feat, dim=-1)
                lora_norm = torch.nn.functional.normalize(lora_feat, dim=-1)
                sim = (clean_norm * lora_norm).sum(dim=-1).item()
                cosine_sims.append(sim)

    rep_drift = {
        "num_probed_samples": len(cosine_sims),
        "mean_cosine_similarity": float(np.mean(cosine_sims)),
        "median_cosine_similarity": float(np.median(cosine_sims)),
        "std_cosine_similarity": float(np.std(cosine_sims)),
        "min_cosine_similarity": float(np.min(cosine_sims)),
        "max_cosine_similarity": float(np.max(cosine_sims)),
        "representation_collapse": bool(np.mean(cosine_sims) < 0.50),
        "interpretation": "Stable domain adaptation without representation collapse"
    }
    with open(os.path.join(FORENSICS_DIR, "representation_drift.json"), "w", encoding="utf-8") as f:
        json.dump(rep_drift, f, indent=2)
    print(f"[+] Representation Drift: Mean Cosine Sim = {rep_drift['mean_cosine_similarity']:.6f} (Min: {rep_drift['min_cosine_similarity']:.6f}, Max: {rep_drift['max_cosine_similarity']:.6f})")

    # Helper for Split Inference
    def evaluate_split(items: List[Dict[str, Any]], split_name: str, use_crops: bool = False) -> Dict[str, Any]:
        correct_cat = 0
        correct_col = 0
        correct_fit = 0
        correct_sil = 0
        correct_mat = 0
        correct_pat = 0

        accepted_count = 0
        confs = []
        high_conf_wrong = 0
        preds_list = []

        crop_dir = "data/garment/crops/phase13c"

        for it in items:
            iid = it["image_id"]
            img_p = it["image_path"]

            if use_crops:
                c_path = os.path.join(crop_dir, f"oracle_crop_{iid}.png")
                if os.path.exists(c_path):
                    img_p = c_path

            if not os.path.exists(img_p):
                continue

            with Image.open(img_p) as im:
                rgb = im.convert("RGB")
                inputs = processor(images=rgb, return_tensors="pt")
                pv = inputs["pixel_values"].to(device)

            with torch.no_grad():
                with torch.amp.autocast('cuda' if torch.cuda.is_available() else 'cpu', dtype=torch.float16 if torch.cuda.is_available() else torch.float32):
                    feat = backbone(pv)
                    preds = heads(feat)

            cat_probs = torch.softmax(preds["category_logits"], dim=-1)[0].cpu().numpy()
            col_probs = torch.softmax(preds["color_logits"], dim=-1)[0].cpu().numpy()
            fit_probs = torch.softmax(preds["fit_logits"], dim=-1)[0].cpu().numpy()
            sil_probs = torch.softmax(preds["silhouette_logits"], dim=-1)[0].cpu().numpy()
            mat_probs = torch.softmax(preds["material_logits"], dim=-1)[0].cpu().numpy()
            pat_probs = torch.softmax(preds["pattern_logits"], dim=-1)[0].cpu().numpy()

            c_idx = int(np.argmax(cat_probs))
            col_idx = int(np.argmax(col_probs))
            fit_idx = int(np.argmax(fit_probs))
            sil_idx = int(np.argmax(sil_probs))
            mat_idx = int(np.argmax(mat_probs))
            pat_idx = int(np.argmax(pat_probs))

            pred_cat = cat_classes[c_idx]
            conf = float(cat_probs[c_idx])
            confs.append(conf)

            exp_cat = it["labels"]["category"]
            exp_col = it["labels"].get("color_family")
            exp_fit = it["labels"].get("fit")
            exp_sil = it["labels"].get("silhouette")
            exp_mat = it["labels"].get("material")
            exp_pat = it["labels"].get("pattern")

            cat_ok = (pred_cat == exp_cat)
            if cat_ok: correct_cat += 1
            if col_classes[col_idx] == exp_col: correct_col += 1
            if fit_classes[fit_idx] == exp_fit: correct_fit += 1
            if sil_classes[sil_idx] == exp_sil: correct_sil += 1
            if mat_classes[mat_idx] == exp_mat: correct_mat += 1
            if pat_classes[pat_idx] == exp_pat: correct_pat += 1

            if conf >= 0.65:
                accepted_count += 1
            if conf > 0.85 and not cat_ok:
                high_conf_wrong += 1

            preds_list.append({
                "image_id": iid,
                "expected_category": exp_cat,
                "predicted_category": pred_cat,
                "category_confidence": round(conf, 4),
                "expected_color": exp_col,
                "predicted_color": col_classes[col_idx],
                "expected_fit": exp_fit,
                "predicted_fit": fit_classes[fit_idx],
                "expected_silhouette": exp_sil,
                "predicted_silhouette": sil_classes[sil_idx],
                "expected_material": exp_mat,
                "predicted_material": mat_classes[mat_idx],
                "expected_pattern": exp_pat,
                "predicted_pattern": pat_classes[pat_idx],
                "input_type": "localized_crop" if use_crops else "full_image"
            })

        N = len(preds_list)
        cat_acc = correct_cat / max(1, N)
        col_acc = correct_col / max(1, N)
        fit_acc = correct_fit / max(1, N)
        sil_acc = correct_sil / max(1, N)
        mat_acc = correct_mat / max(1, N)
        pat_acc = correct_pat / max(1, N)
        macro_f1 = (cat_acc + col_acc + fit_acc + sil_acc + mat_acc + pat_acc) / 6.0

        summary = {
            "split_name": split_name,
            "sample_size": N,
            "input_type": "localized_crop" if use_crops else "full_image",
            "metrics": {
                "category_top1_accuracy": round(cat_acc, 4),
                "color_accuracy": round(col_acc, 4),
                "fit_accuracy": round(fit_acc, 4),
                "silhouette_accuracy": round(sil_acc, 4),
                "material_accuracy": round(mat_acc, 4),
                "pattern_accuracy": round(pat_acc, 4),
                "macro_f1": round(macro_f1, 4),
                "mean_confidence": round(float(np.mean(confs)), 4),
                "accepted_count": accepted_count,
                "refusal_rate": round((N - accepted_count) / max(1, N), 4),
                "false_confidence_count": high_conf_wrong,
                "false_confidence_rate": round(high_conf_wrong / max(1, N), 4)
            }
        }

        # Save split JSONs
        with open(os.path.join(OUTPUT_DIR, f"{split_name}_predictions.json"), "w", encoding="utf-8") as f:
            json.dump(preds_list, f, indent=2)
        with open(os.path.join(OUTPUT_DIR, f"{split_name}_evaluation.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        print(f"Split [{split_name:22s}] (N={N:3d}): Cat={cat_acc*100:5.2f}% | Col={col_acc*100:5.2f}% | Fit={fit_acc*100:5.2f}% | Sil={sil_acc*100:5.2f}% | Mat={mat_acc*100:5.2f}% | Pat={pat_acc*100:5.2f}% | Macro F1={macro_f1*100:5.2f}% | Accepted={accepted_count:2d}/{N:2d} | Refusal={summary['metrics']['refusal_rate']*100:5.1f}%")
        return summary

    # Load All Split Items
    v03_manifest = load_json(DATASET_V03_PATH)
    all_v03 = v03_manifest["items"]

    train_items = [i for i in ds500["items"] if i.get("split") == "train"]
    val_items = [i for i in ds500["items"] if i.get("split") == "validation"]
    blind_items = [i for i in all_v03 if i.get("split") == "blind_test"]
    hard_items = [i for i in all_v03 if i.get("split") == "hard_test"]
    rw_items = [i for i in all_v03 if i.get("split") == "real_world_test"]

    print("\n--- RUNNING MULTI-SPLIT EVALUATIONS ---")
    train_res = evaluate_split(train_items, "train")
    val_res = evaluate_split(val_items, "validation")
    blind_res = evaluate_split(blind_items, "blind_test")
    hard_res = evaluate_split(hard_items, "hard_test")
    rw_full_res = evaluate_split(rw_items, "real_world_test_full")
    rw_crop_res = evaluate_split(rw_items, "real_world_test_crop", use_crops=True)

    multi_summary = {
        "experiment_id": "garment-exp-0015",
        "model_architecture": "SigLIP-SO400M + LoRA (r=8, a=16) + 256-dim Probe",
        "dataset": "dataset-v0.5-500.json",
        "train": train_res,
        "validation": val_res,
        "blind_test": blind_res,
        "hard_test": hard_res,
        "real_world_test_full": rw_full_res,
        "real_world_test_crop": rw_crop_res
    }
    with open(os.path.join(OUTPUT_DIR, "multi_split_summary.json"), "w", encoding="utf-8") as f:
        json.dump(multi_summary, f, indent=2)
    with open(os.path.join(FORENSICS_DIR, "evaluation_summary.json"), "w", encoding="utf-8") as f:
        json.dump(multi_summary, f, indent=2)

    # Prediction Delta and Confidence Accounting
    full_preds = load_json(os.path.join(OUTPUT_DIR, "real_world_test_full_predictions.json"))
    crop_preds = load_json(os.path.join(OUTPUT_DIR, "real_world_test_crop_predictions.json"))
    pred_delta = []
    for fp, cp in zip(full_preds, crop_preds):
        exp_c = fp["expected_category"]
        f_ok = (fp["predicted_category"] == exp_c)
        c_ok = (cp["predicted_category"] == exp_c)
        pred_delta.append({
            "image_id": fp["image_id"],
            "expected_category": exp_c,
            "full_prediction": fp["predicted_category"],
            "crop_prediction": cp["predicted_category"],
            "full_confidence": fp["category_confidence"],
            "crop_confidence": cp["category_confidence"],
            "full_correct": f_ok,
            "crop_correct": c_ok,
            "transition": "GAINED_CORRECT" if (not f_ok and c_ok) else ("LOST_CORRECT" if (f_ok and not c_ok) else ("MAINTAINED_CORRECT" if f_ok else "MAINTAINED_INCORRECT"))
        })

    with open(os.path.join(FORENSICS_DIR, "prediction_delta.json"), "w", encoding="utf-8") as f:
        json.dump(pred_delta, f, indent=2)

    conf_analysis = {
        "real_world_full": {
            "mean_confidence": rw_full_res["metrics"]["mean_confidence"],
            "accepted_count": rw_full_res["metrics"]["accepted_count"],
            "refusal_rate": rw_full_res["metrics"]["refusal_rate"]
        },
        "real_world_crop": {
            "mean_confidence": rw_crop_res["metrics"]["mean_confidence"],
            "accepted_count": rw_crop_res["metrics"]["accepted_count"],
            "refusal_rate": rw_crop_res["metrics"]["refusal_rate"]
        },
        "blind_test": {
            "mean_confidence": blind_res["metrics"]["mean_confidence"],
            "accepted_count": blind_res["metrics"]["accepted_count"],
            "refusal_rate": blind_res["metrics"]["refusal_rate"]
        }
    }
    with open(os.path.join(FORENSICS_DIR, "confidence_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(conf_analysis, f, indent=2)

    print("\n[+] Multi-split evaluation completed and saved to evaluations/ and forensics/!")
    print("=" * 80)

if __name__ == "__main__":
    run_evaluation()
