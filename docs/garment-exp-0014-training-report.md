# GARMENT-EXP-0014 TRAINING REPORT
## Frozen SigLIP-SO400M Control on Dataset-v0.5-500 (Phase 13A)

**Experiment ID**: `garment-exp-0014`  
**Execution Timestamp**: `2026-08-30T14:23:54Z`  
**Execution Device**: NVIDIA GeForce GTX 1650 (CUDA 12.6, 4,095.69 MB VRAM)  
**Primary Control**: `garment-exp-0012` (250-sample frozen control)  
**Status**: **REAL_PRETRAINED_MODEL_TRAINING_VERIFIED**

---

## 1. Executive Summary & Objective

`garment-exp-0014` is the formal **Data Scaling Control Baseline** on the 500-milestone dataset (`dataset-v0.5-500.json`). It measures the empirical effect of scaling the production training/validation corpus from 250 to 500 physical garment assets while holding the model architecture, hyperparameters, and optimization procedure strictly constant with `garment-exp-0012`.

### Scientific Objective:
Determine whether doubling the dataset scale from 250 ($N=230$ train, $N=20$ val) to 500 ($N=459$ train, $N=41$ val) with stratified category distribution (tops, bottoms, outerwear, one-piece, shoes, accessories) improves representation quality and out-of-distribution classification accuracy across all 5 evaluation splits without architectural modification.

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
| **Total Trainable** | Multi-Task Lightweight Heads | **310,586** | MEASURED |
| **Trainable Ratio** | Trainable / Total Model Parameters | **0.0725%** | MEASURED |

---

## 3. Training Dynamics & Checkpoint Evidence

| Metric / Record | Measured Value | Verification Status |
| :--- | :--- | :--- |
| **Optimizer** | AdamW ($\text{lr} = 0.0005$, $\text{weight\_decay} = 0.05$) | VERIFIED |
| **Batch Size / Epochs** | $16$ / $50$ | VERIFIED |
| **Total Optimizer Steps**| 1,450 | VERIFIED |
| **Initial Heads Hash** | `b4326ad7e5f0880186161f102b4cac7a8a9fa2a490a2c385fe740adff7d9cb48` | VERIFIED |
| **Final Heads Hash** | `ce62473c05d48f35c712bc0e2d878b01afc20ec5d828d691e3d131a0715975ac` | VERIFIED (Changed) |
| **Train Loss (E1 → E50)**| $8.7134 \to 0.4728$ | VERIFIED (Monotonic descent) |
| **Best Epoch** | Epoch 2 (Validation Macro F1 = **0.4634**) | VERIFIED |
| **Best Val Category Acc**| **63.41%** (Epoch 2) | VERIFIED |
| **Checkpoint Path** | `training/runs/garment-exp-0014/checkpoint/best_model.pt` | VERIFIED |
| **Checkpoint Size** | 3,752,309 bytes | VERIFIED |
| **Checkpoint SHA-256** | `a9d5a95c393bd2622ec4709055916b3ef1b645baf5155cf25fac4740f8f4a39e` | VERIFIED |

---

## 4. Real Measured Evaluation Results (All 5 Splits)

| Metric | Train ($N=459$) | Val ($N=41$) | Blind Test ($N=20$) | Hard Test ($N=18$) | Real-World Test ($N=16$) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 86.06% (395/459) | 63.41% (26/41) | **45.00% (9/20)** | 16.67% (3/18) | 12.50% (2/16) |
| **Color Accuracy** | 47.49% (218/459) | 39.02% (16/41) | **25.00% (5/20)** | 5.56% (1/18) | 6.25% (1/16) |
| **Fit Accuracy** | 85.62% (393/459) | 56.10% (23/41) | **40.00% (8/20)** | 22.22% (4/18) | 25.00% (4/16) |
| **Silhouette Acc** | 79.52% (365/459) | 51.22% (21/41) | **35.00% (7/20)** | 5.56% (1/18) | 18.75% (3/16) |
| **Material Acc** | 69.93% (321/459) | 56.10% (23/41) | **25.00% (5/20)** | 11.11% (2/18) | 6.25% (1/16) |
| **Pattern Acc** | 76.03% (349/459) | 12.20% (5/41) | 20.00% (4/20) | 22.22% (4/18) | 25.00% (4/16) |
| **Macro F1** | **74.11%** | **46.34%** | **31.67%** | **13.89%** | **15.62%** |
| **Refusal Rate (<0.65)**| 52.29% | 68.29% | 90.00% | 100.00% | 93.75% |
| **False-Confidence (>0.85)**| 0.00% | 0.00% | 0.00% | 0.00% | 0.00% |

---

## 5. Key Forensic Audit Findings

1. **Dataset Integrity Preserved**:
   - `data/garment/metadata/dataset-v0.5-500.json` SHA-256: `85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e` (100% INTACT).
   - `data/garment/metadata/dataset-v0.3-blind-freeze.json` SHA-256: `5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd` (FROZEN BLIND INTACT).
2. **Zero Backbone Drift**:
   - Initial backbone weight hash == Final backbone weight hash (`99ef82c0...`). Backbone remained 100% frozen.
3. **No Commercial AI API Dependencies**:
   - All feature extraction and loss optimization executed locally on PyTorch with CUDA acceleration.
