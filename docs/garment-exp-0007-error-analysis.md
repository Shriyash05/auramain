# GARMENT-EXP-0007 ERROR ANALYSIS
## Empirical Failure Modes & Bottlenecks

**Experiment**: `garment-exp-0007`  
**Dataset**: AURA-Garment-Golden-v0.3 ($N=166$)  

---

## 1. Overview of Failure Modes

Analysis of the split predictions (`train_predictions.json`, `validation_predictions.json`, `blind_test_predictions.json`, `hard_test_predictions.json`, `real_world_test_predictions.json`) identifies three primary root causes of errors in `garment-exp-0007`:

1. **Parameter-to-Sample Ratio (Head Overfitting)**:
   - *Issue*: Training $1,397,434$ parameters across 7 heads on only $N=92$ training samples causes severe memorization of the training set (Train Macro F1 $80.62\%$ vs Val Macro F1 $16.67\%$).
   - *Remedy for next phase*: Linear probing without wide intermediate projection, stronger weight decay ($L_2$ regularization $\ge 0.01$), and bottleneck dimensionality reduction ($1152 \to 256$).

2. **Fine-Grained Attribute Ambiguity (Material & Silhouette)**:
   - *Issue*: While category accuracy achieved $35\%$ on Blind Test and $78.26\%$ on Train, material classification on unaugmented test images remained below $15\%$. Texture cues (cotton vs linen vs silk) in $384\times 384$ crops without high-frequency zoom require specialized fine-grained texture adapters.

3. **Domain Shift in Real-World Test Split ($N=16$)**:
   - *Issue*: Real-world images have complex backgrounds, non-standard lighting, wrinkles, and partial occlusions. The model without data augmentation (color jitter, affine transforms, random cropping) struggles to transfer cleanly from clean studio images to informal selfie/hanger shots.

---

## 2. Quantitative Error Distribution

```
Blind Test Error Breakdown (N=20 samples):
- Correct Top-1 Category: 7 / 20 (35.0%)
- Confident Misclassifications: 8 / 20 (40.0%)
  (e.g., blazer predicted as outerwear or tops)
- Low-Confidence Refusals: 5 / 20 (25.0%)
  (Entropy threshold triggered 'unknown' category)
```

---

## 3. Recommendations for Next Iterations

1. **Adopt Linear Probing / Lightweight Heads**:
   Direct linear projections ($1152 \to K$) eliminate $95\%$ of head parameters, preventing rapid overfitting on small golden dataset regimes.
2. **Feature Augmentation**:
   Apply feature jitter / embedding dropout during cached embedding training to simulate data augmentations in feature space.
3. **Multi-Scale Feature Aggregation**:
   Incorporate multi-layer patch tokens from SigLIP rather than solely using the final pooled embedding for fine-grained attributes like pattern and material.
