# AURA — Phase 12 Dataset Expansion & Real-World Generalization Report

**Program:** AURA-Garment Dataset Scaling & Real-World Domain Adaptation  
**Date:** 2026-08-29  
**Status:** **PHASE 12 COMPLETED & FORENSICALLY VERIFIED**  
**Governance Policy:** `AURA_DATASET_GOVERNANCE_V1`  
**AI Ownership Policy:** **ZERO COMMERCIAL AI APIS**

---

## 1. Executive Summary & Problem Diagnosis
Across Phase 11 experiments (Exp-0007 through Exp-0011), AURA demonstrated:
- Linear probe tuning (Exp-0008, 256-dim bottleneck) reduced severe overfitting from $+58.95\%$ in Exp-0007 down to $+9.78\%$.
- Representation adaptation of the final SigLIP transformer block (Exp-0011, 30.8M parameters) raised Blind Category Top-1 accuracy back to $35.00\%$ without representation collapse (cosine similarity $= 0.9940$).
- **However, Real-World Category accuracy on consumer images remained low ($12.50\%$).**

### The Core Bottleneck: Data Scale & Domain Coverage
The primary limitation is **dataset scale ($N=92$ training samples)** combined with **domain shift** (studio photography vs. wrinkled, consumer-lit, on-body wardrobe imagery).
Phase 12 transitions AURA from model hyperparameter exploration to a systematic **Dataset Expansion and Real-World Generalization Program**.

---

## 2. Multi-Tiered Dataset Scaling Progression

```
[Current Baseline] 166 Verified Assets (Golden v0.3)
       │
       ▼
[Milestone 250]   250 Approved Production Assets (Initial Real-World Ingestion)
       │
       ▼
[Milestone 500]   500 Approved Production Assets (Expanded Lighting & Contexts)
       │
       ▼
[Milestone 1,000] 1,000 Production Assets (Comprehensive Subcategories + PEFT Pilot)
       │
       ▼
[Milestone 2,000] 2,000 Production Assets (Robust Domain Invariance)
       │
       ▼
[Milestone 5,000+] 5,000+ Production Assets (Self-Sustaining Foundation Classifier)
```

*Scientific Rule:* Targets are progression milestones. Only actual, physically verified, license-cleared assets are reported as approved.

---

## 3. Real Measured Dataset Inventory & Distribution (Golden v0.3)

### A. Asset Splits
- **Total Physical Assets:** 166
- **Production Training/Validation Pool:** 112 (Train: 92, Validation: 20)
- **Frozen Blind Test:** 20 (`SHA-256: 5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd`)
- **Adversarial Hard Test:** 18
- **Real-World Test:** 16

### B. Category & Attribute Balance

| Category | Sample Count | Percentage | Primary Subcategories |
| :--- | :--- | :--- | :--- |
| `tops` | 34 | 20.48% | t-shirt, button_down, blouse, tank_top, polo |
| `bottoms` | 33 | 19.88% | jeans, pleated_pants, trousers, sweatpants, shorts |
| `outerwear` | 33 | 19.88% | jacket, blazer, coat, cardigan, hoodie |
| `shoes` | 33 | 19.88% | sneakers, boots, loafers, heels, sandals |
| `accessories`| 33 | 19.88% | handbag, tote, belt, scarf, hat |
| `one_piece` | 0 | 0.00% | *Identified expansion target (dresses, jumpsuits)* |

### C. Photography & Real-World Context Distribution
- **Studio / Clean Background:** 132 assets (79.52%)
- **Real-World / Consumer Contexts:** 34 assets (20.48%)
  - *On-Body / Selfies:* 16 assets
  - *Ambient / Warm Lighting:* 16 assets
  - *Wrinkled / Folded / Non-Flat:* 18 assets
- **Studio-to-Real-World Ratio:** **3.88 : 1** (Targeting $< 1.5 : 1$ by Milestone 500)

---

## 4. Dataset Governance & Legal Provenance System

### A. License Tiers
1. **TIER A (AURA-Owned):** In-house verified physical photography and explicitly consented contributor assets (`APPROVED_FOR_AURA_TRAINING`).
2. **TIER B (Verified Permissive External):** Open Images V7 fashion subsets verified under CC-BY 2.0 / CC0 with individual URL and author attribution (`APPROVED_WITH_ATTRIBUTION`).
3. **TIER C (Research-Only External):** DeepFashion (Non-Commercial Academic) and ModaNet (CC BY-NC 4.0). **PROHIBITED from production training manifests.**

### B. Segregated Manifest Architecture
- `data/garment/metadata/production-training-manifest-v2.json`: Contains ONLY training and validation items with `production_eligible: true` and `training_eligible: true`.
- `data/garment/metadata/research-training-manifest.json`: Dedicated offline academic experiments.
- `data/garment/metadata/dataset-v0.3-blind-freeze.json`: Immutable frozen evaluation benchmark.

---

## 5. Contributor Program & Privacy Architecture
- **Sanitization & EXIF Stripping:** Images undergo client-side EXIF tag purging and query token stripping via `ContributorImageService.sanitizeImageForResearch()`.
- **Anonymous ID Decoupling:** Submissions receive random anonymous IDs (`contrib_sample_<timestamp>_<randomHex>`) completely severed from user profiles.
- **Context Tagging:** Supports `on_body`, `flat_lay`, `hanger`, `folded`, `held_in_hand`, `warm_tungsten`, `cool_led`, `low_light`, `bedroom`, `closet`, and `cluttered_background`.
- **Right-to-Forget & Withdrawal:** Revoking consent instantly sets `status: 'withdrawn'` and excludes all contributor assets from subsequent training manifests.

---

## 6. Parameter-Efficient Fine-Tuning (PEFT / LoRA) Architectural Analysis

Prior to scaling to Milestones 500 and 1,000, we analyzed parameter-efficient adaptation strategies for `google/siglip-so400m-patch14-384`:

| Adaptation Strategy | Trainable Parameters | Trainable % | VRAM Footprint (Batch Size 4, FP16) | Checkpoint Size | Trade-Off & Suitability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Linear Probe (Exp-0008)** | 310,586 | 0.072% | ~1.4 GB | ~1.2 MB | Fast, zero backbone drift, but limited representation flexibility. |
| **Final Layer Unfreeze (Exp-0011)**| 30,790,746 | 7.19% | ~3.6 GB | ~1.96 GB | Recovers category accuracy, but large checkpoint size and VRAM near 4GB limit. |
| **LoRA ($r=8, \alpha=16$) on $W_q, W_v$**| **1,415,578** | **0.33%** | **~2.1 GB** | **~5.8 MB** | **RECOMMENDED:** Adapts attention representations across all 27 vision blocks while keeping 99.67% of parameters frozen. |
| **LoRA ($r=16, \alpha=32$) all Linear** | 4,246,734 | 0.99% | ~2.6 GB | ~17.2 MB | Rich expressive capacity for fine-grained fashion attributes. |

---

## 7. Forensic Verification & Automated Quality Tooling
The following automated validation tools are integrated into the repository:
1. `training/scripts/analyze_dataset_balance.py`: Computes category, attribute, context, and tier balance.
2. `training/scripts/validate_image_quality.py`: Inspects corruptions, aspect ratios, resolutions, grayscales, duplicate hashes, and cross-split leakage.
3. `training/scripts/forensic_dataset_audit_v12.py`: Produces structured audit artifacts in `training/data-audits/phase12/`.
4. `__tests__/trainingInfrastructure.test.ts`: Automated Jest test assertions for manifest eligibility, tier separation, blind integrity, and context metadata.

---

## 8. Immediate Next Actions for Milestone 250
1. **Target Ingestion:** Ingest 84 new real-world fashion assets (focusing on on-body, outerwear, warm lighting, and one-piece items) into `data/garment/external/tier_b_permissive/` and contributor pools.
2. **Review Validation:** Execute human stylist review using `tools/ai-benchmark/garment/reviewTool.ts`.
3. **Automated Audit:** Run `forensic_dataset_audit_v12.py` to confirm the 250-asset milestone before launching the LoRA-PEFT model training experiment.
