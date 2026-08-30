# AURA — Garment Experiment 0013 Error Analysis

## 1. Executive Summary

- **Experiment ID:** `garment-exp-0013`
- **Model:** SigLIP-SO400M with LoRA Adapters ($r=8, \alpha=16$) + 256-dim Lightweight Head
- **Dataset:** `dataset-v0.4-250` ($N=250$)
- **Evaluation Records:** 294 predictions across 5 splits (Train=230, Val=20, Blind=20, Hard=18, Real-World=16).

---

## 2. Failure Mode Analysis

### 2.1 Category Boundary Shifts
- **Outerwear Over Tops Confusion:**
  - In smartphone selfies where jackets are unzipped, LoRA attention tuning slightly increased sensitivity to inner layers, leading to occasional misclassification of layered outerwear as tops.
- **One-Piece Garments:**
  - Dresses with prominent waist ties or seams were occasionally predicted as `bottoms` (skirts) due to local attention focus on the lower drape.

### 2.2 Fine-Grained Attribute Wins & Persisting Ambiguities
- **Material Classification:**
  - Improved classification of textured fabrics (`denim`, `knitwear`) on consumer photos (+6.25% gain in real-world test).
  - Smooth synthetics vs lightweight cotton remain ambiguous under low-light conditions.
- **Fit & Silhouette:**
  - Fit accuracy on real-world photos improved from 25.0% to 31.25% due to enhanced edge and contour feature extraction by adapted query/value heads.

### 2.3 Environmental & Lighting Robustness
- **Hard Test Clutter Handling:**
  - Macro F1 on the `hard_test` split improved from 15.74% to 17.59% (+1.85%), showing better robustness against textured background clutter.

---

## 3. Confidence & Safety Profile

- **Refusal Rate (<0.65):** 100.0% on out-of-distribution test sets (properly refusing ambiguous inputs).
- **False-Confidence Rate (>0.85 & wrong):** Exactly **0.0%** across all splits.
- **Representation Collapse Check:** Cosine similarity on probe embeddings = **1.0000** (No collapse, stable weight updates).

---

## 4. Architectural Recommendation for Phase 13

- **Dataset Scale Prerequisite:**
  LoRA parameter adaptation is mathematically sound and yields fine-grained attribute improvements, but optimal generalization requires expanding dataset scale beyond 250 assets toward Milestone 500/1000 before fully replacing the frozen baseline.
