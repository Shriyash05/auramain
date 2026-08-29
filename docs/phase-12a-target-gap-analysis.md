# AURA — Phase 12A Target Gap Analysis & Acquisition Plan

**Program:** AURA-Garment Milestone 250 Acquisition  
**Date:** 2026-08-29  
**Status:** **ACTIVE ACQUISITION TARGET SPECIFICATION**  
**Governance:** `AURA_DATASET_GOVERNANCE_V1` (Zero Commercial AI APIs)

---

## 1. Executive Summary & Baseline Audit
A forensic analysis of the current verified production dataset (`AURA-Garment-Golden-v0.3`, $N=166$ assets) reveals significant structural skews toward studio editorial photography:
- **Studio-to-Real-World Ratio:** **3.88 : 1** (132 studio vs 34 real-world).
- **One-Piece Garments:** **0 / 166 (0.00%)**.
- **On-Body / Consumer Perspectives:** **16 / 166 (9.64%)**.
- **Wrinkled / Non-Flat Conditions:** **18 / 166 (10.84%)**.
- **Warm / Dim / Low Lighting:** **16 / 166 (9.64%)**.

To reach the **Milestone 250** ($250$ approved production-eligible assets, requiring $+84$ new assets), the acquisition pipeline must not collect random images, but strictly target measured domain deficits.

---

## 2. Priority Acquisition Matrix for 84 New Assets

| Target Domain | Current Count | Target in New Cohort (+84) | Post-Milestone 250 Target | Priority | Focus Subcategories / Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **One-Piece Category** | 0 (0.0%) | **18 assets** | 18 (7.2%) | **CRITICAL** | Dresses, jumpsuits, rompers, dungarees. |
| **Outerwear Category** | 33 (19.9%) | **20 assets** | 53 (21.2%) | **HIGH** | Jackets, blazers, winter coats, cardigans, hoodies, overshirts. |
| **Tops Category** | 34 (20.5%) | **16 assets** | 50 (20.0%) | **MEDIUM** | Knitwear, layered tops, polos, blouses, tank tops. |
| **Bottoms Category** | 33 (19.9%) | **15 assets** | 48 (19.2%) | **MEDIUM** | Cargo pants, midi skirts, tailored trousers, denim shorts. |
| **Shoes Category** | 33 (19.9%) | **8 assets** | 41 (16.4%) | **LOW** | Boots, loafers, sandals, sneakers. |
| **Accessories Category**| 33 (19.9%) | **7 assets** | 40 (16.0%) | **LOW** | Handbags, belts, scarves, hats. |

---

## 3. Real-World Photography & Environmental Context Targets

| Environmental Dimension | Current Count ($N=166$) | Minimum Required in +84 Cohort | Target Goal |
| :--- | :--- | :--- | :--- |
| **On-Body / Selfies** | 16 | **36 assets (42.9%)** | 52 assets ($>20\%$ of total pool) |
| **Cluttered Backgrounds**| 16 | **32 assets (38.1%)** | 48 assets (bedroom, closet, floor, street) |
| **Warm / Low Lighting** | 16 | **28 assets (33.3%)** | 44 assets (warm tungsten, dim ambient, backlit) |
| **Wrinkled / Folded** | 18 | **24 assets (28.6%)** | 42 assets (rumpled cotton, linen folds, unsteamed) |

---

## 4. Acquisition & Review Protocol
1. **Source Clearance:** Check Tier A (AURA-owned / consented contributor) or Tier B (CC-BY / CC0 permissive). Prohibit Tier C.
2. **Provenance Logging:** Assign `candidate_id`, `garment_group_id`, source URL, author credit, license URL to `phase12a-acquisition-registry.json`.
3. **Image Validation:** Run `validate_image_quality.py` (aspect ratios, resolution $>64\text{px}$, RGB, hash duplicate check).
4. **Human Review:** Verify taxonomy labels and context metadata using `tools/ai-benchmark/garment/reviewTool.ts`.
5. **Manifest Staging:** Approved items enter `data/garment/metadata/production-training-manifest-v2.json`.
