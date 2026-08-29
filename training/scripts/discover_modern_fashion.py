"""
AURA Modern Fashion Discovery Engine & Registry Builder (Phase 12A.5 Forensic Correction)
Establishes:
1. Controlled modern fashion search query registry across 21 contemporary style themes.
2. Forensic provenance validation (explicit rejection of placeholder/mock domains like example.com).
3. Dual-Funnel Segregation:
   - Inspiration Funnel: Styling & aesthetic references for Inspiration Library (inspiration_only=True, training_eligible=False).
   - Training Funnel: Only if original canonical source is independently verified under genuine permissive licenses.
4. Kaggle Dataset Discovery Registry (tracking declared vs upstream licenses, requiring legal review).
5. Zero scraping, zero commercial AI APIs, zero blind-test modification.
"""

import os
import sys
import json
import time
import hashlib
from typing import Dict, Any, List, Set, Optional

MODERN_SEARCH_THEMES = [
    {"theme_id": "theme_streetwear", "query": "modern streetwear", "category": "streetwear", "silhouette": "oversized", "key_items": ["hoodie", "cargo pants", "sneakers"]},
    {"theme_id": "theme_menswear", "query": "modern menswear", "category": "tailoring", "silhouette": "structured", "key_items": ["overshirt", "pleated trousers", "loafers"]},
    {"theme_id": "theme_womenswear", "query": "modern womenswear", "category": "casual", "silhouette": "relaxed", "key_items": ["blazer", "straight jeans", "mules"]},
    {"theme_id": "theme_tailoring", "query": "contemporary tailoring", "category": "tailoring", "silhouette": "structured", "key_items": ["relaxed blazer", "wide leg trousers"]},
    {"theme_id": "theme_blazer_outfit", "query": "modern blazer outfit", "category": "smart_casual", "silhouette": "boxy", "key_items": ["oversized blazer", "t-shirt", "trousers"]},
    {"theme_id": "theme_jacket_outfit", "query": "modern jacket outfit", "category": "outerwear", "silhouette": "boxy", "key_items": ["bomber jacket", "straight pants"]},
    {"theme_id": "theme_jeans_outfit", "query": "modern jeans outfit", "category": "casual", "silhouette": "relaxed", "key_items": ["straight leg denim", "knit polo"]},
    {"theme_id": "theme_wide_leg", "query": "modern wide leg trousers", "category": "contemporary", "silhouette": "wide", "key_items": ["wide leg trousers", "fitted top"]},
    {"theme_id": "theme_knitwear", "query": "modern knitwear", "category": "casual", "silhouette": "relaxed", "key_items": ["textured knit sweater", "trousers"]},
    {"theme_id": "theme_layered", "query": "modern layered outfit", "category": "contemporary", "silhouette": "relaxed", "key_items": ["trench coat", "cardigan", "shirt"]},
    {"theme_id": "theme_casual", "query": "modern casual outfit", "category": "casual", "silhouette": "relaxed", "key_items": ["denim jacket", "white tee", "chinos"]},
    {"theme_id": "theme_minimal", "query": "modern minimal outfit", "category": "minimal", "silhouette": "straight", "key_items": ["wool coat", "crewneck", "trousers"]},
    {"theme_id": "theme_luxury_streetwear", "query": "modern luxury streetwear", "category": "streetwear", "silhouette": "oversized", "key_items": ["leather jacket", "hoodie", "boots"]},
    {"theme_id": "theme_smart_casual", "query": "modern smart casual", "category": "smart_casual", "silhouette": "fitted", "key_items": ["knit polo", "tailored trousers", "loafers"]},
    {"theme_id": "theme_resort", "query": "modern resort wear", "category": "resort", "silhouette": "flowing", "key_items": ["linen shirt", "linen trousers", "sandals"]},
    {"theme_id": "theme_summer", "query": "modern summer outfit", "category": "casual", "silhouette": "relaxed", "key_items": ["linen short sleeve", "shorts", "sunglasses"]},
    {"theme_id": "theme_winter", "query": "modern winter outfit", "category": "outerwear", "silhouette": "structured", "key_items": ["puffer jacket", "wool scarf", "boots"]},
    {"theme_id": "theme_monochrome", "query": "modern monochrome outfit", "category": "contemporary", "silhouette": "straight", "key_items": ["black coat", "black turtleneck", "black trousers"]},
    {"theme_id": "theme_sneakers", "query": "modern sneakers outfit", "category": "streetwear", "silhouette": "relaxed", "key_items": ["retro sneakers", "baggy jeans", "overshirt"]},
    {"theme_id": "theme_boots", "query": "modern boots outfit", "category": "contemporary", "silhouette": "structured", "key_items": ["chelsea boots", "tailored coat", "trousers"]},
    {"theme_id": "theme_accessories", "query": "modern accessory styling", "category": "accessories", "silhouette": "clean", "key_items": ["leather tote", "minimal watch", "sunglasses"]}
]

KAGGLE_DISCOVERY_REGISTRY = [
    {
        "dataset_name": "DeepFashion (In-Shop Clothes Retrieval & Category/Attribute)",
        "kaggle_url": "https://www.kaggle.com/datasets/deepfashion/in-shop-clothes",
        "owner": "CUHK Multimedia Lab",
        "dataset_id": "deepfashion_in_shop",
        "declared_license": "Non-Commercial Research Only",
        "license_url": "http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html",
        "upstream_source": "E-commerce web crawls (commercial retailers)",
        "upstream_license": "All Rights Reserved (Retailer Copyright)",
        "commercial_training_status": "LEGAL_REVIEW_REQUIRED_NON_COMMERCIAL",
        "provenance_status": "VERIFIED_RESEARCH_RESTRICTED",
        "production_eligibility": False,
        "notes": "Academic landmark dataset. Strictly prohibited from AURA production commercial training due to non-commercial research clause."
    },
    {
        "dataset_name": "Fashion-MNIST",
        "kaggle_url": "https://www.kaggle.com/datasets/zalando-research/fashionmnist",
        "owner": "Zalando Research",
        "dataset_id": "zalando_fashion_mnist",
        "declared_license": "MIT License",
        "license_url": "https://github.com/zalandoresearch/fashion-mnist/blob/master/LICENSE",
        "upstream_source": "Zalando product catalog thumbnail renders (28x28 grayscale)",
        "upstream_license": "MIT License (Zalando Research)",
        "commercial_training_status": "APPROVED_SYNTHETIC_BENCHMARK",
        "provenance_status": "VERIFIED_OPEN_SOURCE",
        "production_eligibility": False,
        "notes": "Low resolution (28x28 grayscale). Useful for algorithm unit testing only, not production SigLIP training."
    },
    {
        "dataset_name": "iMaterialist (Fashion) 2019 at FGVC6",
        "kaggle_url": "https://www.kaggle.com/c/imaterialist-fashion-2019-FGVC6",
        "owner": "Google AI Perception / FGVC",
        "dataset_id": "imaterialist_fgvc6",
        "declared_license": "FGVC Competition Terms (Non-Commercial Research)",
        "license_url": "https://github.com/visipedia/imat_comp",
        "upstream_source": "Web aggregated consumer & runway images",
        "upstream_license": "Mixed / Unclear Upstream Image Rights",
        "commercial_training_status": "LEGAL_REVIEW_REQUIRED",
        "provenance_status": "COMPETITION_RESTRICTED",
        "production_eligibility": False,
        "notes": "Fine-grained garment attributes. Requires upstream copyright audit before any commercial model training."
    }
]

# Audited references: All 6 previous placeholder references flagged as INVALID_PROVENANCE
DISCOVERY_REFERENCES = [
    {
        "discovery_id": "mod_disc_001",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_001",
        "image_reference": "ref_streetwear_oversized_hoodie_wide_pants.jpg",
        "title": "Minimalist Streetwear: Layered Grey Hoodie and Wide Trousers",
        "description": "Drop-shoulder hoodie with wide-leg pants.",
        "board": "Modern Streetwear Inspo",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:00:00Z",
        "original_source_url": "https://studiomoda.example.com/looks/2026-fw-01",
        "original_source_domain": "studiomoda.example.com",
        "license_status": "UNVERIFIED_PLACEHOLDER",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: Source domain studiomoda.example.com is a placeholder. Stripped of all eligibility."
    },
    {
        "discovery_id": "mod_disc_002",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_002",
        "image_reference": "ref_contemporary_tailoring_box_blazer.jpg",
        "title": "Relaxed Double-Breasted Tailoring with Silk Knit",
        "description": "Double-breasted blazer and trousers.",
        "board": "Contemporary Tailoring",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:01:00Z",
        "original_source_url": "https://ateliernordic.example.com/editorial/autumn-tailoring",
        "original_source_domain": "ateliernordic.example.com",
        "license_status": "UNVERIFIED_PLACEHOLDER",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: Source domain ateliernordic.example.com is a placeholder. Stripped of all eligibility."
    },
    {
        "discovery_id": "mod_disc_003",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_003",
        "image_reference": "ref_monochrome_winter_wool_layering.jpg",
        "title": "All-Black Monochrome Layering with Longline Wool Coat",
        "description": "Monochrome black wool overcoat.",
        "board": "Monochrome Aesthetics",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:02:00Z",
        "original_source_url": "https://commons.wikimedia.org/wiki/File:Woman_in_Black_Coat_Street_Fashion.jpg",
        "original_source_domain": "commons.wikimedia.org",
        "license_status": "UNVERIFIED_REMOTE_MISSING",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: File does not exist on Wikimedia Commons remote API. Stripped of training eligibility."
    },
    {
        "discovery_id": "mod_disc_004",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_004",
        "image_reference": "ref_modern_wide_denim_styling.jpg",
        "title": "Clean Indigo Wide-Leg Jeans and Cropped Cotton Cardigan",
        "description": "High-rise wide-leg raw denim.",
        "board": "Current Denim Trends",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:03:00Z",
        "original_source_url": "https://denimarchive.example.com/looks/raw-denim-04",
        "original_source_domain": "denimarchive.example.com",
        "license_status": "UNVERIFIED_PLACEHOLDER",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: Source domain denimarchive.example.com is a placeholder. Stripped of all eligibility."
    },
    {
        "discovery_id": "mod_disc_005",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_005",
        "image_reference": "ref_resort_linen_summer_smart.jpg",
        "title": "Relaxed Linen Camp Collar Shirt and Drawstring Trousers",
        "description": "Sage green linen shirt look.",
        "board": "Modern Resort Wear",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:04:00Z",
        "original_source_url": "https://unsplash.com/photos/sage-green-linen-shirt-resort",
        "original_source_domain": "unsplash.com",
        "license_status": "UNVERIFIED_REMOTE_MISSING",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: URL unverified and license mislabeled as CC0 (Unsplash uses Unsplash License). Stripped of training eligibility."
    },
    {
        "discovery_id": "mod_disc_006",
        "platform": "pinterest",
        "pin_url": "https://www.pinterest.com/pin/unverified_reference_006",
        "image_reference": "ref_leather_biker_jacket_layering.jpg",
        "title": "Boxy Leather Biker Jacket with Vintage Wash Denim",
        "description": "Cropped leather motorcycle jacket.",
        "board": "Modern Leather Outerwear",
        "creator": "Unverified",
        "discovered_at": "2026-08-29T22:05:00Z",
        "original_source_url": "https://instagram.com/p/example_post_006",
        "original_source_domain": "instagram.com",
        "license_status": "UNVERIFIED_PLACEHOLDER",
        "provenance_status": "INVALID_PROVENANCE",
        "training_eligible": False,
        "inspiration_only": False,
        "notes": "INVALID PROVENANCE: Placeholder post ID. Stripped of all eligibility."
    }
]

def build_corrected_discovery_registry():
    print("=" * 75)
    print("  AURA MODERN FASHION DISCOVERY REGISTRY BUILDER (FORENSIC V2)")
    print("=" * 75)

    registry_path = "data/garment/metadata/modern-fashion-discovery-registry.json"

    registry_payload = {
        "registry_name": "AURA Modern Fashion Discovery & Reference Registry",
        "version": "2.0.0-forensic-audited",
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "platform_policy": {
            "primary_discovery_source": "pinterest",
            "scraping_policy": "NO_SCRAPING_DISCOVERY_LAYER_ONLY",
            "commercial_ai_api_policy": "ZERO_COMMERCIAL_AI_APIS",
            "training_eligibility_rule": "ORIGINAL_SOURCE_PERMISSIVE_LICENSE_VERIFIED_ONLY",
            "unsplash_policy": "Must be labeled 'Unsplash License' with https://unsplash.com/license URL. Never CC0.",
            "kaggle_policy": "Kaggle datasets require independent upstream copyright and license verification. Default: LEGAL_REVIEW_REQUIRED."
        },
        "summary": {
            "total_search_themes": len(MODERN_SEARCH_THEMES),
            "total_discovered_references": len(DISCOVERY_REFERENCES),
            "invalid_sources": len([r for r in DISCOVERY_REFERENCES if r["provenance_status"] == "INVALID_PROVENANCE"]),
            "resolved_sources": len([r for r in DISCOVERY_REFERENCES if r["provenance_status"].startswith("RESOLVED")]),
            "potential_training_candidates": len([r for r in DISCOVERY_REFERENCES if r["training_eligible"]]),
            "inspiration_only_references": len([r for r in DISCOVERY_REFERENCES if r["inspiration_only"]]),
            "kaggle_datasets_tracked": len(KAGGLE_DISCOVERY_REGISTRY),
            "audit_status": "INVALID_DISCOVERY"
        },
        "search_themes": MODERN_SEARCH_THEMES,
        "kaggle_datasets": KAGGLE_DISCOVERY_REGISTRY,
        "references": DISCOVERY_REFERENCES
    }

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry_payload, f, indent=2)

    print(f"[+] Total Search Themes: {len(MODERN_SEARCH_THEMES)}")
    print(f"[+] Total References Audited: {len(DISCOVERY_REFERENCES)}")
    print(f"[-] Invalid / Placeholder References: {registry_payload['summary']['invalid_sources']}")
    print(f"[+] Potential Training Candidates: {registry_payload['summary']['potential_training_candidates']}")
    print(f"[+] Kaggle Datasets Tracked: {len(KAGGLE_DISCOVERY_REGISTRY)}")
    print(f"[+] Registry Status: INVALID_DISCOVERY (0 invalid records allowed in production)")
    print(f"[+] Registry Saved: {registry_path}")

if __name__ == "__main__":
    build_corrected_discovery_registry()
