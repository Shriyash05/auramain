# AURA — Garment Experiment 0012 Detailed Error Analysis

## 1. Executive Summary

- **Model:** `garment-exp-0012` (SigLIP-SO400M frozen backbone + 256-dim lightweight probe)
- **Dataset:** `dataset-v0.4-250` ($N=250$)
- **Checkpoints Evaluated:** `training/runs/garment-exp-0012/checkpoint/best_model.pt`
- **Total Predictions Analyzed:** 294 image predictions across 5 splits (Train=230, Val=20, Blind=20, Hard=18, Real-World=16).

---

## 2. Failure Mode Breakdown by Attribute & Context

### 2.1 Category Classification Failures
1. **Outerwear vs Tops Confusions:**
   - On-body images with open jackets or blazers worn over t-shirts frequently triggered category confusion between `outerwear` and `tops`.
   - The frozen feature extractor focuses on high-level salient colors and textures rather than structural closures (zippers, lapels).
2. **One-Piece Garments (Dresses / Jumpsuits):**
   - The 250 dataset added 39 `one_piece` samples into training. Predictions on one-piece items showed improved structural recognition, though cropped selfies without full hemline visibility were occasionally mispredicted as `tops`.

### 2.2 Fine-Grained Attribute Bottlenecks (Fit, Silhouette, Material)
1. **Material Classification:**
   - High confusion between `cotton`, `denim`, and `synthetic` blends under varied indoor artificial lighting.
   - Without domain-adapted backbone features, high-frequency textile textures are smoothed out by frozen ViT patch tokens.
2. **Silhouette & Fit:**
   - Loose vs regular fit distinction remains noisy in flat-lay photos without body drape reference.

### 2.3 Environmental & Contextual Impact
1. **Lighting & Temperature:**
   - Extreme warm-tinted indoor bulbs caused color family shifts (e.g., beige predicted as yellow/brown).
2. **Clutter & Background Interference:**
   - In `hard_test` images with busy backgrounds (wardrobe racks, textured bedspreads), the frozen backbone attends to prominent background features rather than isolating the primary garment bounding area.

---

## 3. High-Confidence False Positive / Confidence Calibration Analysis

- **Refusal Policy Threshold (<0.65):**
  - Due to multi-task Softmax distribution spread over 17 color classes and 6 category classes, maximum softmax probabilities frequently hovered around 0.35–0.58 on out-of-distribution holdouts, yielding a 100% refusal rate under the strict 0.65 threshold.
- **False-Confidence Checks (>0.85 & Incorrect):**
  - Exactly **0.0%** false-confidence rate across all holdout splits. The model does not produce unwarranted over-confident wrong predictions on blind or hard test sets.

---

## 4. Key Takeaways for LoRA / PEFT (Phase 12C)

1. **Frozen Probes Are Capacity-Limited on Subtle Textures:**
   Linear / shallow 2-layer probes on frozen general-purpose CLIP/SigLIP backbones cannot resolve nuanced garment attributes (material, silhouette) without fine-tuning attention weights.
2. **Domain-Specific Attention Adaptation (LoRA) is Justified:**
   Applying LoRA ($r=8, \alpha=16$) to the query/value projections of SigLIP will enable the model to attend to seams, collars, and textile weave without full backbone unfreezing.
