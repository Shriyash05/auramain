# GARMENT-EXP-0010 TRAINING REPORT
## Loss-Weighted Multi-Task 256-Dimensional Linear Probe (Phase 11I)

**Experiment ID**: `garment-exp-0010`  
**Execution Timestamp**: `2026-08-28T20:08:31Z`  
**Execution Device**: NVIDIA GeForce GTX 1650 (CUDA 12.6, 4095.69 MB VRAM)  
**Primary Control**: `garment-exp-0008` (Equal/baseline loss weights)  
**Status**: **REAL_PRETRAINED_MODEL_TRAINING_VERIFIED**

---

## 1. Executive Summary & Objective

`garment-exp-0010` tests whether **asymmetric multi-task loss weighting** can improve fine-grained attribute recognition (especially material, color, pattern) while maintaining the compact, anti-overfitting 256-dimensional probe architecture from `garment-exp-0008`.

### Scientific Hypothesis:
In equal-weighted multi-task learning on small datasets ($N=92$), high-gradient structural tasks (category, fit) dominate gradient updates, starving subtle texture/color features. By increasing relative loss pressure on Material ($1.50\times$), Color ($1.25\times$), and Pattern ($1.10\times$), while moderately attenuating Fit ($0.75\times$), Silhouette ($0.75\times$), and Formality ($0.75\times$), we hypothesize improved fine-grained attribute learning without expanding model parameter capacity.

---

## 2. Model Architecture & Exact Parameter Counts

| Component | Architecture Specification | Trainable Parameters | Status |
| :--- | :--- | :--- | :--- |
| **Vision Backbone** | `google/siglip-so400m-patch14-384` | 0 (Frozen) | MEASURED |
| **Backbone Parameters** | 428,225,600 | 0 (Frozen) | MEASURED |
| **Backbone SHA-256** | `99ef82c091a1a34b20abe7c4b6fa3aff3a95b1e3f38183864fd1b5d1591d678d` | — | MEASURED |
| **`feature_proj`** | `Linear(1152, 256)` + LayerNorm(256) + GELU + Dropout(0.3) | 295,680 | MEASURED |
| **`category_head`** | `Linear(256, 5)` | 1,285 | MEASURED |
| **`fit_head`** | `Linear(256, 6)` | 1,542 | MEASURED |
| **`silhouette_head`**| `Linear(256, 8)` | 2,056 | MEASURED |
| **`color_head`** | `Linear(256, 17)` | 4,369 | MEASURED |
| **`pattern_head`** | `Linear(256, 9)` | 2,313 | MEASURED |
| **`material_head`** | `Linear(256, 12)` | 3,084 | MEASURED |
| **`formality_head`**| `Sequential(Linear(256, 1), Sigmoid)` | 257 | MEASURED |
| **Total Trainable** | Multi-Task Heads | **310,586** | MEASURED |
| **Params / Sample** | Ratio on $N=92$ Training Set | **3,375.93** | MEASURED |

---

## 3. Loss Weights Vector Configuration

| Task Head | Loss Weight ($w_i$) | Rationale | Status |
| :--- | :--- | :--- | :--- |
| **Category** | **1.00** | Anchor classification task | MEASURED |
| **Fit** | **0.75** | Structural attribute; moderate gradient attenuation | MEASURED |
| **Silhouette** | **0.75** | Structural attribute; moderate gradient attenuation | MEASURED |
| **Color Family** | **1.25** | High-variance chromatic attribute; increased gradient focus | MEASURED |
| **Pattern** | **1.10** | Textile texture/geometric attribute; increased gradient focus | MEASURED |
| **Material** | **1.50** | Fine-grained tactile attribute; primary targeted recovery | MEASURED |
| **Formality** | **0.75** | Scalar regression; moderate gradient attenuation | MEASURED |

---

## 4. Training Dynamics & Checkpoint Evidence

| Metric / Record | Value | Status |
| :--- | :--- | :--- |
| **Optimizer** | AdamW ($\text{lr} = 0.0005$, $\text{weight\_decay} = 0.05$) | MEASURED |
| **Batch Size / Epochs** | $8$ / $50$ | MEASURED |
| **Total Optimizer Steps**| 600 | MEASURED |
| **Initial Heads Hash** | `b4326ad7e5f0880186161f102b4cac7a8a9fa2a490a2c385fe740adff7d9cb48` | MEASURED |
| **Final Heads Hash** | `3f63c76eab01e67ad0e0adfd018973f5c698595c214369f3a90d9b95c3abde2f` | MEASURED |
| **Train Loss (E1 → E50)**| $14.0638 \to 2.3563$ | MEASURED |
| **Val Loss (E1 → E50)** | $12.6916 \to 18.4469$ | MEASURED |
| **Best Epoch** | Epoch 1 (Validation Macro F1 = **0.2083**) | MEASURED |
| **Checkpoint Path** | `training/runs/garment-exp-0010/checkpoint/best_model.pt` | MEASURED |
| **Checkpoint Size** | 3,752,181 bytes | MEASURED |
| **Checkpoint SHA-256** | `222ed000e0890d596bb8d6e6304ab2585a79167cac8817efabc510566cc645df` | MEASURED |

---

## 5. Real Measured Evaluation Results (All 5 Splits)

| Metric | Train ($N=92$) | Val ($N=20$) | Blind ($N=20$) | Hard ($N=18$) | Real-World ($N=16$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 33.70% (31/92) | 25.00% (5/20) | 20.00% (4/20) | 5.56% (1/18) | 25.00% (4/16) |
| **Color Accuracy** | 36.96% (34/92) | 5.00% (1/20) | 15.00% (3/20) | 11.11% (2/18) | 18.75% (3/16) |
| **Fit Accuracy** | 35.87% (33/92) | 35.00% (7/20) | 20.00% (4/20) | 5.56% (1/18) | 18.75% (3/16) |
| **Silhouette Acc** | 28.26% (26/92) | 20.00% (4/20) | 15.00% (3/20) | 16.67% (3/18) | 18.75% (3/16) |
| **Material Acc** | 33.70% (31/92) | 15.00% (3/20) | 10.00% (2/20) | 11.11% (2/18) | **25.00% (4/16)** |
| **Pattern Acc** | 39.13% (36/92) | 25.00% (5/20) | 30.00% (6/20) | 27.78% (5/18) | 18.75% (3/16) |
| **Macro F1** | 34.60% | **20.83%** | 18.33% | 12.96% | **20.83%** |
| **Unknown Refusal Rate** | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% |
| **False-Confidence (>0.85)**| 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |

---

## 6. AI Independence Audit

- External Commercial AI APIs: 0 calls
- OpenAI / Anthropic / Gemini / FASHN / Photoroom / Replicate: 0 dependencies
- Pure local open-weight execution on NVIDIA GeForce GTX 1650.
