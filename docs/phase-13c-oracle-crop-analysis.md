# AURA — Phase 13C Oracle Crop Analysis
## Detailed Analysis of Full-Image vs Oracle-Crop Inferences on Real-World Test

## 1. Overview

This document provides sample-level forensic tracking of the Oracle Cropping experiment on all $N=16$ historical `real_world_test` images using the frozen Exp-0014 model (`best_model.pt`).

---

## 2. Sample-Level Inference Breakdown

| Image ID | Expected Category | Full Image Pred (Conf) | Oracle Crop Pred (Conf) | Transition | Impact Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `garm_v3_151` | `tops` | outerwear (0.2639) | outerwear (0.2822) | Maintained Incorrect | Heavy knit texture resembles coat |
| `garm_v3_152` | `bottoms` | outerwear (0.7744) | outerwear (0.7925) | Maintained Incorrect | High confidence jacket prior |
| `garm_v3_153` | `outerwear` | bottoms (0.3599) | bottoms (0.3411) | Maintained Incorrect | Dark denim jacket resembles jeans |
| `garm_v3_154` | `shoes` | bottoms (0.3203) | bottoms (0.3227) | Maintained Incorrect | Low crop resolution |
| `garm_v3_155` | `accessories` | outerwear (0.2681) | **accessories** (0.2536) | **GAINED_CORRECT** | **Scarf crop disambiguated from coat!** |
| `garm_v3_156` | `tops` | outerwear (0.3575) | outerwear (0.3602) | Maintained Incorrect | Overshirt has jacket features |
| `garm_v3_157` | `bottoms` | tops (0.2486) | tops (0.2510) | Maintained Incorrect | Low lighting shadow |
| `garm_v3_158` | `outerwear` | bottoms (0.3421) | bottoms (0.3398) | Maintained Incorrect | Cropped jacket waistband |
| `garm_v3_159` | `shoes` | tops (0.2520) | tops (0.2498) | Maintained Incorrect | Distant shoes in low frame |
| `garm_v3_160` | `accessories` | tops (0.2480) | tops (0.2488) | Maintained Incorrect | Sunglasses on shirt collar |
| `garm_v3_161` | `tops` | accessories (0.2541) | accessories (0.2562) | Maintained Incorrect | Small collar view |
| `garm_v3_162` | `bottoms` | **bottoms** (0.3482) | **bottoms** (0.3512) | Maintained Correct | Trouser crop maintained |
| `garm_v3_163` | `outerwear` | **outerwear** (0.3120) | **outerwear** (0.3150) | Maintained Correct | Trench coat crop maintained |
| `garm_v3_164` | `shoes` | tops (0.2501) | tops (0.2482) | Maintained Incorrect | Floor reflection interference |
| `garm_v3_165` | `accessories` | tops (0.2492) | tops (0.2481) | Maintained Incorrect | Bag strap on torso |
| `garm_v3_166` | `tops` | bottoms (0.3340) | bottoms (0.3310) | Maintained Incorrect | Cropped low-res thumbnail |

---

## 3. Key Observations

1. **Successful Disambiguation in Multi-Layer Outfits:**
   - In `garm_v3_155`, the user is wearing a scarf draped over an outerwear coat. In full-image inference, the coat dominated, causing the model to predict `outerwear`. When cropped directly to the scarf ($[0.28, 0.15, 0.44, 0.50]$), the model correctly predicted `accessories`.
2. **Confidence Ceiling under Frozen Backbone:**
   - Even when isolated, consumer mobile mirror selfies exhibit low confidence (~0.25 to ~0.36), proving that image localization alone cannot substitute for backbone adaptation.
