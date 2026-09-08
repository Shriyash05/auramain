"""
AURA Phase 13D-R Preflight Verification Script
Verifies:
1. Dataset 500 hash and sample counts (459 train, 41 val)
2. Blind test checksum
3. Hardware CUDA availability
4. Resets runs/garment-exp-0015 for clean rerun
"""

import os
import sys
import json
import hashlib
import shutil
import torch

BLIND_FREEZE_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"
DATASET_500_SHA256 = "85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e"

def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def preflight():
    print("=" * 80)
    print("  AURA — PHASE 13D-R PREFLIGHT VERIFICATION")
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

    # 3. GPU Check
    if not torch.cuda.is_available():
        print("[FATAL] CUDA is not available!")
        sys.exit(1)
    gpu_name = torch.cuda.get_device_name(0)
    vram_mb = torch.cuda.get_device_properties(0).total_memory / (1024**2)
    print(f"[+] GPU Hardware     : {gpu_name} ({vram_mb:.0f} MB VRAM)")

    # 4. Clean Run Directory (preserving recovery forensics)
    run_dir = "training/runs/garment-exp-0015"
    ckpt_dir = os.path.join(run_dir, "checkpoint")
    eval_dir = os.path.join(run_dir, "evaluations")
    
    if os.path.exists(ckpt_dir):
        shutil.rmtree(ckpt_dir)
    if os.path.exists(eval_dir):
        shutil.rmtree(eval_dir)
    os.makedirs(ckpt_dir, exist_ok=True)
    os.makedirs(eval_dir, exist_ok=True)

    # Remove old log / heartbeat files
    for fname in ["training_log.json", "training_heartbeat.json", "metrics.json", "selected_checkpoint.json", "environment.json"]:
        p = os.path.join(run_dir, fname)
        if os.path.exists(p):
            os.remove(p)

    print(f"[+] Run directory reset for clean rerun: {run_dir}")
    print("=" * 80)
    print("[+] PREFLIGHT PASSED — READY FOR CLEAN EXP-0015 RERUN")
    print("=" * 80)

if __name__ == "__main__":
    preflight()
