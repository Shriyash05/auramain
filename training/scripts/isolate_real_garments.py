import os
from PIL import Image
import rembg

brain_dir = r"C:\Users\shriy\.gemini\antigravity-ide\brain\628c21bf-d57c-402e-9517-c2e5874d4811"
out_dir = r"d:\Personal projects\aura\assets\garments\isolated"
os.makedirs(out_dir, exist_ok=True)

# 1. Isolate Minimalist White Sneakers
sneakers_input = os.path.join(brain_dir, "minimalist_white_sneakers_1789072893493.jpg")
if os.path.exists(sneakers_input):
    print("Isolating Minimalist White Sneakers...")
    img = Image.open(sneakers_input).convert("RGB")
    cutout = rembg.remove(img)
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
    sneakers_out = os.path.join(out_dir, "low_sneakers.png")
    cutout.save(sneakers_out, "PNG")
    print(f"Saved: {sneakers_out} | Size: {cutout.size} | Mode: {cutout.mode} | Alpha: {cutout.getextrema()[3]}")

# 2. Isolate Chunky Leather Loafers
loafers_input = os.path.join(brain_dir, "chunky_leather_loafers_1789072910196.jpg")
if os.path.exists(loafers_input):
    print("Isolating Chunky Leather Loafers...")
    img = Image.open(loafers_input).convert("RGB")
    cutout = rembg.remove(img)
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
    loafers_out = os.path.join(out_dir, "leather_loafers.png")
    cutout.save(loafers_out, "PNG")
    print(f"Saved: {loafers_out} | Size: {cutout.size} | Mode: {cutout.mode} | Alpha: {cutout.getextrema()[3]}")

# 3. Isolate Vintage Denim Jeans
jeans_input = os.path.join(brain_dir, "vintage_denim_jeans_1789072926673.jpg")
if os.path.exists(jeans_input):
    print("Isolating Vintage Denim Jeans...")
    img = Image.open(jeans_input).convert("RGB")
    cutout = rembg.remove(img)
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
    jeans_out = os.path.join(out_dir, "vintage_denim.png")
    cutout.save(jeans_out, "PNG")
    print(f"Saved: {jeans_out} | Size: {cutout.size} | Mode: {cutout.mode} | Alpha: {cutout.getextrema()[3]}")

# 4. Clean Tailored Blazer (remove arm on upper right)
blazer_path = os.path.join(out_dir, "tailored_blazer.png")
if os.path.exists(blazer_path):
    print("Cleaning Tailored Blazer...")
    img = Image.open(blazer_path).convert("RGBA")
    w, h = img.size
    # The arm is in the top right quadrant extending to top edge
    # Mask any pixels where y < 220 and x > 320 (the arm)
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            # Arm area: above the hanger shoulder line towards right
            if y < 220 and x > 300:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(blazer_path, "PNG")
    print(f"Saved Clean Blazer: {blazer_path} | Size: {img.size}")

# 5. Clean Heavyweight Boxy Tee (use genuine HRX true garment cutout or make black tee)
hrx_cutout_path = r"d:\Personal projects\aura\training\data-audits\phase17b\samples\hrx_true_garment_cutout.png"
if os.path.exists(hrx_cutout_path):
    print("Setting up clean isolated tee...")
    tee_img = Image.open(hrx_cutout_path).convert("RGBA")
    tee_out = os.path.join(out_dir, "boxy_tee.png")
    tee_img.save(tee_out, "PNG")
    print(f"Saved Clean Tee: {tee_out} | Size: {tee_img.size}")

# 6. Wool Coat: isolate only the coat from the woman photo
wool_coat_path = os.path.join(out_dir, "wool_coat.png")
if os.path.exists(wool_coat_path):
    print("Cleaning Wool Coat to garment only...")
    img = Image.open(wool_coat_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()
    # Remove head/neck (y < 120) and legs/feet (y > 850)
    for y in range(h):
        for x in range(w):
            if y < 120 or y > 850:
                pixels[x, y] = (0, 0, 0, 0)
            # Remove hands if needed (around y: 460-540, x < 100 or x > 350)
            if 460 <= y <= 540 and (x < 75 or x > 355):
                pixels[x, y] = (0, 0, 0, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(wool_coat_path, "PNG")
    print(f"Saved Clean Wool Coat: {wool_coat_path} | Size: {img.size}")

print("\nIsolation script finished successfully!")
