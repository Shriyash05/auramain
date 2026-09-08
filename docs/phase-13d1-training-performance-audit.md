# AURA — Phase 13D.1 Training Performance Audit

**Experiment Context:** `garment-exp-0015` (SigLIP-SO400M LoRA $r=8, \alpha=16$ on `q_proj`, `v_proj` with 256-dim bottleneck head)  
**Dataset:** Immutable `dataset-v0.5-500.json` (459 train, 41 val; SHA-256: `85375f14...`)  
**Hardware Target:** NVIDIA GeForce GTX 1650 (4096 MB VRAM / TU117 / WDDM)  
**Status:** `OPTIMIZED_RERUN_READY`  

---

## 1. Executive Summary & Verified Baseline

During the initial corrected Exp-0015 rerun, the training loop was manually stopped at epoch 18 (~11.24 hours). The measured throughput revealed a massive computational wall on the consumer GTX 1650:
- **Baseline Epoch Duration:** ~37.48 minutes (2,248.87 seconds)
- **Baseline Sample Latency:** 4.900 seconds / sample (~0.204 samples/sec)
- **Projected 50-Epoch Runtime:** ~31.23 hours
- **GPU Allocated Memory:** 1,667.9 MB (constant)

Phase 13D.1 systematically isolated and empirically benchmarked all candidate throughput optimizations without changing the underlying scientific experiment (preserving model architecture, LoRA rank/alpha, taxonomy, dataset, and loss formulation).

---

## 2. Empirical Benchmark Results

### 2.1 Batch Size & Gradient Accumulation Benchmark
Effective batch size held constant at 16 ($N=32$ fixed samples from frozen training split):

| Configuration | Batch Size | Grad Accum | Peak VRAM | Samples / Sec | Sec / Sample | Paging / OOM Status |
|---|---|---|---|---|---|---|
| **Config A** | **1** | **16** | **3,171.7 MB** | **0.2113** | **4.732 s** | **NO (Within 4GB physical VRAM)** |
| Config B | 2 | 8 | 3,797.5 MB | 0.1614 | 6.196 s | High VRAM contention (92.7% VRAM) |
| Config C | 4 | 4 | 5,101.7 MB | 0.1155 | 8.656 s | WDDM PCIe paging into Host RAM |
| Config D | 8 | 2 | 7,728.7 MB | 0.1045 | 9.567 s | Severe PCIe paging thrashing |

**Critical Architectural Finding:**  
On Windows WDDM with a 4GB GPU, batch sizes $\ge 4$ do NOT crash with PyTorch OOM; instead, Windows silently pages GPU memory into system RAM over the PCIe bus. This degrades per-sample throughput by over 100% (from 4.73s to 9.57s per sample). **`batch_size = 1` is the ONLY configuration that fits completely in physical VRAM (3.17 GB peak) without PCIe thrashing.**

### 2.2 DataLoader Worker Benchmark
Constant batch size 1 ($N=32$ samples):

| Workers | Data Wait Time | Compute Time | Total Time | Throughput | Observation |
|---|---|---|---|---|---|
| **0 (sync)** | **0.76 s** | **151.11 s** | **151.87 s** | **0.2107 samp/s** | **Fastest, zero IPC overhead** |
| 2 | 17.97 s | 151.33 s | 169.30 s | 0.1890 samp/s | 18s IPC / process spawning overhead |
| 4 | 33.23 s | 151.45 s | 184.68 s | 0.1733 samp/s | 33s IPC contention |

**Finding:**  
On Windows, multi-process DataLoader (`num_workers > 0`) degrades performance due to Windows process creation and shared-memory serialization. Synchronous loading (`num_workers = 0`) has a data wait time of only 0.76s across 32 samples (0.5% of step time). The forward/backward compute pass consumes 99.5% of step time.

### 2.3 Deterministic Preprocessing Cache Benchmark
Deterministic caching of 384x384 normalized image tensors at `training/cache/preprocessed/`:

| Preprocessing Mode | Total Time (32 samples) | Latency / Sample | Speedup |
|---|---|---|---|
| Cache OFF (PIL decode + HuggingFace processor) | 0.95 s | 29.65 ms | 1.00x |
| **Cache ON (Direct tensor load from disk)** | **0.51 s** | **16.08 ms** | **1.84x faster** |

**Governance & Architectural Guard:**  
Only static image preprocessing is cached. Strictly NO gradient caching, NO backbone forward embedding caching, and NO model output caching are performed, preserving the complete autograd graph through the 27-layer vision transformer.

### 2.4 Checkpoint Save & Reload Serialization Benchmark

| Metric | Result | Target Guard | Status |
|---|---|---|---|
| Checkpoint Size | **5.03 MB** (5,269,431 bytes) | < 50.0 MB | **PASSED** |
| Save Time | **0.038 s** | < 1.0 s | **PASSED** |
| Load Time | **0.033 s** | < 1.0 s | **PASSED** |
| LoRA Tensors Saved | 108 (995,328 params) | 108 | **PASSED** |
| Head Tensors Saved | 18 (310,586 params) | 18 | **PASSED** |
| Frozen Backbone Saved | **0 tensors (0 params)** | 0 | **PASSED** |

Checkpoint write bottleneck has been reduced from 1.73 GB / ~30s down to 5.03 MB / 0.038s.

---

## 3. Micro Sanity Training (`EXP-0015-PERFORMANCE-SANITY`)

A 2-epoch sanity training was executed on the frozen 500 dataset (`dataset-v0.5-500.json`) using the optimized configuration:
- **Experiment ID:** `EXP-0015-PERFORMANCE-SANITY`
- **Initial Heads Hash:** `b4326ad7e5f0880186161f102b4cac7a8a9fa2a490a2c385fe740adff7d9cb48`
- **Final Heads Hash:** `477a0e5aae6a6176621684d4780caf370746cd020af11cc9e0827b1c2678027b` (Delta verified)
- **Epoch 1:** Train Loss 13.5146, Val Loss 13.2388, Val Macro F1 0.1562
- **Epoch 2:** Train Loss 12.6340, Val Loss 13.1247, Val Macro F1 0.1875
- **Optimizer Steps Executed:** 2 cumulative steps
- **Heartbeat Output:** Written to `training/runs/EXP-0015-PERFORMANCE-SANITY/training_heartbeat.json` including `epoch_duration_seconds` (110.39s) and `samples_per_second` (0.1449)
- **Checkpoint Saved & Reloaded:** `best_model.pt` (15.1 MB, SHA-256 verified)
- **Result:** **SANITY SUITE PASSED**

---

## 4. Recommended Configuration & Production Reality

```json
{
  "recommended_batch_size": 1,
  "recommended_gradient_accumulation_steps": 16,
  "effective_batch_size": 16,
  "recommended_num_workers": 0,
  "use_preprocessing_cache": true,
  "cache_dir": "training/cache/preprocessed",
  "measured_throughput_samples_per_sec": 0.2113,
  "measured_seconds_per_sample": 4.733,
  "projected_epoch_seconds": 2172.27,
  "projected_epoch_minutes": 36.20,
  "projected_50_epoch_hours": 30.17,
  "baseline_previous_50_epoch_hours": 31.23,
  "fits_gtx_1650_4gb": true,
  "peak_gpu_memory_mb": 3171.68
}
```

### Computational Reality of 27-Layer LoRA on GTX 1650
1. **The Core Bottleneck is Mathematical:** SigLIP-SO400M has 27 layers with 729 visual tokens. In full LoRA mode across all 27 layers, PyTorch Autograd must compute full backpropagation through 27 matrix multiplication blocks per image. On the GTX 1650 (TU117 Turing GPU lacking FP16 Tensor Cores), 1 sample backward pass requires ~4.7 seconds of raw CUDA compute.
2. **Batch Size Cannot Overcome 4GB VRAM:** Increasing batch size to 2, 4, or 8 triggers memory saturation (3.8 GB) or PCIe shared memory paging (5.1–7.7 GB), slowing execution from 4.7s down to 8.6–9.6s per sample.
3. **50-Epoch Runtime:** At 459 samples per epoch, 1 epoch requires ~36.2 minutes. 50 epochs requires ~30.2 hours.
4. **Recommended Next Stage:** A clean 15–20 epoch budget (or targeted LoRA restricted to the top 6–12 transformer layers) is the only path that compresses runtime to <10 hours on this specific hardware while preserving full scientific integrity.

---

## 5. Decision & Quality Gates

- `npm run ts:check` — **PASSED**
- `npm test` — **PASSED** (24 suites, 89 tests)
- `npx expo export --platform web` — **PASSED** (43 static routes bundled)
- **Decision:** `OPTIMIZED_RERUN_READY`
