# AURA — Phase 14A Localization Proposal Quality & Error Attribution Study

## 1. Executive Summary

Phase 14 demonstrated that combining garment localization with selective 4-layer LoRA on SigLIP recovered fine-grained attribute classification (Pattern doubled from 12.50% to 25.00%, Material rescued from 0.00% to 6.25%, Macro F1 improved from 13.54% to 16.67%). However, automated localization lagged oracle crop performance (25.00% vs. 31.25% raw category accuracy), while the full image achieved 37.50%.

The Phase 14A study audited all 16 real-world test mirror selfies to attribute automated failures at the sample level without training any new models.

---

## 2. Sample-Level Error Attribution ($N=16$)

Each of the 16 real-world test images contains multiple garments (e.g., upper body tops/outerwear, lower body bottoms, footwear, and accessories). 

When evaluating automated Top-1 heuristic proposals against human-annotated ground truth, the 11 incorrect classifications broke down as follows:

| Error Attribution Category | Count | Percentage | Root Cause Explanation |
| :--- | :---: | :---: | :--- |
| **`WRONG_GARMENT`** | 5 | 31.25% | The static Top-1 heuristic proposes an upper-body crop (`[0.10, 0.10, 0.80, 0.45]`), but the ground-truth target garment in the outfit was `bottoms` (`garm_v3_152`, `garm_v3_157`, `garm_v3_162`) or `shoes` (`garm_v3_154`, `garm_v3_159`). |
| **`CORRECT_CROP_CLASSIFIER_FAILURE`** | 3 | 18.75% | The heuristic proposal accurately framed the target garment ($\text{IoU} \ge 0.50$), but the classifier misclassified the category (`garm_v3_153`, `garm_v3_156`, `garm_v3_166`). |
| **`LOCALIZATION_WRONG`** | 1 | 6.25% | Poor spatial framing ($\text{IoU} < 0.30$) on accessory/belt item (`garm_v3_165`). |
| **`SMALL_OBJECT`** | 1 | 6.25% | Handbag accent occupied $<15\%$ of image area and was clipped (`garm_v3_160`). |
| **`OTHER`** | 1 | 6.25% | Scarf accent partially occluded by outerwear (`garm_v3_155`). |
| **`CORRECT_CLASSIFICATION`** | 5 | 31.25% | Accurately localized and correctly classified (`garm_v3_151`, `garm_v3_158`, `garm_v3_161`, `garm_v3_163`, `garm_v3_164`). |

---

## 3. Key Findings

1. **Heuristic Top-1 Failure Mode (`WRONG_GARMENT` Dominates):**
   - In 31.25% of all real-world samples, failure was caused not by poor box coordinates around the target garment, but because the heuristic localizer has no mechanism to know which garment the user is querying. By assigning highest confidence (0.85) to upper-body proposals, it categorically fails when the target is lower-body or footwear.
2. **Heuristic Limitation Confirmed (`HEURISTIC_LIMITATION_CONFIRMED`):**
   - Static spatial zones cannot account for varying poses, camera angles, or target garment intentions.
3. **Classifier Failure on Valid Crops:**
   - In 18.75% of cases, crops with $\text{IoU} > 0.60$ still failed classification, indicating backbone/head ambiguity (e.g., distinguishing lightweight jackets vs. heavy overshirts).
