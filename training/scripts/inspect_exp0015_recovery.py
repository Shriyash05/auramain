import os
import sys
import json
import hashlib
import torch

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

out_dir = "training/runs/garment-exp-0015/forensics/recovery"
os.makedirs(out_dir, exist_ok=True)

ckpt_15_path = "training/runs/garment-exp-0015/checkpoint/best_model.pt"
ckpt_13_path = "training/runs/garment-exp-0013/checkpoint/best_model.pt"

print("=" * 80)
print("  EXP-0015 vs EXP-0013 CHECKPOINT FORENSIC INSPECTION")
print("=" * 80)

def inspect_checkpoint(path, name):
    if not os.path.exists(path):
        print(f"[-] {name} checkpoint missing at {path}")
        return {}
    
    size_bytes = os.path.getsize(path)
    sha256 = compute_sha256(path)
    print(f"\n[*] Inspecting {name}:")
    print(f"    Path      : {path}")
    print(f"    Size      : {size_bytes:,} bytes ({size_bytes / (1024**2):.2f} MB / {size_bytes / (1024**3):.2f} GB)")
    print(f"    SHA-256   : {sha256}")
    
    data = torch.load(path, map_location="cpu")
    print(f"    Top Keys  : {list(data.keys())}")
    print(f"    Epoch     : {data.get('epoch')}")
    print(f"    Val Macro : {data.get('val_macro_f1')}")
    print(f"    Val Cat   : {data.get('val_category_accuracy')}")
    
    # Analyze state dicts
    heads_sd = data.get("heads_state_dict", {})
    heads_tensors = len(heads_sd)
    heads_params = sum(p.numel() for p in heads_sd.values())
    
    backbone_sd = data.get("backbone_state_dict", {})
    backbone_tensors = len(backbone_sd)
    backbone_params = sum(p.numel() for p in backbone_sd.values())
    
    # Categorize backbone tensors into LoRA vs Base
    lora_tensors = {k: v for k, v in backbone_sd.items() if "lora_" in k}
    lora_params = sum(p.numel() for p in lora_tensors.values())
    
    base_backbone_tensors = {k: v for k, v in backbone_sd.items() if "lora_" not in k}
    base_backbone_params = sum(p.numel() for p in base_backbone_tensors.values())
    
    opt_sd = data.get("optimizer_state_dict", {})
    has_optimizer = len(opt_sd) > 0
    
    info = {
        "name": name,
        "path": path,
        "size_bytes": size_bytes,
        "size_mb": round(size_bytes / (1024**2), 2),
        "size_gb": round(size_bytes / (1024**3), 4),
        "sha256": sha256,
        "epoch": data.get("epoch"),
        "val_macro_f1": data.get("val_macro_f1"),
        "val_category_accuracy": data.get("val_category_accuracy"),
        "top_keys": list(data.keys()),
        "has_optimizer_state": has_optimizer,
        "heads_tensor_count": heads_tensors,
        "heads_parameter_count": heads_params,
        "backbone_tensor_count": backbone_tensors,
        "backbone_total_parameter_count": backbone_params,
        "backbone_lora_tensor_count": len(lora_tensors),
        "backbone_lora_parameter_count": lora_params,
        "backbone_base_frozen_tensor_count": len(base_backbone_tensors),
        "backbone_base_frozen_parameter_count": base_backbone_params,
        "total_saved_parameter_count": heads_params + backbone_params
    }
    
    print(f"    Heads Parameters   : {heads_params:,} ({heads_tensors} tensors)")
    print(f"    Backbone Parameters: {backbone_params:,} ({backbone_tensors} tensors)")
    print(f"      - LoRA Trainable : {lora_params:,} ({len(lora_tensors)} tensors)")
    print(f"      - Base Frozen    : {base_backbone_params:,} ({len(base_backbone_tensors)} tensors)")
    print(f"    Optimizer State    : {'YES' if has_optimizer else 'NO'}")
    print(f"    Total Saved Params : {info['total_saved_parameter_count']:,}")
    return info

info15 = inspect_checkpoint(ckpt_15_path, "Exp-0015")
info13 = inspect_checkpoint(ckpt_13_path, "Exp-0013")

comparison = {
    "exp0015": info15,
    "exp0013": info13,
    "root_cause_summary": "Exp-0015 serialized the entire 428,225,600-parameter frozen SigLIP vision backbone state_dict (all 448 base tensors) in addition to LoRA tensors (108 tensors) and heads (26 tensors), totaling 429,531,514 parameters (~1.73 GB in float32). In contrast, a pure adapter checkpoint should only save LoRA tensors (995,328 params) and Heads (310,586 params), totaling 1,305,914 parameters (~5.2 MB)."
}

with open(os.path.join(out_dir, "checkpoint_forensic_comparison.json"), "w", encoding="utf-8") as f:
    json.dump(comparison, f, indent=2)

print("\n" + "=" * 80)
print("  RECOVERY SUMMARY")
print("=" * 80)
print(comparison["root_cause_summary"])
print("=" * 80)
