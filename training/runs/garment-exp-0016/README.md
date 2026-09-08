# AURA Garment Experiment 0016 — Localization + Selective LoRA System Study

**Model:** `aura-garment-v1`
**Backbone:** `google/siglip-so400m-patch14-384` + Selective LoRA (Last 4 Layers: 23–26, r=8, a=16)
**Head:** 256-dim Bottleneck Head (1152 -> 256)
**Hardware:** `NVIDIA GeForce GTX 1650` (4096 MB VRAM)
**Dataset:** Frozen `dataset-v0.5-500.json` (N=500, Train=459, Val=41)
**Status:** **PHASE 14 SYSTEM EXPERIMENT READY**
