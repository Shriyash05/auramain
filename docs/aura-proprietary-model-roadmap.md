# AURA Proprietary Model Roadmap
## Architecture of the AURA Unified Fashion Intelligence Network

**Product:** AURA  
**Document:** Proprietary AI Roadmap & Multi-Stage Architecture  
**Version:** 1.0  
**Status:** **ACTIVE STRATEGIC BLUEPRINT**  

---

## 1. Core Architecture of the AURA Model

Instead of relying on generic third-party LLMs that lack fashion domain rigor, AURA is building an owned, modular **Fashion Intelligence Network**:

```text
               +-------------------------------------------------+
               |             GLOBAL FASHION TAXONOMY             |
               |      (Silhouette, Fit, Palette, Formality)      |
               +-------------------------------------------------+
                                        |
                                        v
               +-------------------------------------------------+
               |           AURA PAIRWISE COMPATIBILITY           |
               |            (Color / Proportion Matrix)          |
               +-------------------------------------------------+
                                        |
                                        v
               +-------------------------------------------------+
               |             PERSONAL USER EMBEDDINGS            |
               |       (Wears, Likes, Saves, Rejections, Swaps)  |
               +-------------------------------------------------+
                                        |
                                        v
               +-------------------------------------------------+
               |          DYNAMIC BEHAVIORAL STYLE RANKER        |
               |          (Context, Season, 48hr Damping)        |
               +-------------------------------------------------+
```

---

## 2. Progressive Phased Rollout

### Milestone 1: Hybrid Deterministic Core (Current Baseline)
- Combinatorial candidate generation in TypeScript ([`stylingEngine.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/stylingEngine.ts)).
- Real-time on-device preference gradient learning ([`preferenceLearningService.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/preferenceLearningService.ts)).
- Wardrobe gap combination unlocking analysis ([`wardrobeGapService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/wardrobeGapService.ts)).

### Milestone 2: `aura-garment-v1` & `aura-segment-v1` (First Proprietary Models)
- **First Owned Model:** `aura-garment-v1` (SigLIP-SO400M fine-tuned on fashion attributes).
- **Segmentation Container:** `aura-segment-v1` (BiRefNet Apache 2.0 deployed to serverless GPU).

### Milestone 3: `aura-inspire-v1` & `aura-intent-v1`
- Fine-tune Florence-2-Large on fashion deconstruction dataset.
- Export Qwen2.5-3B instruction adapter for converting natural styling prompts into structured `StylingEngine` constraints.

### Milestone 4: Self-Hosted `aura-vto-v1`
- Deploy IDM-VTON / CatVTON pipeline to serverless GPU containers with authenticated Supabase signed URL bridges.

---

## 3. Clear Boundaries: What Remains Deterministic vs What Uses ML

| Subsystem | Approach | Rationale |
| :--- | :--- | :--- |
| **Outfit Generation & Candidate Generation** | **DETERMINISTIC** | Combinatorial exploration of user closet with hard weather/color/category constraints is 100% reliable, zero-cost, and instant (<15ms). |
| **Personal Preference Learning** | **DETERMINISTIC / ANALYTICAL** | Linear gradient updates on user preference vector running directly on client device preserve privacy and require zero cloud compute. |
| **Wardrobe Gap Detection** | **DETERMINISTIC** | Mathematical combination unlocking potential ($N_{\text{tops}} \times N_{\text{bottoms}}$) enforces strict, explainable truth. |
| **Garment Attribute Extraction** | **LEARNED ML (SigLIP)** | Vision model needed to extract subtle texture, fit, and pattern from raw user camera photos. |
| **Garment Cutouts** | **LEARNED ML (BiRefNet)** | Neural matting model needed to separate clothing from complex real-world backgrounds. |
| **Virtual Try-On** | **LEARNED ML (Diffusion)** | Generative diffusion pipeline required for high-fidelity garment warping and blending. |
