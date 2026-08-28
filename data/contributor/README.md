# AURA Fashion Research Contributor Ingestion Boundary

**Purpose:** Isolated staging area for voluntary, consent-verified user image submissions under the *AURA Fashion Research Contributor Program*.

---

## 1. Privacy Boundary Rules

1. **NO AUTOMATIC COLLECTION:** Zero production wardrobe scans are ever written to this folder automatically.
2. **CONSENT-GATED INGESTION:** Only images with signed cryptographic consent records (`consent_version >= 1.0`) are staged here.
3. **EXIF REMOVED:** All GPS, camera hardware tags, timestamps, and device fingerprints are stripped prior to arrival.
4. **WITHDRAWAL PROTOCOL:** If a user revokes consent or deletes their account, their staged images are immediately purged.

---

## 2. Directory Structure

- `staged/`: Initial pre-validation uploads with stripped EXIF.
- `anonymized/`: Human-reviewed, face/landmark-masked images eligible for future dataset manifests (`v0.4+`).
- `metadata/contributor-registry.json`: Lineage tracker recording consent timestamps and withdrawal states.
