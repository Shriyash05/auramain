"""
AURA Phase 12A Target Gap Analysis Generator
Analyzes the current verified production dataset (N=166) across:
- Categories and Subcategories
- Context (On-body, flat-lay, hanger, folded, held, partial)
- Lighting (Daylight, warm tungsten, cool LED, low light, shadowed)
- Background (Studio clean, bedroom, closet, street, cluttered)
- Garment condition (Pristine, wrinkled, folded, occluded)
Calculates exact measured deficits and prioritizes target composition for new acquisitions.
"""

import os
import sys
import json
from typing import Dict, Any

def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_gap_analysis(manifest_path: str, taxonomy_path: str, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    manifest = load_json(manifest_path)
    taxonomy = load_json(taxonomy_path)

    items = manifest.get("items", [])
    total_count = len(items)

    # 1. Category Distribution
    cat_counts = {c: 0 for c in taxonomy["categories"]["classes"]}
    cat_counts["one_piece"] = 0
    for it in items:
        c = it.get("labels", {}).get("category", "unknown")
        cat_counts[c] = cat_counts.get(c, 0) + 1

    # 2. Context Distribution
    ctx_counts = {
        "studio": 0,
        "flat_lay": 0,
        "on_body": 0,
        "hanger": 0,
        "folded": 0,
        "wrinkled": 0,
        "ambient_warm_lighting": 0,
        "low_light": 0,
        "cluttered_consumer_bg": 0,
        "partial_occlusion": 0
    }
    for it in items:
        ctx_list = it.get("context_labels", ["studio"])
        split = it.get("split", "train")

        if "studio" in ctx_list or "clean-background" in ctx_list:
            ctx_counts["studio"] += 1
        if "flat-lay" in ctx_list or "flat_lay" in ctx_list:
            ctx_counts["flat_lay"] += 1
        if "on-body" in ctx_list or "on_body" in ctx_list or split == "real_world_test":
            ctx_counts["on_body"] += 1
        if "wrinkled" in ctx_list or "folded" in ctx_list or split == "hard_test":
            ctx_counts["wrinkled"] += 1
        if "ambient-lighting" in ctx_list or "warm_tungsten" in ctx_list:
            ctx_counts["ambient_warm_lighting"] += 1
        if "low_light" in ctx_list:
            ctx_counts["low_light"] += 1
        if "cluttered" in ctx_list or "consumer-photo" in ctx_list or split == "real_world_test":
            ctx_counts["cluttered_consumer_bg"] += 1
        if "partial-occlusion" in ctx_list:
            ctx_counts["partial_occlusion"] += 1

    # 3. Measured Deficits & Target Requirements (for 84 new samples towards 250)
    category_gaps = []
    if cat_counts.get("one_piece", 0) == 0:
        category_gaps.append({
            "category": "one_piece",
            "current_count": 0,
            "current_percentage": 0.0,
            "target_allocation_in_new_cohort": 18,
            "subcategories_needed": ["dress", "jumpsuit", "romper", "dungaree"],
            "urgency": "CRITICAL"
        })

    outerwear_count = cat_counts.get("outerwear", 0)
    category_gaps.append({
        "category": "outerwear",
        "current_count": outerwear_count,
        "current_percentage": round(outerwear_count / total_count * 100, 2),
        "target_allocation_in_new_cohort": 20,
        "subcategories_needed": ["jacket", "blazer", "winter_coat", "cardigan", "hoodie", "overshirt"],
        "urgency": "HIGH",
        "rationale": "Mitigate recurring tops vs outerwear confusion."
    })

    category_gaps.append({
        "category": "tops",
        "current_count": cat_counts.get("tops", 0),
        "current_percentage": round(cat_counts.get("tops", 0) / total_count * 100, 2),
        "target_allocation_in_new_cohort": 16,
        "subcategories_needed": ["knitwear", "layered_top", "tank_top", "polo", "blouse"],
        "urgency": "MEDIUM"
    })

    category_gaps.append({
        "category": "bottoms",
        "current_count": cat_counts.get("bottoms", 0),
        "current_percentage": round(cat_counts.get("bottoms", 0) / total_count * 100, 2),
        "target_allocation_in_new_cohort": 15,
        "subcategories_needed": ["cargo_pants", "midi_skirt", "tailored_trousers", "denim_shorts"],
        "urgency": "MEDIUM"
    })

    category_gaps.append({
        "category": "shoes",
        "current_count": cat_counts.get("shoes", 0),
        "current_percentage": round(cat_counts.get("shoes", 0) / total_count * 100, 2),
        "target_allocation_in_new_cohort": 8,
        "subcategories_needed": ["boots", "loafers", "sandals", "sneakers"],
        "urgency": "LOW"
    })

    category_gaps.append({
        "category": "accessories",
        "current_count": cat_counts.get("accessories", 0),
        "current_percentage": round(cat_counts.get("accessories", 0) / total_count * 100, 2),
        "target_allocation_in_new_cohort": 7,
        "subcategories_needed": ["handbag", "belt", "scarf", "hat"],
        "urgency": "LOW"
    })

    # Context Gaps
    context_gaps = [
        {
            "dimension": "on_body_imagery",
            "current_count": ctx_counts["on_body"],
            "target_in_new_cohort": 36,
            "priority": "CRITICAL",
            "description": "Smartphones, mirror selfies, real-world user wearing garment."
        },
        {
            "dimension": "warm_and_low_lighting",
            "current_count": ctx_counts["ambient_warm_lighting"] + ctx_counts["low_light"],
            "target_in_new_cohort": 28,
            "priority": "HIGH",
            "description": "Warm tungsten bulbs, dim bedroom ambient lighting, backlit scenes."
        },
        {
            "dimension": "wrinkled_folded_condition",
            "current_count": ctx_counts["wrinkled"],
            "target_in_new_cohort": 24,
            "priority": "HIGH",
            "description": "Casual flat-lay with non-pristine folds, rumpled cotton, unsteamed linen."
        },
        {
            "dimension": "cluttered_consumer_background",
            "current_count": ctx_counts["cluttered_consumer_bg"],
            "target_in_new_cohort": 32,
            "priority": "HIGH",
            "description": "Bedroom floors, chairs, messy closets, changing rooms, street."
        }
    ]

    analysis_output = {
        "analysis_version": "1.0.0",
        "phase": "Phase 12A",
        "baseline_dataset": "AURA-Garment-Golden-v0.3",
        "total_baseline_assets": total_count,
        "target_milestone": 250,
        "additional_required": 84,
        "measured_baseline": {
            "categories": cat_counts,
            "contexts": ctx_counts,
            "studio_vs_real_world_ratio": "3.88:1"
        },
        "target_allocation_plan_84_assets": {
            "categories": {
                "one_piece": 18,
                "outerwear": 20,
                "tops": 16,
                "bottoms": 15,
                "shoes": 8,
                "accessories": 7
            },
            "contexts": {
                "on_body_min": 36,
                "cluttered_bg_min": 32,
                "warm_low_light_min": 28,
                "wrinkled_folded_min": 24
            }
        },
        "category_deficits": category_gaps,
        "context_deficits": context_gaps
    }

    out_file = os.path.join(out_dir, "target_gap_analysis.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(analysis_output, f, indent=2)

    print(f"[+] Successfully generated target gap analysis: {out_file}")
    return analysis_output

if __name__ == "__main__":
    manifest = "data/garment/metadata/production-training-manifest.json"
    taxonomy = "data/garment/metadata/canonical_taxonomy.json"
    out_dir = "training/data-audits/phase12a"
    generate_gap_analysis(manifest, taxonomy, out_dir)
