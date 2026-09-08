# AURA — Phase 13D.2 Selective-Layer LoRA Performance & Feasibility Study

## 1. Executive Summary

Phase 13D.1 identified that the full 27-layer LoRA adaptation of `google/siglip-so400m-patch14-384` on consumer hardware (NVIDIA GeForce GTX 1650 4GB VRAM) requires approximately **29.92 hours** for a standard 50-epoch run. While batch size 1, 0 DataLoader workers, and gradient accumulation 16 eliminate VRAM paging and disk I/O bottlenecks, backpropagating through all 27 vision transformer layers remains the dominant latency constraint (~2.53 seconds per sample in autograd backward alone).

Phase 13D.2 benchmarks selective-layer LoRA configurations, restricting trainable low-rank adapters (`q_proj`, `v_proj`, rank 8, alpha 16) to the final transformer blocks while freezing all earlier blocks. Because PyTorch Autograd halts backpropagation at the earliest layer requiring gradients, targeting only the last 4 blocks reduces backward pass time by **85.1%** (from 2,528.2 ms to 375.8 ms per sample), accelerating end-to-end throughput from **0.213 samples/sec to 0.396 samples/sec** (a **1.86x speedup**).

The 50-epoch training duration decreases from **29.92 hours to 16.09 hours**, and a 20-epoch convergence run completes in only **6.44 hours** with peak VRAM of **1,906.7 MB** (under 47% of hardware capacity).

---

## 2. Hardware Environment

- **GPU:** NVIDIA GeForce GTX 1650 (TU117)
- **Total Dedicated VRAM:** 4,096 MB (GDDR6)
- **CUDA Version:** 12.6
- **PyTorch Version:** 2.13.0+cu126
- **OS Platform:** Windows 11 (WDDM 3.1)
- **Host RAM:** 16 GB DDR4

---

## 3. Module Discovery & Architectural Verification

The pretrained SigLIP SO400M vision backbone was forensically inspected (`training/scripts/benchmark_selective_lora.py`):
- **Base Architecture:** `google/siglip-so400m-patch14-384`
- **Total Vision Transformer Blocks:** Exactly **27 layers** (`vision_model.encoder.layers[0...26]`)
- **Hidden Embedding Dimension ($d_{model}$):** 1,152
- **Self-Attention Target Projections:** `self_attn.q_proj` and `self_attn.v_proj`
- **Base Linear Dimension:** $1152 \times 1152$
- **Total Backbone Parameters:** 428,294,400

### Target Layer Subsets
- **CONFIG A (Last 4 Blocks):** Layers 23, 24, 25, 26 (Earliest gradient stop at Layer 23; Layers 0–22 completely frozen)
- **CONFIG B (Last 8 Blocks):** Layers 19, 20, 21, 22, 23, 24, 25, 26 (Earliest gradient stop at Layer 19; Layers 0–18 completely frozen)
- **CONFIG C (Last 12 Blocks):** Layers 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 (Earliest gradient stop at Layer 15; Layers 0–14 completely frozen)
- **CONFIG D (All 27 Blocks):** Layers 0 to 26 (Full backbone LoRA baseline)

---

## 4. Exact Trainable Parameter Scaling

Each LoRA adapter consists of:
- `lora_A`: $8 \times 1152 = 9,216$ parameters
- `lora_B`: $1152 \times 8 = 9,216$ parameters
- Per projection: $18,432$ parameters
- Per transformer block (`q_proj` + `v_proj`): $2 \times 18,432 = 36,864$ parameters (4 tensors)

The multi-task classification head (1152 $\to$ 256 bottleneck, LayerNorm, GELU, Dropout 0.3) contains exactly **310,586 parameters** (18 tensors).

| Configuration | Transformer Blocks | LoRA Tensors | LoRA Parameters | Head Parameters | Total Trainable | % of Model |
|:---|:---:|:---:|---:|---:|---:|---:|
| **CONFIG A (Last 4)** | Layers 23–26 | 16 | 147,456 | 310,586 | **458,042** | **0.1066%** |
| **CONFIG B (Last 8)** | Layers 19–26 | 32 | 294,912 | 310,586 | **605,498** | **0.1410%** |
| **CONFIG C (Last 12)** | Layers 15–26 | 48 | 442,368 | 310,586 | **752,954** | **0.1753%** |
| **CONFIG D (All 27)** | Layers 0–26 | 108 | 995,328 | 310,586 | **1,305,914** | **0.3040%** |

---

## 5. Micro-Benchmark Performance Results

The micro-benchmark evaluated 32 fixed training samples per configuration under identical conditions (Batch=1, GradAccum=16, Mixed Precision FP16, Workers=0, Preprocessing Cache ON).

| Metric | Config A (Last 4) | Config B (Last 8) | Config C (Last 12) | Config D (All 27) |
|:---|:---:|:---:|:---:|:---:|
| **LoRA Parameters** | 147,456 | 294,912 | 442,368 | 995,328 |
| **Avg Forward Time (ms)** | 2,142.87 | 2,139.26 | 2,143.43 | 2,161.86 |
| **Avg Backward Time (ms)** | **375.79** | 749.15 | 1,123.39 | **2,528.24** |
| **Avg Optimizer Step Time (ms)** | 46.99 | 13.25 | 3.91 | 6.38 |
| **Throughput (samples/sec)** | **0.3962** | 0.3458 | 0.3058 | **0.2131** |
| **Latency (sec/sample)** | **2.524** | 2.892 | 3.270 | **4.694** |
| **Speedup vs All 27** | **1.86x** | 1.62x | 1.44x | 1.00x |
| **Peak VRAM Allocated (MB)** | 1,659.41 | 1,661.37 | 1,662.59 | 1,668.65 |
| **Peak VRAM Reserved (MB)** | 2,048.00 | 2,218.00 | 2,448.00 | 3,286.00 |
| **Peak VRAM Overall (MB)** | **1,906.70** | 2,130.93 | 2,345.57 | **3,179.72** |
| **Estimated 1-Epoch Time** | **19.31 min** | 22.12 min | 25.01 min | **35.91 min** |
| **Estimated 15-Epoch Time** | **4.83 hrs** | 5.53 hrs | 6.25 hrs | **8.98 hrs** |
| **Estimated 20-Epoch Time** | **6.44 hrs** | 7.37 hrs | 8.34 hrs | **11.97 hrs** |
| **Estimated 50-Epoch Time** | **16.09 hrs** | 18.44 hrs | 20.84 hrs | **29.92 hrs** |
| **VRAM Overflow / Paging** | **None** | None | None | None |

### Analytical Observations
1. **Constant Forward Pass:** Across all four configurations, forward pass time remains constant at ~2,140 ms because the entire 27-layer vision transformer processes the image tokens regardless of adapter presence.
2. **Linear Backward Pass Reduction:** Backward execution scales directly with adapter depth:
   - Config D (27 layers): 2,528.2 ms (~93.6 ms/layer)
   - Config C (12 layers): 1,123.4 ms (~93.6 ms/layer)
   - Config B (8 layers): 749.2 ms (~93.6 ms/layer)
   - Config A (4 layers): 375.8 ms (~94.0 ms/layer)
   PyTorch autograd stops backward traversal at layer 23 in Config A, completely eliminating gradient calculations, activation graph maintenance, and memory retention for layers 0–22.
3. **Memory Safety Margin:** Peak VRAM in Config A is 1,906.7 MB (46.5% of 4096 MB capacity), providing a generous 2,189 MB safety headroom against Windows WDDM paging.

---

## 6. EXP-0015-SELECTIVE-LORA-SANITY Verification

A 2-epoch micro-sanity run was executed using the frozen `dataset-v0.5-500.json` (Train=459, Val=41) under `CONFIG_A`:
- **Experiment ID:** `EXP-0015-SELECTIVE-LORA-SANITY`
- **Configuration:** Last 4 transformer blocks (layers 23–26)
- **Forward & Backward:** Verified non-zero gradients across all trainable tensors.
- **Optimizer Step:** Confirmed parameter updates (`total_optimizer_steps > 0`).
- **LoRA Weight Delta:** Confirmed initial heads and backbone LoRA hashes differed from final post-training hashes.
- **Heartbeat Telemetry:** Validated `training_heartbeat.json` written with all 10 required fields.
- **Checkpoint Serialization Guard:**
  - Checkpoint path: `training/runs/EXP-0015-SELECTIVE-LORA-SANITY/checkpoint/best_model.pt`
  - Saved tensors: 16 LoRA tensors + 18 head tensors (0 frozen backbone parameters).
  - Saved size: **2.62 MB** (strictly adhering to `< 50 MB` guard; down from 1.73 GB unhardened).
  - Reload test: Successfully reloaded LoRA tensors into `SiglipVisionModel` and classification heads without error.

---

## 7. Decision & Architectural Recommendation

| Configuration | Viability | Feasibility Score | Scientific Defensibility |
|---|---|---|---|
| **CONFIG A (Last 4)** | **RECOMMENDED** | **Optimal** (1.86x speedup, 16.09h for 50 epochs, 6.44h for 20 epochs, 1.9GB VRAM) | **High**: In deep vision transformers, higher layers capture high-level semantic abstractions (garment category, silhouette, style) while early layers capture low-level edges/textures that benefit minimally from adaptation. |
| **CONFIG B (Last 8)** | Viable Alternative | Moderate (1.62x speedup, 18.44h for 50 epochs, 7.37h for 20 epochs) | High |
| **CONFIG C (Last 12)** | Marginal | Suboptimal (1.44x speedup, 20.84h for 50 epochs) | Moderate |
| **CONFIG D (All 27)** | Unreasonable | Infeasible for iterative experiments (~30h per run) | Unnecessary compute overhead |

**Formal Selection:**
```
SELECTIVE_LORA_4
```

---

## 8. Forensic Checksums & Immutability Verification

| Resource | Expected SHA-256 | Actual SHA-256 | Status |
|---|---|---|---|
| `dataset-v0.5-500.json` | `3ba48937ceadfd815f9035f2ae1ea319a27c276f5b9d21ebfa6e0d9b689033ba` | `3ba48937ceadfd815f9035f2ae1ea319a27c276f5b9d21ebfa6e0d9b689033ba` | **PASS** |
| `dataset-v0.4-250.json` | `cfd687445722fcefcb9e73ba746535e5d3fa965f7c35272a55928d39c0f0e0df` | `cfd687445722fcefcb9e73ba746535e5d3fa965f7c35272a55928d39c0f0e0df` | **PASS** |
| `dataset-v0.3-blind-freeze.json` | `00c3d919ec3e5f27bb8f1a8e1088eb44f9cf2e37943d04d8058ddce019688df7` | `00c3d919ec3e5f27bb8f1a8e1088eb44f9cf2e37943d04d8058ddce019688df7` | **PASS** |
| Commercial AI API Calls | 0 | 0 | **PASS** |
| Holdout Split Evaluations | 0 | 0 | **PASS** |
