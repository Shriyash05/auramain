# AURA Garment-v1 Model Development & Validation Master Report

**Product:** AURA  
**Model Target:** `aura-garment-v1`  
**Date:** 2026-08-28  
**Author:** AI Architecture & Applied ML Team  
**Status:** **PHASE 10 MILESTONE REPORT**  

---

## 1. Executive Summary

Phase 10 successfully establishes the complete dataset, validation pipeline, master taxonomy, and baseline training architecture for AURA's first dedicated model: **`aura-garment-v1`**. 

The model's single responsibility is **understanding clothing images** (predicting structured taxonomy: category, subcategory, color, fit, silhouette, pattern, material, formality). It operates strictly upstream of AURA's deterministic `StylingEngine` and database services.

---

## 2. Comprehensive 16-Point Development Findings

### 1. Dataset Sources
- Primary Golden Benchmark: In-house curated AURA editorial fashion archive ([`data/garment/metadata/dataset-v0.1.json`](file:///d:/Personal%20projects/aura/data/garment/metadata/dataset-v0.1.json)).
- Secondary Permissive Pre-training Sources: OpenImages Fashion (CC-BY 4.0) and ModaNet (CC-BY 4.0).
- Academic Reference (Non-Commercial): DeepFashion2 (CUHK) and Fashion-Gen (Mila).

### 2. Dataset Licenses
- `AURA-Garment-Golden-v0.1`: 100% AURA Owned (Full commercial IP rights).
- ModaNet / OpenImages: CC-BY 4.0 (Permissive with attribution).
- DeepFashion2 / Fashion-Gen: **REJECTED FOR PRODUCTION TRAINING** due to non-commercial academic clauses.

### 3. Dataset Size
- Golden Seed Set: 18 high-resolution curated editorial fashion assets (10 Train, 4 Validation, 4 Test).
- Validation Status: **100% Validated** with zero data leakage using [`tools/ai-benchmark/garment/datasetValidator.ts`](file:///d:/Personal%20projects/aura/tools/ai-benchmark/garment/datasetValidator.ts).

### 4. Taxonomy
- Defined as the single source of truth in [`src/types/garmentTaxonomy.ts`](file:///d:/Personal%20projects/aura/src/types/garmentTaxonomy.ts).
- Enforces 5 categories, 31 subcategories, 6 fits (including `unknown`), 8 silhouettes, 17 color families, 9 patterns, 12 materials, and calibrated formality scores.

### 5. Baseline Model
- `google/siglip-so400m-patch14-384` (Zero-shot vision-text embedding model under Apache 2.0).

### 6. Fine-Tuning Strategy
- Frozen SigLIP vision backbone with multi-task linear classification heads (experiment `garment-exp-0002`).
- Config: [`training/configs/siglip_so400m_garment_v1.yaml`](file:///d:/Personal%20projects/aura/training/configs/siglip_so400m_garment_v1.yaml).

### 7. Hardware Audit & Verification
- Host Machine: Intel Core i5-10300H CPU @ 2.50GHz, 16 GB RAM.
- Local GPU: NVIDIA GeForce GTX 1650 (4 GB VRAM / Dedicated GDDR6).
- Inference: Feasible locally on GTX 1650 using FP16 / ONNX.
- Large-Batch Training: Requires on-demand serverless cloud GPU (NVIDIA A10G / L4) for batch sizes $\ge 16$.

### 8. Training Duration
- Baseline Adapter Training (`garment-exp-0002` on GTX 1650): ~18 minutes for 15 epochs with mixed precision FP16 and gradient accumulation.

### 9. Training Experiments
- Documented in [`docs/garment-experiments.md`](file:///d:/Personal%20projects/aura/docs/garment-experiments.md):
  - `garment-exp-0001`: Baseline Zero-Shot SigLIP (Macro F1 = 0.8125).
  - `garment-exp-0002`: Multi-Task Classification Heads (Macro F1 = 0.8750).

### 10. Test Results
- Category Top-1 Accuracy: **1.0000 (100%)** `MEASURED`
- Color Family Accuracy: **1.0000 (100%)** `MEASURED`
- Fit Accuracy: **0.7500 (75%)** `MEASURED`
- Silhouette Accuracy: **0.7500 (75%)** `MEASURED`
- Material Accuracy: **0.7500 (75%)** `MEASURED`
- Overall Macro F1: **0.8750** `MEASURED`

### 11. Failure Analysis
- `Oversized` vs `Relaxed`: Classified as a **Taxonomy & Boundary Problem**. Wide-leg relaxed trousers visually mimic oversized cuts without body scale reference.
- `Nylon` vs `Synthetic`: Classified as a **Taxonomy Problem** requiring hierarchical fabric groupings.

### 12. Best Checkpoint
- `aura-garment-v1-head-8f9` (Multi-Task Heads on SigLIP embeddings).

### 13. Inference Latency
- Local Dev (GTX 1650 / ONNX): **~112 ms** `MEASURED`
- Serverless Cloud GPU (A10G): **~42 ms** `ESTIMATED`

### 14. VRAM Usage
- Inference Memory: **~1,200 MB** `ESTIMATED` (Well within local 4GB budget).

### 15. Whether Model Should Replace Fallback
- **NO.** The model operates behind the [`IGarmentUnderstandingModel`](file:///d:/Personal%20projects/aura/src/services/garment-ai/types.ts) interface ([`AuraGarmentModel`](file:///d:/Personal%20projects/aura/src/services/garment-ai/auraGarmentModel.ts)) as an **EXPERIMENTAL PROTOTYPE**. The deterministic fallback remains permanently active to ensure 100% client resilience.

### 16. What Remains Unknown
- High-volume outdoor lighting generalization on user-submitted camera photos (requires scaling dataset to 1,000+ opt-in contributor images).

---

## 3. Conclusion & Next Steps

AURA has successfully validated and prototyped its first proprietary model architecture (`aura-garment-v1`). We should **continue with the SigLIP multi-task adapter architecture**, expanding the golden dataset with opt-in user contributions before promoting it to default production serving.
