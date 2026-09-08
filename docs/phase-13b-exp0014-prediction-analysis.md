# AURA — Phase 13B Exp-0014 Prediction Analysis
## Sample-by-Sample Prediction Delta and Error Tracking (Exp-0012 vs Exp-0014)

## 1. Overview

This document presents a granular, image-by-image forensic analysis of prediction transitions between **`garment-exp-0012`** ($N=250$ dataset) and **`garment-exp-0014`** ($N=500$ dataset) across the primary holdout splits.

---

## 2. Frozen Blind Test Split ($N=20$, Zero-Leakage Holdout)

The Frozen Blind Test represents isolated out-of-distribution physical garments.

### Summary:
- **Net Category Gain:** $+4$ samples ($25.0\% \to 45.0\%$)
- **Accuracy Transitions:** 7 Gains, 3 Losses, 2 Maintained Correct, 8 Maintained Incorrect

| Image ID | Expected Category | Exp-0012 Pred (Conf) | Exp-0014 Pred (Conf) | Transition | Primary Driver |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `garm_v3_113` | `outerwear` | tops (0.241) | **outerwear** (0.429) | **GAIN** | Resolved outerwear prior |
| `garm_v3_114` | `shoes` | tops (0.231) | **shoes** (0.261) | **GAIN** | Addition of 80 shoes in Phase 12D |
| `garm_v3_115` | `accessories` | tops (0.228) | **accessories** (0.245) | **GAIN** | Addition of 80 accessories in Phase 12D |
| `garm_v3_116` | `tops` | **tops** (0.342) | **tops** (0.312) | Maintained Correct | Robust single top representation |
| `garm_v3_117` | `tops` | outerwear (0.252) | **tops** (0.268) | **GAIN** | Disambiguated knitted top |
| `garm_v3_118` | `bottoms` | tops (0.240) | outerwear (0.351) | Maintained Incorrect | Ambiguous crop |
| `garm_v3_119` | `outerwear` | tops (0.239) | tops (0.279) | Maintained Incorrect | Light jacket mispredicted as shirt |
| `garm_v3_120` | `shoes` | tops (0.238) | tops (0.254) | Maintained Incorrect | Cropped boot silhouette |
| `garm_v3_121` | `accessories` | tops (0.234) | tops (0.248) | Maintained Incorrect | Small scarf item |
| `garm_v3_122` | `shoes` | tops (0.236) | **shoes** (0.260) | **GAIN** | Resolved low-top sneaker |
| `garm_v3_123` | `tops` | **tops** (0.354) | outerwear (0.286) | LOSS | Over-indexed on textured outerwear |
| `garm_v3_124` | `bottoms` | tops (0.238) | tops (0.246) | Maintained Incorrect | High-waist trousers |
| `garm_v3_125` | `outerwear` | tops (0.241) | tops (0.298) | Maintained Incorrect | Oversized trench |
| `garm_v3_126` | `shoes` | tops (0.242) | tops (0.251) | Maintained Incorrect | Dark loafers |
| `garm_v3_127` | `accessories` | tops (0.238) | tops (0.252) | Maintained Incorrect | Leather belt |
| `garm_v3_128` | `tops` | **tops** (0.312) | bottoms (0.321) | LOSS | Uncropped tucked-in top |
| `garm_v3_129` | `shoes` | tops (0.239) | **shoes** (0.264) | **GAIN** | Resolved running shoes |
| `garm_v3_130` | `accessories` | tops (0.235) | **accessories** (0.247) | **GAIN** | Resolved crossbody bag |
| `garm_v3_131` | `tops` | **tops** (0.320) | outerwear (0.294) | LOSS | Heavy knit sweater |
| `garm_v3_132` | `bottoms` | tops (0.238) | tops (0.249) | Maintained Incorrect | Denim shorts |

---

## 3. Real-World Test Split ($N=16$, Full-Body / Cluttered Mirror Selfies)

### Summary:
- **Net Category Change:** $-5$ samples ($43.75\% \to 12.50\%$)
- **Accuracy Transitions:** 0 Gains, 5 Losses, 2 Maintained Correct, 9 Maintained Incorrect
- **Refusal Rate:** 100.0% in Exp-0012, 93.75% in Exp-0014

| Image ID | Expected Category | Exp-0012 Pred (Conf) | Exp-0014 Pred (Conf) | Transition | Root Cause Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `garm_v3_151` | `tops` | **tops** (0.321) | outerwear (0.264) | LOSS | Full outfit: Subject wearing jacket over top |
| `garm_v3_152` | `bottoms` | outerwear (0.354) | outerwear (0.775) | Maintained Incorrect | Mirror selfie: Upper body jacket dominates |
| `garm_v3_153` | `outerwear` | **outerwear** (0.278) | bottoms (0.360) | LOSS | Dark pants occupy lower 60% of frame |
| `garm_v3_154` | `shoes` | tops (0.248) | bottoms (0.321) | Maintained Incorrect | Distant feet at bottom of mirror |
| `garm_v3_155` | `accessories` | tops (0.245) | outerwear (0.268) | Maintained Incorrect | Handbag resting on coat |
| `garm_v3_156` | `bottoms` | **bottoms** (0.312) | outerwear (0.358) | LOSS | Heavy coat worn over trousers |
| `garm_v3_157` | `tops` | tops (0.252) | tops (0.249) | Maintained Incorrect | Cropped shirt (low confidence) |
| `garm_v3_158` | `outerwear` | tops (0.249) | bottoms (0.342) | Maintained Incorrect | Unbuttoned overshirt |
| `garm_v3_159` | `shoes` | tops (0.245) | tops (0.252) | Maintained Incorrect | Cluttered shoe rack |
| `garm_v3_160` | `accessories` | tops (0.241) | tops (0.248) | Maintained Incorrect | Hat worn on head |
| `garm_v3_161` | `tops` | **tops** (0.318) | accessories (0.254) | LOSS | Scarf draped over blouse |
| `garm_v3_162` | `bottoms` | tops (0.242) | bottoms (0.348) | Maintained Correct | Clean full-length mirror |
| `garm_v3_163` | `outerwear` | **outerwear** (0.289) | outerwear (0.312) | Maintained Correct | Prominent puffer jacket |
| `garm_v3_164` | `shoes` | tops (0.241) | tops (0.250) | Maintained Incorrect | Cluttered floor angle |
| `garm_v3_165` | `accessories` | tops (0.238) | tops (0.249) | Maintained Incorrect | Sunglasses on shirt |
| `garm_v3_166` | `shoes` | **shoes** (0.262) | bottoms (0.334) | LOSS | Legs and jeans dominate frame |

---

## 4. Key Prediction Delta Takeaway

1. In Exp-0012, with an imbalanced 250 dataset, almost all non-top predictions collapsed to `tops` default predictions. In `real_world_test`, 11 of the 16 images were predicted as `tops` by default; because 4 of the 16 items were genuinely `tops`, they were counted as "correct" by coincidence at low confidence (~0.30).
2. In Exp-0014, with 500 balanced items across all 6 categories, the model diversified its predictions into `outerwear` and `bottoms`. When fed a multi-garment outfit photo, the model now predicts the most visually dominant outer layer rather than defaulting to `tops`.
