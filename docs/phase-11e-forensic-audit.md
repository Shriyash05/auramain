# AURA Phase 11E — Forensic Architecture, Dataset & Preprocessing Audit

**Product:** AURA  
**Document:** Forensic Root-Cause Analysis of Experiment `garment-exp-0006`  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ROOT CAUSE PROVEN & AUDIT COMPLETE**  

---

## 1. Executive Summary & Root-Cause Determination

A forensic investigation was conducted to determine why `garment-exp-0006` achieved poor generalization (Blind Macro F1: $0.1667$, Category Top-1: $25\%$).

### PRIMARY ROOT CAUSE:
**ARCHITECTURE & PRETRAINED WEIGHT DEFICIENCY (`A` & `B`)**  
The vision backbone in [`training/scripts/train_garment_classifier.py`](file:///d:/Personal%20projects/aura/training/scripts/train_garment_classifier.py) (`AuraFeatureExtractor`) was a **randomly initialized 2-layer Conv2d module with frozen parameters (`requires_grad=False`)**. It did NOT load pretrained vision weights from `google/siglip-so400m-patch14-384`. Consequently, the multi-task linear classification heads were trained on static, random noise embeddings.

---

## 2. Step-by-Step Forensic Findings

### Step 1: Model Architecture & Pretrained Weight Verification
- **Model Class:** `AuraGarmentClassifier`
- **Backbone Class:** `AuraFeatureExtractor`
- **Pretrained Weights Loaded:** **FALSE** (Random initialization).
- **Parameter Breakdown:** Total: **22,732,986**, Trainable: **1,397,434**, Frozen: **21,335,552**.
- **Audit Finding:** Freezing untrained random weights collapses image representations into non-separable clusters.

### Step 2: Model Output & Confidence Analysis
- **Unique Predicted Categories (Validation Split):** All 5 categories predicted ({0, 1, 2, 3, 4}).
- **Mean Confidence:** **0.4568** (Reflects expected model uncertainty on random feature embeddings).

### Step 3: Dataset Balance & Integrity
- **Physical Assets on Disk:** **166 verified images** ($100\%$).
- **Class Balance:**
  - `Train (N=92)`: Tops (19), Bottoms (19), Outerwear (18), Shoes (18), Accessories (18).
  - `Validation (N=20)`: Tops (4), Bottoms (4), Outerwear (4), Shoes (4), Accessories (4).
  - `Blind Test (N=20)`: Tops (4), Bottoms (4), Outerwear (4), Shoes (4), Accessories (4).
- **Split Leakage:** **ZERO** ($0$ overlap across all splits).

### Step 4: Preprocessing Alignment
- **Train / Eval Preprocessing:** **100% Identical** (`Resize(384, 384) + ToTensor() + Normalize(ImageNet)`).
- **Note:** Standard SigLIP uses $[-1, 1]$ normalization; ImageNet normalization was applied, which is a minor discrepancy overshadowed by the lack of pretrained weights.

### Step 5: Label -> Index Bijective Consistency
- Canonical taxonomy mapping index integrity was verified ($100\%$ bijective consistency between class names and integer indices).

### Step 6: Train Split Evaluation (Memorization vs Capacity)
- Evaluating `best_model.pt` on the **Training Split ($N=92$)** yielded only **70.65% Category Top-1 Accuracy** ($65/92$).
- **Diagnosis:** The linear heads could not even memorize the training dataset because the frozen random feature space does not provide linearly separable manifold representations.

### Step 7: Controlled Sanity Overfitting Test
- When feature extraction weights were made trainable on a small subset ($N=8$ images), the model reached **100.0% Category Accuracy** ($8/8$) in 25 epochs.
- **Proof:** The multi-task loss function, backward pass, and optimizer math are completely sound.

---

## 3. Conclusions & Readiness for Phase 11F (`garment-exp-0007`)

1. `garment-exp-0006` remains preserved in [`docs/garment-experiments.md`](file:///d:/Personal%20projects/aura/docs/garment-experiments.md) as the first real GPU execution baseline.
2. The exact root cause of poor performance is **proven to be the lack of pretrained vision weights in the frozen feature extractor**.
3. In Phase 11F (`garment-exp-0007`), loading actual pretrained vision representations (or enabling lightweight end-to-end backbone tuning) will unlock genuine semantic classification.
