# AURA Phase 11A — Machine Learning Training & Operations Guide

**Product:** AURA  
**Document:** ML Operations, Training CLI, Evaluation & ONNX Verification Manual  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **ACTIVE OPERATIONAL GUIDE**  

---

## 1. Local Hardware & Environment Specifications

- **Target Local Hardware:** Intel Core i5-10300H CPU, 16 GB RAM, NVIDIA GeForce GTX 1650 (4 GB Dedicated GDDR6 VRAM).
- **VRAM Optimization Strategy:**
  - `batch_size: 4` per worker.
  - `gradient_accumulation_steps: 4` (Effective batch size = 16).
  - `mixed_precision: "fp16"` enabled.
  - SigLIP-SO400M backbone remains frozen; only multi-task linear projection heads are trained.

---

## 2. Canonical Taxonomy Synchronization

Before training, ensure canonical taxonomy mappings are generated from the TypeScript source of truth:
```bash
node tools/ai-benchmark/garment/exportCanonicalTaxonomy.js
```
This generates [`data/garment/metadata/canonical_taxonomy.json`](file:///d:/Personal%20projects/aura/data/garment/metadata/canonical_taxonomy.json).

---

## 3. Training Commands

### Dry-Run Validation (Schema & Split Check):
```bash
python training/scripts/train_garment_classifier.py --config training/configs/siglip_so400m_garment_v1.yaml --dry-run
```

### Smoke Test (1-Batch Forward/Backward Verification):
```bash
python training/scripts/train_garment_classifier.py --config training/configs/siglip_so400m_garment_v1.yaml --smoke-test
```

### Resume Training from Existing Checkpoint:
```bash
python training/scripts/train_garment_classifier.py --config training/configs/siglip_so400m_garment_v1.yaml --resume-from training/runs/garment-exp-0004/latest_checkpoint.pt
```

---

## 4. Multi-Split Evaluation Commands

Evaluate model checkpoints on isolated test splits without modifying frozen test manifests:

```bash
# Blind Holdout Test Set (N=20)
python training/scripts/evaluate_model.py --split blind_test

# Adversarial Hard Test Set (N=18)
python training/scripts/evaluate_model.py --split hard_test

# Real-World Phone Photo Test Set (N=16)
python training/scripts/evaluate_model.py --split real_world_test
```

---

## 5. ONNX Export & Parity Verification

```bash
# Export PyTorch checkpoint to ONNX with dynamic batch axes
python training/scripts/export_onnx.py --config training/configs/siglip_so400m_garment_v1.yaml --checkpoint training/checkpoints/best_model.pt --output training/checkpoints/aura-garment-v1.onnx

# Verify inference numerical parity (L_inf < 1e-4)
python training/scripts/verify_onnx.py --onnx-path training/checkpoints/aura-garment-v1.onnx --dry-run
```

---

## 6. Execution Status Matrix

| Component / Command | Environment | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Canonical Taxonomy Exporter** | Node.js / TypeScript | `IMPLEMENTED` & `EXECUTED` | Synchronized with `src/types/garmentTaxonomy.ts` |
| **Pipeline Dry-Run Validation** | Python 3.14 / Local | `IMPLEMENTED` & `EXECUTED` | Verified splits: Train (92), Val (20), Blind (20), Hard (18), RW (16) |
| **Multi-Split Evaluation CLI** | Python 3.14 / Local | `IMPLEMENTED` & `EXECUTED` | Verified blind_test, hard_test, and real_world_test reporting |
| **ONNX Exporter & Verifier CLI** | Python 3.14 / Local | `IMPLEMENTED` & `EXECUTED` | Dynamic axis [batch_size, 1152] verified |
| **Full GPU Tensor Training Run** | NVIDIA GTX 1650 (Local) | `ARCHITECTURE READY` | Scheduled for Phase 11B official run |
| **Cloud GPU Scaled Fine-Tuning**| Serverless A10G / L4 | `ESTIMATED` / `NOT RUN` | No cloud GPU consumed in Phase 11A |
