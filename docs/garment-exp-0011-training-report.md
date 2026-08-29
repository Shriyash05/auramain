# AURA Garment Experiment 0011 — Training Execution Report

**Experiment ID:** `garment-exp-0011`  
**Run Directory:** `training/runs/garment-exp-0011`  
**Date:** 2026-08-29  
**Hardware:** NVIDIA GeForce GTX 1650 (4095.69 MB VRAM) / CUDA 12.6  
**Status:** **REAL PRETRAINED GPU RUN — FORENSICALLY VERIFIED**

---

## 1. Model Configuration & Trainable Parameters
- **Backbone Architecture:** `google/siglip-so400m-patch14-384` ($428,225,600$ total parameters)
- **Trainability Configuration:**
  - Layers 0..25: **FROZEN** ($397,745,440$ parameters)
  - Layer 26 + Post LayerNorm + Trainable Blocks: **UNFROZEN** ($30,480,160$ parameters)
- **Multi-Task Head Architecture:** `AuraLightweightHeads` ($1152 \to 256$ bottleneck, $310,586$ parameters, dropout $0.3$)
- **Total Trainable Parameters:** **30,790,746** (Backbone: $30,480,160$, Heads: $310,586$)
- **Learning Rates:** Backbone $\text{lr}=10^{-5}$, Heads $\text{lr}=5\times 10^{-4}$
- **Batch Size & Precision:** Batch Size 4, Gradient Accumulation 2 (effective batch size 8), FP16 Mixed Precision

---

## 2. Forensic Parameter Verification
- **Backbone Weight SHA-256:** `99ef82c091a1a34b6b69c4c5cebb12d8a562efbfa4081079d8468b69da39ce3d`
- **Initial Heads Parameter Hash:** `b4326ad7e5f0880186161f102b4cac7a8a9fa2a490a2c385fe740adff7d9cb48`
- **Final Heads Parameter Hash:** `e602af03b2f3125016db36fd5c991d6502331e7a14273c9589b59967653ac06c`
- **Checkpoint Path:** `training/runs/garment-exp-0011/checkpoint/best_model.pt`
- **Checkpoint Size:** 1,960,695,280 bytes
- **Checkpoint SHA-256:** `60f0a9f05c17d0e22d8a39a71f09d6a9244a46be682c68659c2bbc59757c2cb9`

---

## 3. Training Dynamics & Loss Progression
- **Total Epochs:** 20
- **Total Optimizer Steps:** 240
- **Best Validation Epoch:** Epoch 2 (Validation Macro F1: `0.1667`, Category Top-1: `15.00%`)
- **Final Train Loss:** 2.1310 (down from 9.1667 in Epoch 1)
- **Final Validation Loss:** 10.2305
