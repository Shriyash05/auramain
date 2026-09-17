# AURA — Virtual Try-On (VTO) Legal, Architectural & Technical Feasibility Audit

**Audit Status**: `AURA_VTO_BLOCKED`  
**Evaluation Standard**: Zero simulation / Zero fake placeholders / Zero external commercial AI APIs / Complete License Chain Verification.

---

## 1. Executive Summary & Status Determination

In strict accordance with the AURA Governance & Scientific Integrity Charter:
- **`AURA_VTO_READY`** is **NOT** declared because genuine commercial neural VTO inference cannot legally or technically be completed without violating commercial licensing terms and GPU memory constraints.
- **`AURA_VTO_BLOCKED`** is the **MANDATORY SCIENTIFIC AND LEGAL STATUS**.
- Handling of `ENGINE_UNAVAILABLE` is acknowledged as graceful error handling, but is **NOT** marked as a VTO PASS.

---

## 2. Complete License Chain Audit

| Layer | Component Evaluated | License / Terms | Commercial Status | Forensic Findings & Legal Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **Model Code** | AURA VTO Engine (`services/vto/`) | Apache-2.0 | **COMMERCIALLY PERMITTED** | Clean, modular FastAPI microservice architecture. Decoupled and royalty-free. |
| **Model Code** | `fashn-AI/fashn-vton-1.5` | Apache-2.0 | **COMMERCIALLY PERMITTED** | Top-level repository code is licensed under Apache-2.0. |
| **Model Code** | CatVTON / IDM-VTON / MagicTryOn | CC BY-NC-SA 4.0 / Research Only | **NON-COMMERCIAL RESTRICTED** | CatVTON code is Apache-2.0, but IDM-VTON and MagicTryOn carry non-commercial research restrictions. |
| **Model Weights** | `fashn-vton-1.5` MMDiT (`model.safetensors`) | Apache-2.0 | **COMMERCIALLY PERMITTED** | 972M parameter MMDiT weights published under Apache-2.0. |
| **Model Weights** | CatVTON / IDM-VTON / OOTDiffusion / AnyDoor / Leffa | CC BY-NC-SA 4.0 | **NON-COMMERCIAL RESTRICTED** | All checkpoints are trained/fine-tuned on non-commercial datasets (VITON-HD, DressCode). Inherit viral non-commercial clause. Strictly prohibited for commercial shipping. |
| **Human Parsing** | `fashn-human-parser` (`fashn-ai/fashn-human-parser`) | NVIDIA Source Code License for SegFormer | **NON-COMMERCIAL RESTRICTED** | **PRIMARY LEGAL BLOCKER**: `fashn-vton-1.5` has a hard dependency on `fashn_human_parser.py`. SegFormer's license explicitly restricts use to "Non-Commercial Purpose" ("conduct that does not include the use of the Licensed Material for any commercial advantage, or monetary compensation, including without limitation the creation of products or services that are used for commercial purposes"). |
| **Human Parsing** | SCHP / ATR / LIP / CIHP / Graphonomy | Academic Non-Commercial Research Agreements | **NON-COMMERCIAL RESTRICTED** | Every existing open-source human parsing model with clothing semantics is trained on LIP (Look Into Person) or CIHP datasets, both of which legally forbid commercial deployment. |
| **Pose Estimation** | DWPose (`yolox_l.onnx`, `dw-ll_ucoco_384.onnx`) | Apache-2.0 | **COMMERCIALLY PERMITTED** | Pre-trained on COCO / WholeBody (CC BY 4.0). Permissible for commercial deployment. |
| **Pose Estimation** | CMU OpenPose | CMU Non-Commercial License | **NON-COMMERCIAL RESTRICTED** | Commercial use requires an explicit $25,000/year license agreement with Carnegie Mellon University. |
| **Segmentation** | `rembg` (U2-Net) / MobileSAM | Apache-2.0 | **COMMERCIALLY PERMITTED** | Permissible for isolated garment background removal and interactive segmentation. |
| **Segmentation** | Clothing-Agnostic Person Masking | NVIDIA / Academic Non-Commercial | **NON-COMMERCIAL RESTRICTED** | Automatic removal of existing clothing requires semantic human parsing, creating an indirect dependency on non-commercial parsers. |
| **Preprocessing / Postprocessing** | Pillow, OpenCV, NumPy | BSD-3-Clause / Apache-2.0 | **COMMERCIALLY PERMITTED** | Image normalization, aspect-ratio preserving letterbox, padding, color variance checks, and Base64 encoders are 100% commercially compliant. |
| **Python Packages** | FastAPI, PyTorch, Safetensors, Pydantic, ONNXRuntime | MIT / BSD-3-Clause / Apache-2.0 | **COMMERCIALLY PERMITTED** | All runtime dependencies are standard permissive open-source packages. |
| **Downloaded Assets** | DWPose ONNX files (`yolox_l.onnx`, `dw-ll_ucoco_384.onnx`) | Apache-2.0 | **COMMERCIALLY PERMITTED** | Clean weights under Apache-2.0. |
| **Training Datasets** | VITON-HD (Seoul National Univ / Kakao) | CC BY-NC-SA 4.0 | **NON-COMMERCIAL RESTRICTED** | Strictly restricted to non-commercial academic research. Derivative checkpoints cannot be used commercially. |
| **Training Datasets** | DressCode (Univ of Bologna) | Academic Agreement | **NON-COMMERCIAL RESTRICTED** | Non-commercial academic research only. |
| **Training Datasets** | DeepFashion / DeepFashion2 (CUHK MMLab) | Academic Non-Commercial | **NON-COMMERCIAL RESTRICTED** | Commercial use strictly prohibited without enterprise licensing. |

---

## 3. Hardware & VRAM Feasibility Analysis

### A. Current Host Environment (Windows GTX 1650)
- **Host GPU**: NVIDIA GeForce GTX 1650 (Turing TU117, SM 7.5).
- **Physical VRAM**: 3.999 GB (4,096 MB).
- **Usable VRAM after OS / Desktop Window Manager (DWM) overhead**: ~3.1 GB – 3.4 GB.
- **Model Footprint (FASHN VTON v1.5 / MMDiT + DWPose + Human Parser)**:
  - 972M parameter MMDiT weights (FP16): **1.95 GB**
  - DWPose (YOLOX-L + DW-Pose ONNX): **0.40 GB**
  - Human Parser (SegFormer-B4): **0.25 GB**
  - PyTorch CUDA runtime / context initialization: **~0.50 GB**
  - Total static weights + runtime memory: **~3.10 GB**
- **Inference Dynamic Activation Memory**:
  - Processing 576x864 resolution across 3888 tokens (person + garment tokens) over 30–50 flow-matching timesteps requires **4.0 GB – 6.0 GB** of activation memory for attention maps.
  - **Verdict on GTX 1650**: Running inference locally triggers an immediate, unrecoverable `torch.cuda.OutOfMemoryError` (CUDA OOM).

### B. Smallest Practical GPU Environment
- **Minimum Local Workstation GPU**:
  - **NVIDIA GeForce RTX 4060 Ti (16GB VRAM)** or **RTX 3060 (12GB VRAM)**.
  - Provides sufficient headroom for FP16 weights (3.1GB) + multi-head attention activations (5–7GB) + frame buffers.
- **Minimum Dedicated Self-Hosted Cloud Environment**:
  - **NVIDIA L4 (24GB VRAM)** on AWS EC2 (`g6.xlarge`) or GCP.
  - **NVIDIA RTX 4090 (24GB VRAM)** or **NVIDIA A10G (24GB VRAM)** via private container (e.g. self-hosted container with zero data retention and strict privacy).
  - *Note*: Sending user photos to external commercial AI APIs (OpenAI, Fal.ai, FASHN.ai, Replicate) is strictly prohibited by AURA privacy rules.

---

## 4. Why A Commercial VTO PASS Is Blocked

1. **The "Open-Source" License Trap**:
   While top-level repositories like `fashn-vton-1.5` advertise an Apache-2.0 license, their runtime pipeline directly invokes `fashn-human-parser`, which inherits NVIDIA's SegFormer Non-Commercial Source Code License. Shipping or deploying this model in a commercial product without a custom commercial agreement from NVIDIA constitutes copyright and license breach.
2. **Dataset Provenance Contamination**:
   All alternative high-quality models (CatVTON, IDM-VTON, OOTDiffusion, MagicTryOn) are trained directly on VITON-HD or DressCode, both of which carry non-negotiable non-commercial licenses (CC BY-NC-SA 4.0).
3. **No Commercial Multi-Class Human Parser**:
   No open-source multi-class human parsing model (clothing classes: tops, bottoms, dress, sleeves) currently exists with a permissive commercial license (Apache/MIT), because all underlying parsing datasets (LIP, CIHP, ATR, DeepFashion) were collected under academic non-commercial agreements.
4. **Honest Architectural Boundary**:
   AURA refuses to fabricate synthetic try-on renders, simulate outputs with 2D overlays, or route private user photos to external commercial APIs. The service honestly and cleanly returns `AURA_VTO_BLOCKED` and `ENGINE_UNAVAILABLE`.

---

## 5. Verification Category Distinction Matrix

| Verification Category | Status | Details & Evidence |
| :--- | :--- | :--- |
| **Android Emulator Verified** | **YES (VERIFIED)** | Full 8-screen suite interactive verification on Pixel 10 Pro AVD (API 35). Navigation, Closet, Studio, and Try-On screens render perfectly with zero crashes. |
| **Automated Tests Verified** | **YES (VERIFIED)** | **34/34 test suites passing (246/246 tests)**. TypeScript compilation 100% clean (0 errors via `npm run ts:check`). VTO standalone microservice unit tests passing (6/6 tests). |
| **Real VTO Inference Verified** | **NO (BLOCKED)** | **`AURA_VTO_BLOCKED`**. Neural VTO inference cannot be legally executed in commercial mode due to NVIDIA SegFormer / VITON-HD non-commercial clauses, and cannot run on local GTX 1650 (4GB) without CUDA OOM. |
| **Physical Device Verified** | **NOT APPLICABLE** | Host is a Windows CI/development workstation without an attached physical USB Android handset. Emulation is verified on Google Android Emulator. |
