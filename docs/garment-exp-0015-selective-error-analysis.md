# AURA — Experiment 0015 Selective LoRA Error Analysis

## 1. Overview

This document investigates the specific failure modes, category confusions, and attribute head behaviors observed across holdout splits in `garment-exp-0015`. While selective LoRA adaptation on the final 4 transformer blocks boosted raw real-world category accuracy to **37.50%** (up from 12.50% in Exp-0014), it introduced specific trade-offs on studio e-commerce items and revealed persistent challenges in multi-garment consumer images.

---

## 2. Real-World Split Error Forensics ($N=16$)

### A. Successfully Identified Garments (6 / 16 = 37.50%)
In contrast to the frozen control which correctly identified only 2 garments, Exp-0015 successfully recognized 6 garments directly from raw full-image consumer photos:

1. **`garm_v3_151` (Tops):** Predicted `tops` (Confidence: 0.3291). Real-world casual top correctly categorized despite patterned background.
2. **`garm_v3_158` (Outerwear):** Predicted `outerwear` (Confidence: 0.5825). Heavy coat correctly segmented from complex body posture.
3. **`garm_v3_161` (Tops):** Predicted `tops` (Confidence: 0.3369). Casual sweater recognized despite warm indoor ambient lighting.
4. **`garm_v3_163` (Outerwear):** Predicted `outerwear` (Confidence: 0.2245). Layered blazer correctly distinguished from under-shirt.
5. **`garm_v3_164` (Shoes):** Predicted `shoes` (Confidence: 0.4202). Footwear detected in a full-body mirror selfie.
6. **`garm_v3_166` (Tops):** Predicted `tops` (Confidence: 0.2734). Lightweight top recognized despite folded pose.

---

### B. Persistent Failure Modes in Real-World Photos

| Image ID | Expected Category | Predicted Category | Confidence | Root Cause |
|:---|:---:|:---:|:---:|:---|
| **`garm_v3_152`** | Bottoms | Outerwear | 0.7310 | **Dominant Garment Occlusion:** The photo contains a prominent dark jacket above the pants; full-image global pooling latches onto the larger upper-body garment. |
| **`garm_v3_153`** | Outerwear | Bottoms | 0.3787 | **High-Contrast Pants:** The lower body features bright contrasting trousers that dominate the attention map. |
| **`garm_v3_154`** | Shoes | Bottoms | 0.3342 | **Scale Disparity:** Shoes occupy < 5% of the total pixel area in a standing mirror selfie; global ViT tokens dilute small peripheral garments. |
| **`garm_v3_155`** | Accessories | Tops | 0.6528 | **Small Accessory vs Torso:** A shoulder handbag is worn over a solid shirt; the model attends to the torso clothing. |
| **`garm_v3_156`** | Tops | Shoes | 0.2625 | **Complex Clutter:** Dark lighting and reflective footwear caused attention dispersion. |
| **`garm_v3_157`** | One-Piece | Tops | 0.3798 | **One-Piece vs Top Confusion:** Jumpsuit/dress shares visual neckline/torso features with a blouse. |
| **`garm_v3_159`** | Bottoms | Outerwear | 0.4055 | **Long Coat Overlap:** Trench coat extends past the knees, completely covering the waistband of the trousers. |
| **`garm_v3_160`** | Shoes | Bottoms | 0.3228 | **Full-Body Perspective:** Camera angle emphasizes pants legs rather than sneakers. |
| **`garm_v3_162`** | Accessories | Tops | 0.4999 | **Jewelry / Scarf:** Fine neckwear merged into the upper garment representation. |
| **`garm_v3_165`** | One-Piece | Tops | 0.4411 | **Dress Structure:** Two-tone dress upper half processed as a separate shirt. |

---

## 3. Attribute Head Diagnostic

### A. Material (0.00% on Real-World, 15.00% on Blind)
- **Problem:** Material classification requires microscopic texture cues (e.g. weave of linen, knit of wool, sheen of silk).
- **Failure:** In consumer smartphone photos, compression artifacts, blur, and uneven indoor lighting erase micro-textures. The model defaults to the dominant training class (`cotton` or `synthetic`).

### B. Fit & Silhouette (12.50% on Real-World)
- **Problem:** Full-body poses (slouching, hands in pockets, angled stances) distort apparent drape and silhouette.
- **Failure:** Silhouette predictions collapse to `straight` or `regular` because loose/oversized fits cannot be disambiguated without body-pose estimation.

### C. Color (6.25% on Real-World)
- **Problem:** Mixed lighting and multi-garment compositions cause palette confusion.
- **Failure:** When a dark jacket is worn over light trousers, the color head predicts `black` for the outfit rather than the specific query garment color.

---

## 4. Architectural Synthesis

The error patterns confirm the scientific hypothesis formulated across Phases 13B, 13C, and 13D:
1. **Selective LoRA successfully bridges semantic category adaptation:** Adapting the top 4 transformer blocks enables SigLIP to map naturalistic consumer attire to correct fashion categories (tops, outerwear, shoes) far better than frozen representations (+200% gain).
2. **Localization remains essential for multi-garment scenes:** Parameter adaptation alone cannot resolve spatial ambiguity when multiple garments compete for global attention tokens in a single frame. Small accessories, shoes, and overlapping layers inevitably suffer from visual interference without spatial bounding.
