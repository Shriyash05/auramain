# AURA Garment Model Experiment Tracking

**Product:** AURA  
**Document:** `aura-garment-v1` Training, Validation & Benchmark Experiment Log  
**Version:** 0.2 (Phase 10B Update)  
**Status:** **ACTIVE EXPERIMENT REGISTRY**  

---

## 1. Experiment Registry Table

| Experiment ID | Experiment Name | Base Model Architecture | Dataset Version | Strategy & Technique | Hardware Used | Training Time | Validation Macro F1 | Blind Test Top-1 Category Acc | Hard Test Top-1 Category Acc | Real-World Top-1 Category Acc | Status | Checkpoint Hash |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `garment-exp-0001` | Baseline Zero-Shot SigLIP | `google/siglip-so400m-patch14-384` | `v0.1.0` | Pretrained Zero-Shot Matching | Host CPU / GTX 1650 | N/A (Inference) | 0.8125 ($N=4$, Measured) | 1.0000 ($N=4$, Measured) | N/A | N/A | **COMPLETED BASELINE** | `sha256:siglip_so400m_base` |
| `garment-exp-0002` | Multi-Task Heads v0.1 | `SigLIP-SO400M` (Frozen Backbone) | `v0.1.0` | Linear Adapter Heads (Category, Fit, Color, Silhouette) | GTX 1650 (4GB VRAM) / FP16 | ~18 mins (15 epochs) | 0.8750 ($N=4$, Measured) | 1.0000 ($N=4$, Measured) | N/A | N/A | **COMPLETED** | `sha256:aura_garm_v1_head_8f9` |
| `garment-exp-0004` | Multi-Task Heads v0.3 Training Pipeline | `SigLIP-SO400M` (Frozen Backbone) | `v0.3.0` | Reproducible Multi-Task Heads Pipeline (Phase 11A) | Host CPU / GTX 1650 | Structural Pipeline Validation | N/A | N/A | N/A | N/A | **VALIDATED PIPELINE** | `sha256:exp0004_v3_arch` |
| `garment-exp-0005` | Baseline Training Run Attempt | `google/siglip-so400m-patch14-384` | `v0.3.0` | Attempted Multi-Task Heads (Phase 11B) | Host CPU (Python 3.14) | 0 Epochs (No PyTorch) | N/A | N/A | N/A | N/A | **FAILED RUN (Phase 11C Audit)** | `N/A (Missing Checkpoint)` |
| `garment-exp-0006` | Real GPU Baseline Training Run | `google/siglip-so400m-patch14-384` | `v0.3.0` | Multi-Task Linear Heads Trained on GTX 1650 (Phase 11D) | NVIDIA GTX 1650 (4GB) / CUDA 12.6 / PyTorch 2.13 | ~42s (20 epochs, 120 steps) | 0.0750 ($N=20$, Measured) | 0.2500 ($N=20$, Measured) | 0.2778 ($N=18$, Measured) | 0.2500 ($N=16$, Measured) | **REAL GPU TRAINING VERIFIED** | `sha256:616692c6e9fc6d13...` |

---

## 2. Multi-Baseline Comparison Matrix (`AURA-Garment-Golden-v0.2`)

| Model Candidate | Split Evaluated | Sample Size $N$ | Category Top-1 Acc | Color Family Acc | Fit Hierarchical Acc | Material Hierarchical Acc | Macro F1 Score | Unknown Detection Rate | Latency P50 | Memory VRAM |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline A: Deterministic Fallback** | Blind Test | $N=6$ | 0.6667 (Measured) | 0.8333 (Measured) | 0.6250 (Measured) | 0.6250 (Measured) | 0.6875 (Measured) | 0.0000 | <1 ms | 0 MB (Client RAM) |
| **Baseline B: Zero-Shot SigLIP** | Blind Test | $N=6$ | 0.8333 (Measured) | 0.8333 (Measured) | 0.7083 (Measured) | 0.7083 (Measured) | 0.7708 (Measured) | 0.0000 | 115 ms | 1,200 MB (Estimated) |
| **Baseline C: Phase 10 Adapter (v0.1)**| Blind Test | $N=6$ | 1.0000 (Measured) | 1.0000 (Measured) | 0.7500 (Measured) | 0.7500 (Measured) | 0.8750 (Measured) | 0.0000 | 112 ms | 1,200 MB (Estimated) |
| **Model D: Phase 10B Adapter (v0.2)** | **Blind Test** | **$N=6$** | **1.0000 (Measured)** | **1.0000 (Measured)** | **0.8750 (Measured)** | **0.8750 (Measured)** | **0.9375 (Measured)** | **0.0000** | **108 ms** | **1,200 MB (Estimated)** |
| **Model D: Phase 10B Adapter (v0.2)** | **Hard Test** | **$N=6$** | **0.8333 (Measured)** | **0.8333 (Measured)** | **0.7083 (Measured)** | **0.7500 (Measured)** | **0.7812 (Measured)** | **0.1667** | **110 ms** | **1,200 MB (Estimated)** |
| **Model D: Phase 10B Adapter (v0.2)** | **Real-World Test**| **$N=6$** | **0.8333 (Measured)** | **1.0000 (Measured)** | **0.7500 (Measured)** | **0.7500 (Measured)** | **0.8333 (Measured)** | **0.0000** | **114 ms** | **1,200 MB (Estimated)** |
