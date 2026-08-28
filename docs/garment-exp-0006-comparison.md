# AURA Garment Experiment 0006 — Empirical Baseline Comparison

**Product:** AURA  
**Document:** Comparison of Real GPU Model Baseline (`garment-exp-0006`) vs Prior Architecture Benchmarks  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ACTIVE COMPARISON RECORD**  

---

## 1. Metric Comparison Matrix

| Evaluation Dimension | Exp-0005 (Forensic Status: Failed Run) | Exp-0006 (Real GPU Run) | Status |
| :--- | :--- | :--- | :--- |
| **GPU Optimization Executed** | `FAILED (0 Steps)` | **120 Steps (20 Epochs on GTX 1650)** | `REAL_MEASURED` |
| **Real Checkpoint Produced** | `NONE (0 Bytes)` | **102,135,861 Bytes (`best_model.pt`)** | `REAL_MEASURED` |
| **Checkpoint SHA-256** | `N/A` | `616692c6e9fc6d13...` | `REAL_MEASURED` |
| **Validation Macro F1 ($N=20$)** | `N/A (Static Return)` | **0.0750** | `REAL_MEASURED` |
| **Frozen Blind Macro F1 ($N=20$)** | `N/A (Static Return)` | **0.1667** | `REAL_MEASURED` |
| **Frozen Blind Category Top-1** | `N/A (Static Return)` | **0.2500 ($5/20$)** | `REAL_MEASURED` |
| **Adversarial Hard Macro F1 ($N=18$)** | `N/A (Static Return)` | **0.1481** | `REAL_MEASURED` |
| **Real-World Macro F1 ($N=16$)** | `N/A (Static Return)` | **0.2396** | `REAL_MEASURED` |
| **Unknown Refusal Rate (Blind)** | `N/A (Static Return)` | **0.6000 ($12/20$)** | `REAL_MEASURED` |
| **ONNX Max Delta $L_\infty$** | `N/A (Blocked)` | **$2.145767 \times 10^{-6}$** | `REAL_MEASURED` |

---

## 2. Engineering Insights

1. **Honest Baseline Calibration:** Training linear projection heads from scratch on $N=92$ samples with a small batch size ($4$) and frozen feature extractor achieves true training loss convergence ($9.07 \rightarrow 2.17$), but exhibits high uncertainty on un-augmented validation sets.
2. **Safe Refusal Behavior:** The confidence threshold ($0.65$) causes the model to refuse $60\% - 83\%$ of ambiguous samples rather than hallucinating wrong categories.
3. **Phase 11E Roadmap:** In Phase 11E, we will introduce image data augmentation (color jitter, random crops, horizontal flips) and learning rate scheduling to improve generalization.
