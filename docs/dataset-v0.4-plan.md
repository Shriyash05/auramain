# AURA Garment Dataset v0.4 Expansion & Milestone Roadmap

**Product:** AURA  
**Document:** Dataset Scaling Milestones & v0.4 Architecture Plan  
**Date:** 2026-08-28  
**Status:** **ACTIVE ROADMAP PLAN**  

---

## 1. Scaling Milestones & Quality Gates

| Milestone | Target Total Validated Samples | Target Contributor Cohort | Primary Objective | Quality Gate Required |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 1** | **250 Samples** | $\sim 84$ Contributor Photos | Initial contributor pipeline verification | Zero group leakage; 100% human-verified labels. |
| **Milestone 2** | **500 Samples** | $\sim 334$ Contributor Photos | Balanced class distributions across 5 categories | Subcategory Top-1 accuracy $\ge 88\%$ on holdout set. |
| **Milestone 3** | **750 Samples** | $\sim 584$ Contributor Photos | Hard-case expansion (overshirts, sheer fabrics, low-light) | Adversarial hard-set Macro F1 $\ge 82\%$. |
| **Milestone 4** | **1,000 Samples** | $\sim 834$ Contributor Photos | Statistically powered generalization benchmark | Frozen Blind Test Macro F1 $\ge 92\%$; Real-World $\ge 88\%$. |
| **Milestone 5** | **2,000+ Samples** | $\sim 1,834$ Contributor Photos | Candidate production training pool | False-confidence rate $\le 0.01\%$; unknown refusal calibrated. |

---

## 2. Frozen Test Set Protection

- **`dataset-v0.3-blind-freeze.json` ($N=20$):** Remains **PERMANENTLY FROZEN**. Zero contributor images will ever be inserted into this historical benchmark to maintain pure evaluation integrity.
- **`dataset-v0.4-blind-freeze.json`:** Will be independently generated and frozen only once Milestone 4 ($N \ge 1,000$) is achieved.
