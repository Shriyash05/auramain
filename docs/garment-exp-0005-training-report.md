# AURA Garment Experiment 0005 — Training Report & Forensic Status

**Product:** AURA  
**Experiment ID:** `garment-exp-0005`  
**Base Model:** `google/siglip-so400m-patch14-384`  
**Dataset:** `AURA-Garment-Golden-v0.3` ($N=166$)  
**Date:** 2026-08-28  
**Author:** Lead ML Engineer  
**Status:** **FAILED — TRAINING DID NOT OCCUR IN HOST PYTHON ENVIRONMENT**  

---

## 1. Executive Summary & Inventory

Experiment `garment-exp-0005` attempted to execute multi-task fine-tuning on `AURA-Garment-Golden-v0.3`. A Phase 11C forensic audit revealed that because the ambient development machine runs Python 3.14.7 without PyTorch wheels, the training loop did not execute backpropagation gradient steps, and no serialized `.pt` checkpoint was written to disk.

---

## 2. Forensic Audit Summary

```text
CHECKPOINT STATUS:
  checkpoint_path: training/runs/garment-exp-0005/checkpoint/best_model.pt
  exists: false (0 bytes)
  sha256: N/A (Missing)

TRAINING STATUS:
  epochs_executed: 0
  optimizer_steps: 0
  weight_delta: 0.0
  forensic_status: FAILED — TRAINING DID NOT ACTUALLY OCCUR IN PYTHON HOST
  root_cause: BLOCKED — HOST PYTHON 3.14 LACKS PYTORCH PACKAGES

DATASET STATUS:
  total_physical_samples: 166 verified on disk
  train: 92
  validation: 20
  frozen_blind: 20 (Immutable)
  hard: 18
  real_world: 16
  split_leakage: ZERO (0 overlap)

PRODUCTION STATUS:
  recommendation: KEEP EXPERIMENTAL PROTOTYPE BEHIND ADAPTER
  deterministic_fallback: StandardImageProcessingProvider remains 100% active
```
