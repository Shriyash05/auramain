# AURA AI Hardware Requirements & Compute Infrastructure

**Product:** AURA  
**Document:** Hardware Sizing, Memory Footprint & Serving Topology  
**Version:** 1.0  
**Status:** **ACTIVE INFRASTRUCTURE SPECIFICATION**  

---

## 1. Local Development vs Cloud Serving Topology

AURA operates on a split-execution architecture:
1. **Local / On-Device Layer:** Combinatorial styling, 48hr recency damping, preference weight vector learning, and keyword indexing execute locally on the user's phone or developer laptop (0 VRAM, <50MB RAM).
2. **Serverless Cloud GPU Layer:** Heavy computer vision and diffusion workloads scale on-demand on serverless GPU containers (e.g. RunPod Serverless / Modal / AWS EC2 G5) and scale down to zero when idle.

---

## 2. Hardware Sizing by Workload Tier

| Workload | Recommended Model | Minimum Inference VRAM | Recommended Inference GPU | Minimum Fine-Tuning VRAM (LoRA / QLoRA) | Recommended Training GPU |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Garment Attribute Extraction** | `SigLIP-SO400M` | 1.5 GB | NVIDIA T4 / GTX 1650 (Local) | 8 GB | NVIDIA RTX 3090 / A10G |
| **Garment Segmentation** | `BiRefNet` | 3.5 GB | NVIDIA T4 / L4 | 12 GB | NVIDIA RTX 4090 / A10G |
| **Inspiration Analysis** | `Florence-2-Large` | 2.5 GB | NVIDIA A10G / L4 | 16 GB | NVIDIA A10G / RTX 4090 |
| **Natural Language Intent** | `Qwen2.5-3B (AWQ)`| 2.8 GB | NVIDIA GTX 1650 (Local) / T4 | 12 GB | NVIDIA RTX 4090 |
| **Virtual Try-On Diffusion** | `IDM-VTON / CatVTON` | 12.0 GB | NVIDIA A10G (24GB) / L4 (24GB) | 32 GB - 48 GB | NVIDIA A100 (80GB) |

---

## 3. Serverless GPU Cost Model (On-Demand Compute)

| GPU Instance Type | Hourly Cost (Market Rate) | Cost Per Second | Workload Capacity (Requests / Sec) | Estimated Raw Compute Cost Per Call |
| :--- | :--- | :--- | :--- | :--- |
| **NVIDIA T4 (16 GB)** | ~$0.20 / hr | $0.000055 / s | ~8 garment cutouts / sec | **$0.0007 per garment** |
| **NVIDIA L4 (24 GB)** | ~$0.55 / hr | $0.000152 / s | ~5 inspiration parses / sec | **$0.0012 per inspiration** |
| **NVIDIA A10G (24 GB)** | ~$0.75 / hr | $0.000208 / s | ~0.25 VTO try-ons / sec (4.0s) | **$0.0083 per try-on** |

*Note: Infrastructure costs scale dynamically to zero when no active requests are occurring.*
