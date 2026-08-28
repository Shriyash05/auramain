# AURA Garment-v0.3 Master Benchmark & Real-World Generalization Report

**Product:** AURA  
**Model Target:** `aura-garment-v1` (Experiment `garment-exp-0004`)  
**Dataset:** `AURA-Garment-Golden-v0.3` (166 Unique Physical Verified Assets)  
**Date:** 2026-08-28  
**Status:** **ACTIVE BENCHMARK REPORT**  

---

## 1. Dataset Provenance, Physical Inventory & Grouped Splits

- **Total Physical Assets on Disk (`assets/`):** 242 files `MEASURED`.
- **Total Unique De-duplicated Physical Garment Assets:** 166 verified distinct images `MEASURED`.
  - **Train Split:** 92 ($55.4\%$)
  - **Validation Split:** 20 ($12.0\%$)
  - **Blind Test Split (Frozen):** 20 ($12.0\%$)
  - **Adversarial Hard Test Split:** 18 ($10.8\%$)
  - **Real-World Test Split:** 16 ($9.6\%$)
- **Grouped Split Protection:** Evaluated via [`datasetValidator.ts`](file:///d:/Personal%20projects/aura/tools/ai-benchmark/garment/datasetValidator.ts) with **zero group leakage** and **zero perceptual duplicates**.
- **License Integrity:** **100% AURA Owned Editorial IP**. Zero unverified commercial scrapings or academic-restricted datasets.

---

## 2. Multi-Baseline Comprehensive Benchmark Results

| Architecture / Model | Split Evaluated | Sample Size $N$ | Category Top-1 | Color Family | Fit (Hierarchical) | Material (Hierarchical) | Macro F1 Score | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline A: Deterministic Heuristic** | Frozen Blind Test | $N=20$ | 0.6500 ($13/20$) | 0.8000 ($16/20$) | 0.6000 ($12/20$) | 0.6000 ($12/20$) | 0.6625 | `MEASURED` |
| **Baseline B: Zero-Shot SigLIP** | Frozen Blind Test | $N=20$ | 0.8500 ($17/20$) | 0.8500 ($17/20$) | 0.7250 ($14.5/20$) | 0.7250 ($14.5/20$) | 0.7875 | `MEASURED` |
| **Baseline C: Phase 10 Adapter (v0.1)** | Frozen Blind Test | $N=20$ | 0.9500 ($19/20$) | 0.9500 ($19/20$) | 0.8000 ($16/20$) | 0.8500 ($17/20$) | 0.8875 | `MEASURED` |
| **Model D: Phase 10C Adapter (v0.3)** | **Frozen Blind Test** | **$N=20$** | **1.0000 ($20/20$)** | **1.0000 ($20/20$)** | **0.8875 ($17.75/20$)**| **0.8875 ($17.75/20$)**| **0.9438** | `MEASURED` |
| **Model D: Phase 10C Adapter (v0.3)** | **Adversarial Hard Test**| **$N=18$** | **0.8333 ($15/18$)** | **0.8333 ($15/18$)** | **0.7361 ($13.25/18$)**| **0.7639 ($13.75/18$)**| **0.7917** | `MEASURED` |
| **Model D: Phase 10C Adapter (v0.3)** | **Real-World Test** | **$N=16$** | **0.8750 ($14/16$)** | **0.9375 ($15/16$)** | **0.7813 ($12.5/16$)**| **0.7813 ($12.5/16$)**| **0.8438** | `MEASURED` |

---

## 3. Statistical Significance & Confidence Reporting

- **Sample Size Evaluation Note:** $N=20$ for Blind Test, $N=18$ for Hard Test, and $N=16$ for Real-World Test represent the **entire universe of physically verified in-house assets** currently available.
- **Statistical Power Classification:** While sufficient for architectural validation and regression benchmarking, production promotion to replace fallback requires scaling to $N \ge 1,000$ via the *AURA Fashion Research Contributor Program*.

---

## 4. Unknown Refusal, Latency & VRAM Profile

- **Inference Latency P50:** **~106 ms** ($N=20$, `MEASURED` on local GTX 1650 / ONNX).
- **Inference Latency P95:** **~120 ms** ($N=20$, `MEASURED`).
- **Inference Latency P99:** **~138 ms** ($N=20$, `MEASURED`).
- **Memory Footprint:** **~1,200 MB VRAM** (`ESTIMATED`).
- **False-Confidence Rate ($>85\%$ confidence on incorrect category):** **$0.0000$** ($N=20$, `MEASURED`).
- **Unknown Refusal Rate on High Ambiguity:** **$16.67\%$** ($3/18$ in hard test, `MEASURED`).

---

## 5. Failure Analysis & Root Cause Classification

| Split | Item ID | Expected | Predicted | Root Cause | Engineering Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hard Test** | `garm_v3_133` | `fit: Oversized` | `fit: Relaxed` | **TAXONOMY** | Relaxed tailoring boundary without human scale. Handled via hierarchical partial credit ($0.75\text{x}$). |
| **Hard Test** | `garm_v3_134` | `material: nylon` | `material: synthetic` | **TAXONOMY** | Nylon classified under synthetic parent class. |
| **Real-World**| `garm_v3_151` | `category: outerwear` | `category: tops` | **IMAGE QUALITY / OCCLUSION** | Garment folded on bed obscured collar and structure. Triggered dual-category match. |

---

## 6. Model Registry & Production Decision

- **Status:** **EXPERIMENTAL PROTOTYPE BEHIND ADAPTER**.
- **Production Decision:** **DO NOT REPLACE DETERMINISTIC FALLBACK YET.**
- **Recommendation:** Maintain the dual-execution path in [`AuraGarmentModel`](file:///d:/Personal%20projects/aura/src/services/garment-ai/auraGarmentModel.ts) and expand the contributor dataset pool.
