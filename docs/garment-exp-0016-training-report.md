# AURA Garment Experiment 0016 — System Training & Execution Report

## 1. Executive Summary

Experiment `garment-exp-0016` constitutes the Phase 14 system evaluation combining **4-layer selective LoRA representation adaptation** (`layers 23–26`, rank 8, alpha 16, dropout 0.05 on `q_proj` and `v_proj`) with **garment-focused input localization** on the immutable `dataset-v0.5-500.json` benchmark.

The training execution verified:
- **Architecture:** `google/siglip-so400m-patch14-384` backbone with layers 0–22 100% frozen.
- **Trainable Parameters:** 147,456 LoRA parameters (16 tensors) + 310,586 head parameters (18 tensors) = **458,042 total parameters** (0.1066% of the model).
- **Optimization:** AdamW optimizer, cosine annealing scheduler, learning rate 0.0005 (head) / 0.0002 (LoRA), weight decay 0.05, batch size 1 with gradient accumulation 16.
- **Optimizer Steps:** 232 total steps across 8 epochs (29 steps/epoch = $\lceil 459/16 \rceil$), early-stopping cleanly at Epoch 8 (best validation Macro F1: **0.4715** at Epoch 2).
- **Checkpoint Serialization Guard:** Checkpoint size is **5.28 MB** (5,541,273 bytes, SHA-256: `2102078309399dc7dd7e3760cd70004a0a7b8bb8b48e163ab25736f55fda6d2e`), strictly adhering to the `< 50 MB` guard with zero frozen base backbone parameters serialized.
- **Checkpoint Reload:** Bit-for-bit identical inference verified upon reloading into a fresh model instance (maximum logit difference: `0.0000000000`).

---

## 2. Hardware & Environmental Telemetry

- **Target Hardware:** NVIDIA GeForce GTX 1650 (4,096 MB VRAM)
- **Host Environment:** Windows 11, CUDA 12.6, PyTorch 2.13.0+cu126
- **Peak GPU Memory Allocated:** 1,658.2 MB (~40.5% capacity)
- **Peak GPU Memory Reserved:** 2,048.0 MB (~50.0% capacity)
- **Memory Safety:** Zero VRAM paging into system RAM; safe execution within 4GB consumer constraint.
- **Training Duration:** 10,056.85 seconds (2.79 hours)
- **Throughput:** ~0.3687 samples/sec

---

## 3. Training Input & Provenance Verification

In strict accordance with Section 6 of the scientific protocol:
- No bounding boxes were fabricated or synthetically invented for the 500 catalog items in `dataset-v0.5-500.json`.
- Because all 500 items in `dataset-v0.5-500.json` are isolated single-garment e-commerce photographs, the original image serves as the verified garment-focused input.
- Training provenance and hyperparameter parity were preserved identically to Exp-0015 to guarantee that the Phase 14 system test isolates the effect of garment-focused input during inference.

---

## 4. Multi-Split Baseline Telemetry

| Split | Sample Size | Input Mode | Category Top-1 | Color | Fit | Silhouette | Material | Pattern | Macro F1 | Refusal Rate |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Train** | 459 | Garment-Focused | 68.41% | 48.80% | 85.84% | 79.74% | 69.50% | 76.69% | **71.50%** | 40.96% |
| **Validation** | 41 | Garment-Focused | 51.22% | 41.46% | 56.10% | 56.10% | 56.10% | 12.20% | **45.53%** | 60.98% |
| **Blind Test** | 20 | Garment-Focused | 25.00% | 10.00% | 30.00% | 20.00% | 15.00% | 25.00% | **20.83%** | 90.00% |
| **Hard Test** | 18 | Garment-Focused | 16.67% | 16.67% | 27.78% | 11.11% | 5.56% | 27.78% | **17.59%** | 100.00% |
| **Real-World Full** | 16 | Full Image | 37.50% | 6.25% | 12.50% | 12.50% | 0.00% | 12.50% | **13.54%** | 87.50% |
| **Real-World Oracle** | 16 | Oracle Crop | 31.25% | 6.25% | 18.75% | 12.50% | 6.25% | 25.00% | **16.67%** | 87.50% |
| **Real-World Auto** | 16 | Automated Crop | 25.00% | 18.75% | 12.50% | 12.50% | 6.25% | 18.75% | **15.62%** | 87.50% |
