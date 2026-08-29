# AURA Garment Experiment 0011 — Forensic Error Analysis Report

**Experiment ID:** `garment-exp-0011`  
**Checkpoint:** `training/runs/garment-exp-0011/checkpoint/best_model.pt`  
**Checkpoint SHA-256:** `60f0a9f05c17d0e22d8a39a71f09d6a9244a46be682c68659c2bbc59757c2cb9`

---

## 1. Split-by-Split Error Breakdown

### A. Frozen Blind Test Split (N=20)
- **Category Performance:** 7 / 20 correct (**35.00%**).
  - *Correct classifications:* `tops` (t-shirt, sweatshirt, jacket), `bottoms` (jeans, trousers), `one_piece` (dress).
  - *Primary failure mode:* Subtly layered garments and outerwear misclassified as `tops` instead of `outerwear` due to limited outer layer training examples.
- **Attribute Classification:**
  - *Color:* 3 / 20 correct (15.00%) — Multi-color and dark patterned items confused with solid black/navy.
  - *Fit:* 4 / 20 correct (20.00%) — Over-predicting `Regular` fit.
  - *Silhouette:* 5 / 20 correct (25.00%).
  - *Material:* 2 / 20 correct (10.00%) — Silk/viscose confused with synthetic/cotton.
  - *Pattern:* 4 / 20 correct (20.00%).

### B. Adversarial Hard Test Split (N=18)
- **Category Performance:** 2 / 18 correct (**11.11%**).
  - *Failure mode:* Wrinkled and folded garments cause texture distortion in the adapted layer.
- **Attribute Performance:**
  - Silhouette accuracy fell to 0.00% under occlusion and non-flat folds.

### C. Real-World Consumer Test Split (N=16)
- **Category Performance:** 2 / 16 correct (**12.50%**).
  - *Failure mode:* Background clutter, indoor tungsten lighting, and on-body perspectives diverge from studio flat-lay training samples.

---

## 2. Representation Adaptation vs Frozen Backbone Diagnostics

| Diagnostic Metric | Base Pretrained SigLIP | Exp-0011 Adapted SigLIP | Assessment |
| :--- | :--- | :--- | :--- |
| **Embedding Norm** | 20.5879 | 20.3987 | Stable ($\Delta = -0.1892$) |
| **Cosine Similarity to Base** | 1.0000 | 0.994037 | Preserved ($> 0.99$) |
| **Catastrophic Forgetting** | N/A | **FALSE** | Pretrained capability intact |
| **Train Category Accuracy** | 34.78% (Exp-0008) | 59.78% | Effective task alignment |

---

## 3. Recommendations for Next ML Phases
1. **Expand In-House & Permissive Data Pool:** Ingest Tier A and Tier B assets using `audit_training_pool.py` to scale training samples beyond $N=92$.
2. **Context Diversity Augmentation:** Add consumer lighting and on-body perspectives to the training split.
3. **Multi-Layer LoRA Pilot:** Evaluate rank-8 or rank-16 Low-Rank Adaptation across attention query/value projections.
