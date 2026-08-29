# AURA Phase 12A — Kaggle Source Forensic Audit & Milestone 250 Gate

## 1. Executive Summary
- **Milestone 250 Status:** **REACHED** (Exact **250** production training/validation assets).
- **Frozen Manifest:** `data/garment/metadata/dataset-v0.4-250.json` (SHA-256: `8bf14c5921ba25a2879d524172dde7f6a6ba91a706524b8fed039fc3664da062`).
- **Frozen Blind Checksum:** `5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd` (100% Intact & Untouched).
- **Approved Source Policy:** `controlled_expansion`.

---

## 2. Kaggle Source Forensic Verification
- **Dataset:** Clothing Dataset (Full) (`agrigorev/clothing-dataset-full`)
- **Owner:** Alexey Grigorev
- **Declared License:** `CC0 1.0 Universal`
- **Upstream Repository:** `https://github.com/alexeygrigorev/clothing-dataset`
- **Upstream Verification Findings:**
  - Upstream repo contains an unambiguous CC0 1.0 Universal public domain dedication.
  - README explicitly declares: *"This dataset can be freely used for any purpose, including commercial... Training an internal model at any company"*.
  - Images were crowdsourced from community smartphone wardrobe photos tracked by anonymous `sender_id`.
  - Zero commercial retailer watermarks, zero scraped e-commerce catalog duplicates.
  - Legal Classification: **APPROVED (Controlled Expansion)**.

---

## 3. Dataset Distribution at Milestone 250
- **Total Production Train/Val Assets:** **250**
  - Original AURA Golden Pure Train/Val: **112**
  - Tier B Internet (Wikimedia CC0/CC-BY): **29**
  - Kaggle Clothing Dataset (CC0): **109**
- **Category Coverage:**
  - Tops: 60
  - Bottoms: 56
  - Outerwear: 73
  - Shoes: 43
  - Accessories: 38
  - One-Piece: 39
- **Real-World Smartphone / Context Coverage:** 149 / 250 (59.6% real-world consumer captures).
