# AURA Contributor Data Governance & Privacy Architecture

**Product:** AURA  
**Document:** Contributor Data Governance, Sanitization & Right-to-Forget Policy  
**Date:** 2026-08-28  
**Status:** **ACTIVE GOVERNANCE SPECIFICATION**  

---

## 1. Zero Silent Harvesting Guarantee

Under no circumstances does AURA collect, index, or stage user wardrobe items for model training without active, explicit consent recorded under `AURA_RESEARCH_CONSENT_V1`.

```text
WARDROBE UPLOAD ───► Standard Private Closet (Database & Local Storage Only)
                          │
                     (Opt-In Event)
                          │
                          ▼
            Sanitization & EXIF Purge
                          │
                          ▼
            Anonymous Sample ID Generated
                          │
                          ▼
         Human Stylist Validation (reviewTool)
                          │
                          ▼
             Candidate Dataset Manifest
```

---

## 2. Right-to-Forget & Revocation Protocol

When a user revokes research consent or deletes their account:
1. **Immediate Ingestion Stop:** All ongoing and future contribution workflows are disabled.
2. **Status Transition to `withdrawn`:** All existing contribution records are marked `status = "withdrawn"` with `withdrawn_at` timestamp.
3. **Exclusion from Future Dataset Builds:** [`ContributorDatasetBuilder`](file:///d:/Personal%20projects/aura/tools/ai-benchmark/garment/buildContributorDataset.ts) automatically excludes any sample where `status === 'withdrawn'` or `withdrawn_at !== null`.
4. **Model Retraining Policy:** While trained neural network weights cannot be mathematically un-computed post-hoc, withdrawn samples are permanently barred from subsequent training runs and fine-tuning cycles.
