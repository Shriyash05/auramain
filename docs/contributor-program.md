# AURA Fashion Research Contributor Program Specification

**Product:** AURA  
**Document:** Contributor Program Architecture, User Experience & Consent Specification  
**Version:** 1.0.0  
**Date:** 2026-08-28  
**Status:** **ACTIVE SPECIFICATION & IMPLEMENTATION**  

---

## 1. Vision & Core Philosophy

AI models in fashion frequently suffer from domain drift when confronted with real-world mobile photography—ambient room shadows, wrinkled textiles, folded garments, and casual postures.

The **AURA Fashion Research Contributor Program** creates a voluntary, privacy-preserving bridge allowing users to donate sanitized garment images to train open, ethical garment understanding models.

### Key Rules:
1. **100% Opt-In:** User wardrobe data is private by default. Zero automated harvesting.
2. **Decoupled Lineage:** User identity (`user_id`) is strictly decoupled into anonymous research sample identifiers (`contrib_sample_<timestamp>_<hash>`).
3. **Right-to-Forget:** Users can revoke research participation at any time, instantly excluding their data from all future dataset versions and future training cycles.
4. **No Commercial AI Vendors:** Zero contributed data is ever shared with or processed through commercial third-party AI APIs (OpenAI, Claude, Gemini, FASHN.ai, Photoroom).

---

## 2. User Journey & Screens

```text
PROFILE SCREEN
     ↓ (Subtle Navigation)
app/research/index.tsx (Consent & Program Explanation)
     ↓ [Join Research Program]
app/research/dashboard.tsx (Contributor Dashboard & Metrics)
     ↓ [Contribute a Garment]
app/research/contribute.tsx (Wardrobe Picker + Context Tagging)
     ↓ [Confirm & Stage]
STAGING AREA (awaiting_review)
     ↓ (Human Stylist Review)
APPROVED DATASET MANIFEST
```

---

## 3. Real-World Capture Contexts & Difficulties

Contributors tag the contextual environment of their garment photos:
- `flat_lay`: Laid flat on bed/floor.
- `on_body`: Worn naturally with body movement.
- `folded`: Partially folded in closet/drawer.
- `wrinkled`: Casual real-world laundry state.
- `ambient_light`: Natural indoor/outdoor lighting without studio flashes.
- `low_light`: Evening / dim room lighting.
- `occluded`: Straps, bags, or layers overlapping.
