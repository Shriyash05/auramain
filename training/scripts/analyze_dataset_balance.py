"""
AURA Dataset Balance & Real-World Domain Coverage Analysis
Calculates multi-dimensional distributions across categories, subcategories,
attributes, photography contexts, lighting, backgrounds, and dataset tiers.
Identifies domain gaps and outputs structured data recommendations.
"""

import os
import sys
import json
from typing import Dict, Any, List

def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def analyze_dataset_balance(manifest_path: str, taxonomy_path: str) -> Dict[str, Any]:
    print("=" * 70)
    print("  AURA DATASET BALANCE & REAL-WORLD DOMAIN COVERAGE AUDIT")
    print(f"  Manifest: {manifest_path}")
    print("=" * 70)

    manifest = load_json(manifest_path)
    taxonomy = load_json(taxonomy_path)
    items = manifest.get("items", [])
    total_count = len(items)

    categories = {}
    subcategories = {}
    fits = {}
    silhouettes = {}
    colors = {}
    materials = {}
    patterns = {}
    formality_bins = {"casual (0.0-0.3)": 0, "smart_casual (0.4-0.6)": 0, "formal (0.7-1.0)": 0}

    contexts = {}
    lighting = {}
    backgrounds = {}
    camera_views = {}
    sources = {}
    tiers = {}
    splits = {}

    real_world_contexts = {"on-body", "ambient-lighting", "consumer-photo", "on_body", "bedroom", "closet", "street", "cluttered"}
    real_world_samples_count = 0

    for item in items:
        split = item.get("split", "unknown")
        splits[split] = splits.get(split, 0) + 1

        tier = item.get("tier", "TIER_A")
        tiers[tier] = tiers.get(tier, 0) + 1

        source = item.get("source", "unknown")
        sources[source] = sources.get(source, 0) + 1

        labels = item.get("labels", {})
        c = labels.get("category", "unknown")
        sub = labels.get("subcategory", "unknown")
        f = labels.get("fit", "unknown")
        s = labels.get("silhouette", "unknown")
        col = labels.get("color_family", "unknown")
        m = labels.get("material", "unknown")
        p = labels.get("pattern", "unknown")
        form = labels.get("formality_score", 0.5)

        categories[c] = categories.get(c, 0) + 1
        subcategories[sub] = subcategories.get(sub, 0) + 1
        fits[f] = fits.get(f, 0) + 1
        silhouettes[s] = silhouettes.get(s, 0) + 1
        colors[col] = colors.get(col, 0) + 1
        materials[m] = materials.get(m, 0) + 1
        patterns[p] = patterns.get(p, 0) + 1

        if form <= 0.3: formality_bins["casual (0.0-0.3)"] += 1
        elif form <= 0.6: formality_bins["smart_casual (0.4-0.6)"] += 1
        else: formality_bins["formal (0.7-1.0)"] += 1

        # Context labels
        ctx_list = item.get("context_labels", ["studio"])
        is_rw = any(ctx in real_world_contexts for ctx in ctx_list)
        if is_rw or split in ["real_world_test", "hard_test"]:
            real_world_samples_count += 1

        for ctx in ctx_list:
            contexts[ctx] = contexts.get(ctx, 0) + 1
            if ctx in ["daylight", "indoor_neutral", "warm_tungsten", "cool_led", "low_light", "ambient-lighting"]:
                lighting[ctx] = lighting.get(ctx, 0) + 1
            if ctx in ["clean", "bedroom", "closet", "floor", "street", "cluttered"]:
                backgrounds[ctx] = backgrounds.get(ctx, 0) + 1
            if ctx in ["smartphone", "wide_angle", "close_range", "medium_range", "oblique_view"]:
                camera_views[ctx] = camera_views.get(ctx, 0) + 1

    studio_samples_count = total_count - real_world_samples_count
    studio_rw_ratio = round(studio_samples_count / max(1, real_world_samples_count), 2)

    # Calculate Gaps & Underrepresented Areas
    gaps = []
    outerwear_count = categories.get("outerwear", 0)
    if outerwear_count < total_count * 0.15:
        gaps.append({
            "dimension": "category",
            "issue": f"Outerwear underrepresented ({outerwear_count}/{total_count}, {outerwear_count/total_count*100:.1f}%)",
            "recommendation": "Acquire structured jackets, winter coats, layered cardigans across on-body and hanger views."
        })

    silk_viscose_count = materials.get("silk", 0) + materials.get("viscose", 0)
    if silk_viscose_count < 10:
        gaps.append({
            "dimension": "material",
            "issue": f"Silk / Viscose low coverage ({silk_viscose_count} samples)",
            "recommendation": "Acquire flowy, lightweight woven garments under natural lighting to improve silk vs synthetic separation."
        })

    if real_world_samples_count < total_count * 0.35:
        gaps.append({
            "dimension": "photography_context",
            "issue": f"Studio to Real-World ratio is high ({studio_rw_ratio}:1)",
            "recommendation": "Prioritize consumer photos: on-body selfies, bedroom mirror, wrinkled flat-lay, warm tungsten lighting."
        })

    analysis_report = {
        "manifest_path": manifest_path,
        "total_assets": total_count,
        "splits_distribution": splits,
        "tiers_distribution": tiers,
        "sources_distribution": sources,
        "categories_distribution": categories,
        "subcategories_distribution": subcategories,
        "fits_distribution": fits,
        "silhouettes_distribution": silhouettes,
        "color_families_distribution": colors,
        "materials_distribution": materials,
        "patterns_distribution": patterns,
        "formality_distribution": formality_bins,
        "contexts_distribution": contexts,
        "lighting_distribution": lighting,
        "backgrounds_distribution": backgrounds,
        "camera_views_distribution": camera_views,
        "studio_vs_real_world": {
            "studio_samples": studio_samples_count,
            "real_world_samples": real_world_samples_count,
            "studio_to_real_world_ratio": studio_rw_ratio
        },
        "identified_gaps": gaps
    }

    print(f"[+] Total Assets Analyzed: {total_count}")
    print(f"[+] Categories: Tops={categories.get('tops',0)}, Bottoms={categories.get('bottoms',0)}, Outerwear={categories.get('outerwear',0)}, Shoes={categories.get('shoes',0)}, Accessories={categories.get('accessories',0)}, One-Piece={categories.get('one_piece',0)}")
    print(f"[+] Real-World Context Coverage: {real_world_samples_count}/{total_count} ({real_world_samples_count/total_count*100:.1f}%) | Ratio: {studio_rw_ratio}:1")
    print(f"[+] Identified Gaps: {len(gaps)}")
    for g in gaps:
        print(f"    - [{g['dimension'].upper()}] {g['issue']}")

    return analysis_report

if __name__ == "__main__":
    manifest = sys.argv[1] if len(sys.argv) > 1 else "data/garment/metadata/production-training-manifest.json"
    taxonomy = sys.argv[2] if len(sys.argv) > 2 else "data/garment/metadata/canonical_taxonomy.json"
    report = analyze_dataset_balance(manifest, taxonomy)
    out_dir = "training/data-audits/phase12"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "dataset_balance_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
