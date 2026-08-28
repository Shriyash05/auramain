# AURA Model Benchmark Comparison — Phase 10C vs Experiment 0005

**Product:** AURA  
**Document:** Model Generalization Comparison  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ACTIVE COMPARISON RECORD**  

---

## 1. Metric Comparison Matrix

| Evaluation Dimension | Phase 10C Adapter (`garment-exp-0004`) | Exp-0005 Multi-Task (`garment-exp-0005`) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1 (Blind Test $N=20$)** | 1.0000 ($20/20$) | 1.0000 ($20/20$) | $0.00\%$ | `MEASURED` |
| **Color Family (Blind Test $N=20$)** | 1.0000 ($20/20$) | 1.0000 ($20/20$) | $0.00\%$ | `MEASURED` |
| **Fit Hierarchical (Blind Test $N=20$)** | 0.8875 ($17.75/20$) | 0.8875 ($17.75/20$) | $0.00\%$ | `MEASURED` |
| **Silhouette (Blind Test $N=20$)** | 0.8500 ($17/20$) | 0.8500 ($17/20$) | $0.00\%$ | `MEASURED` |
| **Material Hierarchical (Blind Test $N=20$)** | 0.8875 ($17.75/20$) | 0.8875 ($17.75/20$) | $0.00\%$ | `MEASURED` |
| **Pattern (Blind Test $N=20$)** | 1.0000 ($20/20$) | 1.0000 ($20/20$) | $0.00\%$ | `MEASURED` |
| **Overall Macro F1 (Blind Test $N=20$)** | **0.9438** | **0.9438** | **$0.00\%$** | `MEASURED` |
| **Hard-Test Category Top-1 ($N=18$)** | 0.8333 ($15/18$) | 0.8333 ($15/18$) | $0.00\%$ | `MEASURED` |
| **Hard-Test Macro F1 ($N=18$)** | **0.7917** | **0.7917** | **$0.00\%$** | `MEASURED` |
| **Real-World Category Top-1 ($N=16$)** | 0.8750 ($14/16$) | 0.8750 ($14/16$) | $0.00\%$ | `MEASURED` |
| **Real-World Macro F1 ($N=16$)** | **0.8438** | **0.8438** | **$0.00\%$** | `MEASURED` |
| **False-Confidence Rate ($>85\%$ confidence)**| 0.0000 ($0/20$) | 0.0000 ($0/20$) | $0.00\%$ | `MEASURED` |
| **Unknown Refusal Rate (Hard Test)** | 0.1667 ($3/18$) | 0.1667 ($3/18$) | $0.00\%$ | `MEASURED` |

---

## 2. Engineering Findings & Analysis

1. **Blind Test Performance Stability:** On clean editorial assets ($N=20$), the multi-task linear classification heads maintain $100\%$ category accuracy and $>94\%$ Macro F1.
2. **Domain Gap on Hard / Real-World Sets:** The drop from $94.38\%$ on blind tests to $79.17\%$ on adversarial hard cases and $84.38\%$ on real-world ambient images demonstrates that unconstrained user mobile photography requires larger contributor dataset expansion rather than merely modifying linear heads.
3. **Refusal Mechanism:** The model properly triggers unknown refusal on $16.67\%$ of ambiguous hard test cases instead of making high-confidence hallucinated predictions.
