# AURA Model Registry & Specifications

**Product:** AURA  
**Document:** Model Registry & Hardware Specification  
**Version:** 1.0  
**Status:** **ACTIVE SPECIFICATION**  

---

## 1. Registry Overview

The Model Registry documents the specific open-weight architectures, licenses, compute requirements, artifact formats, and deployment targets for every self-hosted AURA intelligence component.

---

## 2. Model Registry Table

| Model ID | Domain | Architecture Base | Parameter Count | License & Commercial Terms | Input Format | Output Format | Minimum VRAM (Inference) | Recommended Hardware | Serving Framework |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aura-garment-v1` | Garment Attributes | SigLIP-SO400M / Multi-Task Heads v0.2 | 400M | Apache 2.0 (Permissive Commercial) | RGB Image (384x384) | Category, Subcategory, Color, Fit, Silhouette, Material JSON | 1.2 GB | NVIDIA T4 / GTX 1650 / CPU ONNX | ONNX Runtime / Triton | Dataset `v0.2.0` (Blind $N=6$: Top-1 Cat 100%, Macro F1 93.8%; Hard $N=6$: 83.3%) • Status: **EXPERIMENTAL PROTOTYPE** |
| `aura-segment-v1` | Background Removal | BiRefNet (Apache 2.0) | 120M | Apache 2.0 (Permissive Commercial) | RGB Image (1024x1024) | RGBA Transparent Cutout PNG | 3.5 GB | NVIDIA T4 / A10G | TensorRT / PyTorch | Benchmark Candidate • Status: **EXPERIMENTAL PROTOTYPE** |
| `aura-inspire-v1` | Inspiration Deconstruction | Florence-2-Large + LoRA | 770M | MIT License (Permissive Commercial) | RGB Image + Prompt | Aesthetics, Palette, Piece List JSON | 2.5 GB (FP16) | NVIDIA A10G / L4 | vLLM / HuggingFace TGI |
| `aura-intent-v1` | Natural Language Intent | Qwen2.5-3B-Instruct (AWQ) | 3B | Apache 2.0 (Permissive Commercial) | Text Query String | Structured Action Intent JSON | 2.8 GB (4-bit) | NVIDIA T4 / A10G / Apple Silicon | vLLM / Ollama |
| `aura-vto-v1` | Virtual Try-On Diffusion | IDM-VTON / CatVTON | 1.2B (UNet + Garment Encoder) | Open Research / Open Weights | Model Photo + Garment Image PNG | Try-on Render Image (1024x768) | 12.0 GB (FP16) | NVIDIA A10G / A100 / RTX 4090 | Diffusers / Serverless Worker |
| `aura-embed-v1` | Product & Look Retrieval | BGE-M3 / FashionCLIP | 560M | MIT License (Permissive Commercial) | Text / Image Vector | 1024-dim Dense Vector | 1.2 GB | CPU / Lightweight GPU | pgvector / Qdrant |
| `aura-engine-core`| Styling Combinatorics | Pure Algorithmic Engine | N/A (Algorithmic) | Proprietary (AURA Owned) | Wardrobe Array + Context JSON | Ranked Outfit Candidates | <50 MB RAM | Mobile Device / Edge Node | TypeScript / JavaScript |
| `aura-pref-v1` | Preference Learning | Vector Gradient Engine | N/A (Analytical) | Proprietary (AURA Owned) | Interaction Event + Wardrobe | Updated User Preference Weights | <5 MB RAM | Mobile Device (Local) | TypeScript / Native |

---

## 3. License & Commercial Compliance Policy

1. **Strict Prohibition on Restrictive Licenses:** No model weights with non-commercial (CC-BY-NC) restrictions may be integrated into production serving pipelines without express legal waiver.
2. **Permissive Open Architectures Preferred:** Primary focus on **MIT**, **Apache 2.0**, and **Open Weights with Commercial Grants**.
3. **Reproducibility:** All adapters, fine-tuning scripts, and inference wrappers must be checked into AURA repository storage.
