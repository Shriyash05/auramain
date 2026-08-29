"""
AURA Training Pool Quality & Governance Audit
Calculates dataset distributions, checks license tiers, verifies taxonomy alignment,
and detects data hygiene issues (corrupted files, cross-split leakage, missing labels).
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any, List
from PIL import Image

def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def audit_pool(manifest_path: str, taxonomy_path: str) -> Dict[str, Any]:
    print("=" * 60)
    print("  AURA TRAINING POOL QUALITY & GOVERNANCE AUDIT")
    print(f"  Manifest: {manifest_path}")
    print("=" * 60)

    manifest = load_json(manifest_path)
    taxonomy = load_json(taxonomy_path)

    items = manifest.get("items", [])
    total_images = len(items)

    valid_cats = set(taxonomy["categories"]["classes"])
    valid_fits = set(taxonomy["fits"]["classes"])
    valid_sils = set(taxonomy["silhouettes"]["classes"])
    valid_cols = set(taxonomy["color_families"]["classes"])
    valid_pats = set(taxonomy["patterns"]["classes"])
    valid_mats = set(taxonomy["materials"]["classes"])

    distributions = {
        "splits": {},
        "tiers": {},
        "license_statuses": {},
        "sources": {},
        "categories": {},
        "fits": {},
        "silhouettes": {},
        "color_families": {},
        "materials": {},
        "patterns": {},
        "contexts": {}
    }

    approved_count = 0
    research_only_count = 0
    rejected_count = 0

    image_hashes = {}
    duplicates = []
    group_to_splits = {}
    cross_split_leakage = []
    invalid_labels = []
    missing_files = []
    unreadable_files = []

    for item in items:
        img_id = item.get("image_id")
        split = item.get("split", "unknown")
        tier = item.get("tier", "TIER_A")
        lic = item.get("license_status", "UNKNOWN")
        source = item.get("source", "unknown")
        group_id = item.get("garment_group_id", img_id)
        img_path = item.get("image_path", "")

        # Tier counts
        distributions["splits"][split] = distributions["splits"].get(split, 0) + 1
        distributions["tiers"][tier] = distributions["tiers"].get(tier, 0) + 1
        distributions["license_statuses"][lic] = distributions["license_statuses"].get(lic, 0) + 1
        distributions["sources"][source] = distributions["sources"].get(source, 0) + 1

        if lic in ["APPROVED_FOR_AURA_TRAINING", "APPROVED_WITH_ATTRIBUTION"]:
            approved_count += 1
        elif lic == "RESEARCH_ONLY":
            research_only_count += 1
        else:
            rejected_count += 1

        # File validation
        if not os.path.exists(img_path):
            missing_files.append({"image_id": img_id, "path": img_path})
        else:
            try:
                with Image.open(img_path) as img:
                    w, h = img.size
                    mode = img.mode
                with open(img_path, "rb") as f:
                    f_hash = hashlib.sha256(f.read()).hexdigest()
                if f_hash in image_hashes:
                    duplicates.append({"original": image_hashes[f_hash], "duplicate": img_id, "hash": f_hash})
                else:
                    image_hashes[f_hash] = img_id
            except Exception as e:
                unreadable_files.append({"image_id": img_id, "path": img_path, "error": str(e)})

        # Group splitting check
        if group_id not in group_to_splits:
            group_to_splits[group_id] = set()
        group_to_splits[group_id].add(split)

        # Labels validation
        labels = item.get("labels", {})
        c = labels.get("category")
        f = labels.get("fit")
        s = labels.get("silhouette")
        col = labels.get("color_family")
        m = labels.get("material")
        p = labels.get("pattern")

        if c not in valid_cats: invalid_labels.append({"image_id": img_id, "field": "category", "value": c})
        if f not in valid_fits: invalid_labels.append({"image_id": img_id, "field": "fit", "value": f})
        if s not in valid_sils: invalid_labels.append({"image_id": img_id, "field": "silhouette", "value": s})
        if col not in valid_cols: invalid_labels.append({"image_id": img_id, "field": "color_family", "value": col})
        if m not in valid_mats: invalid_labels.append({"image_id": img_id, "field": "material", "value": m})
        if p not in valid_pats: invalid_labels.append({"image_id": img_id, "field": "pattern", "value": p})

        distributions["categories"][c] = distributions["categories"].get(c, 0) + 1
        distributions["fits"][f] = distributions["fits"].get(f, 0) + 1
        distributions["silhouettes"][s] = distributions["silhouettes"].get(s, 0) + 1
        distributions["color_families"][col] = distributions["color_families"].get(col, 0) + 1
        distributions["materials"][m] = distributions["materials"].get(m, 0) + 1
        distributions["patterns"][p] = distributions["patterns"].get(p, 0) + 1

        for ctx in item.get("context_labels", ["studio"]):
            distributions["contexts"][ctx] = distributions["contexts"].get(ctx, 0) + 1

    # Check cross-split leakage
    for gid, split_set in group_to_splits.items():
        if len(split_set) > 1:
            cross_split_leakage.append({"garment_group_id": gid, "splits": list(split_set)})

    # Production purity assertion
    is_prod_manifest = manifest.get("production_eligible", False)
    prohibited_items_in_prod = 0
    if is_prod_manifest:
        prohibited_items_in_prod = research_only_count + rejected_count

    audit_report = {
        "manifest_path": manifest_path,
        "total_images": total_images,
        "approved_count": approved_count,
        "research_only_count": research_only_count,
        "rejected_count": rejected_count,
        "distributions": distributions,
        "hygiene_checks": {
            "missing_files_count": len(missing_files),
            "unreadable_files_count": len(unreadable_files),
            "exact_duplicate_count": len(duplicates),
            "cross_split_leakage_count": len(cross_split_leakage),
            "invalid_taxonomy_labels_count": len(invalid_labels),
            "prohibited_in_production_count": prohibited_items_in_prod
        },
        "audit_passed": (
            len(missing_files) == 0 and
            len(unreadable_files) == 0 and
            len(cross_split_leakage) == 0 and
            len(invalid_labels) == 0 and
            prohibited_items_in_prod == 0
        )
    }

    print(f"[+] Total Images: {total_images}")
    print(f"[+] Approved: {approved_count} | Research-Only: {research_only_count} | Rejected: {rejected_count}")
    print(f"[+] Missing files: {len(missing_files)} | Corrupted: {len(unreadable_files)}")
    print(f"[+] Duplicates: {len(duplicates)} | Cross-split leakage: {len(cross_split_leakage)}")
    print(f"[+] Invalid labels: {len(invalid_labels)} | Prohibited in Prod: {prohibited_items_in_prod}")
    print(f"[*] Audit Passed: {audit_report['audit_passed']}")

    return audit_report

if __name__ == "__main__":
    manifest = sys.argv[1] if len(sys.argv) > 1 else "data/garment/metadata/production-training-manifest.json"
    taxonomy = sys.argv[2] if len(sys.argv) > 2 else "data/garment/metadata/canonical_taxonomy.json"
    report = audit_pool(manifest, taxonomy)
    out_dir = "training/runs/audit"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "training_pool_audit.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    if not report["audit_passed"]:
        sys.exit(1)
