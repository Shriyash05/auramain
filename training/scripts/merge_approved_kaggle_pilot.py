"""
AURA Approved Kaggle Pilot Asset Merger (Phase 12A.7)
Merges approved Tier B Kaggle pilot assets from:
data/garment/metadata/kaggle-clothing-pilot-approved.json
Into:
- data/garment/metadata/production-training-manifest-v2.json
- data/garment/metadata/dataset-v0.4-candidates.json
- data/garment/metadata/attribution-manifest.json
Preserves 100% frozen blind test integrity.
"""

import os
import sys
import json
import time
import hashlib

FROZEN_BLIND_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def merge_kaggle_pilot_assets():
    print("=" * 75)
    print("  AURA MERGING APPROVED KAGGLE PILOT ASSETS")
    print("=" * 75)

    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    blind_pre = compute_sha256(blind_path)
    if blind_pre != FROZEN_BLIND_SHA256:
        raise RuntimeError(f"BLIND TEST HASH MISMATCH BEFORE MERGE: {blind_pre}")

    pilot_approved_path = "data/garment/metadata/kaggle-clothing-pilot-approved.json"
    prod_manifest_path = "data/garment/metadata/production-training-manifest-v2.json"
    candidates_manifest_path = "data/garment/metadata/dataset-v0.4-candidates.json"
    attribution_manifest_path = "data/garment/metadata/attribution-manifest.json"

    pilot_approved = load_json(pilot_approved_path)
    prod_manifest = load_json(prod_manifest_path)
    candidates_manifest = load_json(candidates_manifest_path)
    attribution_manifest = load_json(attribution_manifest_path)

    new_items = pilot_approved.get("items", [])
    print(f"[+] Approved Kaggle Pilot Items to Merge: {len(new_items)}")

    # 1. Merge into production-training-manifest-v2.json
    existing_prod_ids = {it["image_id"] for it in prod_manifest["items"]}
    added_to_prod = 0
    for it in new_items:
        if it["image_id"] not in existing_prod_ids:
            prod_manifest["items"].append(it)
            existing_prod_ids.add(it["image_id"])
            added_to_prod += 1

    prod_manifest["total_training_validation_count"] = len(prod_manifest["items"])
    prod_manifest["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_json(prod_manifest_path, prod_manifest)

    # 2. Merge into dataset-v0.4-candidates.json
    existing_cand_ids = {it["image_id"] for it in candidates_manifest["items"]}
    added_to_cands = 0
    for it in new_items:
        if it["image_id"] not in existing_cand_ids:
            candidates_manifest["items"].append(it)
            existing_cand_ids.add(it["image_id"])
            added_to_cands += 1

    candidates_manifest["total_assets"] = len(candidates_manifest["items"])
    candidates_manifest["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_json(candidates_manifest_path, candidates_manifest)

    # 3. Add attributions to attribution-manifest.json
    existing_attr_ids = {at["image_id"] for at in attribution_manifest.get("attributions", [])}
    added_to_attr = 0
    for it in new_items:
        if it["image_id"] not in existing_attr_ids:
            attribution_manifest["attributions"].append({
                "image_id": it["image_id"],
                "author": it["author"],
                "license_name": it["license_name"],
                "license_url": it["license_url"],
                "source_url": it["source_url"],
                "attribution_text": it["attribution_text"]
            })
            existing_attr_ids.add(it["image_id"])
            added_to_attr += 1

    attribution_manifest["total_attributed_assets"] = len(attribution_manifest["attributions"])
    attribution_manifest["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_json(attribution_manifest_path, attribution_manifest)

    # Verify blind test intact
    blind_post = compute_sha256(blind_path)
    if blind_post != FROZEN_BLIND_SHA256:
        raise RuntimeError(f"BLIND TEST COMPROMISED AFTER MERGE: {blind_post}")

    print(f"[+] Added {added_to_prod} assets to production-training-manifest-v2 (New Total: {len(prod_manifest['items'])})")
    print(f"[+] Added {added_to_cands} assets to dataset-v0.4-candidates (New Total: {len(candidates_manifest['items'])})")
    print(f"[+] Added {added_to_attr} attributions (New Total: {len(attribution_manifest['attributions'])})")
    print(f"[+] Frozen Blind Integrity: PASS ({blind_post})")

if __name__ == "__main__":
    merge_kaggle_pilot_assets()
