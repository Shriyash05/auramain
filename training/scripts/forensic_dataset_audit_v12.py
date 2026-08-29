"""
AURA Phase 12 Comprehensive Forensic Dataset Audit
Generates machine-readable data audit artifacts into training/data-audits/phase12/:
- dataset_summary.json
- license_summary.json
- category_balance.json
- context_balance.json
- duplicate_report.json
- split_integrity.json
- blind_integrity.json
- provenance_report.json
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any, List
from PIL import Image

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

def run_forensic_dataset_audit():
    print("=" * 75)
    print("  AURA — PHASE 12 COMPREHENSIVE FORENSIC DATASET AUDIT")
    print("=" * 75)

    out_dir = "training/data-audits/phase12"
    os.makedirs(out_dir, exist_ok=True)

    prod_manifest_path = "data/garment/metadata/production-training-manifest.json"
    research_manifest_path = "data/garment/metadata/research-training-manifest.json"
    registry_path = "data/garment/metadata/external-dataset-registry.json"
    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    taxonomy_path = "data/garment/metadata/canonical_taxonomy.json"

    prod_manifest = load_json(prod_manifest_path)
    res_manifest = load_json(research_manifest_path)
    registry = load_json(registry_path)
    blind_manifest = load_json(blind_path)
    taxonomy = load_json(taxonomy_path)

    items = prod_manifest.get("items", [])
    total_images = len(items)

    # 1. Blind Integrity Check
    blind_hash = compute_sha256(blind_path)
    blind_integrity = {
        "frozen_blind_manifest_path": blind_path,
        "expected_sha256": FROZEN_BLIND_SHA256,
        "measured_sha256": blind_hash,
        "sample_count": len(blind_manifest.get("items", [])),
        "immutable_lock_intact": bool(blind_hash == FROZEN_BLIND_SHA256),
        "status": "PASS" if blind_hash == FROZEN_BLIND_SHA256 else "VIOLATION"
    }
    with open(os.path.join(out_dir, "blind_integrity.json"), "w", encoding="utf-8") as f:
        json.dump(blind_integrity, f, indent=2)

    # 2. License Summary & Governance
    license_counts = {}
    tier_counts = {}
    governance_status = {}
    for d in registry.get("datasets", []):
        did = d.get("dataset_id")
        governance_status[did] = {
            "tier": d.get("tier"),
            "legal_status": d.get("legal_status"),
            "commercial_training_allowed": d.get("commercial_training_allowed"),
            "attribution_required": d.get("attribution_required")
        }

    for it in items:
        lic = it.get("license_status", "UNKNOWN")
        t = it.get("tier", "TIER_A")
        license_counts[lic] = license_counts.get(lic, 0) + 1
        tier_counts[t] = tier_counts.get(t, 0) + 1

    license_summary = {
        "ownership_policy": registry.get("ownership_policy"),
        "total_production_assets": total_images,
        "license_status_distribution": license_counts,
        "tier_distribution": tier_counts,
        "registered_dataset_governance": governance_status,
        "production_purity": {
            "tier_c_in_production": tier_counts.get("TIER_C", 0),
            "research_only_in_production": license_counts.get("RESEARCH_ONLY", 0),
            "purity_pass": tier_counts.get("TIER_C", 0) == 0 and license_counts.get("RESEARCH_ONLY", 0) == 0
        }
    }
    with open(os.path.join(out_dir, "license_summary.json"), "w", encoding="utf-8") as f:
        json.dump(license_summary, f, indent=2)

    # 3. Category & Taxonomy Balance
    cat_counts = {}
    subcat_counts = {}
    fit_counts = {}
    sil_counts = {}
    col_counts = {}
    mat_counts = {}
    pat_counts = {}
    for it in items:
        lbls = it.get("labels", {})
        c = lbls.get("category", "unknown")
        sub = lbls.get("subcategory", "unknown")
        f = lbls.get("fit", "unknown")
        s = lbls.get("silhouette", "unknown")
        col = lbls.get("color_family", "unknown")
        m = lbls.get("material", "unknown")
        p = lbls.get("pattern", "unknown")

        cat_counts[c] = cat_counts.get(c, 0) + 1
        subcat_counts[sub] = subcat_counts.get(sub, 0) + 1
        fit_counts[f] = fit_counts.get(f, 0) + 1
        sil_counts[s] = sil_counts.get(s, 0) + 1
        col_counts[col] = col_counts.get(col, 0) + 1
        mat_counts[m] = mat_counts.get(m, 0) + 1
        pat_counts[p] = pat_counts.get(p, 0) + 1

    category_balance = {
        "total_assets": total_images,
        "categories": cat_counts,
        "subcategories": subcat_counts,
        "fits": fit_counts,
        "silhouettes": sil_counts,
        "color_families": col_counts,
        "materials": mat_counts,
        "patterns": pat_counts
    }
    with open(os.path.join(out_dir, "category_balance.json"), "w", encoding="utf-8") as f:
        json.dump(category_balance, f, indent=2)

    # 4. Context Balance
    context_counts = {}
    rw_count = 0
    rw_keys = {"on-body", "ambient-lighting", "consumer-photo", "on_body", "bedroom", "closet", "street", "cluttered"}
    for it in items:
        ctxs = it.get("context_labels", ["studio"])
        if any(c in rw_keys for c in ctxs) or it.get("split") in ["real_world_test", "hard_test"]:
            rw_count += 1
        for c in ctxs:
            context_counts[c] = context_counts.get(c, 0) + 1

    context_balance = {
        "total_assets": total_images,
        "real_world_samples": rw_count,
        "studio_samples": total_images - rw_count,
        "real_world_percentage": round(rw_count / max(1, total_images) * 100, 2),
        "context_distribution": context_counts
    }
    with open(os.path.join(out_dir, "context_balance.json"), "w", encoding="utf-8") as f:
        json.dump(context_balance, f, indent=2)

    # 5. Duplicate & Near Duplicate Report
    img_hashes = {}
    duplicates = []
    for it in items:
        p = it.get("image_path")
        iid = it.get("image_id")
        if os.path.exists(p):
            h = compute_sha256(p)
            if h in img_hashes:
                duplicates.append({"original": img_hashes[h], "duplicate": iid, "sha256": h})
            else:
                img_hashes[h] = iid

    duplicate_report = {
        "total_unique_hashes": len(img_hashes),
        "exact_duplicates_count": len(duplicates),
        "duplicates": duplicates,
        "duplicate_pass": len(duplicates) == 0
    }
    with open(os.path.join(out_dir, "duplicate_report.json"), "w", encoding="utf-8") as f:
        json.dump(duplicate_report, f, indent=2)

    # 6. Split Integrity Report
    group_to_splits = {}
    split_counts = {}
    cross_split_leakage = []
    for it in items:
        gid = it.get("garment_group_id", it.get("image_id"))
        sp = it.get("split", "unknown")
        split_counts[sp] = split_counts.get(sp, 0) + 1
        if gid not in group_to_splits:
            group_to_splits[gid] = set()
        group_to_splits[gid].add(sp)

    for gid, s_set in group_to_splits.items():
        if len(s_set) > 1:
            cross_split_leakage.append({"garment_group_id": gid, "splits": list(s_set)})

    split_integrity = {
        "split_counts": split_counts,
        "total_garment_groups": len(group_to_splits),
        "cross_split_leakage_count": len(cross_split_leakage),
        "cross_split_leakage": cross_split_leakage,
        "split_isolation_pass": len(cross_split_leakage) == 0
    }
    with open(os.path.join(out_dir, "split_integrity.json"), "w", encoding="utf-8") as f:
        json.dump(split_integrity, f, indent=2)

    # 7. Provenance Report
    provenance_entries = []
    missing_prov_count = 0
    for it in items:
        prov = {
            "image_id": it.get("image_id"),
            "source": it.get("source"),
            "source_dataset": it.get("source_dataset"),
            "tier": it.get("tier"),
            "license_status": it.get("license_status"),
            "license_evidence": it.get("license_evidence"),
            "quality_status": it.get("quality_status")
        }
        if not prov["source"] or not prov["license_status"] or not prov["tier"]:
            missing_prov_count += 1
        provenance_entries.append(prov)

    provenance_report = {
        "total_assets": len(provenance_entries),
        "missing_provenance_count": missing_prov_count,
        "provenance_pass": missing_prov_count == 0,
        "sample_entries": provenance_entries[:5]
    }
    with open(os.path.join(out_dir, "provenance_report.json"), "w", encoding="utf-8") as f:
        json.dump(provenance_report, f, indent=2)

    # 8. Consolidated Dataset Summary
    dataset_summary = {
        "audit_version": "1.0.0",
        "phase": "Phase 12",
        "governance_policy": "AURA_DATASET_GOVERNANCE_V1",
        "total_production_assets": total_images,
        "research_only_assets": len(res_manifest.get("items", [])),
        "frozen_blind_intact": blind_integrity["immutable_lock_intact"],
        "production_purity_pass": license_summary["production_purity"]["purity_pass"],
        "duplicate_pass": duplicate_report["duplicate_pass"],
        "split_isolation_pass": split_integrity["split_isolation_pass"],
        "provenance_pass": provenance_report["provenance_pass"],
        "overall_audit_passed": bool(
            blind_integrity["immutable_lock_intact"] and
            license_summary["production_purity"]["purity_pass"] and
            duplicate_report["duplicate_pass"] and
            split_integrity["split_isolation_pass"] and
            provenance_report["provenance_pass"]
        )
    }
    with open(os.path.join(out_dir, "dataset_summary.json"), "w", encoding="utf-8") as f:
        json.dump(dataset_summary, f, indent=2)

    print(f"[+] Blind Integrity: {blind_integrity['status']}")
    print(f"[+] Production Purity: {dataset_summary['production_purity_pass']}")
    print(f"[+] Duplicates: {len(duplicates)} | Split Leakage: {len(cross_split_leakage)}")
    print(f"[+] Overall Forensic Audit Status: {'PASS' if dataset_summary['overall_audit_passed'] else 'FAIL'}")
    print(f"[+] Artifacts written to {out_dir}/")

    return dataset_summary

if __name__ == "__main__":
    summary = run_forensic_dataset_audit()
    if not summary["overall_audit_passed"]:
        sys.exit(1)
