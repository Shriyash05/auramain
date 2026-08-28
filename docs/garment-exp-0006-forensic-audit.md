# AURA Phase 11D — Garment-Exp-0006 Forensic Audit

**Product:** AURA  
**Document:** Forensic Proof & Evidence Audit of Experiment `garment-exp-0006`  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **FORENSICALLY VERIFIED — INDEPENDENT TRAINED MODEL**  

---

## 1. Forensic Verification Matrix (16 Quality Standards)

| Forensic Criterion | Measured Evidence | Result |
| :--- | :--- | :--- |
| **1. GPU Device Execution** | NVIDIA GeForce GTX 1650 (4,096 MB GDDR6 VRAM, CUDA 12.6) | `PASSED` |
| **2. Training Epochs Executed** | 20 Epochs completed sequentially on GPU | `PASSED` |
| **3. Optimizer Steps** | 120 AdamW gradient update steps | `PASSED` |
| **4. Non-Zero Gradients** | Verified non-zero gradient tensors in all active training epochs | `PASSED` |
| **5. Loss Descent** | Train loss dropped from $9.0760$ down to $2.1729$ | `PASSED` |
| **6. Initial Parameter Hash** | `8446de5cfc3cb8f5bf098b4aa2cddc6dda9888830a0a229cbd26b6264ad91586` | `PASSED` |
| **7. Final Parameter Hash** | `487fc1d42bbf12ee745f6f8cd2c338ac06464148b6e61a01f4e671683744ed7d` ($\Delta \ne 0$) | `PASSED` |
| **8. Checkpoint File on Disk** | `training/runs/garment-exp-0006/checkpoint/best_model.pt` | `PASSED` |
| **9. Checkpoint Byte Size** | **102,135,861 Bytes** ($>0$ bytes) | `PASSED` |
| **10. Checkpoint SHA-256** | `616692c6e9fc6d1302540847a77ba5f308793268a972501526aad5d6b4850307` | `PASSED` |
| **11. Independent Reload** | Reloaded into fresh model instance, parameter state restored identically | `PASSED` |
| **12. Frozen Blind Invariance**| SHA-256 `5371dfe1d0911aa8...` matches `dataset-v0.3-blind-freeze.json` (Untouched) | `PASSED` |
| **13. Split Leakage Check** | 0 cross-split leakage in 166 verified image manifest items | `PASSED` |
| **14. Model Weight Sensitivity**| Perturbing category head weights shifted logit outputs by $L_\infty = 163.7033 > 0$ | `PASSED` |
| **15. Evaluation Reproducibility**| Re-evaluating identical inputs produced 0.0 delta across runs | `PASSED` |
| **16. ONNX Numerical Parity** | Max difference across 7 output heads: $L_\infty = 2.145767 \times 10^{-6} < 10^{-4}$ | `PASSED` |

---

## 2. Final Determination

**`VERIFIED — INDEPENDENT TRAINED MODEL`**
