import json
import os
from PIL import Image

manifest_path = "data/garment/metadata/dataset-v0.3.json"
manifest = json.load(open(manifest_path, "r", encoding="utf-8"))
items = [i for i in manifest["items"] if i.get("split") == "real_world_test"]

print(f"Total Real World Items: {len(items)}")
for it in items:
    img_p = it["image_path"]
    exists = os.path.exists(img_p)
    if exists:
        im = Image.open(img_p)
        print(f"ID: {it['image_id']:12s} | Cat: {it['labels']['category']:12s} | Subcat: {it['labels'].get('subcategory',''):15s} | Size: {im.size} | Context: {it.get('real_world_context','')} | Path: {img_p}")
    else:
        print(f"ID: {it['image_id']} MISSING at {img_p}")
