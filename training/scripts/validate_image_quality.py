"""
AURA Image Quality Control & Dataset Hygiene Validation
Performs automated inspection of image assets:
- Image readability and corruption checks
- Resolution and aspect ratio bounds
- Grayscale / single-channel detection
- SHA-256 duplicate detection
- Context metadata presence
- Taxonomy label validation
- Cross-split garment group leakage
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

def validate_image_quality(manifest_path: str, taxonomy_path: str) -> Dict[str, Any]:
    print("=" * 70)
    print("  AURA IMAGE QUALITY & DATASET HYGIENE VALIDATOR")
    print(f"  Manifest: {manifest_path}")
    print("=" * 70)

    manifest = load_json(manifest_path)
    taxonomy = load_json(taxonomy_path)

    valid_cats = set(taxonomy["categories"]["classes"])
    valid_cats.add("one_piece")
    valid_fits = set(taxonomy["fits"]["classes"])
    valid_sils = set(taxonomy["silhouettes"]["classes"])
    valid_cols = set(taxonomy["color_families"]["classes"])
    valid_pats = set(taxonomy["patterns"]["classes"])
    valid_mats = set(taxonomy["materials"]["classes"])

    items = manifest.get("items", [])
    total_images = len(items)

    corrupt_files = []
    missing_files = []
    extreme_aspect_ratios = []
    low_resolutions = []
    grayscale_images = []
    missing_context_metadata = []
    invalid_taxonomy_labels = []
    image_hashes = {}
    duplicates = []
    group_to_splits = {}
    cross_split_leakage = []

    for item in items:
        img_id = item.get("image_id")
        split = item.get("split", "unknown")
        group_id = item.get("garment_group_id", img_id)
        img_path = item.get("image_path", "")

        # Group splitting tracking
        if group_id not in group_to_splits:
            group_to_splits[group_id] = set()
        group_to_splits[group_id].add(split)

        # Context presence
        ctx_list = item.get("context_labels") or ([item.get("capture_context")] if item.get("capture_context") else ["studio"])
        if not ctx_list or len(ctx_list) == 0:
            missing_context_metadata.append(img_id)

        # Labels validation
        labels = item.get("labels", {})
        c = labels.get("category")
        f = labels.get("fit")
        s = labels.get("silhouette")
        col = labels.get("color_family")
        m = labels.get("material")
        p = labels.get("pattern")

        if c not in valid_cats: invalid_taxonomy_labels.append({"image_id": img_id, "field": "category", "val": c})
        if f not in valid_fits: invalid_taxonomy_labels.append({"image_id": img_id, "field": "fit", "val": f})
        if s not in valid_sils: invalid_taxonomy_labels.append({"image_id": img_id, "field": "silhouette", "val": s})
        if col not in valid_cols: invalid_taxonomy_labels.append({"image_id": img_id, "field": "color_family", "val": col})
        if m not in valid_mats: invalid_taxonomy_labels.append({"image_id": img_id, "field": "material", "val": m})
        if p not in valid_pats: invalid_taxonomy_labels.append({"image_id": img_id, "field": "pattern", "val": p})

        # Physical file inspection
        if not os.path.exists(img_path):
            missing_files.append({"image_id": img_id, "path": img_path})
            continue

        try:
            with open(img_path, "rb") as f_obj:
                f_bytes = f_obj.read()
                h = hashlib.sha256(f_bytes).hexdigest()
                if h in image_hashes:
                    duplicates.append({"image_id": img_id, "duplicate_of": image_hashes[h], "sha256": h})
                else:
                    image_hashes[h] = img_id

            with Image.open(img_path) as img:
                w, h_dim = img.size
                mode = img.mode

                # Aspect ratio check
                aspect_ratio = w / float(h_dim)
                if aspect_ratio < 0.25 or aspect_ratio > 4.0:
                    extreme_aspect_ratios.append({"image_id": img_id, "size": [w, h_dim], "aspect_ratio": round(aspect_ratio, 2)})

                # Low resolution check (<64px minimum feature dimension)
                if w < 64 or h_dim < 64:
                    low_resolutions.append({"image_id": img_id, "size": [w, h_dim]})

                # Single-channel grayscale check
                if mode in ["L", "1"]:
                    grayscale_images.append({"image_id": img_id, "mode": mode})

        except Exception as e:
            corrupt_files.append({"image_id": img_id, "path": img_path, "error": str(e)})

    # Cross-split group leakage check
    for gid, split_set in group_to_splits.items():
        if len(split_set) > 1:
            cross_split_leakage.append({"garment_group_id": gid, "splits": list(split_set)})

    quality_passed = (
        len(missing_files) == 0 and
        len(corrupt_files) == 0 and
        len(extreme_aspect_ratios) == 0 and
        len(low_resolutions) == 0 and
        len(grayscale_images) == 0 and
        len(duplicates) == 0 and
        len(missing_context_metadata) == 0 and
        len(invalid_taxonomy_labels) == 0 and
        len(cross_split_leakage) == 0
    )

    quality_report = {
        "manifest_path": manifest_path,
        "total_images_checked": total_images,
        "quality_passed": quality_passed,
        "metrics": {
            "missing_files_count": len(missing_files),
            "corrupt_files_count": len(corrupt_files),
            "extreme_aspect_ratio_count": len(extreme_aspect_ratios),
            "low_resolution_count": len(low_resolutions),
            "grayscale_image_count": len(grayscale_images),
            "exact_duplicate_count": len(duplicates),
            "missing_context_count": len(missing_context_metadata),
            "invalid_taxonomy_labels_count": len(invalid_taxonomy_labels),
            "cross_split_leakage_count": len(cross_split_leakage)
        },
        "details": {
            "missing_files": missing_files,
            "corrupt_files": corrupt_files,
            "extreme_aspect_ratios": extreme_aspect_ratios,
            "low_resolutions": low_resolutions,
            "grayscale_images": grayscale_images,
            "duplicates": duplicates,
            "missing_context_metadata": missing_context_metadata,
            "invalid_taxonomy_labels": invalid_taxonomy_labels,
            "cross_split_leakage": cross_split_leakage
        }
    }

    print(f"[+] Total Images Checked: {total_images}")
    print(f"[+] Corrupt: {len(corrupt_files)} | Missing: {len(missing_files)} | Low-Res: {len(low_resolutions)}")
    print(f"[+] Grayscale: {len(grayscale_images)} | Duplicates: {len(duplicates)} | Leakage: {len(cross_split_leakage)}")
    print(f"[+] Missing Context: {len(missing_context_metadata)} | Invalid Labels: {len(invalid_taxonomy_labels)}")
    print(f"[*] Overall Image Quality Check Passed: {quality_passed}")

    return quality_report

if __name__ == "__main__":
    manifest = sys.argv[1] if len(sys.argv) > 1 else "data/garment/metadata/production-training-manifest.json"
    taxonomy = sys.argv[2] if len(sys.argv) > 2 else "data/garment/metadata/canonical_taxonomy.json"
    report = validate_image_quality(manifest, taxonomy)
    out_dir = "training/data-audits/phase12"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "image_quality_validation.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    if not report["quality_passed"]:
        sys.exit(1)
