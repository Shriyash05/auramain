import os
import base64
import io
from PIL import Image

iso_dir = r"d:\Personal projects\aura\assets\garments\isolated"
seed_files = {
    "wool_coat": "wool_coat.png",
    "tailored_blazer": "tailored_blazer.png",
    "cotton_oxford": "cotton_oxford.png",
    "boxy_tee": "boxy_tee.png",
    "wide_trousers": "wide_trousers.png",
    "vintage_denim": "vintage_denim.png",
    "leather_loafers": "leather_loafers.png",
    "low_sneakers": "low_sneakers.png",
    "leather_crossbody": "leather_crossbody.png"
}

ts_lines = [
    "/**",
    " * Seed Garment Isolated Cutouts",
    " * Pre-compiled, genuine transparent RGBA PNG assets.",
    " * Zero human model, zero background, 100% single isolated garments.",
    " */",
    "export const SEED_GARMENT_CUTOUTS: Record<string, string> = {"
]

for key, fname in seed_files.items():
    p = os.path.join(iso_dir, fname)
    img = Image.open(p).convert("RGBA")
    # Resize keeping aspect ratio so max dim is 500
    img.thumbnail((500, 500), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"
    ts_lines.append(f"  {key}: '{data_uri}',")
    print(f"{key}: thumbnail={img.size}, b64_len={len(b64)}")

ts_lines.append("};")
ts_lines.append("")

out_ts = r"d:\Personal projects\aura\src\constants\seedGarmentAssets.ts"
with open(out_ts, "w", encoding="utf-8") as f:
    f.write("\n".join(ts_lines))

print(f"\nWrote seedGarmentAssets.ts ({os.path.getsize(out_ts)} bytes)")
