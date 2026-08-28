# AURA Garment Dataset Forensics — Version 0.2 Audit

**Product:** AURA  
**Document:** Historical Dataset Forensic Analysis (v0.1 → v0.2 Transition)  
**Date:** 2026-08-28  
**Author:** AI Architecture & Data Integrity Team  
**Status:** **ACTIVE FORENSIC AUDIT**  

---

## 1. Executive Summary & Inventory

This forensic audit rigorously traces the provenance, unique image counts, label changes, split integrity, and license lineage between **`AURA-Garment-Golden-v0.1`** ($N=18$) and **`AURA-Garment-Golden-v0.2`** ($N=46$).

### Workspace Physical Asset Inventory:
- **Total Physical Image Files in `assets/`:** 242 files `MEASURED`.
- **Total Unique Visual Content Assets (deduplicated by byte-fingerprint):** 168 unique visual assets `MEASURED`.

---

## 2. Manifest Comparison: `dataset-v0.1.json` vs `dataset-v0.2.json`

| Metric / Dimension | `dataset-v0.1.json` | `dataset-v0.2.json` | Delta ($\Delta$) | Forensic Analysis & Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Total Samples ($N$)** | 18 | 46 | **+28 (+155.6%)** | Expanded coverage across editorial archive. |
| **Train Split Count** | 10 ($55.6\%$) | 22 ($47.8\%$) | **+12** | Expanded multi-category representation. |
| **Validation Split Count** | 4 ($22.2\%$) | 6 ($13.0\%$) | **+2** | Tuned for validation checkpoint selection. |
| **Blind Test Split Count** | 4 ($22.2\%$) | 6 ($13.0\%$) | **+2** | Unseen holdout test set. |
| **Adversarial Hard Test Count** | 0 ($0.0\%$) | 6 ($13.0\%$) | **+6 (New)** | Added fine-grained edge cases (cream vs white, navy in shadow, nylon vs synthetic). |
| **Real-World Test Count** | 0 ($0.0\%$) | 6 ($13.0\%$) | **+6 (New)** | Added realistic phone/ambient lighting, wrinkled, flat-lay, and on-body contexts. |
| **Perceptual Leakage** | 0 detected | 0 detected | **0 (Zero Leakage)** | Verified via perceptual fingerprinting validator. |
| **Master Taxonomy Version** | `v1.0` (Flat) | `v0.2` (Hierarchical) | **Upgraded** | Introduced hierarchical fit/material partial credit. |
| **License Provenance** | AURA Editorial | AURA Editorial | **100% Owned** | Commercial IP rights verified. |

---

## 3. Label Changes & Refinements

1. **Hierarchical Fit Mapping:** `garm_v2_hard_06` mapped with parent-child relationship between `Relaxed` and `Oversized`.
2. **Material Groupings:** `garm_v2_hard_05` categorized under synthetic super-class with `nylon` subtype flag.
3. **Color Space Boundaries:** `garm_v2_hard_01` flagged as `cream_vs_white_boundary` with Delta-E threshold annotation.
