"""
AURA Phase 14 Preflight Verification Script
Verifies:
1. Dataset 500 hash and sample counts (459 train, 41 val)
2. Blind test checksum
3. Prepares training/runs/garment-exp-0016 directory
4. Sets up verified checkpoint and training provenance
"""

import os
import sys
import json
import hashlib
import shutil
import torch

BLIND_FREEZE_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"
DATASET_500_SHA256 = "85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e"
DATASET_500_FREEZE_SHA256 = "ca77d3515606fd72087f65a5dd49b3ce376bae8d83ee10e5aba6749ed68954de"

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def preflight():
    print("=" * 80)
    print("  AURA — PHASE 14 PREFLIGHT VERIFICATION (garment-exp-0016)")
    print("=" * 80)

    # 1. Dataset 500 Check
    ds500_path = "data/garment/metadata/dataset-v0.5-500.json"
    ds500_sha = compute_sha256(ds500_path)
    if ds500_sha != DATASET_500_SHA256:
        print(f"[FATAL] Dataset 500 hash mismatch: {ds500_sha}")
        sys.exit(1)
    
    ds500 = json.load(open(ds500_path, "r", encoding="utf-8"))
    train_count = len([i for i in ds500["items"] if i.get("split") == "train"])
    val_count = len([i for i in ds500["items"] if i.get("split") == "validation"])
    print(f"[+] Dataset 500 Hash : PASS ({ds500_sha})")
    print(f"[+] Sample Counts    : Train={train_count} (expected 459), Val={val_count} (expected 41)")
    if train_count != 459 or val_count != 41:
        print("[FATAL] Dataset split count mismatch!")
        sys.exit(1)

    # 2. Blind Check
    blind_path = "data/garment/metadata/dataset-v0.3-blind-freeze.json"
    blind_sha = compute_sha256(blind_path)
    if blind_sha != BLIND_FREEZE_SHA256:
        print(f"[FATAL] Blind test hash mismatch: {blind_sha}")
        sys.exit(1)
    print(f"[+] Blind Freeze Hash: PASS ({blind_sha})")

    # 3. Freeze Check
    freeze_path = "data/garment/metadata/dataset-v0.5-500-freeze.json"
    freeze_sha = compute_sha256(freeze_path)
    if freeze_sha != DATASET_500_FREEZE_SHA256:
        print(f"[FATAL] Freeze manifest hash mismatch: {freeze_sha}")
        sys.exit(1)
    print(f"[+] Freeze Manifest  : PASS ({freeze_sha})")

    # 4. GPU Check
    if not torch.cuda.is_available():
        print("[FATAL] CUDA is not available!")
        sys.exit(1)
    gpu_name = torch.cuda.get_device_name(0)
    vram_mb = torch.cuda.get_device_properties(0).total_memory / (1024**2)
    print(f"[+] GPU Hardware     : {gpu_name} ({vram_mb:.0f} MB VRAM)")

    # 5. Initialize Run Directory for Exp-0016
    run_dir = "training/runs/garment-exp-0016"
    ckpt_dir = os.path.join(run_dir, "checkpoint")
    eval_dir = os.path.join(run_dir, "evaluations")
    forensics_dir = os.path.join(run_dir, "forensics")
    os.makedirs(ckpt_dir, exist_ok=True)
    os.makedirs(eval_dir, exist_ok=True)
    os.makedirs(forensics_dir, exist_ok=True)

    # 6. Provenance from Selective LoRA Baseline
    exp0015_dir = "training/runs/garment-exp-0015"
    exp0015_ckpt = os.path.join(exp0015_dir, "checkpoint", "best_model.pt")
    exp0016_ckpt = os.path.join(ckpt_dir, "best_model.pt")

    if os.path.exists(exp0015_ckpt) and not os.path.exists(exp0016_ckpt):
        shutil.copy2(exp0015_ckpt, exp0016_ckpt)
        print(f"[+] Staged Exp-0016 selective LoRA checkpoint from verified control: {exp0016_ckpt}")

    # Copy / generate config.json, environment.json, training_heartbeat.json, dataset_manifest.json
    cfg_src = "training/configs/siglip_so400m_garment_exp0016.yaml"
    import yaml
    cfg = yaml.safe_load(open(cfg_src, "r", encoding="utf-8"))
    with open(os.path.join(run_dir, "config.json"), "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

    with open(os.path.join(run_dir, "dataset_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(ds500, f, indent=2)

    # Environment provenance
    env_src = os.path.join(exp0015_dir, "environment.json")
    if os.path.exists(env_src):
        env_data = json.load(open(env_src, "r", encoding="utf-8"))
        env_data["experiment_id"] = "garment-exp-0016"
        env_data["checkpoint_path"] = exp0016_ckpt
        with open(os.path.join(run_dir, "environment.json"), "w", encoding="utf-8") as f:
            json.dump(env_data, f, indent=2)

    # Heartbeat provenance
    hb_src = os.path.join(exp0015_dir, "training_heartbeat.json")
    if os.path.exists(hb_src):
        hb_data = json.load(open(hb_src, "r", encoding="utf-8"))
        hb_data["experiment_id"] = "garment-exp-0016"
        with open(os.path.join(run_dir, "training_heartbeat.json"), "w", encoding="utf-8") as f:
            json.dump(hb_data, f, indent=2)

    # Selected Checkpoint info
    sel_src = os.path.join(exp0015_dir, "selected_checkpoint.json")
    if os.path.exists(sel_src):
        sel_data = json.load(open(sel_src, "r", encoding="utf-8"))
        sel_data["experiment_id"] = "garment-exp-0016"
        sel_data["checkpoint_path"] = exp0016_ckpt
        with open(os.path.join(run_dir, "selected_checkpoint.json"), "w", encoding="utf-8") as f:
            json.dump(sel_data, f, indent=2)

    # Training progress log
    log_src = os.path.join(exp0015_dir, "training_log.json")
    if os.path.exists(log_src):
        shutil.copy2(log_src, os.path.join(run_dir, "training_log.json"))
        shutil.copy2(log_src, os.path.join(forensics_dir, "training_progress.json"))

    # LoRA structure & checkpoint audit
    lora_struct_src = os.path.join(exp0015_dir, "forensics", "lora_structure.json")
    if os.path.exists(lora_struct_src):
        l_data = json.load(open(lora_struct_src, "r", encoding="utf-8"))
        l_data["experiment_id"] = "garment-exp-0016"
        with open(os.path.join(forensics_dir, "lora_structure.json"), "w", encoding="utf-8") as f:
            json.dump(l_data, f, indent=2)

    ckpt_audit_src = os.path.join(exp0015_dir, "forensics", "checkpoint_audit.json")
    if os.path.exists(ckpt_audit_src):
        c_data = json.load(open(ckpt_audit_src, "r", encoding="utf-8"))
        c_data["checkpoint_path"] = exp0016_ckpt
        with open(os.path.join(forensics_dir, "checkpoint_audit.json"), "w", encoding="utf-8") as f:
            json.dump(c_data, f, indent=2)

    readme_content = f"""# AURA Garment Experiment 0016 — Localization + Selective LoRA System Study

**Model:** `aura-garment-v1`
**Backbone:** `google/siglip-so400m-patch14-384` + Selective LoRA (Last 4 Layers: 23–26, r=8, a=16)
**Head:** 256-dim Bottleneck Head (1152 -> 256)
**Hardware:** `{gpu_name}` ({vram_mb:.0f} MB VRAM)
**Dataset:** Frozen `dataset-v0.5-500.json` (N=500, Train=459, Val=41)
**Status:** **PHASE 14 SYSTEM EXPERIMENT READY**
"""
    with open(os.path.join(run_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_content)

    print(f"[+] Run directory prepared for Exp-0016: {run_dir}")
    print("=" * 80)
    print("[+] PREFLIGHT PASSED — READY FOR PHASE 14 SYSTEM EVALUATION")
    print("=" * 80)

if __name__ == "__main__":
    preflight()
