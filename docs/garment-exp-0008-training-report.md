# GARMENT-EXP-0008 TRAINING REPORT
## Lightweight Regularized Linear Probe (Phase 11G)

**Experiment ID**: `garment-exp-0008`  
**Status**: **REAL_PRETRAINED_MODEL_TRAINING_VERIFIED**  
**Device**: NVIDIA GeForce GTX 1650 (CUDA 12.6, 4095.69 MB VRAM)

---

## 1. Experiment Objective

Test whether a **small, regularized classification head** generalizes better than the oversized head used in Exp-0007.

**Hypothesis**: Exp-0007 suffered severe overfitting because 1,397,434 trainable parameters were trained on only 92 samples (15,190:1 ratio). A 256-dim bottleneck with higher dropout and weight decay should reduce overfitting.

---

## 2. Architecture

| Component | Exp-0007 (Baseline) | Exp-0008 (This Experiment) |
| :--- | :--- | :--- |
| **Vision Backbone** | `google/siglip-so400m-patch14-384` (frozen) | `google/siglip-so400m-patch14-384` (frozen) |
| **Backbone Parameters** | 428,225,600 (frozen) | 428,225,600 (frozen) |
| **Backbone Weight SHA-256** | `99ef82c091a1a34b...` | `99ef82c091a1a34b...` (identical) |
| **Feature Projection** | `Linear(1152, 1152)` + LayerNorm + GELU | `Linear(1152, 256)` + LayerNorm + GELU |
| **Head Architecture** | `Linear(1152, K)` per task | `Linear(256, K)` per task |
| **Dropout** | 0.1 | **0.3** |
| **Trainable Parameters** | 1,397,434 | **310,586** (77.8% reduction) |
| **Params / Training Sample** | 15,190 | **3,376** |

---

## 3. Training Configuration

| Parameter | Value |
| :--- | :--- |
| **Optimizer** | AdamW |
| **Learning Rate** | 0.0005 |
| **Weight Decay** | 0.05 (5× stronger than Exp-0007) |
| **Batch Size** | 8 |
| **Epochs** | 50 |
| **Scheduler** | Cosine Annealing (eta_min=1e-5) |
| **Seed** | 42 |
| **Train Samples** | 92 |
| **Validation Samples** | 20 |

---

## 4. Training Dynamics

| Metric | Value | Status |
| :--- | :--- | :--- |
| **Optimizer Steps** | 600 | MEASURED |
| **Duration** | ~10s | MEASURED |
| **Train Loss (Epoch 1)** | 9.1966 | MEASURED |
| **Train Loss (Epoch 50)** | 1.5623 | MEASURED |
| **Val Loss (Epoch 1)** | 8.3676 | MEASURED |
| **Val Loss (Epoch 50)** | 12.2895 | MEASURED |
| **Best Epoch** | 1 | MEASURED |
| **Best Val Macro F1** | 0.1833 | MEASURED |
| **Initial Heads Hash** | `b4326ad7e5f08801...` | MEASURED |
| **Final Heads Hash** | `77f6cce0f11b29fc...` | MEASURED |
| **Checkpoint SHA-256** | `e97f4e2e97564f85...` | MEASURED |
| **Checkpoint Size** | 3,751,989 bytes | MEASURED |

**Key Observation**: The best checkpoint was selected at **Epoch 1**. Validation loss increased monotonically after Epoch 1, indicating that even with 77.8% fewer parameters, the model still overfits rapidly on N=92 samples.

---

## 5. Real Measured Evaluation Results (All 5 Splits)

| Metric | Train (N=92) | Val (N=20) | Blind (N=20) | Hard (N=18) | Real-World (N=16) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 39.13% | 25.00% | **30.00%** | 5.56% | **31.25%** |
| **Color Accuracy** | 39.13% | 10.00% | **20.00%** | 11.11% | **18.75%** |
| **Fit Accuracy** | 42.39% | 15.00% | **30.00%** | 11.11% | **18.75%** |
| **Silhouette Accuracy** | 32.61% | 25.00% | **25.00%** | 22.22% | 18.75% |
| **Material Accuracy** | 17.39% | 15.00% | **15.00%** | 11.11% | **18.75%** |
| **Pattern Accuracy** | 38.04% | 20.00% | **30.00%** | 22.22% | **18.75%** |
| **Macro F1** | 34.78% | 18.33% | **25.00%** | 13.89% | **20.83%** |
| **Unknown Refusal Rate** | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% |

All metrics are **REAL_MEASURED** from actual GPU inference on the Exp-0008 checkpoint.

---

## 6. AI Independence Audit

- OpenAI: 0 references
- Anthropic / Claude: 0 references
- Gemini: 0 references
- FASHN / Photoroom / Replicate: 0 references
- **Status: PASS — Zero Commercial AI APIs**
