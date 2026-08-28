# GARMENT-EXP-0009 TRAINING REPORT
## 512-Dimension Intermediate Linear Probe (Phase 11H)

**Experiment ID**: `garment-exp-0009`  
**Execution Timestamp**: `2026-08-28T19:48:33Z`  
**Execution Device**: NVIDIA GeForce GTX 1650 (CUDA 12.6, 4095.69 MB VRAM)  
**Status**: **REAL_PRETRAINED_MODEL_TRAINING_VERIFIED**

---

## 1. Executive Summary & Experiment Objective

`garment-exp-0009` tests whether an intermediate **512-dimensional bottleneck representation** provides a superior capacity/generalization tradeoff compared with the oversized 1152-dimensional head (`garment-exp-0007`, 1.39M parameters) and the aggressive 256-dimensional bottleneck (`garment-exp-0008`, 310K parameters).

### Experimental Hypothesis:
- Exp-0007 ($1152 \to 1152$) severely overfit ($80.62\%$ Train F1 vs $21.67\%$ Blind F1).
- Exp-0008 ($1152 \to 256$) reduced overfitting ($34.78\%$ Train F1 vs $25.00\%$ Blind F1), but collapsed hard-test accuracy to $5.56\%$ due to excessive compression.
- Exp-0009 ($1152 \to 512$) tests the $512$-dim balance with $621,114$ trainable parameters ($6,751$ params/sample on $N=92$).

---

## 2. Model Architecture & Exact Parameter Counts

| Component | Architecture Specification | Trainable Parameters | Status |
| :--- | :--- | :--- | :--- |
| **Vision Backbone** | `google/siglip-so400m-patch14-384` | 0 (Frozen) | MEASURED |
| **Backbone Parameters** | 428,225,600 | 0 (Frozen) | MEASURED |
| **Backbone SHA-256** | `99ef82c091a1a34b20abe7c4b6fa3aff3a95b1e3f38183864fd1b5d1591d678d` | — | MEASURED |
| **`feature_proj`** | `Linear(1152, 512)` + LayerNorm(512) + GELU + Dropout(0.3) | 591,360 | MEASURED |
| **`category_head`** | `Linear(512, 5)` | 2,565 | MEASURED |
| **`fit_head`** | `Linear(512, 6)` | 3,078 | MEASURED |
| **`silhouette_head`**| `Linear(512, 8)` | 4,104 | MEASURED |
| **`color_head`** | `Linear(512, 17)` | 8,721 | MEASURED |
| **`pattern_head`** | `Linear(512, 9)` | 4,617 | MEASURED |
| **`material_head`** | `Linear(512, 12)` | 6,156 | MEASURED |
| **`formality_head`**| `Sequential(Linear(512, 1), Sigmoid)` | 513 | MEASURED |
| **Total Trainable** | Multi-Task Heads | **621,114** | MEASURED |
| **Params / Sample** | Ratio on $N=92$ Training Set | **6,751.24** | MEASURED |

---

## 3. Training Configuration & Execution Dynamics

| Configuration Parameter | Value | Status |
| :--- | :--- | :--- |
| **Backbone Architecture** | `google/siglip-so400m-patch14-384` | MEASURED |
| **Bottleneck Dimension** | 512 | MEASURED |
| **Head Dropout** | 0.3 | MEASURED |
| **Optimizer** | AdamW | MEASURED |
| **Learning Rate** | 0.0005 | MEASURED |
| **Weight Decay** | 0.05 | MEASURED |
| **Batch Size** | 8 | MEASURED |
| **Epochs** | 50 | MEASURED |
| **Scheduler** | Cosine Annealing ($\eta_{\min} = 10^{-5}$) | MEASURED |
| **Total Optimizer Steps**| 600 | MEASURED |
| **Duration** | ~10s on GTX 1650 | MEASURED |
| **Initial Heads Hash** | `976a2a64050a7109ea88655e92101e49c6a22860fbd4df98fa8ad4f5f4fdb584` | MEASURED |
| **Final Heads Hash** | `27c5ac6f56e432b654d249846f88f8924ca3c723b9bcd8ece44ab65d6adfbff9` | MEASURED |
| **Train Loss (E1 → E50)**| $8.9736 \to 1.2115$ | MEASURED |
| **Val Loss (E1 → E50)** | $8.3161 \to 14.3018$ | MEASURED |
| **Best Epoch** | Epoch 1 (Validation Macro F1 = $0.1833$) | MEASURED |
| **Checkpoint SHA-256** | `a62c26f202ab0f12037d5b2c7c73a3affe31c7ab0ff09d80f2b364fde79aeba7` | MEASURED |
| **Checkpoint Size** | 7,478,325 bytes | MEASURED |

---

## 4. Real Measured Evaluation Results (All 5 Splits)

| Metric | Train ($N=92$) | Val ($N=20$) | Blind ($N=20$) | Hard ($N=18$) | Real-World ($N=16$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 46.74% | 5.00% | **30.00%** | **16.67%** | **31.25%** |
| **Color Accuracy** | 40.22% | 20.00% | **15.00%** | **5.56%** | **0.00%** |
| **Fit Accuracy** | 47.83% | 15.00% | **40.00%** | **5.56%** | **18.75%** |
| **Silhouette Acc** | 40.22% | 25.00% | **20.00%** | **11.11%** | **18.75%** |
| **Material Acc** | 34.78% | 15.00% | **5.00%** | **11.11%** | **0.00%** |
| **Pattern Acc** | 54.35% | 30.00% | **20.00%** | **27.78%** | **12.50%** |
| **Macro F1** | 44.02% | 18.33% | **21.67%** | **12.96%** | **13.54%** |
| **Unknown Refusal Rate** | 98.91% | 100.00% | **100.00%** | **100.00%** | **100.00%** |
| **False-Confidence (>0.85)**| 0.00% | 0.00% | **0.00%** | **0.00%** | **0.00%** |

---

## 5. AI Independence & Sovereign Governance Audit

- External Commercial AI APIs: 0 calls
- OpenAI / Anthropic / Gemini / FASHN / Photoroom / Replicate: 0 dependencies
- Pure local execution on NVIDIA GTX 1650 with SigLIP-SO400M open weights.
