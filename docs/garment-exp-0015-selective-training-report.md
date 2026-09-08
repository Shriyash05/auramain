# AURA Garment Experiment 0015 — Selective-Layer LoRA Training Report

## 1. Executive Summary

Experiment `garment-exp-0015` represents the first computationally practical parameter-efficient fine-tuning (LoRA) experiment executed on the immutable 500-sample garment dataset (`dataset-v0.5-500.json`). Guided by the Phase 13D.2 architectural micro-benchmark, LoRA adapters (rank 8, alpha 16, dropout 0.05) were targeted exclusively to the attention query (`q_proj`) and value (`v_proj`) projections of the **last 4 transformer blocks (layers 23–26)** of `google/siglip-so400m-patch14-384`, while keeping layers 0–22 completely frozen.

Training completed cleanly on consumer GPU hardware (NVIDIA GeForce GTX 1650 4GB VRAM) in **2.79 hours (10,056.85 seconds)** across 8 executed epochs, terminating via validation early stopping (patience = 6) after validation Macro F1 peaked at **0.4715** (Validation Category: **60.98%**) in Epoch 2. Checkpoint serialization was strictly hardened, saving only 16 LoRA tensors and 18 classification head tensors totaling **5.28 MB** (zero frozen backbone weights serialized; well under the 50 MB guard). Bit-for-bit identical inference was verified upon checkpoint reloading.

---

## 2. Hardware & Runtime Telemetry

- **GPU:** NVIDIA GeForce GTX 1650 (4,096 MB VRAM)
- **Host System:** Windows 11 / CUDA 12.6 / PyTorch 2.13.0+cu126
- **Peak VRAM Allocated:** 1,658.2 MB (~40.5% capacity)
- **Peak VRAM Reserved:** 2,048.0 MB (~50.0% capacity)
- **Zero VRAM Spilling:** No host paging into system memory observed
- **Total Training Duration:** 10,056.85 s (2.79 hours)
- **Average Epoch Duration:** 1,257.1 s (~20.95 minutes/epoch)
- **Average Throughput:** ~0.3687 samples/sec

---

## 3. Architecture & Parameter Accounting

| Component | Modules / Blocks | Trainable Tensors | Trainable Parameters | Status |
|:---|:---:|:---:|---:|:---:|
| **Vision Backbone Base** | Layers 0–22 (23 blocks) | 0 | 0 | 100% Frozen |
| **Vision Backbone Base** | Layers 23–26 (4 blocks) | 0 | 0 | 100% Frozen |
| **LoRA Adapters** | Layers 23–26 (`q_proj`, `v_proj`) | 16 | 147,456 | Trainable |
| **Classification Heads** | 1152 $\to$ 256 Bottleneck + 7 Heads | 18 | 310,586 | Trainable |
| **Total Model Parameters** | 27 Transformer Blocks + Heads | 34 | **458,042** | **0.1066% of Model** |
| **Total Frozen Parameters** | Layers 0–26 Base Weights | 448 | 428,225,600 | 99.8934% of Model |

---

## 4. Optimizer Accumulation Audit & Training Curve

- **Effective Batch Size:** Batch size = 1, Gradient accumulation = 16 $\to$ 16 samples per optimizer step.
- **Batches per Epoch:** 459 batches.
- **Optimizer Steps per Epoch:** Exactly 29 updates ($28 \times 16 + 1 \times 11 = 459$).
- **Total Cumulative Optimizer Steps:** 232 steps ($8 \times 29 = 232$).

### Epoch Progress
| Epoch | Train Loss | Val Loss | Val Macro F1 | Val Category Acc | Val Color Acc | Cumulative Steps | Epoch Duration |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | 8.6903 | 9.3574 | 0.4350 | 43.9% | 53.7% | 29 | 1,262 s |
| **2\*** | **6.0719** | **8.3910** | **0.4715** | **61.0%** | **41.5%** | **58** | **1,254 s** |
| **3** | 4.9194 | 8.4945 | 0.4390 | 63.4% | 22.0% | 87 | 1,256 s |
| **4** | 4.1373 | 8.4482 | 0.4309 | 61.0% | 22.0% | 116 | 1,255 s |
| **5** | 3.5990 | 8.6387 | 0.4472 | 61.0% | 29.3% | 145 | 1,258 s |
| **6** | 3.0668 | 8.7688 | 0.4350 | 58.5% | 26.8% | 174 | 1,257 s |
| **7** | 2.6623 | 8.9815 | 0.4309 | 56.1% | 24.4% | 203 | 1,256 s |
| **8** | 2.2725 | 9.1640 | 0.4512 | 56.1% | 31.7% | 232 | 1,245 s |

\* *Epoch 2 selected as best checkpoint based on highest validation Macro F1 (0.4715). Early stopping cleanly terminated execution at Epoch 8 after 6 non-improving epochs.*

---

## 5. Checkpoint Verification & Bit-for-Bit Reload

- **Selected Checkpoint Path:** `training/runs/garment-exp-0015/checkpoint/best_model.pt`
- **File Size:** 5,541,273 bytes (**5.28 MB**) — conforming strictly to the `< 50 MB` guard.
- **SHA-256 Checksum:** `2102078309399dc7dd7e3760cd70004a0a7b8bb8b48e163ab25736f55fda6d2e`
- **Weight Delta Proof:**
  - Initial Heads SHA-256: `b4326ad7e5f0880186161f102b4cac7a8a9fa2a490a2c385fe740adff7d9cb48`
  - Final Heads SHA-256: `cabdcf2f30151cc83b7b7524712c0aa4997198c6d57a228f8fa84fddaa2fb040`
  - Initial LoRA Backbone SHA-256: `0896da91a378cc6b6f045e3df2c791fcb518acbb861545b43642e1efe5878467`
  - Final LoRA Backbone SHA-256: `cdcc7080e0529b72d2bac0a3992dcab2e68bde27645d1374544510885aadb5f2`
- **Reload Inference Parity:** Instantiating a fresh model and reloading the saved state dictionary yielded a maximum absolute logit difference of **0.0000000000** on fixed validation samples.
