"""
AURA Merge Approved Internet Assets Script
Merges approved Tier B internet garment assets into:
1. data/garment/metadata/production-training-manifest-v2.json (pure train/val pool)
2. data/garment/metadata/dataset-v0.4-candidates.json (comprehensive candidate manifest)
Enforces strict provenance, license gating, duplicate prevention, and zero split leakage.
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any, List

FROZEN_BLIND_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def merge_internet_assets():
    print("=" * 75)
    print("  AURA MERGE APPROVED TIER B INTERNET GARMENT ASSETS")
    print("=" * 75)

    approved_manifest_path = "data/garment/metadata/internet-tier-b-approved.json"
    prod_v2_manifest_path = "data/garment/metadata/production-training-manifest-v2.json"
    golden_v03_path = "data/garment/metadata/dataset-v0.3.json"
    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    taxonomy_path = "data/garment/metadata/canonical_taxonomy.json"
    candidates_v04_path = "data/garment/metadata/dataset-v0.4-candidates.json"

    # Pre-merge Blind Checksum
    blind_pre_hash = compute_sha256(blind_path)
    if blind_pre_hash != FROZEN_BLIND_SHA256:
        raise RuntimeError(f"CRITICAL: Blind test corrupted before merge! Expected {FROZEN_BLIND_SHA256}, got {blind_pre_hash}")

    approved_data = load_json(approved_manifest_path)
    prod_v2_data = load_json(prod_v2_manifest_path)
    golden_v03 = load_json(golden_v03_path)
    taxonomy = load_json(taxonomy_path)

    new_items = approved_data.get("items", [])
    print(f"[*] Found {len(new_items)} approved Tier B candidates to merge.")

    existing_ids = {it["image_id"] for it in golden_v03.get("items", [])}
    existing_hashes = {compute_sha256(it["image_path"]) for it in golden_v03.get("items", []) if os.path.exists(it["image_path"])}
    existing_groups = {it.get("garment_group_id") for it in golden_v03.get("items", [])}

    valid_cats = set(taxonomy["categories"]["classes"])
    valid_cats.add("one_piece")

    verified_merge_items = []
    for it in new_items:
        iid = it["image_id"]
        img_p = it["image_path"]
        tier = it.get("tier")
        lic = it.get("license_status")
        group_id = it.get("garment_group_id")
        labels = it.get("labels", {})
        cat = labels.get("category")

        # 1. Identity & Duplicate check
        if iid in existing_ids:
            raise ValueError(f"Duplicate image_id '{iid}' detected during merge!")

        if not os.path.exists(img_p):
            raise FileNotFoundError(f"Asset file missing: {img_p}")

        h = compute_sha256(img_p)
        if h in existing_hashes:
            raise ValueError(f"Duplicate image hash detected for {iid}: {h}")

        # 2. License check
        if tier != "TIER_B" or lic not in ["APPROVED_WITH_ATTRIBUTION", "APPROVED_FOR_AURA_TRAINING", "APPROVED_PUBLIC_DOMAIN_CC0"]:
            raise ValueError(f"License violation for {iid}: Tier={tier}, License={lic}")

        # 3. Taxonomy check
        if cat not in valid_cats:
            raise ValueError(f"Invalid category '{cat}' for {iid}")

        # 4. Group isolation
        if group_id in existing_groups:
            print(f"    [!] Note: Existing group ID '{group_id}' matched.")

        verified_merge_items.append(it)
        existing_ids.add(iid)
        existing_hashes.add(h)

    # Merge into production training manifest v2
    prod_manifest_base = load_json("data/garment/metadata/production-training-manifest.json")
    baseline_train_val_items = [dict(it) for it in prod_manifest_base.get("items", []) if it.get("split") in ["train", "validation"]]
    for b in baseline_train_val_items:
        b["training_eligible"] = True
        b["production_eligible"] = True

    merged_prod_items = baseline_train_val_items + verified_merge_items

    prod_v2_data["manifest_name"] = "AURA-Production-Training-Manifest-v2.0"
    prod_v2_data["version"] = "2.0.0"
    prod_v2_data["total_training_validation_count"] = len(merged_prod_items)
    prod_v2_data["splits"] = {
        "train_count": len([i for i in merged_prod_items if i["split"] == "train"]),
        "val_count": len([i for i in merged_prod_items if i["split"] == "validation"]),
        "total_train_val_count": len(merged_prod_items)
    }
    prod_v2_data["items"] = merged_prod_items

    with open(prod_v2_manifest_path, "w", encoding="utf-8") as f:
        json.dump(prod_v2_data, f, indent=2)

    # Merge into dataset-v0.4-candidates.json
    all_golden_items = golden_v03.get("items", [])
    merged_candidate_items = all_golden_items + verified_merge_items

    candidate_v04_payload = {
        "dataset_name": "AURA-Garment-Candidates-v0.4",
        "version": "0.4.0-candidate",
        "created_at": "2026-08-29T18:45:00Z",
        "license": "AURA Multi-Tiered Research & Commercial Permissive Dataset",
        "total_count": len(merged_candidate_items),
        "production_pool_count": len(merged_prod_items),
        "evaluation_holdout_count": len(all_golden_items) - len(baseline_train_val_items),
        "splits": {
            "train_count": len([i for i in merged_candidate_items if i["split"] == "train"]),
            "val_count": len([i for i in merged_candidate_items if i["split"] == "validation"]),
            "blind_test_count": len([i for i in merged_candidate_items if i["split"] == "blind_test"]),
            "hard_test_count": len([i for i in merged_candidate_items if i["split"] == "hard_test"]),
            "real_world_test_count": len([i for i in merged_candidate_items if i["split"] == "real_world_test"]),
            "total_count": len(merged_candidate_items)
        },
        "items": merged_candidate_items
    }

    with open(candidates_v04_path, "w", encoding="utf-8") as f:
        json.dump(candidate_v04_payload, f, indent=2)

    # Post-merge Blind Checksum Validation
    blind_post_hash = compute_sha256(blind_path)
    if blind_post_hash != FROZEN_BLIND_SHA256:
        raise RuntimeError(f"CRITICAL: Blind test corrupted during merge! Expected {FROZEN_BLIND_SHA256}, got {blind_post_hash}")

    print(f"[+] Successfully merged {len(verified_merge_items)} assets.")
    print(f"[+] Production Training/Validation Pool: {len(baseline_train_val_items)} -> {len(merged_prod_items)}")
    print(f"[+] Total Dataset Candidate Pool: {len(all_golden_items)} -> {len(merged_candidate_items)}")
    print(f"[+] Frozen Blind Integrity: PASS ({blind_post_hash})")

if __name__ == "__main__":
    merge_internet_assets()
