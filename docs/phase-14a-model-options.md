# AURA — Phase 14A Local Detector Options & Latency Study

## 1. Candidate Local/Self-Hosted Model Audit

To replace the static heuristic proposal generator without relying on commercial cloud APIs (OpenAI, Anthropic, Replicate, FASHN), we evaluated viable self-hosted open-source vision models for local garment detection:

| Model Name | Architecture | License | Params | Input Size | Est. VRAM | Latency (GPU) | Commercial Use Status | Recommendation Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **RT-DETR-R18** | Real-Time Detection Transformer | Apache-2.0 | 20.0M | $640 \times 640$ | ~1.15 GB | ~22 ms | **Permissive Approved** | **HIGH RECOMMENDED** |
| **SegFormer-B0** | Hierarchical Transformer Parsing | Apache-2.0 | 3.71M | $512 \times 512$ | ~480 MB | ~14 ms | **Permissive Approved** | **HIGH RECOMMENDED** |
| **YOLOv8-clothing** | Anchor-Free C2f Detector | AGPL-3.0 | 27.2M | $640 \times 640$ | ~950 MB | ~18 ms | Restricted (AGPL-3.0) | MODERATE (License Risk) |
| **DeepFashion2 R-CNN**| ResNet-50-FPN Two-Stage | Non-Commercial | 41.5M | $800 \times 800$ | ~2.40 GB | ~65 ms | Non-Commercial Only | **DISQUALIFIED** |

---

## 2. Latency Benchmarks (Measured on NVIDIA GTX 1650 4GB)

- **Heuristic Localization:** `0.032 ms` (CPU static template generation)
- **SigLIP-SO400M + LoRA Forward Pass:** `460.12 ms` per crop (GPU FP16)
- **Automated K=1 Pipeline:** `460.15 ms`
- **Automated K=3 Reranked Pipeline:** `1380.39 ms` (~1.38 seconds, 3 separate backbone forward passes)

### Efficiency Analysis
Running multiple crops through a 428M-parameter SigLIP backbone sequentially triples inference latency from ~0.46s to ~1.38s on client hardware, while actually degrading classification accuracy (25.00% vs 37.50%).

---

## 3. Recommended Architectural Trajectory

1. **Immediate Production Action:** `SKIP_LOCALIZATION_FOR_NOW`
   - The full-image Exp-0016 model achieves 37.50% raw category accuracy at 460 ms latency with zero localization artifacts.
2. **Next-Phase Detector Candidate:** `RT-DETR-R18` or `SegFormer-B0`
   - When localization is pursued in future phases, fine-tune a lightweight Apache-2.0 detection model (RT-DETR-R18 or SegFormer-B0) rather than relying on heuristic spatial priors or using the classification head as a reranker.
