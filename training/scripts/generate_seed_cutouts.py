import os
import io
import urllib.request
from PIL import Image
import rembg

SEED_ITEMS = [
    {
        "key": "wool_coat",
        "url": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop",
        "category": "outerwear",
        "name": "Structured Wool Coat"
    },
    {
        "key": "tailored_blazer",
        "url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop",
        "category": "outerwear",
        "name": "Classic Tailored Blazer"
    },
    {
        "key": "cotton_oxford",
        "url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop",
        "category": "tops",
        "name": "Oversized Cotton Oxford"
    },
    {
        "key": "boxy_tee",
        "url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
        "category": "tops",
        "name": "Heavyweight Boxy Tee"
    },
    {
        "key": "wide_trousers",
        "url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop",
        "category": "bottoms",
        "name": "Pleated Wide-Leg Trousers"
    },
    {
        "key": "vintage_denim",
        "url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop",
        "category": "bottoms",
        "name": "Straight-Fit Vintage Denim"
    },
    {
        "key": "leather_loafers",
        "url": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop",
        "category": "shoes",
        "name": "Chunky Leather Loafers"
    },
    {
        "key": "low_sneakers",
        "url": "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop",
        "category": "shoes",
        "name": "Minimalist Low Sneakers"
    },
    {
        "key": "leather_crossbody",
        "url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop",
        "category": "accessories",
        "name": "Structured Leather Crossbody"
    }
]

out_dir = os.path.join(r"d:\Personal projects\aura", "assets", "garments", "isolated")
os.makedirs(out_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

print(f"Isolating {len(SEED_ITEMS)} seed garments into {out_dir}...", flush=True)

for item in SEED_ITEMS:
    key = item["key"]
    url = item["url"]
    out_file = os.path.join(out_dir, f"{key}.png")
    
    print(f"\nProcessing {item['name']} ({key})...", flush=True)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw_data = resp.read()
        
        img = Image.open(io.BytesIO(raw_data)).convert("RGB")
        # Run background removal using default cached u2net
        cutout = rembg.remove(img)
        
        # Crop tightly to non-zero alpha bounding box
        bbox = cutout.getbbox()
        if bbox:
            cutout = cutout.crop(bbox)
        
        cutout.save(out_file, "PNG")
        
        extrema = cutout.getextrema()
        alpha_extrema = extrema[3] if len(extrema) == 4 else None
        print(f"  Saved: {out_file} | Size: {cutout.size} | Mode: {cutout.mode} | Alpha: {alpha_extrema}", flush=True)
    except Exception as e:
        print(f"  Error processing {key}: {e}", flush=True)

print("\nFinished isolating seed garments.", flush=True)
