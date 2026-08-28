# AURA Fashion Research Contributor Program — Data Governance & Privacy Requirements

**Product:** AURA  
**Document:** Contributor Consent, Anonymization, Data Lineage & Right-to-Forget Specification  
**Version:** 1.0  
**Status:** **ACTIVE DATA GOVERNANCE SPECIFICATION**  

---

## 1. Core Principles

1. **Zero Silent Collection:** User wardrobe photos and camera scans are **private by default**. No image is ever transferred to training storage without explicit, affirmative user opt-in.
2. **Purpose Limitation:** Contributor images are used exclusively to train and evaluate AURA self-hosted fashion intelligence models (`aura-garment-v1`, `aura-segment-v1`, `aura-inspire-v1`).
3. **No Commercial Vendor Leakage:** Contributor images are never shared, sold, or proxied to third-party commercial AI APIs (e.g. OpenAI, Anthropic, Gemini, FASHN.ai).

---

## 2. Contributor Opt-In & Consent Architecture

```text
+-------------------------------------------------------------+
|               AURA SETTINGS -> PRIVACY & RESEARCH           |
+-------------------------------------------------------------+
| [ ] Join AURA Fashion Research Contributor Program          |
|     "Help improve AURA's fashion intelligence by allowing   |
|     anonymized clothing cutouts to be included in our       |
|     open-source research benchmarks. You can withdraw       |
|     at any time, and your photos will be purged from future |
|     dataset versions."                                      |
+-------------------------------------------------------------+
```

---

## 3. Data Processing & Anonymization Requirements

Before any opted-in image enters the contributor staging pipeline:
1. **EXIF & Metadata Stripping:** All GPS coordinates, device identifiers, timestamps, and camera serial numbers are permanently purged.
2. **Face & Body Anonymization:** For on-body photos, faces and identifiable skin landmarks are automatically cropped or masked.
3. **Cryptographic ID Assignment:** Images are assigned an anonymous UUID (`contributor_img_<uuid>`) decoupled from the user's `auth.users.id`.

---

## 4. Withdrawal & Right-to-Forget Protocol

1. **Immediate Deletion from Active Raw Pools:** When a user opts out or requests account deletion via `DatabaseService.deleteUserAccountData(userId)`:
   - Staged contributor images are immediately purged from active cloud storage buckets.
   - The user's contributor token is invalidated.
2. **Training Manifest Versioning & Lineage Tracking:**
   - Datasets are strictly versioned (`v0.1`, `v0.2`, `v0.3`).
   - If a user withdraws consent, their images are excluded from the next dataset version (`v_{N+1}`).
   - Existing models trained on prior versions are documented in [`docs/garment-experiments.md`](file:///d:/Personal%20projects/aura/docs/garment-experiments.md) with complete lineage hashes.
