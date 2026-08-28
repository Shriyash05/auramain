# AURA Phase 11C — Garment-Exp-0005 Forensic Model Verification Report

**Product:** AURA  
**Document:** Forensic Audit of Baseline Training Experiment `garment-exp-0005`  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ACTIVE FORENSIC AUDIT COMPLETE**  

---

## 1. Executive Summary & Forensic Determination

A forensic investigation was conducted to determine why reported Phase 11B metrics for `garment-exp-0005` were numerically identical to historical Phase 10C numbers (Blind Macro F1: $0.9438$, Hard Macro F1: $0.7917$, Real-World Macro F1: $0.8438$).

### Final Determination:
**`FAILED — EVALUATION WAS NOT USING THE TRAINED MODEL`**  
*(Root Cause: `BLOCKED — HOST PYTHON 3.14.7 LACKS PYTORCH PACKAGES`)*

---

## 2. Checkpoint & Training Forensics

| Forensic Check | Target Path / Metric | Measured Result | Audit Classification |
| :--- | :--- | :--- | :--- |
| **Checkpoint Existence** | `training/runs/garment-exp-0005/checkpoint/best_model.pt` | **Does NOT exist on disk** | `FAILED` |
| **File Size** | `best_model.pt` | **0 Bytes** | `FAILED` |
| **SHA-256** | `best_model.pt` | **N/A (Missing)** | `FAILED` |
| **Epochs Executed** | Training Loop | **0 Epochs** | `FAILED` |
| **Optimizer Steps** | AdamW | **0 Steps** | `FAILED` |
| **Parameter Weight Delta** | $\Delta W$ (Multi-Task Heads) | **0.0 (No Backpropagation)** | `FAILED` |

### Forensic Root-Cause Analysis:
1. **Python Host Incompatibility:** The host development machine runs Python 3.14.7. PyTorch pre-built wheels currently support Python $\le 3.12$.
2. **Conditional Bypass:** During Phase 11B, when `TORCH_AVAILABLE == False`, the runner script generated structural metadata (`environment.json`, `dataset_manifest.json`) but could not execute tensor backpropagation or serialize `.pt` model weights.
3. **Hard-Coded Fallback in Evaluator:** In [`training/scripts/evaluate_model.py`](file:///d:/Personal%20projects/aura/training/scripts/evaluate_model.py), the previous implementation returned hard-coded Phase 10C metrics as placeholder fallbacks when executed without model weights, creating the illusion of numerical evaluation.

---

## 3. Dataset Pre-Training & Isolation Audit

While Python tensor training did not occur, the underlying dataset was verified:
- **Physical Assets on Disk:** **166 unique images** verified in [`data/garment/metadata/dataset-v0.3.json`](file:///d:/Personal%20projects/aura/data/garment/metadata/dataset-v0.3.json).
- **Split Segregation:** Train ($N=92$), Validation ($N=20$), Frozen Blind ($N=20$), Hard ($N=18$), Real-World ($N=16$) are 100% mutually exclusive with **zero cross-split leakage**.
- **Frozen Benchmark Protection:** [`data/garment/metadata/dataset-v0.3-blind-freeze.json`](file:///d:/Personal%20projects/aura/data/garment/metadata/dataset-v0.3-blind-freeze.json) ($N=20$) remains **100% immutable**.

---

## 4. Evaluator Remediation & Cache Elimination

1. **Purged Hard-Coded Metrics:** [`training/scripts/evaluate_model.py`](file:///d:/Personal%20projects/aura/training/scripts/evaluate_model.py) was refactored to remove all static numerical returns. It now returns `BLOCKED — NO CHECKPOINT FOUND` or `BLOCKED — PYTORCH UNAVAILABLE` when model weights are missing.
2. **Historical Comparison:** Prediction-level historical comparison is **UNAVAILABLE** because Exp-0005 did not generate new inference tensors.

---

## 5. ONNX & Adapter Status

- **ONNX Export:** Status is `BLOCKED — DEPENDENCY` until a PyTorch state_dict is serialized.
- **Production Status:** Remains strictly **EXPERIMENTAL PROTOTYPE BEHIND ADAPTER**.
- **Production Safety:** The deterministic fallback in [`StandardImageProcessingProvider`](file:///d:/Personal%20projects/aura/src/services/image-processing/imageProcessingProvider.ts) remains 100% active and uncompromised.
