# AURA Garment Dataset Audit & Licensing Assessment

**Product:** AURA  
**Document:** Dataset Licensing, Provenance, Attribute & Commercial Rights Audit  
**Version:** 0.2 (Phase 10B Update)  
**Status:** **ACTIVE LEGAL & DATASET AUDIT**  

---

## 1. Core Licensing & Data Governance Principles

In accordance with [`docs/training-data-policy.md`](file:///d:/Personal%20projects/aura/docs/training-data-policy.md):
1. **User Wardrobe Data is NOT Training Data:** Private user wardrobe images are strictly isolated and never copied into training datasets.
2. **Commercial Use Rights Mandatory:** No dataset with non-commercial (CC-BY-NC / Academic Research Only) clauses may be used to train or fine-tune models deployed in commercial production without an express commercial license agreement.
3. **Attribution & Provenance:** All training samples must maintain traceable metadata, annotator verification, and license lineage.

---

## 2. Comprehensive External Dataset Audit Table

| Dataset Name | Source Organization / URL | Exact License | Commercial Use Permitted? | Redistribution Permitted? | Modification Permitted? | Image Count | Attribute Availability | AURA Decision Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AURA Curated Editorial Archive (v0.2)** | AURA In-House Editorial Team | **AURA Proprietary (100% Owned)** | **YES** | **YES** | **YES** | 168 base assets + curated augmentations | Full AURA Master Taxonomy (Category, Subcategory, Color, Fit, Silhouette, Pattern, Material, Formality, Occasion, Season) | **APPROVED (Primary Golden Set)** |
| **ModaNet (iMaterialist)** | eBay Research / CVPR | **CC-BY 4.0** | **YES** (With Attribution) | **YES** | **YES** | ~55,176 | 13 polygon garment categories, boundaries | **APPROVED FOR PRE-TRAINING / TAXONOMY MAPPING** |
| **OpenImages V7 (Fashion Subset)** | Google LLC | **CC-BY 4.0 / Apache 2.0** | **YES** | **YES** | **YES** | ~120,000 | Clothing bounding boxes, coarse categories | **APPROVED FOR PRE-TRAINING** |
| **DeepFashion2** | CUHK (MMLab) | DeepFashion2 Non-Commercial Agreement | **NO** (Academic Research Only) | **NO** | **YES** (Internal Research Only) | ~491,000 | Categories, landmarks, segmentation masks | **REJECTED FOR PRODUCTION (Academic Only)** |
| **Fashion-Gen** | Mila / SSENSE | Research Non-Commercial License | **NO** (Academic Research Only) | **NO** | **NO** | ~325,000 | Categories, descriptions, colors, materials | **REJECTED FOR PRODUCTION (Academic Only)** |
| **iMaterialist (Fashion 2019/2020)** | Kaggle / FGVC | FGVC Competition Rules / Academic | **REVIEW REQUIRED** (Commercial grant varies by sub-tier) | **NO** | **YES** | ~45,000 | Fine-grained attributes | **REVIEW REQUIRED (Restricted)** |
| **AURA Research Contributor Program** | Opt-in Users (Consent-gated) | AURA Contributor Terms | **YES** (Explicit Opt-in Consent) | **NO** (Private Internal) | **YES** | 0 (Pre-Launch Pipeline) | Full AURA Taxonomy | **APPROVED (Consent-Gated Only)** |

---

## 3. Dataset Expansion Strategy for `AURA-Garment-Golden-v0.2`

1. **Rejection of Academic Sets:** DeepFashion2 and Fashion-Gen remain **strictly rejected** from production training manifests to prevent IP contamination.
2. **100% Owned In-House Asset Utilization:** The golden dataset `v0.2` expands across our 168 in-house editorial assets across all 5 core categories, augmented with real-world photography variations (flat lay, hanging, on-body, wrinkled, ambient indoor/outdoor lighting) and adversarial hard-test samples.
3. **Audit State:** **APPROVED & FULLY COMPLIANT**.
