# AURA Self-Hosted AI Architecture & Service Topology

**Product:** AURA  
**Document:** Self-Hosted AI Serving, Container Packaging & Routing Specification  
**Version:** 1.0  
**Status:** **ACTIVE ARCHITECTURAL BLUEPRINT**  

---

## 1. High-Level Architecture

AURA's intelligence architecture is designed so that the client application communicates with specialized AURA-owned services rather than third-party AI APIs.

```text
                      +-----------------------------------+
                      |      AURA Mobile App (Client)     |
                      +-----------------------------------+
                                        |
                                        v
                      +-----------------------------------+
                      |      AURA Supabase Edge Gateway   |
                      |          & Model Router           |
                      +-----------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
 (Lightweight Deterministic & Analytical)             (Asynchronous GPU Models)
                 |                                             |
                 v                                             v
+-----------------------------------+         +-----------------------------------+
|      AURA Local & Edge Core       |         |   AURA Self-Hosted GPU Cluster    |
| - StylingEngine (Combinatorics)   |         |   (Modal / RunPod Serverless)     |
| - PreferenceLearning (Gradients)  |         | - aura-segment-v1 (BiRefNet)      |
| - WardrobeGapService (Unlocking)  |         | - aura-garment-v1 (SigLIP)        |
| - UniversalSearch (Index Search)  |         | - aura-inspire-v1 (Florence-2)    |
| - Intent Parsing (FastRegex)      |         | - aura-vto-v1 (CatVTON)           |
+-----------------------------------+         +-----------------------------------+
```

---

## 2. Component Serving Topologies

### 1. `aura-segment-v1` (Garment Segmentation Service)
- **Base Model:** `BiRefNet` (Apache 2.0).
- **Packaging:** Docker container with PyTorch / TensorRT runtime.
- **Trigger:** Invoked when user photographs or uploads a clothing item.
- **Endpoint:** `POST /functions/v1/segment-garment`
- **Payload:** `{ "image_url": "signed_supabase_url" }`
- **Output:** `{ "cutout_url": "signed_processed_url", "mIoU": 0.94, "latency_ms": 220 }`

### 2. `aura-garment-v1` (Garment Understanding Service)
- **Base Model:** `SigLIP-SO400M` fine-tuned on AURA fashion taxonomy.
- **Packaging:** ONNX Runtime / Triton Inference Server.
- **Trigger:** Invoked during garment ingestion.
- **Output:** Categorical attributes (category, color, fit, pattern, silhouette, formality).

### 3. `aura-inspire-v1` (Inspiration Deconstruction Service)
- **Base Model:** `Florence-2-Large` (MIT License) with LoRA adapter.
- **Trigger:** Invoked when user adds an inspiration photo from Pinterest, Instagram, or gallery.
- **Output:** Structured JSON style formula and piece list consumed by `InspirationMatchingService`.

### 4. `aura-vto-v1` (Virtual Try-On Diffusion Service)
- **Base Model:** `CatVTON` / `IDM-VTON` container.
- **Trigger:** Invoked when user triggers "Try On in Mirror".
- **Security:** Ephemeral execution in isolated container memory; user model photos purged according to [`docs/training-data-policy.md`](file:///d:/Personal%20projects/aura/docs/training-data-policy.md).
