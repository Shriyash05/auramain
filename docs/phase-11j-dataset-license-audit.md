# AURA Phase 11J — Dataset Governance & License Provenance Audit

**Status:** APPROVED & ENFORCED  
**Governance Policy:** `AURA_DATASET_GOVERNANCE_V1`  
**Ownership Constraint:** **ZERO COMMERCIAL AI APIS**

---

## 1. Executive Summary & Legal Provenance Policy
To build proprietary, self-hosted fashion intelligence without commercial AI dependencies, all training data ingested into AURA must satisfy strict intellectual property, license, and provenance constraints.

AURA establishes a 3-tier dataset classification architecture:
- **TIER A (AURA-Owned):** In-house physical garment photography, editorial assets, and explicitly consented contributor data. Authorized for production training (`APPROVED_FOR_AURA_TRAINING`).
- **TIER B (Verified Permissive External):** External datasets with verified commercial AI training permissive licenses (CC0, CC-BY 2.0 / 4.0 with structured attribution). Authorized for production training with attribution manifests (`APPROVED_WITH_ATTRIBUTION`).
- **TIER C (Research-Only External):** Non-commercial academic datasets (e.g., DeepFashion NC, ModaNet CC BY-NC). Strictly isolated to `research-training-manifest.json` and prohibited from production models (`production_eligible: false`).

---

## 2. Dataset Legal Review & Classification

| Dataset ID | Full Name | Image License | Annotation License | Commercial Training Allowed | Attribution Required | AURA Tier | Legal Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aura-garment-golden-v0.3` | AURA Golden Benchmark v0.3 | Proprietary AURA | Proprietary AURA | **YES** | No | **TIER A** | `APPROVED_FOR_AURA_TRAINING` |
| `deepfashion-inshop` | DeepFashion In-Shop Clothes Retrieval | Non-Commercial Academic | Non-Commercial Academic | **NO** | Yes | **TIER C** | `RESEARCH_ONLY` (Prohibited from Prod) |
| `modanet` | ModaNet Fashion Dataset | CC BY-NC 4.0 | CC BY-NC 4.0 | **NO** | Yes | **TIER C** | `RESEARCH_ONLY` (Prohibited from Prod) |
| `fashionpedia` | Fashionpedia Ontology & Dataset | Third-Party Unverified | CC BY 4.0 | **NO** (Pending Image Audit) | Yes | **TIER C** | `LEGAL_REVIEW_REQUIRED` |
| `open-images-fashion-v7` | Open Images V7 Fashion Subset | CC-BY 2.0 / CC0 | CC BY 4.0 | **YES** | Yes | **TIER B** | `APPROVED_WITH_ATTRIBUTION` |

---

## 3. Segregated Manifest System
1. **Production Manifest (`data/garment/metadata/production-training-manifest.json`):**
   - Contains $166$ verified assets (all Tier A in-house curated).
   - `production_eligible: true`.
   - Automated quality audit enforced via `training/scripts/audit_training_pool.py`.
2. **Research Manifest (`data/garment/metadata/research-training-manifest.json`):**
   - Reserved exclusively for offline academic explorations.
   - `production_eligible: false`.
3. **Immutable Frozen Blind Test (`data/garment/metadata/dataset-v0.3-blind-freeze.json`):**
   - SHA-256: `5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd`
   - Hard isolated from all training pools.
