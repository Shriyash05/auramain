#!/usr/bin/env python3
"""
AURA — Phase 13D.1 LoRA Training Throughput & Performance Benchmark
Measures:
1. Batch size vs. Gradient Accumulation (1, 2, 4, 8) with effective batch size ~16
2. DataLoader workers (0, 2, 4) wait time vs compute time
3. Preprocessing cache (Disabled vs Enabled)
4. Checkpoint serialization speed and size (<50MB guard)
Outputs machine-readable metrics to training/runs/garment-exp-0015/forensics/performance/
"""

import os
import sys
import gc
import time
import json
import shutil
import argparse
from typing import Dict, Any, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, Subset
from transformers import AutoImageProcessor, SiglipVisionModel

# Import architecture from canonical training pipeline
sys.path.insert(0, os.path.dirname(__file__))
from train_garment_classifier import (
    AuraGarmentDataset,
    AuraSigLIPBackbone,
    AuraLightweightHeads,
    MultiTaskFashionLoss,
    compute_file_sha256
)

DATASET_PATH = "data/garment/metadata/dataset-v0.5-500.json"
TAXONOMY_PATH = "data/garment/metadata/canonical_taxonomy.json"
BACKBONE_NAME = "google/siglip-so400m-patch14-384"
PERF_DIR = "training/runs/garment-exp-0015/forensics/performance"
CACHE_DIR = "training/cache/preprocessed"


class CachedPreprocessedDataset(Dataset):
    """
    Wraps AuraGarmentDataset but caches deterministic preprocessed pixel_values (384x384 float tensor).
    Strictly NO embedding caching, NO gradient caching, NO model output caching.
    """
    def __init__(self, base_dataset: AuraGarmentDataset, cache_dir: str, enable_cache: bool = True):
        self.base_dataset = base_dataset
        self.cache_dir = cache_dir
        self.enable_cache = enable_cache
        if enable_cache:
            os.makedirs(cache_dir, exist_ok=True)

    def __len__(self) -> int:
        return len(self.base_dataset)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        item = self.base_dataset.items[idx]
        image_id = item.get("image_id")
        cache_file = os.path.join(self.cache_dir, f"{image_id}.pt") if self.enable_cache else None

        if self.enable_cache and os.path.exists(cache_file):
            pixel_values = torch.load(cache_file, map_location="cpu")
        else:
            # Deterministic image preprocessing via Hugging Face SiglipImageProcessor
            img_rel = item.get("image_path", "")
            img_full = os.path.join(self.base_dataset.root_dir, img_rel)
            from PIL import Image
            with Image.open(img_full) as img:
                img_rgb = img.convert("RGB")
                processed = self.base_dataset.image_processor(images=img_rgb, return_tensors="pt")
                pixel_values = processed["pixel_values"].squeeze(0)
            if self.enable_cache:
                torch.save(pixel_values, cache_file)

        labels = item.get("labels", {})
        cat_idx = self.base_dataset.cat_map.get(labels.get("category"), 0)
        fit_idx = self.base_dataset.fit_map.get(labels.get("fit"), self.base_dataset.fit_map.get("unknown", 0))
        sil_idx = self.base_dataset.sil_map.get(labels.get("silhouette"), self.base_dataset.sil_map.get("unknown", 0))
        col_idx = self.base_dataset.col_map.get(labels.get("color_family"), self.base_dataset.col_map.get("unknown", 0))
        pat_idx = self.base_dataset.pat_map.get(labels.get("pattern"), self.base_dataset.pat_map.get("unknown", 0))
        mat_idx = self.base_dataset.mat_map.get(labels.get("material"), self.base_dataset.mat_map.get("unknown", 0))
        formality = float(labels.get("formality_score", 0.5))

        return {
            "image_id": image_id,
            "pixel_values": pixel_values,
            "category": torch.tensor(cat_idx, dtype=torch.long),
            "fit": torch.tensor(fit_idx, dtype=torch.long),
            "silhouette": torch.tensor(sil_idx, dtype=torch.long),
            "color_family": torch.tensor(col_idx, dtype=torch.long),
            "pattern": torch.tensor(pat_idx, dtype=torch.long),
            "material": torch.tensor(mat_idx, dtype=torch.long),
            "formality": torch.tensor(formality, dtype=torch.float32),
        }


def setup_model(device: torch.device) -> Tuple[AuraSigLIPBackbone, AuraLightweightHeads, MultiTaskFashionLoss]:
    """Instantiate identical Exp-0015 LoRA model."""
    backbone = AuraSigLIPBackbone(
        model_name=BACKBONE_NAME,
        unfreeze_last_n_layers=0,
        use_lora=True,
        lora_rank=8,
        lora_alpha=16.0,
        lora_dropout=0.05,
        lora_target_modules=["q_proj", "v_proj"]
    ).to(device)

    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        taxonomy = json.load(f)

    heads = AuraLightweightHeads(taxonomy, input_dim=1152, bottleneck_dim=256, dropout=0.3).to(device)
    loss_fn = MultiTaskFashionLoss({})
    return backbone, heads, loss_fn


def run_batch_benchmark(device: torch.device, sample_indices: List[int]) -> List[Dict[str, Any]]:
    """Benchmark batch_size 1, 2, 4, 8 with constant effective batch size 16."""
    print("\n" + "=" * 70)
    print(" 1. BATCH SIZE & GRADIENT ACCUMULATION BENCHMARK (Effective Batch = 16)")
    print("=" * 70)

    base_ds = AuraGarmentDataset(DATASET_PATH, TAXONOMY_PATH, split="train", processor_name=BACKBONE_NAME)
    subset_ds = Subset(base_ds, sample_indices)

    configs = [
        {"batch_size": 1, "grad_accum": 16, "name": "Config A (bs=1, accum=16)"},
        {"batch_size": 2, "grad_accum": 8, "name": "Config B (bs=2, accum=8)"},
        {"batch_size": 4, "grad_accum": 4, "name": "Config C (bs=4, accum=4)"},
        {"batch_size": 8, "grad_accum": 2, "name": "Config D (bs=8, accum=2)"},
    ]

    results = []

    for cfg in configs:
        bs = cfg["batch_size"]
        accum = cfg["grad_accum"]
        name = cfg["name"]
        print(f"\n[*] Testing {name}...")

        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats(device)

        record: Dict[str, Any] = {
            "batch_size": bs,
            "gradient_accumulation": accum,
            "effective_batch": bs * accum,
            "warmup_iterations": 1,
            "samples_processed": 0,
            "elapsed_seconds": 0.0,
            "seconds_per_sample": 0.0,
            "samples_per_second": 0.0,
            "optimizer_steps": 0,
            "peak_gpu_memory_mb": 0.0,
            "gpu_allocated_mb": 0.0,
            "gpu_reserved_mb": 0.0,
            "oom": False,
            "cuda_error": None
        }

        try:
            backbone, heads, loss_fn = setup_model(device)
            backbone.train()
            heads.train()

            params = [p for p in backbone.parameters() if p.requires_grad] + [p for p in heads.parameters() if p.requires_grad]
            optimizer = optim.AdamW(params, lr=1e-4)

            loader = DataLoader(subset_ds, batch_size=bs, shuffle=False, num_workers=0)

            # Warmup iteration
            warmup_done = False
            for batch in loader:
                targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    feats = backbone(batch["pixel_values"].to(device))
                    preds = heads(feats)
                    l, _ = loss_fn(preds, targets)
                    l = l / accum
                l.backward()
                optimizer.zero_grad()
                warmup_done = True
                break

            torch.cuda.synchronize(device)
            torch.cuda.reset_peak_memory_stats(device)

            # Measured iterations
            opt_steps = 0
            samples_count = 0
            start_t = time.perf_counter()

            for step, batch in enumerate(loader):
                targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    feats = backbone(batch["pixel_values"].to(device))
                    preds = heads(feats)
                    l, _ = loss_fn(preds, targets)
                    l = l / accum
                l.backward()

                if (step + 1) % accum == 0 or (step + 1) == len(loader):
                    optimizer.step()
                    optimizer.zero_grad()
                    opt_steps += 1

                samples_count += len(batch["pixel_values"])

            torch.cuda.synchronize(device)
            elapsed = time.perf_counter() - start_t

            peak_mb = torch.cuda.max_memory_allocated(device) / (1024 ** 2)
            alloc_mb = torch.cuda.memory_allocated(device) / (1024 ** 2)
            res_mb = torch.cuda.memory_reserved(device) / (1024 ** 2)

            sec_per_sample = elapsed / max(1, samples_count)
            samp_per_sec = samples_count / max(1e-5, elapsed)

            record.update({
                "samples_processed": samples_count,
                "elapsed_seconds": round(elapsed, 4),
                "seconds_per_sample": round(sec_per_sample, 4),
                "samples_per_second": round(samp_per_sec, 4),
                "optimizer_steps": opt_steps,
                "peak_gpu_memory_mb": round(peak_mb, 2),
                "gpu_allocated_mb": round(alloc_mb, 2),
                "gpu_reserved_mb": round(res_mb, 2),
                "oom": False
            })

            print(f"    -> Elapsed: {elapsed:.2f}s | Speed: {samp_per_sec:.2f} samp/s ({sec_per_sample:.3f} s/sample) | Peak VRAM: {peak_mb:.1f} MB")

            # Cleanup
            del backbone, heads, optimizer, loader
            gc.collect()
            torch.cuda.empty_cache()

        except torch.cuda.OutOfMemoryError as e:
            print(f"    [!] OOM encountered for {name}: {e}")
            record["oom"] = True
            record["cuda_error"] = "torch.cuda.OutOfMemoryError"
            gc.collect()
            torch.cuda.empty_cache()
        except Exception as e:
            print(f"    [!] CUDA / Execution Error for {name}: {e}")
            record["cuda_error"] = str(e)
            gc.collect()
            torch.cuda.empty_cache()

        results.append(record)

    return results


def run_dataloader_benchmark(device: torch.device, sample_indices: List[int], best_batch_size: int = 2) -> List[Dict[str, Any]]:
    """Benchmark DataLoader workers (0, 2, 4) measuring wait time vs compute time."""
    print("\n" + "=" * 70)
    print(f" 2. DATALOADER WORKERS BENCHMARK (Batch Size = {best_batch_size})")
    print("=" * 70)

    base_ds = AuraGarmentDataset(DATASET_PATH, TAXONOMY_PATH, split="train", processor_name=BACKBONE_NAME)
    subset_ds = Subset(base_ds, sample_indices)

    worker_counts = [0, 2, 4]
    results = []

    for workers in worker_counts:
        print(f"\n[*] Testing DataLoader num_workers = {workers}...")
        gc.collect()
        torch.cuda.empty_cache()

        record: Dict[str, Any] = {
            "num_workers": workers,
            "batch_size": best_batch_size,
            "samples_processed": 0,
            "data_wait_time_sec": 0.0,
            "compute_time_sec": 0.0,
            "total_time_sec": 0.0,
            "samples_per_sec": 0.0,
            "error": None
        }

        try:
            backbone, heads, loss_fn = setup_model(device)
            backbone.train()
            heads.train()
            params = [p for p in backbone.parameters() if p.requires_grad] + [p for p in heads.parameters() if p.requires_grad]
            optimizer = optim.AdamW(params, lr=1e-4)

            # Warmup
            loader = DataLoader(subset_ds, batch_size=best_batch_size, shuffle=False, num_workers=workers)
            for batch in loader:
                targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    feats = backbone(batch["pixel_values"].to(device))
                    preds = heads(feats)
                    l, _ = loss_fn(preds, targets)
                l.backward()
                optimizer.zero_grad()
                break

            torch.cuda.synchronize(device)

            total_wait_t = 0.0
            total_compute_t = 0.0
            samples_count = 0

            loader = DataLoader(subset_ds, batch_size=best_batch_size, shuffle=False, num_workers=workers)
            data_start = time.perf_counter()

            for batch in loader:
                data_ready = time.perf_counter()
                total_wait_t += (data_ready - data_start)

                compute_start = time.perf_counter()
                targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
                with torch.amp.autocast('cuda', dtype=torch.float16):
                    feats = backbone(batch["pixel_values"].to(device))
                    preds = heads(feats)
                    l, _ = loss_fn(preds, targets)
                l.backward()
                optimizer.step()
                optimizer.zero_grad()

                torch.cuda.synchronize(device)
                total_compute_t += (time.perf_counter() - compute_start)
                samples_count += len(batch["pixel_values"])
                data_start = time.perf_counter()

            total_elapsed = total_wait_t + total_compute_t
            samp_per_sec = samples_count / max(1e-5, total_elapsed)

            record.update({
                "samples_processed": samples_count,
                "data_wait_time_sec": round(total_wait_t, 4),
                "compute_time_sec": round(total_compute_t, 4),
                "total_time_sec": round(total_elapsed, 4),
                "samples_per_sec": round(samp_per_sec, 4)
            })

            print(f"    -> Data Wait: {total_wait_t:.2f}s | Compute: {total_compute_t:.2f}s | Total: {total_elapsed:.2f}s ({samp_per_sec:.2f} samp/s)")

            del backbone, heads, optimizer, loader
            gc.collect()
            torch.cuda.empty_cache()

        except Exception as e:
            print(f"    [!] Error testing num_workers={workers}: {e}")
            record["error"] = str(e)
            gc.collect()
            torch.cuda.empty_cache()

        results.append(record)

    return results


def run_preprocessing_benchmark(device: torch.device, sample_indices: List[int], batch_size: int = 2) -> Dict[str, Any]:
    """Compare on-the-fly PIL/SiglipImageProcessor vs. Preprocessed Tensor Disk Cache."""
    print("\n" + "=" * 70)
    print(" 3. PREPROCESSING CACHE BENCHMARK (Cache OFF vs Cache ON)")
    print("=" * 70)

    base_ds = AuraGarmentDataset(DATASET_PATH, TAXONOMY_PATH, split="train", processor_name=BACKBONE_NAME)
    subset_ds = Subset(base_ds, sample_indices)

    # 1. Cache Disabled (Fresh decode and preprocess)
    print("\n[*] Testing Preprocessing Cache OFF (on-the-fly PIL + SigLIP preprocessor)...")
    t0 = time.perf_counter()
    raw_times = []
    for idx in range(len(subset_ds)):
        st = time.perf_counter()
        _ = subset_ds[idx]["pixel_values"]
        raw_times.append(time.perf_counter() - st)
    cache_off_total = sum(raw_times)
    cache_off_per_sample = cache_off_total / len(raw_times)
    print(f"    -> Total Preprocessing Time: {cache_off_total:.2f}s ({cache_off_per_sample*1000:.1f} ms / sample)")

    # 2. Build Cache
    print("\n[*] Populating Preprocessed Tensor Disk Cache at training/cache/preprocessed/...")
    cached_ds = CachedPreprocessedDataset(base_ds, cache_dir=CACHE_DIR, enable_cache=True)
    cached_subset = Subset(cached_ds, sample_indices)
    # Ensure populated
    for idx in range(len(cached_subset)):
        _ = cached_subset[idx]

    # 3. Cache Enabled (Reading preprocessed tensor directly)
    print("[*] Testing Preprocessing Cache ON (direct tensor read from disk)...")
    cached_times = []
    for idx in range(len(cached_subset)):
        st = time.perf_counter()
        _ = cached_subset[idx]["pixel_values"]
        cached_times.append(time.perf_counter() - st)
    cache_on_total = sum(cached_times)
    cache_on_per_sample = cache_on_total / len(cached_times)
    speedup = cache_off_per_sample / max(1e-5, cache_on_per_sample)
    print(f"    -> Total Preprocessed Load Time: {cache_on_total:.2f}s ({cache_on_per_sample*1000:.1f} ms / sample)")
    print(f"    -> Preprocessing Speedup: {speedup:.2f}x faster")

    return {
        "samples_tested": len(sample_indices),
        "cache_off_total_sec": round(cache_off_total, 4),
        "cache_off_ms_per_sample": round(cache_off_per_sample * 1000, 2),
        "cache_on_total_sec": round(cache_on_total, 4),
        "cache_on_ms_per_sample": round(cache_on_per_sample * 1000, 2),
        "preprocessing_speedup_factor": round(speedup, 2),
        "cache_directory": CACHE_DIR,
        "is_gradient_cached": False,
        "is_embedding_cached": False,
        "is_model_output_cached": False
    }


def run_checkpoint_benchmark(device: torch.device) -> Dict[str, Any]:
    """Benchmark checkpoint save time, file size, and parameter counts."""
    print("\n" + "=" * 70)
    print(" 4. CHECKPOINT SAVE PERFORMANCE & SERIALIZATION BENCHMARK")
    print("=" * 70)

    backbone, heads, _ = setup_model(device)
    test_ckpt_path = os.path.join(PERF_DIR, "benchmark_checkpoint.pt")

    # Extract state dicts
    lora_state = {k: v for k, v in backbone.state_dict().items() if "lora_" in k}
    heads_state = heads.state_dict()

    lora_param_count = sum(p.numel() for p in lora_state.values())
    heads_param_count = sum(p.numel() for p in heads_state.values())
    frozen_base_count = sum(p.numel() for k, p in backbone.state_dict().items() if "lora_" not in k)

    ckpt_payload = {
        "experiment_id": "garment-exp-0015-bench",
        "epoch": 1,
        "lora_state_dict": lora_state,
        "heads_state_dict": heads_state,
        "model_state_dict": heads_state,
        "val_macro_f1": 0.50,
        "backbone_model_name": BACKBONE_NAME,
        "use_lora": True,
        "saved_trainable_parameters": lora_param_count + heads_param_count
    }

    t0 = time.perf_counter()
    torch.save(ckpt_payload, test_ckpt_path)
    save_seconds = time.perf_counter() - t0

    size_bytes = os.path.getsize(test_ckpt_path)
    size_mb = size_bytes / (1024 ** 2)

    # Verification of loaded state
    t_load0 = time.perf_counter()
    loaded = torch.load(test_ckpt_path, map_location="cpu")
    load_seconds = time.perf_counter() - t_load0

    saved_lora_tensors = len(loaded.get("lora_state_dict", {}))
    saved_head_tensors = len(loaded.get("heads_state_dict", {}))

    print(f"[+] Checkpoint Saved in {save_seconds:.3f}s | Size: {size_mb:.2f} MB ({size_bytes:,} bytes)")
    print(f"[+] Loaded in {load_seconds:.3f}s | LoRA Tensors: {saved_lora_tensors} ({lora_param_count:,} params) | Head Tensors: {saved_head_tensors} ({heads_param_count:,} params)")

    passed_guard = size_mb < 50.0 and frozen_base_count == 428225600

    return {
        "checkpoint_path": test_ckpt_path,
        "save_duration_sec": round(save_seconds, 4),
        "load_duration_sec": round(load_seconds, 4),
        "size_bytes": size_bytes,
        "size_mb": round(size_mb, 2),
        "size_under_50mb_guard": size_mb < 50.0,
        "lora_tensors": saved_lora_tensors,
        "lora_parameters": lora_param_count,
        "heads_tensors": saved_head_tensors,
        "heads_parameters": heads_param_count,
        "frozen_backbone_parameters_saved": 0,
        "passed_checkpoint_guard": size_mb < 50.0
    }


def main():
    parser = argparse.ArgumentParser(description="LoRA Throughput & Performance Benchmark")
    parser.add_argument("--samples", type=int, default=32, help="Number of fixed training samples to benchmark")
    args = parser.parse_args()

    os.makedirs(PERF_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)

    if not torch.cuda.is_available():
        print("[!] ERROR: CUDA is required for training benchmark.")
        sys.exit(1)

    device = torch.device("cuda:0")
    gpu_name = torch.cuda.get_device_name(device)
    print("=" * 70)
    print(f" AURA — PHASE 13D.1 LORA THROUGHPUT BENCHMARK ON {gpu_name}")
    print("=" * 70)

    sample_indices = list(range(args.samples))

    # 1. Batch Size & Grad Accum Benchmark
    batch_results = run_batch_benchmark(device, sample_indices)
    with open(os.path.join(PERF_DIR, "batch_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(batch_results, f, indent=2)

    # Determine fastest non-OOM batch size
    valid_configs = [c for c in batch_results if not c.get("oom") and c.get("samples_per_second", 0) > 0]
    if valid_configs:
        fastest_cfg = max(valid_configs, key=lambda x: x["samples_per_second"])
        best_bs = fastest_cfg["batch_size"]
        best_accum = fastest_cfg["gradient_accumulation"]
    else:
        best_bs = 1
        best_accum = 16

    # 2. DataLoader Workers Benchmark
    dataloader_results = run_dataloader_benchmark(device, sample_indices, best_batch_size=best_bs)
    with open(os.path.join(PERF_DIR, "dataloader_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(dataloader_results, f, indent=2)

    best_worker_cfg = min(
        [r for r in dataloader_results if not r.get("error")],
        key=lambda x: x["total_time_sec"],
        default={"num_workers": 0}
    )
    best_workers = best_worker_cfg["num_workers"]

    # 3. Preprocessing Benchmark
    preprocessing_results = run_preprocessing_benchmark(device, sample_indices, batch_size=best_bs)
    with open(os.path.join(PERF_DIR, "preprocessing_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(preprocessing_results, f, indent=2)

    # 4. Checkpoint Save Benchmark
    checkpoint_results = run_checkpoint_benchmark(device)
    with open(os.path.join(PERF_DIR, "checkpoint_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(checkpoint_results, f, indent=2)

    # 5. Compute Recommended Configuration & Estimated Runtime
    # Total training samples = 459
    total_train_samples = 459
    total_epochs = 50

    # Measured throughput with optimal batch size
    fastest_samp_per_sec = fastest_cfg["samples_per_second"]
    baseline_epoch_sec = total_train_samples / fastest_samp_per_sec
    baseline_50_epoch_hrs = (baseline_epoch_sec * total_epochs) / 3600.0

    rec_cfg = {
        "recommended_batch_size": best_bs,
        "recommended_gradient_accumulation_steps": best_accum,
        "effective_batch_size": best_bs * best_accum,
        "recommended_num_workers": best_workers,
        "use_preprocessing_cache": True,
        "cache_dir": CACHE_DIR,
        "measured_throughput_samples_per_sec": fastest_samp_per_sec,
        "measured_seconds_per_sample": round(1.0 / max(1e-5, fastest_samp_per_sec), 3),
        "projected_epoch_seconds": round(baseline_epoch_sec, 2),
        "projected_epoch_minutes": round(baseline_epoch_sec / 60.0, 2),
        "projected_50_epoch_hours": round(baseline_50_epoch_hrs, 2),
        "baseline_previous_50_epoch_hours": 31.23,
        "throughput_improvement_factor": round(31.23 / max(0.1, baseline_50_epoch_hrs), 2),
        "fits_gtx_1650_4gb": fastest_cfg["peak_gpu_memory_mb"] < 3500.0,
        "peak_gpu_memory_mb": fastest_cfg["peak_gpu_memory_mb"]
    }

    with open(os.path.join(PERF_DIR, "recommended_configuration.json"), "w", encoding="utf-8") as f:
        json.dump(rec_cfg, f, indent=2)

    print("\n" + "=" * 70)
    print(" BENCHMARK COMPLETE — RECOMMENDED CONFIGURATION:")
    print(f"  Batch Size: {best_bs}")
    print(f"  Gradient Accumulation: {best_accum} (Effective Batch = {best_bs * best_accum})")
    print(f"  DataLoader Workers: {best_workers}")
    print(f"  Preprocessing Cache: Enabled ({CACHE_DIR})")
    print(f"  Throughput: {fastest_samp_per_sec:.2f} samples/sec")
    print(f"  Projected Epoch Time: {baseline_epoch_sec / 60.0:.2f} minutes (down from 37.48 min)")
    print(f"  Projected 50-Epoch Runtime: {baseline_50_epoch_hrs:.2f} hours (down from 31.23 hours)")
    print("=" * 70)


if __name__ == "__main__":
    main()
