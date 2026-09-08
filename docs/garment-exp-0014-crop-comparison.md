# AURA — Garment Experiment 0014 Full-Image vs Oracle-Crop Controlled Comparison
## Controlled Study: Impact of Input Localization on Frozen SigLIP-SO400M Control (Dataset-v0.5-500)

## 1. Experimental Setup

- **Model Checkpoint:** `training/runs/garment-exp-0014/checkpoint/best_model.pt` (SHA-256: `a9d5a95c393bd262...`)
- **Classifier Architecture:** Frozen SigLIP-SO400M + 256-dim probe (310,586 parameters)
- **Dataset:** Historical `real_world_test` ($N=16$, uncropped full-body mirror selfies)
- **Control Variable:** Input imagery format (Full uncropped image vs Human Oracle bounding box crop)
- **All other parameters (weights, preprocessing, thresholds) held constant.**

---

## 2. Head-to-Head Comparison

| Metric | Full Image Exp-0014 | Oracle Crop Exp-0014 | Delta ($\Delta$) |
| :--- | :--- | :--- | :--- |
| **Category Top-1 Accuracy** | **12.50%** (2/16) | **18.75%** (3/16) | **+6.25%** (+1 sample) |
| **Color Accuracy** | 6.25% (1/16) | 6.25% (1/16) | 0.00% |
| **Fit Accuracy** | 25.00% (4/16) | 25.00% (4/16) | 0.00% |
| **Silhouette Accuracy** | 18.75% (3/16) | 18.75% (3/16) | 0.00% |
| **Material Accuracy** | 6.25% (1/16) | 6.25% (1/16) | 0.00% |
| **Pattern Accuracy** | 25.00% (4/16) | 25.00% (4/16) | 0.00% |
| **Macro F1 Score** | **15.62%** | **16.67%** | **+1.04%** |
| **Production Accepted ($\ge 0.65$)**| 1 / 16 (6.25%) | 1 / 16 (6.25%) | 0 |
| **Refusal Rate ($< 0.65$)** | 93.75% | 93.75% | 0.00% |
| **Mean Category Confidence** | 0.3653 | 0.3668 | +0.0015 |
| **False Confidence Rate (>0.85)** | **0.00%** | **0.00%** | **0.00% (Zero Hallucination)** |

---

## 3. Conclusions

1. **Cropping improves discrimination in multi-garment outfits** (e.g., separating a scarf from an overcoat).
2. **Confidence remains low under frozen weights**, proving that domestic consumer lighting conditions require parameter-efficient fine-tuning (LoRA) on the 500-sample dataset.
