# AURA Garment Dataset Audit & Licensing Assessment

**Product:** AURA  
**Document:** Training Dataset Licensing, Provenance & Attribute Audit for `aura-garment-v1`  
**Version:** 1.0  
**Status:** **ACTIVE DATASET AUDIT**  

---

## 1. Executive Summary

Training or fine-tuning `aura-garment-v1` requires establishing legally compliant, high-quality fashion imagery with comprehensive attribute labeling. In accordance with [`docs/training-data-policy.md`](file:///d:/Personal%20projects/aura/docs/training-data-policy.md):
- **User Wardrobe Data is NOT Training Data:** Private user wardrobe photos are strictly excluded unless the user explicitly opts into the *AURA Fashion Research Contributor Program*.
- **No Unlicensed Scraping:** Datasets must possess verifiable commercial permissions or permissive open licenses for commercial model derivative training.

---

## 2. Dataset Licensing & Feasibility Matrix

| Dataset Name | Source / Organization | Primary License | Commercial Training Permitted? | Image Count | Labeled Attributes | Known Limitations & Restrictions | Recommendation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DeepFashion2** | CUHK (MMLab) | DeepFashion2 Non-Commercial Agreement | **NO** (Academic / Non-Commercial Only) | ~491,000 | 13 categories, landmarks, segmentation masks, bounding boxes | Non-commercial clause prohibits commercial production model training without custom university license. | **REJECTED FOR PRODUCTION / EXPERIMENTAL REFERENCE ONLY** |
| **Fashion-Gen** | Mila / SSENSE | Research Non-Commercial License | **NO** (Non-Commercial Research) | ~325,000 | Categories, subcategories, text descriptions, colors, materials | Non-commercial distribution restriction. | **REJECTED FOR PRODUCTION** |
| **ModaNet (iMaterialist)** | eBay Research / CVPR | Creative Commons CC-BY 4.0 | **YES** (Permissive Commercial with Attribution) | ~55,176 | 13 polygon classes, categories, outer boundaries | High segmentation detail; lacks granular fit attributes (oversized vs relaxed). | **APPROVED FOR TAXONOMY & PRE-TRAINING** |
| **OpenImages Fashion Subsets** | Google / OpenImages V7 | CC-BY 4.0 / Apache 2.0 | **YES** (Permissive Commercial) | ~120,000 | Clothing bounding boxes, high-level categories | Coarse attributes; requires fine-grained labeling. | **APPROVED FOR PRE-TRAINING** |
| **AURA Curated Editorial Dataset (v0.1)** | In-House AURA Stylists | Proprietary (AURA Owned 100%) | **YES** (Full Commercial IP Ownership) | 168 curated Phase 1 fashion pieces | Category, subcategory, exact hex color, fit, silhouette, material, formality, season, occasion | Clean high-resolution photography; small seed size requiring augmentation. | **APPROVED PRIMARY GOLDEN DATASET** |
| **AURA Contributor Research Dataset** | Opt-In User Program (Consent-gated) | AURA Contributor Terms (100% Owned) | **YES** (Explicit User Consent) | Currently 0 (Pre-Launch) | Full AURA schema | Opt-in pipeline initialized in database schema. | **APPROVED FOR FUTURE ITERATIONS** |

---

## 3. Findings & Strategy for `aura-garment-v1`

1. **Academic Dataset Restrictions:** DeepFashion2 and Fashion-Gen cannot be used to train weights shipped in commercial production due to non-commercial academic license terms.
2. **Approved Strategy:** 
   - Use permissive **ModaNet (CC-BY 4.0)** and **OpenImages** for base feature representations.
   - Use the **AURA Curated Editorial Golden Dataset (`dataset-v0.1.json`)** with our exact master taxonomy as the primary evaluation and fine-tuning target.
   - Augment with synthetic color, lighting, and geometric transformations.
