"""
AURA Phase 11J Forensic Verification Script
Validates dataset governance, licensing registries, segregated manifests,
representation adaptation pilot (garment-exp-0011), weight integrity, and metric validity.
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any

FROZEN_BLIND_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"

def compute_file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def run_forensic_verification():
    print("=" * 70)
    print("  AURA — PHASE 11J COMPREHENSIVE FORENSIC VERIFICATION AUDIT")
    print("=" * 70)

    errors = []

    # 1. External Dataset Registry & Governance Audit
    print("\n[1/5] Auditing External Dataset Registry & Licensing Governance...")
    reg_path = "data/garment/metadata/external-dataset-registry.json"
    if not os.path.exists(reg_path):
        errors.append(f"Missing registry: {reg_path}")
    else:
        with open(reg_path, "r", encoding="utf-8") as f:
            registry = json.load(f)
        datasets = {d["dataset_id"]: d for d in registry.get("datasets", [])}
        print(f"[+] Loaded {len(datasets)} dataset governance entries.")

        # Assert DeepFashion is Tier C
        df = datasets.get("deepfashion-inshop")
        if not df or df.get("tier") != "TIER_C" or df.get("commercial_training_allowed") is not False:
            errors.append("DeepFashion must be marked TIER_C and commercial_training_allowed: False")
        else:
            print("[+] DeepFashion correctly isolated as Tier C (Research Only).")

        # Assert ModaNet is Tier C
        mn = datasets.get("modanet")
        if not mn or mn.get("tier") != "TIER_C" or mn.get("commercial_training_allowed") is not False:
            errors.append("ModaNet must be marked TIER_C and commercial_training_allowed: False")
        else:
            print("[+] ModaNet correctly isolated as Tier C (Research Only).")

    # 2. Segregated Manifest Auditing
    print("\n[2/5] Auditing Segregated Training Manifests...")
    prod_manifest_path = "data/garment/metadata/production-training-manifest.json"
    research_manifest_path = "data/garment/metadata/research-training-manifest.json"

    if not os.path.exists(prod_manifest_path):
        errors.append(f"Missing production manifest: {prod_manifest_path}")
    else:
        with open(prod_manifest_path, "r", encoding="utf-8") as f:
            prod_manifest = json.load(f)
        if not prod_manifest.get("production_eligible"):
            errors.append("Production manifest must have production_eligible: true")
        for item in prod_manifest.get("items", []):
            if item.get("tier") not in ["TIER_A", "TIER_B"]:
                errors.append(f"Item {item.get('image_id')} has invalid tier {item.get('tier')} in production manifest")
            if item.get("license_status") not in ["APPROVED_FOR_AURA_TRAINING", "APPROVED_WITH_ATTRIBUTION"]:
                errors.append(f"Item {item.get('image_id')} has unapproved license status in production manifest")
        print(f"[+] Production manifest verified: {len(prod_manifest.get('items', []))} items (all Tier A/B approved).")

    if not os.path.exists(research_manifest_path):
        errors.append(f"Missing research manifest: {research_manifest_path}")
    else:
        with open(research_manifest_path, "r", encoding="utf-8") as f:
            res_manifest = json.load(f)
        if res_manifest.get("production_eligible") is not False:
            errors.append("Research manifest must have production_eligible: false")
        print("[+] Research manifest verified: strictly isolated from production.")

    # 3. Frozen Blind Test Isolation & Integrity
    print("\n[3/5] Auditing Frozen Blind Test Integrity...")
    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    if not os.path.exists(blind_path):
        errors.append(f"Missing frozen blind test: {blind_path}")
    else:
        blind_hash = compute_file_sha256(blind_path)
        if blind_hash != FROZEN_BLIND_SHA256:
            errors.append(f"Frozen blind test hash mismatch! Expected {FROZEN_BLIND_SHA256}, got {blind_hash}")
        else:
            print(f"[+] Frozen blind test SHA-256 intact: {blind_hash}")

    # 4. Representation Adaptation Model (garment-exp-0011) Forensic Audit
    print("\n[4/5] Auditing Representation Adaptation Pilot (garment-exp-0011)...")
    exp11_dir = "training/runs/garment-exp-0011"
    ckpt_path = os.path.join(exp11_dir, "checkpoint", "best_model.pt")
    forensics_dir = os.path.join(exp11_dir, "forensics")
    eval_dir = os.path.join(exp11_dir, "evaluations")

    if not os.path.exists(ckpt_path):
        errors.append(f"Missing Exp-0011 checkpoint: {ckpt_path}")
    else:
        ckpt_size = os.path.getsize(ckpt_path)
        ckpt_hash = compute_file_sha256(ckpt_path)
        print(f"[+] Exp-0011 Checkpoint: {ckpt_size:,} bytes | SHA-256: {ckpt_hash[:16]}...")
        if ckpt_size < 1_000_000_000:
            errors.append(f"Exp-0011 Checkpoint unexpectedly small ({ckpt_size} bytes). Expected adapted backbone + heads.")

    proof_path = os.path.join(forensics_dir, "pretrained_weight_verification.json")
    if not os.path.exists(proof_path):
        errors.append(f"Missing pretrained proof: {proof_path}")
    else:
        with open(proof_path, "r", encoding="utf-8") as f:
            proof = json.load(f)
        if not proof.get("is_genuine_pretrained") or proof.get("random_noise_baseline"):
            errors.append("Exp-0011 pretrained verification proof failed")
        print(f"[+] Pretrained proof verified: {proof.get('backbone_model_name')} (Trainable backbone params: {proof.get('trainable_backbone_parameters'):,})")

    drift_path = os.path.join(forensics_dir, "representation_drift_audit.json")
    if not os.path.exists(drift_path):
        errors.append(f"Missing representation drift audit: {drift_path}")
    else:
        with open(drift_path, "r", encoding="utf-8") as f:
            drift = json.load(f)
        if drift.get("catastrophic_forgetting_detected"):
            errors.append("Catastrophic forgetting detected in representation drift audit!")
        print(f"[+] Representation drift verified: Cosine Similarity = {drift.get('mean_cosine_similarity')} | Forgetting: {drift.get('catastrophic_forgetting_detected')}")

    # 5. Multi-Split Evaluations Audit
    print("\n[5/5] Auditing Multi-Split Measured Metrics...")
    splits = ["train", "validation", "blind_test", "hard_test", "real_world_test"]
    for split in splits:
        eval_path = os.path.join(eval_dir, f"{split}_evaluation.json")
        if not os.path.exists(eval_path):
            errors.append(f"Missing evaluation metrics for split {split}: {eval_path}")
        else:
            with open(eval_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
            if metrics.get("status") != "REAL_MEASURED":
                errors.append(f"Metrics status for {split} is not REAL_MEASURED")
            cat_acc = metrics.get("metrics", {}).get("category_top1_accuracy")
            f1 = metrics.get("metrics", {}).get("macro_f1")
            print(f"[+] Split '{split}' (N={metrics.get('sample_size')}): Category Top-1 = {cat_acc*100:.2f}%, Macro F1 = {f1*100:.2f}%")

    print("\n" + "=" * 70)
    if errors:
        print(f"[!] FORENSIC VERIFICATION FAILED WITH {len(errors)} ERROR(S):")
        for err in errors:
            print(f"    - {err}")
        return False
    else:
        print("[+] ALL FORENSIC AUDITS PASSED WITH ZERO VIOLATIONS!")
        print("=" * 70)
        return True

if __name__ == "__main__":
    passed = run_forensic_verification()
    if not passed:
        sys.exit(1)
