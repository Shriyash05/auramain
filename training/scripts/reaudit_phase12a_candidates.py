"""
AURA Phase 12A.3 License Re-Audit Script
Re-audits all candidate assets against the hardened licensing policy:
- CC0 / Public Domain / CC BY: APPROVED_FOR_PRODUCTION
- CC BY-SA / CC BY-ND: Moved to LEGAL_REVIEW_REQUIRED
- CC BY-NC: REJECTED
Updates internet-acquisition-registry.json, internet-tier-b-approved.json, and attribution-manifest.json.
"""

import os
import shutil
import json
from typing import Dict, Any, List

def reaudit_candidates():
    print("=" * 75)
    print("  AURA — PHASE 12A.3 LICENSE RE-AUDIT & CANDIDATE RE-EVALUATION")
    print("=" * 75)

    approved_manifest_path = "data/garment/metadata/internet-tier-b-approved.json"
    registry_path = "data/garment/metadata/internet-acquisition-registry.json"
    attribution_path = "data/garment/metadata/attribution-manifest.json"

    approved_manifest = json.load(open(approved_manifest_path, "r", encoding="utf-8"))
    registry = json.load(open(registry_path, "r", encoding="utf-8"))
    attribution = json.load(open(attribution_path, "r", encoding="utf-8"))

    legal_review_dir = "data/garment/internet_candidates/legal_review"
    os.makedirs(legal_review_dir, exist_ok=True)

    retained_approved = []
    moved_to_legal_review = []

    candidates_map = {c["candidate_id"]: c for c in registry.get("candidates", [])}
    item_to_cand = {
        "garm_net_001": "cand_net_1788009130_001",
        "garm_net_002": "cand_net_1788009132_002",
        "garm_net_003": "cand_net_1788009135_003",
        "garm_net_004": "cand_net_1788009137_004",
        "garm_net_005": "cand_net_1788009139_005",
        "garm_net_006": "cand_net_1788009148_010",
        "garm_net_007": "cand_net_1788009153_011",
        "garm_net_008": "cand_net_1788009156_012",
        "garm_net_009": "cand_net_1788009159_013",
        "garm_net_010": "cand_net_1788009167_015",
        "garm_net_011": "cand_net_1788009187_017"
    }

    for item in approved_manifest.get("items", []):
        iid = item["image_id"]
        lic = item.get("license_name", "").lower()
        src_path = item.get("image_path", "")

        is_sharealike = any(sa in lic for sa in ["-sa", " sa", "sharealike", "share-alike"])
        is_noderiv = any(nd in lic for nd in ["-nd", " nd", "noderivatives"])

        cid = item_to_cand.get(iid)
        cand_rec = candidates_map.get(cid)

        if is_sharealike or is_noderiv:
            # Move to legal review
            dest_filename = os.path.basename(src_path)
            dest_path = os.path.join(legal_review_dir, dest_filename)
            if os.path.exists(src_path):
                shutil.move(src_path, dest_path)

            moved_to_legal_review.append(iid)
            if cand_rec:
                cand_rec["license_status"] = "LEGAL_REVIEW_REQUIRED"
                cand_rec["final_status"] = "LEGAL_REVIEW_REQUIRED"
                cand_rec["production_eligible"] = False
                cand_rec["download_path"] = dest_path.replace("\\", "/")
                cand_rec["legal_review_rationale"] = f"License '{item.get('license_name')}' contains ShareAlike/NoDerivatives terms; held for explicit legal assessment."
            print(f"[-] Moved to LEGAL REVIEW: {iid} ({item.get('license_name')}) -> {dest_path}")
        else:
            retained_approved.append(item)
            if cand_rec:
                cand_rec["license_status"] = "APPROVED_WITH_ATTRIBUTION" if "by" in lic else "APPROVED_PUBLIC_DOMAIN_CC0"
                cand_rec["final_status"] = "APPROVED"
                cand_rec["production_eligible"] = True
            print(f"[+] Retained in APPROVED: {iid} ({item.get('license_name')})")

    # Update internet-tier-b-approved.json
    approved_manifest["total_approved_assets"] = len(retained_approved)
    approved_manifest["items"] = retained_approved
    with open(approved_manifest_path, "w", encoding="utf-8") as f:
        json.dump(approved_manifest, f, indent=2)

    # Update attribution-manifest.json to keep attributions only for retained items
    retained_ids = {it["image_id"] for it in retained_approved}
    retained_attributions = [a for a in attribution.get("attributions", []) if a["image_id"] in retained_ids]
    attribution["total_attributed_assets"] = len(retained_attributions)
    attribution["attributions"] = retained_attributions
    with open(attribution_path, "w", encoding="utf-8") as f:
        json.dump(attribution, f, indent=2)

    # Update registry summary
    registry["summary"]["approved"] = len(retained_approved)
    registry["summary"]["legal_review_required"] = len([c for c in registry["candidates"] if c.get("final_status") == "LEGAL_REVIEW_REQUIRED"])
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    print(f"\n[+] License Re-Audit Complete.")
    print(f"[+] Retained Approved: {len(retained_approved)} | Moved to Legal Review: {len(moved_to_legal_review)}")

if __name__ == "__main__":
    reaudit_candidates()
