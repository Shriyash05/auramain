"""
AURA Automated License-Aware Internet Garment Acquisition Script
Connects to approved open media APIs (Wikimedia Commons MediaWiki API),
discovers candidate garment media, verifies individual file license terms,
enforces strict CC0/Public Domain/CC-BY whitelist policies, downloads image
binaries with full rate-limiting and provenance logging, and stages them for review.
"""

import os
import sys
import json
import time
import hashlib
import urllib.parse
from typing import Dict, Any, List, Optional
import requests
from PIL import Image

USER_AGENT = "AuraGarmentResearchBot/1.0 (https://aura-wardrobe.app; research-contact@aura-wardrobe.app) python-requests/2.31"

APPROVED_LICENSES = {
    "cc0", "public domain", "cc-zero", "pdm",
    "cc by", "cc-by", "cc by 2.0", "cc-by-2.0", "cc by 2.5", "cc-by-2.5",
    "cc by 3.0", "cc-by-3.0", "cc by 4.0", "cc-by-4.0",
    "cc by-sa", "cc-by-sa", "cc by-sa 2.0", "cc-by-sa-2.0", "cc by-sa 3.0", "cc-by-sa-3.0", "cc by-sa 4.0", "cc-by-sa-4.0"
}

PROHIBITED_SUBSTRINGS = ["-nc", "nc", "non-commercial", "noncommercial", "by-nd", "-nd", "all rights reserved"]

QUERY_GROUPS = [
    {"category": "one_piece", "queries": ["evening dress clothing", "cocktail dress garment", "vintage dress clothing", "jumpsuit fashion", "cheongsam dress"]},
    {"category": "outerwear", "queries": ["denim jacket clothing", "trench coat fashion", "wool coat clothing", "bomber jacket clothing", "blazer clothing on body", "cardigan sweater fashion"]},
    {"category": "tops", "queries": ["polo shirt clothing", "button down shirt clothing", "knit sweater clothing", "tank top garment", "hoodie clothing street"]},
    {"category": "bottoms", "queries": ["trousers street fashion", "denim shorts clothing", "pleated skirt fashion", "sweatpants clothing", "jeans street clothing"]},
    {"category": "shoes", "queries": ["leather boots footwear", "sneakers shoes footwear", "loafers shoes fashion", "sandals footwear"]},
    {"category": "accessories", "queries": ["leather handbag fashion", "tote bag clothing", "scarf accessory clothing", "hat fashion clothing"]}
]

def load_json(path: str) -> Dict[str, Any]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def normalize_license(license_name: str) -> str:
    cleaned = license_name.strip().lower()
    for prov in PROHIBITED_SUBSTRINGS:
        if prov in cleaned:
            return "PROHIBITED_NON_COMMERCIAL"
    if any(sa in cleaned for sa in ["-sa", " sa", "sharealike", "share-alike"]):
        return "LEGAL_REVIEW_REQUIRED"
    if any(nd in cleaned for nd in ["-nd", " nd", "noderivatives", "no-derivatives"]):
        return "LEGAL_REVIEW_REQUIRED"
    if any(app in cleaned for app in ["cc0", "public domain", "pdm"]):
        return "APPROVED_PUBLIC_DOMAIN_CC0"
    if any(app in cleaned for app in ["cc by", "cc-by"]):
        return "APPROVED_WITH_ATTRIBUTION"
    return "LEGAL_REVIEW_REQUIRED"

def search_wikimedia_commons(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    endpoint = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime"
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(endpoint, params=params, headers=headers, timeout=15)
        if resp.status_code != 200:
            print(f"[!] Commons API returned status {resp.status_code} for query '{query}'")
            return []
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        results = []
        for pid, page in pages.items():
            title = page.get("title", "")
            imageinfo = page.get("imageinfo", [])
            if not imageinfo:
                continue
            info = imageinfo[0]
            ext = info.get("extmetadata", {})
            results.append({
                "title": title,
                "url": info.get("url"),
                "description_url": info.get("descriptionurl"),
                "mime": info.get("mime"),
                "width": info.get("width"),
                "height": info.get("height"),
                "size": info.get("size"),
                "license_short": ext.get("LicenseShortName", {}).get("value", "UNKNOWN"),
                "license_url": ext.get("LicenseUrl", {}).get("value", ""),
                "artist": ext.get("Artist", {}).get("value", "Unknown Author"),
                "credit": ext.get("Credit", {}).get("value", ""),
                "description": ext.get("ImageDescription", {}).get("value", "")
            })
        return results
    except Exception as e:
        print(f"[!] Commons API error for query '{query}': {e}")
        return []

def acquire_candidates(max_downloads: int = 30, target_approved: int = 10):
    print("=" * 75)
    print("  AURA AUTOMATED LICENSE-AWARE GARMENT ACQUISITION")
    print(f"  Max Download Limit: {max_downloads} | Target Approved: {target_approved}")
    print("=" * 75)

    base_dir = "data/garment/internet_candidates"
    pending_dir = os.path.join(base_dir, "pending")
    approved_dir = os.path.join(base_dir, "approved")
    rejected_dir = os.path.join(base_dir, "rejected")
    legal_review_dir = os.path.join(base_dir, "legal_review")

    for d in [pending_dir, approved_dir, rejected_dir, legal_review_dir]:
        os.makedirs(d, exist_ok=True)

    registry_path = "data/garment/metadata/internet-acquisition-registry.json"
    registry = load_json(registry_path)
    if "candidates" not in registry:
        registry = {"registry_name": "AURA Internet Garment Acquisition Registry", "version": "1.0.0", "summary": {}, "candidates": []}

    existing_urls = {c.get("original_url") for c in registry.get("candidates", [])}
    existing_hashes = {c.get("sha256") for c in registry.get("candidates", []) if c.get("sha256")}

    # Also load golden dataset hashes to prevent duplicate ingestion
    golden = load_json("data/garment/metadata/dataset-v0.3.json")
    for it in golden.get("items", []):
        p = it.get("image_path")
        if os.path.exists(p):
            existing_hashes.add(compute_sha256(p))

    downloaded_count = 0
    discovered_count = 0
    license_verified_count = 0

    headers = {"User-Agent": USER_AGENT}

    for group in QUERY_GROUPS:
        cat = group["category"]
        if downloaded_count >= max_downloads:
            break

        for q in group["queries"]:
            if downloaded_count >= max_downloads:
                break

            print(f"[*] Discovering candidates for category [{cat.upper()}] with query: '{q}'...")
            items = search_wikimedia_commons(q, limit=6)
            discovered_count += len(items)

            for item in items:
                if downloaded_count >= max_downloads:
                    break

                img_url = item.get("url")
                if not img_url or img_url in existing_urls:
                    continue

                existing_urls.add(img_url)

                lic_name = item.get("license_short", "UNKNOWN")
                lic_norm = normalize_license(lic_name)

                candidate_idx = len(registry["candidates"]) + 1
                cand_id = f"cand_net_{int(time.time())}_{candidate_idx:03d}"
                ext_str = os.path.splitext(urllib.parse.urlparse(img_url).path)[1].lower()
                if ext_str not in [".jpg", ".jpeg", ".png", ".webp"]:
                    ext_str = ".jpg"

                dest_path = os.path.join(pending_dir, f"{cand_id}{ext_str}")

                if lic_norm == "PROHIBITED_NON_COMMERCIAL":
                    print(f"    [-] Rejected prohibited NC license: {lic_name} for {item.get('title')}")
                    registry["candidates"].append({
                        "candidate_id": cand_id,
                        "original_url": img_url,
                        "source_url": item.get("description_url"),
                        "source_platform": "wikimedia_commons",
                        "title": item.get("title"),
                        "author": item.get("artist"),
                        "license_name": lic_name,
                        "license_status": "REJECTED",
                        "final_status": "REJECTED",
                        "production_eligible": False
                    })
                    continue

                if lic_norm == "LEGAL_REVIEW_REQUIRED":
                    print(f"    [?] Flagged for legal review: {lic_name} for {item.get('title')}")
                    registry["candidates"].append({
                        "candidate_id": cand_id,
                        "original_url": img_url,
                        "source_url": item.get("description_url"),
                        "source_platform": "wikimedia_commons",
                        "title": item.get("title"),
                        "author": item.get("artist"),
                        "license_name": lic_name,
                        "license_status": "LEGAL_REVIEW_REQUIRED",
                        "final_status": "LEGAL_REVIEW_REQUIRED",
                        "production_eligible": False
                    })
                    continue

                # Approved License: Download candidate binary
                license_verified_count += 1
                try:
                    time.sleep(0.5) # Friendly rate limiting
                    resp = requests.get(img_url, headers=headers, timeout=20, stream=True)
                    if resp.status_code != 200:
                        print(f"    [!] Failed to download ({resp.status_code}): {img_url}")
                        continue

                    # Check Content-Type & Size
                    content_type = resp.headers.get("Content-Type", "")
                    if "image" not in content_type:
                        print(f"    [!] Skipping non-image response: {content_type}")
                        continue

                    with open(dest_path, "wb") as f_out:
                        for chunk in resp.iter_content(chunk_size=32768):
                            f_out.write(chunk)

                    # Compute hash & verify image readable
                    file_sha256 = compute_sha256(dest_path)
                    if file_sha256 in existing_hashes:
                        print(f"    [-] Duplicate hash detected, discarding: {dest_path}")
                        os.remove(dest_path)
                        continue

                    existing_hashes.add(file_sha256)

                    with Image.open(dest_path) as img:
                        w, h = img.size
                        aspect = w / float(h)
                        if w < 128 or h < 128 or aspect < 0.25 or aspect > 4.0:
                            print(f"    [-] Extreme dimension or low res ({w}x{h}), discarding.")
                            os.remove(dest_path)
                            continue

                    downloaded_count += 1
                    print(f"    [+] Successfully acquired candidate {cand_id}: {item.get('title')} ({lic_name}, {w}x{h})")

                    candidate_record = {
                        "candidate_id": cand_id,
                        "image_id": f"garm_net_{candidate_idx:03d}",
                        "garment_group_id": f"group_net_{candidate_idx:03d}",
                        "original_url": img_url,
                        "source_url": item.get("description_url"),
                        "source_platform": "wikimedia_commons",
                        "source_dataset": "wikimedia_commons_fashion_open",
                        "author": item.get("artist"),
                        "title": item.get("title"),
                        "license_name": lic_name,
                        "license_url": item.get("license_url"),
                        "attribution_text": f"Photo '{item.get('title')}' by {item.get('artist')}, licensed under {lic_name} via Wikimedia Commons ({item.get('description_url')})",
                        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "download_path": dest_path,
                        "sha256": file_sha256,
                        "original_dimensions": [w, h],
                        "file_format": ext_str.replace(".", "").upper(),
                        "file_size": os.path.getsize(dest_path),
                        "provenance_status": "COMPLETE",
                        "license_status": lic_norm,
                        "suggested_category": cat,
                        "review_status": "REVIEW_PENDING",
                        "production_eligible": False, # Requires human review before setting True
                        "final_status": "REVIEW_PENDING"
                    }
                    registry["candidates"].append(candidate_record)

                except Exception as e:
                    print(f"    [!] Error downloading/validating candidate: {e}")
                    if os.path.exists(dest_path):
                        os.remove(dest_path)

    registry["summary"] = {
        "total_discovered": discovered_count,
        "total_downloaded": downloaded_count,
        "license_verified": license_verified_count,
        "candidates_logged": len(registry["candidates"]),
        "review_pending": len([c for c in registry["candidates"] if c.get("final_status") == "REVIEW_PENDING"]),
        "rejected": len([c for c in registry["candidates"] if c.get("final_status") == "REJECTED"]),
        "legal_review_required": len([c for c in registry["candidates"] if c.get("final_status") == "LEGAL_REVIEW_REQUIRED"])
    }

    with open(registry_path, "w", encoding="utf-8") as f_reg:
        json.dump(registry, f_reg, indent=2)

    print(f"\n[+] Acquisition Batch Complete.")
    print(f"[+] Discovered: {discovered_count} | License Verified: {license_verified_count} | Downloaded: {downloaded_count}")
    print(f"[+] Staged into: {pending_dir}")
    print(f"[+] Registry updated: {registry_path}")

if __name__ == "__main__":
    max_d = int(sys.argv[1]) if len(sys.argv) > 1 else 15
    target_a = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    acquire_candidates(max_downloads=max_d, target_approved=target_a)
