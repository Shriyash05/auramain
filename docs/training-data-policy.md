# AURA Training Data & Privacy Policy

**Product:** AURA  
**Document:** Training Data, Data Governance & Privacy Architecture  
**Version:** 1.0  
**Status:** **ACTIVE PRIVACY POLICY**  

---

## 1. Core Principles of AURA Data Governance

1. **User Wardrobe Data is NOT Automatic Training Data:** By default, user photos, wardrobe collections, body reference photos, and wear habits are strictly private personal data and are **NEVER** automatically ingested into model training pipelines.
2. **Explicit Opt-In for Model Improvement:** Any contribution of anonymized garment images or styling feedback to train AURA-owned specialized models requires explicit, informed, and revocable user consent.
3. **No External Commercial Data Leaks:** User data is never sent to third-party AI foundation vendors (e.g. OpenAI, Anthropic, Google) where it could be stored or used to train third-party commercial models.
4. **Local-First Processing Where Feasible:** Personal preference weight learning, recent wear damping, and search indexing operate on-device on the user's mobile client.

---

## 2. Permitted Training Data Sources for AURA Models

The proprietary AURA fashion intelligence dataset is composed strictly of:
1. **Public Domain & Permissively Licensed Datasets:** DeepFashion2 (Research/Permissive subsets), Fashion-Gen, and open taxonomy benchmarks.
2. **Curated Editorial Fashion Datasets:** In-house fashion editorial lookbooks, curated garment photography, and expert fashion stylist annotations.
3. **Synthetic Training Examples:** Legally and ethically generated photorealistic garment textures and synthetic outfit combinations created internally.
4. **Anonymized Opt-In User Contributions:** Garment cutouts and anonymized interaction vectors from users who explicitly opted into the *AURA Fashion Research Contributor Program*.

---

## 3. Data Deletion & Model Retraining Rights

- When a user requests account deletion via [`DatabaseService.deleteUserAccountData(userId)`](file:///d:/Personal%20projects/aura/src/services/database/databaseService.ts), all database records, user photos, and storage files are immediately and permanently destroyed.
- If a user previously opted into research contributions and later revokes consent, their anonymized contributions are excluded from future training runs.
