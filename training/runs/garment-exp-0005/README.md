# AURA Garment Model Experiment Run: garment-exp-0005

**Model:** `aura-garment-v1`  
**Base:** `google/siglip-so400m-patch14-384` (Frozen Backbone)  
**Dataset:** `AURA-Garment-Golden-v0.3` ($N=166$)  
**Date:** 2026-08-28  
**Status:** **BASELINE EXPERIMENT COMPLETE**  

---

## 1. Split Allocation
- **Train ($N=92$):** Training split only.
- **Validation ($N=20$):** Used strictly for checkpoint selection.
- **Frozen Blind Test ($N=20$):** Immutable holdout benchmark.
- **Adversarial Hard Test ($N=18$):** Edge cases.
- **Real-World Test ($N=16$):** Wrinkled, flat-lay, ambient lighting.

---

## 2. Benchmark Summary
- **Frozen Blind Test ($N=20$):** Category Top-1: $100\%$, Macro F1: $0.9438$.
- **Hard Test ($N=18$):** Category Top-1: $83.33\%$, Macro F1: $0.7917$.
- **Real-World Test ($N=16$):** Category Top-1: $87.50\%$, Macro F1: $0.8438$.
- **Production Status:** **EXPERIMENTAL PROTOTYPE BEHIND ADAPTER** (Deterministic fallback remains active).
