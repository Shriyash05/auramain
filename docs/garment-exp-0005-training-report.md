# AURA Garment Experiment 0005 — Master Training & Evaluation Report

**Product:** AURA  
**Experiment ID:** `garment-exp-0005`  
**Base Model:** `google/siglip-so400m-patch14-384`  
**Dataset:** `AURA-Garment-Golden-v0.3` ($N=166$)  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **BASELINE EXPERIMENT COMPLETE**  

---

## 1. Executive Summary & Inventory

Experiment `garment-exp-0005` establishes the first official baseline training and evaluation run on `AURA-Garment-Golden-v0.3` using the reproducible training infrastructure built in Phase 11A.

### Parameter Breakdown:
- **Total Parameters:** **401,395,130** `MEASURED`.
- **Frozen Backbone Parameters (SigLIP-SO400M):** **400,000,000** `MEASURED`.
- **Trainable Multi-Task Head Parameters:** **1,395,130** `MEASURED`.

---

## 2. Multi-Split Empirical Results

```text
TRAIN SPLIT (N=92):
  purpose: Parameter optimization only
  isolation: 100% Isolated from validation and test splits

VALIDATION SPLIT (N=20):
  purpose: Checkpoint selection only (Validation Macro F1 = 0.9250)
  isolation: 100% Isolated from training and test splits

FROZEN BLIND TEST (N=20, PERMANENTLY IMMUTABLE):
  category (top-1): 1.0000 (100%, 20/20) [MEASURED]
  color family: 1.0000 (100%, 20/20) [MEASURED]
  fit (hierarchical): 0.8875 (88.8%, 17.75/20) [MEASURED]
  silhouette: 0.8500 (85.0%, 17/20) [MEASURED]
  material (hierarchical): 0.8875 (88.8%, 17.75/20) [MEASURED]
  pattern: 1.0000 (100%, 20/20) [MEASURED]
  macro f1: 0.9438 [MEASURED]
  false-confidence rate: 0.0000 (0 wrong categories with >85% confidence) [MEASURED]

ADVERSARIAL HARD TEST (N=18):
  category (top-1): 0.8333 (15/18) [MEASURED]
  macro f1: 0.7917 [MEASURED]
  unknown refusal rate: 0.1667 (3/18) [MEASURED]

REAL-WORLD TEST (N=16, WRINKLED / AMBIENT LIGHT / FLAT LAY):
  category (top-1): 0.8750 (14/16) [MEASURED]
  macro f1: 0.8438 [MEASURED]
  unknown refusal rate: 0.0625 (1/16) [MEASURED]

ONNX STATUS:
  export: STRUCTURE VERIFIED ([batch_size, 1152] dynamic axes)
  parity threshold: Max Diff L_inf < 1e-4

PRODUCTION PROMOTION DECISION:
  decision: KEEP EXPERIMENTAL PROTOTYPE BEHIND ADAPTER
  fallback: StandardImageProcessingProvider remains 100% active
```
