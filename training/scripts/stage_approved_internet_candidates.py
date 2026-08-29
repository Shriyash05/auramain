"""
AURA Stage Approved Internet Candidates Script
Processes reviewed and verified candidate images from Wikimedia Commons:
1. Copies image binaries to data/garment/internet_candidates/approved/
2. Assigns verified canonical taxonomy labels and context tags
3. Updates data/garment/metadata/internet-tier-b-approved.json
4. Updates data/garment/metadata/attribution-manifest.json
5. Updates data/garment/metadata/internet-acquisition-registry.json
"""

import os
import shutil
import json
import hashlib
from typing import Dict, Any, List
from PIL import Image

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

APPROVED_ITEMS_REVIEW = [
    {
        "candidate_id": "cand_net_1788009130_001",
        "image_id": "garm_net_001",
        "garment_group_id": "garment_group_net_01",
        "category": "one_piece",
        "subcategory": "dungarees",
        "fit": "Regular",
        "silhouette": "straight",
        "color_family": "blue",
        "material": "cotton",
        "pattern": "solid",
        "formality_score": 0.3,
        "context_labels": ["flat_lay", "clean", "daylight"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Verified dungaree one-piece outfit on flat-lay background."
    },
    {
        "candidate_id": "cand_net_1788009132_002",
        "image_id": "garm_net_002",
        "garment_group_id": "garment_group_net_02",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Regular",
        "silhouette": "flowing",
        "color_family": "cream",
        "material": "silk",
        "pattern": "floral",
        "formality_score": 0.8,
        "context_labels": ["studio", "hanger", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Floral silk evening dress from museum archives."
    },
    {
        "candidate_id": "cand_net_1788009135_003",
        "image_id": "garm_net_003",
        "garment_group_id": "garment_group_net_03",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Relaxed",
        "silhouette": "relaxed",
        "color_family": "white",
        "material": "cotton",
        "pattern": "solid",
        "formality_score": 0.4,
        "context_labels": ["on_body", "smartphone", "daylight", "street"],
        "review_decision": "CORRECT",
        "reviewer_notes": "On-body white summer dress captured outdoors."
    },
    {
        "candidate_id": "cand_net_1788009137_004",
        "image_id": "garm_net_004",
        "garment_group_id": "garment_group_net_04",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Regular",
        "silhouette": "flowing",
        "color_family": "multi",
        "material": "cotton",
        "pattern": "floral",
        "formality_score": 0.5,
        "context_labels": ["hanger", "cluttered", "indoor_neutral", "closet"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Retail store rack display dresses on hangers."
    },
    {
        "candidate_id": "cand_net_1788009139_005",
        "image_id": "garm_net_005",
        "garment_group_id": "garment_group_net_05",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "fitted",
        "color_family": "red",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.7,
        "context_labels": ["on_body", "cluttered", "warm_tungsten", "street"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Window mannequin red party dress under warm lighting."
    },
    {
        "candidate_id": "cand_net_1788009148_010",
        "image_id": "garm_net_006",
        "garment_group_id": "garment_group_net_06",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "straight",
        "color_family": "blue",
        "material": "silk",
        "pattern": "textured",
        "formality_score": 0.7,
        "context_labels": ["flat_lay", "clean", "daylight"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Classic summer cheongsam dress."
    },
    {
        "candidate_id": "cand_net_1788009153_011",
        "image_id": "garm_net_007",
        "garment_group_id": "garment_group_net_07",
        "category": "one_piece",
        "subcategory": "jumpsuit",
        "fit": "Fitted",
        "silhouette": "fitted",
        "color_family": "pink",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.8,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Pink designer jumpsuit."
    },
    {
        "candidate_id": "cand_net_1788009156_012",
        "image_id": "garm_net_008",
        "garment_group_id": "garment_group_net_08",
        "category": "one_piece",
        "subcategory": "jumpsuit",
        "fit": "Relaxed",
        "silhouette": "wide",
        "color_family": "black",
        "material": "cotton",
        "pattern": "solid",
        "formality_score": 0.6,
        "context_labels": ["hanger", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Black jumpsuit with pleated wide legs on mannequin."
    },
    {
        "candidate_id": "cand_net_1788009159_013",
        "image_id": "garm_net_009",
        "garment_group_id": "garment_group_net_09",
        "category": "one_piece",
        "subcategory": "jumpsuit",
        "fit": "Fitted",
        "silhouette": "fitted",
        "color_family": "black",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.6,
        "context_labels": ["on_body", "smartphone", "indoor_neutral", "bedroom"],
        "review_decision": "CORRECT",
        "reviewer_notes": "On-body jumpsuit model in indoor setting."
    },
    {
        "candidate_id": "cand_net_1788009167_015",
        "image_id": "garm_net_010",
        "garment_group_id": "garment_group_net_10",
        "category": "one_piece",
        "subcategory": "jumpsuit",
        "fit": "Regular",
        "silhouette": "straight",
        "color_family": "blue",
        "material": "linen",
        "pattern": "solid",
        "formality_score": 0.5,
        "context_labels": ["on_body", "daylight", "street", "smartphone"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Turquoise summer jumpsuit on-body."
    },
    {
        "candidate_id": "cand_net_1788009187_017",
        "image_id": "garm_net_011",
        "garment_group_id": "garment_group_net_11",
        "category": "outerwear",
        "subcategory": "jacket",
        "fit": "Regular",
        "silhouette": "straight",
        "color_family": "navy",
        "material": "wool",
        "pattern": "solid",
        "formality_score": 0.8,
        "context_labels": ["clean", "indoor_neutral", "flat_lay"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Tailored double-breasted naval jacket."
    }
]

def stage_approved_candidates():
    print("=" * 75)
    print("  AURA STAGING APPROVED TIER B INTERNET GARMENT ASSETS")
    print("=" * 75)

    base_dir = "data/garment/internet_candidates"
    pending_dir = os.path.join(base_dir, "pending")
    approved_dir = os.path.join(base_dir, "approved")
    os.makedirs(approved_dir, exist_ok=True)

    registry_path = "data/garment/metadata/internet-acquisition-registry.json"
    attribution_path = "data/garment/metadata/attribution-manifest.json"
    approved_manifest_path = "data/garment/metadata/internet-tier-b-approved.json"

    with open(registry_path, "r", encoding="utf-8") as f:
        registry = json.load(f)

    with open(attribution_path, "r", encoding="utf-8") as f:
        attribution_manifest = json.load(f)

    candidates_map = {c["candidate_id"]: c for c in registry["candidates"]}
    approved_items = []
    attributions = []

    for review in APPROVED_ITEMS_REVIEW:
        cid = review["candidate_id"]
        if cid not in candidates_map:
            print(f"[!] Candidate {cid} not found in registry!")
            continue

        cand = candidates_map[cid]
        src_file = cand.get("download_path")
        if not src_file or not os.path.exists(src_file):
            print(f"[!] File for {cid} missing: {src_file}")
            continue

        ext = os.path.splitext(src_file)[1]
        dest_filename = f"{review['image_id']}{ext}"
        dest_path = os.path.join(approved_dir, dest_filename)

        # Standardize and save
        shutil.copy2(src_file, dest_path)
        img_sha256 = compute_sha256(dest_path)

        # Update candidate in registry
        cand["final_status"] = "APPROVED"
        cand["review_status"] = review["review_decision"]
        cand["reviewer_notes"] = review["reviewer_notes"]
        cand["production_eligible"] = True
        cand["approved_image_path"] = dest_path.replace("\\", "/")
        cand["taxonomy_labels"] = {
            "category": review["category"],
            "subcategory": review["subcategory"],
            "fit": review["fit"],
            "silhouette": review["silhouette"],
            "color_family": review["color_family"],
            "material": review["material"],
            "pattern": review["pattern"],
            "formality_score": review["formality_score"],
            "occasions": ["Casual" if review["formality_score"] < 0.6 else "Formal"],
            "seasons": ["All Season"]
        }
        cand["context_labels"] = review["context_labels"]

        approved_item = {
            "image_id": review["image_id"],
            "garment_group_id": review["garment_group_id"],
            "image_path": dest_path.replace("\\", "/"),
            "split": "train",
            "tier": "TIER_B",
            "license_status": cand["license_status"],
            "license_name": cand["license_name"],
            "license_url": cand.get("license_url", ""),
            "author": cand.get("author", "Unknown"),
            "source": "wikimedia_commons",
            "source_dataset": "wikimedia_commons_fashion_open",
            "source_url": cand.get("source_url", ""),
            "attribution_text": cand.get("attribution_text", ""),
            "production_eligible": True,
            "training_eligible": True,
            "difficulty": "normal",
            "capture_context": review["context_labels"][0],
            "context_labels": review["context_labels"],
            "labels": cand["taxonomy_labels"],
            "verified": True,
            "verification_method": "human_stylist_review",
            "quality_status": "VERIFIED"
        }
        approved_items.append(approved_item)

        attributions.append({
            "image_id": review["image_id"],
            "title": cand.get("title", ""),
            "author": cand.get("author", "Unknown"),
            "license": cand.get("license_name", ""),
            "license_url": cand.get("license_url", ""),
            "source_url": cand.get("source_url", ""),
            "attribution_statement": cand.get("attribution_text", "")
        })

        print(f"[+] Approved and staged: {review['image_id']} ({review['category']} / {review['subcategory']}) from {cand['title']}")

    # Write approved manifest
    approved_manifest_payload = {
        "manifest_name": "AURA-Garment-Internet-Tier-B-Approved",
        "version": "1.0.0",
        "updated_at": "2026-08-29T18:45:00Z",
        "tier": "TIER_B",
        "license_status": "APPROVED_WITH_ATTRIBUTION",
        "production_eligible": True,
        "total_approved_assets": len(approved_items),
        "items": approved_items
    }
    with open(approved_manifest_path, "w", encoding="utf-8") as f:
        json.dump(approved_manifest_payload, f, indent=2)

    # Write attribution manifest
    attribution_manifest["total_attributed_assets"] = len(attributions)
    attribution_manifest["attributions"] = attributions
    with open(attribution_path, "w", encoding="utf-8") as f:
        json.dump(attribution_manifest, f, indent=2)

    # Write updated registry
    registry["summary"]["approved"] = len(approved_items)
    registry["summary"]["review_pending"] = len([c for c in registry["candidates"] if c.get("final_status") == "REVIEW_PENDING"])
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    print(f"\n[+] Successfully staged {len(approved_items)} approved Tier B assets.")
    print(f"[+] Output Manifest: {approved_manifest_path}")
    print(f"[+] Attribution Manifest: {attribution_path}")

if __name__ == "__main__":
    stage_approved_candidates()
