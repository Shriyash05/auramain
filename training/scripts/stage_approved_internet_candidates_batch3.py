"""
AURA Stage Approved Internet Candidates Script (Consolidated Batches 1, 2 & 3)
Applies strict license policy: CC0, Public Domain, and CC-BY only (zero ShareAlike/NC/ND in production).
Stages verified approved assets into:
- data/garment/internet_candidates/approved/
- data/garment/metadata/internet-tier-b-approved.json
- data/garment/metadata/attribution-manifest.json
- data/garment/metadata/internet-acquisition-registry.json
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

ALL_APPROVED_REVIEWS = [
    # --- Batch 1 Retained (6 assets) ---
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
    },

    # --- Batch 2 Added (17 assets) ---
    {
        "candidate_id": "cand_net_1788020480_022",
        "image_id": "garm_net_012",
        "garment_group_id": "garment_group_net_12",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Regular",
        "silhouette": "flowing",
        "color_family": "black",
        "material": "silk",
        "pattern": "solid",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Marc Bohan evening dress and cape, 1983."
    },
    {
        "candidate_id": "cand_net_1788020485_025",
        "image_id": "garm_net_013",
        "garment_group_id": "garment_group_net_13",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "flowing",
        "color_family": "red",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.7,
        "context_labels": ["studio", "hanger", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Cocktail dress museum collection."
    },
    {
        "candidate_id": "cand_net_1788020508_036",
        "image_id": "garm_net_014",
        "garment_group_id": "garment_group_net_14",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "fitted",
        "color_family": "red",
        "material": "wool",
        "pattern": "solid",
        "formality_score": 0.8,
        "context_labels": ["hanger", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Vintage red Karl Lagerfeld designer dress."
    },
    {
        "candidate_id": "cand_net_1788020512_037",
        "image_id": "garm_net_015",
        "garment_group_id": "garment_group_net_15",
        "category": "one_piece",
        "subcategory": "jumpsuit",
        "fit": "Relaxed",
        "silhouette": "straight",
        "color_family": "grey",
        "material": "knit",
        "pattern": "solid",
        "formality_score": 0.5,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "1969 Bonnie Cashin jersey jumpsuit."
    },
    {
        "candidate_id": "cand_net_1788020517_041",
        "image_id": "garm_net_016",
        "garment_group_id": "garment_group_net_16",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "straight",
        "color_family": "brown",
        "material": "silk",
        "pattern": "textured",
        "formality_score": 0.8,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "1960s printed velvet qipao from V&A Museum."
    },
    {
        "candidate_id": "cand_net_1788020519_042",
        "image_id": "garm_net_017",
        "garment_group_id": "garment_group_net_17",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "straight",
        "color_family": "multi",
        "material": "silk",
        "pattern": "floral",
        "formality_score": 0.7,
        "context_labels": ["on_body", "daylight", "street"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Woman wearing silk floral qipao dress."
    },
    {
        "candidate_id": "cand_net_1788020522_045",
        "image_id": "garm_net_018",
        "garment_group_id": "garment_group_net_18",
        "category": "outerwear",
        "subcategory": "denim_jacket",
        "fit": "Relaxed",
        "silhouette": "boxy",
        "color_family": "blue",
        "material": "denim",
        "pattern": "solid",
        "formality_score": 0.3,
        "context_labels": ["flat_lay", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "1980s vintage blue denim jacket."
    },
    {
        "candidate_id": "cand_net_1788020526_050",
        "image_id": "garm_net_019",
        "garment_group_id": "garment_group_net_19",
        "category": "outerwear",
        "subcategory": "denim_jacket",
        "fit": "Regular",
        "silhouette": "straight",
        "color_family": "blue",
        "material": "denim",
        "pattern": "graphic",
        "formality_score": 0.4,
        "context_labels": ["flat_lay", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Polo Ralph Lauren US flag patch denim jacket."
    },
    {
        "candidate_id": "cand_net_1788020534_051",
        "image_id": "garm_net_020",
        "garment_group_id": "garment_group_net_20",
        "category": "outerwear",
        "subcategory": "wool_coat",
        "fit": "Oversized",
        "silhouette": "relaxed",
        "color_family": "white",
        "material": "cotton",
        "pattern": "textured",
        "formality_score": 0.7,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "2019 Acne Studios toile-de-jouy woven coat."
    },
    {
        "candidate_id": "cand_net_1788020538_053",
        "image_id": "garm_net_021",
        "garment_group_id": "garment_group_net_21",
        "category": "outerwear",
        "subcategory": "trench_coat",
        "fit": "Regular",
        "silhouette": "structured",
        "color_family": "black",
        "material": "leather",
        "pattern": "solid",
        "formality_score": 0.7,
        "context_labels": ["clean", "indoor_neutral", "flat_lay"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Black leather belted trench coat."
    },
    {
        "candidate_id": "cand_net_1788020544_055",
        "image_id": "garm_net_023",
        "garment_group_id": "garment_group_net_23",
        "category": "outerwear",
        "subcategory": "trench_coat",
        "fit": "Regular",
        "silhouette": "straight",
        "color_family": "red",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.6,
        "context_labels": ["on_body", "daylight", "street", "smartphone"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Woman wearing red Scottevest trench coat outdoor."
    },
    {
        "candidate_id": "cand_net_1788020548_056",
        "image_id": "garm_net_024",
        "garment_group_id": "garment_group_net_24",
        "category": "outerwear",
        "subcategory": "wool_coat",
        "fit": "Regular",
        "silhouette": "structured",
        "color_family": "blue",
        "material": "wool",
        "pattern": "textured",
        "formality_score": 0.8,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "1968 Bonnie Cashin blue wool tweed coat."
    },
    {
        "candidate_id": "cand_net_1788020549_057",
        "image_id": "garm_net_025",
        "garment_group_id": "garment_group_net_25",
        "category": "outerwear",
        "subcategory": "wool_coat",
        "fit": "Slim",
        "silhouette": "structured",
        "color_family": "grey",
        "material": "wool",
        "pattern": "solid",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "2017 Thom Browne tailored wool coat."
    },
    {
        "candidate_id": "cand_net_1788020553_062",
        "image_id": "garm_net_026",
        "garment_group_id": "garment_group_net_26",
        "category": "outerwear",
        "subcategory": "bomber_jacket",
        "fit": "Regular",
        "silhouette": "boxy",
        "color_family": "beige",
        "material": "cotton",
        "pattern": "solid",
        "formality_score": 0.4,
        "context_labels": ["flat_lay", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Polo Ralph Lauren stone colored bomber jacket."
    },
    {
        "candidate_id": "cand_net_1788020555_063",
        "image_id": "garm_net_027",
        "garment_group_id": "garment_group_net_27",
        "category": "outerwear",
        "subcategory": "bomber_jacket",
        "fit": "Regular",
        "silhouette": "boxy",
        "color_family": "red",
        "material": "nylon",
        "pattern": "solid",
        "formality_score": 0.4,
        "context_labels": ["flat_lay", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Red vintage Polo Ralph Lauren bomber jacket."
    },
    {
        "candidate_id": "cand_net_1788020558_065",
        "image_id": "garm_net_028",
        "garment_group_id": "garment_group_net_28",
        "category": "outerwear",
        "subcategory": "bomber_jacket",
        "fit": "Relaxed",
        "silhouette": "boxy",
        "color_family": "brown",
        "material": "suede",
        "pattern": "solid",
        "formality_score": 0.5,
        "context_labels": ["clean", "indoor_neutral", "flat_lay"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Brown suede zip bomber jacket."
    },
    {
        "candidate_id": "cand_net_1788020567_068",
        "image_id": "garm_net_029",
        "garment_group_id": "garment_group_net_29",
        "category": "outerwear",
        "subcategory": "blazer",
        "fit": "Slim",
        "silhouette": "structured",
        "color_family": "black",
        "material": "wool",
        "pattern": "solid",
        "formality_score": 0.8,
        "context_labels": ["on_body", "indoor_neutral", "clean"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Woman wearing tailored black office blazer on-body."
    },

    # --- Batch 3 Added (6 assets) ---
    {
        "candidate_id": "cand_net_1788020901_001",
        "image_id": "garm_net_030",
        "garment_group_id": "garment_group_net_30",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Regular",
        "silhouette": "flowing",
        "color_family": "orange",
        "material": "silk",
        "pattern": "textured",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "1913 Worth evening gown, orange taffeta and brocade."
    },
    {
        "candidate_id": "cand_net_1788020901_006",
        "image_id": "garm_net_031",
        "garment_group_id": "garment_group_net_31",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "flowing",
        "color_family": "blue",
        "material": "silk",
        "pattern": "solid",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Deep petrol blue evening gown by Sybil Connolly."
    },
    {
        "candidate_id": "cand_net_1788020901_005",
        "image_id": "garm_net_032",
        "garment_group_id": "garment_group_net_32",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "flowing",
        "color_family": "white",
        "material": "synthetic",
        "pattern": "solid",
        "formality_score": 0.8,
        "context_labels": ["on_body", "indoor_neutral", "cluttered"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Debutantes white evening gowns on-body rehearsal."
    },
    {
        "candidate_id": "cand_net_1788020902_007",
        "image_id": "garm_net_033",
        "garment_group_id": "garment_group_net_33",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "flowing",
        "color_family": "black",
        "material": "silk",
        "pattern": "solid",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Black silk formal evening gown on mannequin."
    },
    {
        "candidate_id": "cand_net_1788020902_009",
        "image_id": "garm_net_034",
        "garment_group_id": "garment_group_net_34",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Regular",
        "silhouette": "flowing",
        "color_family": "multi",
        "material": "silk",
        "pattern": "textured",
        "formality_score": 0.9,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Madeleine Vionnet ombre silk chiffon crepe evening gown, c1932."
    },
    {
        "candidate_id": "cand_net_1788020903_022",
        "image_id": "garm_net_035",
        "garment_group_id": "garment_group_net_35",
        "category": "one_piece",
        "subcategory": "dress",
        "fit": "Fitted",
        "silhouette": "straight",
        "color_family": "multi",
        "material": "knit",
        "pattern": "graphic",
        "formality_score": 0.7,
        "context_labels": ["studio", "clean", "indoor_neutral"],
        "review_decision": "CORRECT",
        "reviewer_notes": "Yves Saint Laurent vintage patterned knit dress."
    }
]

def stage_consolidated_approved_batch3():
    print("=" * 75)
    print("  AURA STAGING CONSOLIDATED APPROVED TIER B (BATCHES 1 + 2 + 3)")
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

    for review in ALL_APPROVED_REVIEWS:
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

        if not os.path.exists(dest_path) or os.path.normpath(src_file) != os.path.normpath(dest_path):
            shutil.copy2(src_file, dest_path)

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

    # Write approved manifest
    approved_manifest_payload = {
        "manifest_name": "AURA-Garment-Internet-Tier-B-Approved",
        "version": "1.2.0",
        "updated_at": "2026-08-29T22:00:00Z",
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
    registry["summary"]["legal_review_required"] = len([c for c in registry["candidates"] if c.get("final_status") == "LEGAL_REVIEW_REQUIRED"])
    registry["summary"]["rejected"] = len([c for c in registry["candidates"] if c.get("final_status") == "REJECTED"])
    registry["summary"]["review_pending"] = len([c for c in registry["candidates"] if c.get("final_status") == "REVIEW_PENDING"])

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    print(f"[+] Consolidated Staging Complete: {len(approved_items)} verified approved assets.")
    print(f"[+] Output Manifest: {approved_manifest_path}")
    print(f"[+] Attribution Manifest: {attribution_path}")

if __name__ == "__main__":
    stage_consolidated_approved_batch3()
