# AURA Garment Experiment 0005 — Systematic Error Analysis

**Product:** AURA  
**Document:** Deep Failure Mode & Root-Cause Classification  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ACTIVE ERROR ANALYSIS**  

---

## 1. Failure Mode Taxonomy & Distribution

| Failure Category | Primary Symptoms | Example Items | Root Cause | Engineering Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Taxonomy Boundary** | `overshirt` predicted as `button_down` or `outerwear` | `garm_v3_133` | Boundary between thick overshirts and lightweight outerwear jackets. | Implemented dual-category classification (`primary_category` + `secondary_category`). |
| **Volume Ambiguity** | `Oversized` predicted as `Relaxed` | `garm_v3_132` | Volume in flat lays without human body reference. | Hierarchical loss granting $0.75\text{x}$ partial credit for parent tailoring classes. |
| **Fiber Ambiguity** | `nylon` predicted as `synthetic` | `garm_v3_134` | Micro-textures invisible without macro camera resolution. | Material hierarchy mapping fine fibers into parent synthetic super-class. |
| **Lighting / Shadow** | `navy` predicted as `black` | `garm_v3_135` | Ambient low-light shadow collapses dark blue chromatic saturation. | Delta-E LAB thresholding for dark neutral clusters. |
| **Occlusion / Folding** | Structured silhouette predicted as `unknown` | `garm_v3_151` | Wrinkled or folded garments on beds obscuring silhouette cut. | Refusal protocol properly triggers `unknown` instead of false confidence. |

---

## 2. Remediation Strategy

1. **Do NOT endlessly expand taxonomy complexity:** Taxonomy v0.3 with hierarchical matching and dual-category tagging is mathematically sound.
2. **Prioritize Real Contributor Photos:** Expand contributor onboarding through the *AURA Fashion Research Contributor Program* to introduce diverse ambient shadows and wrinkle patterns into the training split.
