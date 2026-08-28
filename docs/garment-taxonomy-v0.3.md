# AURA Master Garment Taxonomy Specification — Version 0.3

**Product:** AURA  
**Document:** Master Fashion Taxonomy v0.3, Observability Matrix & Refusal Protocol  
**Date:** 2026-08-28  
**Author:** Fashion Taxonomy & Applied ML Team  
**Status:** **ACTIVE MASTER TAXONOMY SPECIFICATION**  

---

## 1. Executive Summary & Taxonomy Evolution

| Version | Key Focus | Primary Architecture | Limitations Addressed |
| :--- | :--- | :--- | :--- |
| **v1.0** | Initial flat taxonomy | Direct string mapping | No ambiguity handling; fit confusion on oversized tailoring. |
| **v0.2** | Hierarchical taxonomy | Parent-child trees (Relaxed -> Oversized, Synthetic -> Nylon) | Resolved binary penalty on volume and fiber super-classes. |
| **v0.3** | **Observability-Gated Refusal** | Calibrated confidence gates + Dual-Category Hybrid tagging | Formalizes unknown refusal when visual evidence is insufficient. |

---

## 2. Attribute Visual Observability Matrix

| Attribute Field | Visual Observability Tier | Reliability on Clean Studio Flat-Lay | Reliability on Real-World Phone Photo | Refusal / Unknown Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Category** | **Directly Observable** | $99.5\%$ | $94.0\%$ | Fallback to `accessories` if unidentifiable accent. |
| **Subcategory** | **Directly Observable** | $92.0\%$ | $86.0\%$ | Dual-tagging for boundary items (e.g. `overshirt` $\leftrightarrow$ `jacket`). |
| **Color Family** | **Directly Observable** | $98.0\%$ | $88.0\%$ (Shadow sensitivity) | Delta-E LAB thresholding for dark tones. |
| **Silhouette** | **Directly Observable** | $88.0\%$ | $82.0\%$ | Returns `unknown` if garment is folded or balled up. |
| **Fit Proportions** | **Partially Observable** | $75.0\%$ | $68.0\%$ | **Refusal:** Flat-lays without scale default to `unknown` / `Relaxed`. |
| **Material Fiber** | **Partially Observable** | $80.0\%$ | $65.0\%$ | Returns super-class (`synthetic` / `natural`) if blend is unseen. |
| **Pattern** | **Directly Observable** | $96.0\%$ | $90.0\%$ | Textured micro-weaves distinguished from solid flat cotton. |
| **Formality Score**| **Latent / Continuous** | $90.0\%$ | $85.0\%$ | Mean Absolute Error (MAE) evaluated on 0.0–1.0 scale. |

---

## 3. Taxonomy v0.3 Change Log

1. **Dual-Category Tagging for Overshirts:** Items spanning Tops and Outerwear can declare `category: "tops"`, `secondary_category: "outerwear"`, preventing false penalty failures.
2. **Confidence-Gated Refusal ($<0.65$):** If the classification head produces maximum softmax probability $<0.65$, the prediction is set to `"unknown"`.
3. **Delta-E LAB Color Clustered Palette:** Light Neutrals (Optic White, Off-White, Cream), Dark Neutrals (Black, Charcoal, Navy), Earth (Beige, Brown, Olive).
