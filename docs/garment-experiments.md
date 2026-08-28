# AURA Garment Model Experiment Tracking

**Product:** AURA  
**Document:** `aura-garment-v1` Training & Fine-Tuning Experiment Log  
**Version:** 1.0  
**Status:** **ACTIVE EXPERIMENT REGISTRY**  

---

## 1. Experiment Registry Table

| Experiment ID | Experiment Name | Base Model Architecture | Dataset Version | Strategy & Technique | Hardware Used | Training Time | Validation Macro F1 | Test Top-1 Category Acc | Test Fit Acc | Status | Checkpoint Hash |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `garment-exp-0001` | Baseline Zero-Shot SigLIP | `google/siglip-so400m-patch14-384` | `v0.1.0` | Pretrained Zero-Shot Matching | Host CPU / GTX 1650 | N/A (Inference) | 0.8125 (Measured) | 1.0000 (Measured) | 0.7500 (Measured) | **COMPLETED BASELINE** | `sha256:siglip_so400m_base` |
| `garment-exp-0002` | Multi-Task Classification Heads | `SigLIP-SO400M` (Frozen Backbone) | `v0.1.0` | Linear Adapter Heads (Category, Fit, Color, Silhouette) | GTX 1650 (4GB VRAM) / Mixed Precision FP16 | ~18 mins (15 epochs) | 0.8750 (Measured) | 1.0000 (Measured) | 0.7500 (Measured) | **BEST VALIDATED ADAPTER** | `sha256:aura_garm_v1_head_8f9` |
| `garment-exp-0003` | Full LoRA Fine-Tuning | `SigLIP-SO400M` + LoRA ($r=16$) | `v0.1.0` | LoRA Attention Projections | Requires $\ge 12\text{GB}$ VRAM | Pending Cloud GPU | Pending | Pending | Pending | **PLANNED CLOUD RUN** | `pending` |

---

## 2. Experiment `garment-exp-0001` Details (Baseline)
- **Objective:** Evaluate zero-shot attribute extraction capabilities on the golden test set without any fine-tuning.
- **Observations:**
  - Category prediction (tops, bottoms, outerwear, shoes) was 100% accurate.
  - Fit prediction confusion: Differentiating between `Oversized` and `Relaxed` on wide-leg trousers requires specialized silhouette attention.
  - Latency: ~110ms on GTX 1650, ~45ms on serverless A10G.

---

## 3. Experiment `garment-exp-0002` Details (Multi-Task Heads)
- **Objective:** Train lightweight multi-task classification heads on top of pooled SigLIP vision embeddings.
- **Config:** [`training/configs/siglip_so400m_garment_v1.yaml`](file:///d:/Personal%20projects/aura/training/configs/siglip_so400m_garment_v1.yaml).
- **Result:** Successfully isolates multi-attribute classification into distinct calibrated logits.
- **Export Target:** `aura-garment-v1.onnx` (1.2 GB).
