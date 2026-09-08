#!/usr/bin/env python3
"""
AURA — Phase 13D.2 Selective-Layer LoRA Performance & Feasibility Benchmark
Evaluates selective attention LoRA on:
- Config A: Last 4 transformer blocks (layers 23-26)
- Config B: Last 8 transformer blocks (layers 19-26)
- Config C: Last 12 transformer blocks (layers 15-26)
- Config D: All 27 transformer blocks (layers 0-26, reference)

Fixed Controls:
- Architecture: google/siglip-so400m-patch14-384
- LoRA: r=8, alpha=16, dropout=0.05, targets: ["q_proj", "v_proj"]
- Head: 1152 -> 256 bottleneck, LayerNorm, GELU, Dropout 0.3
- Batch Size: 1, Gradient Accumulation: 16 (effective batch = 16)
- DataLoader: workers=0, Preprocessing Cache: ON
"""

import os
import sys
import gc
import time
import json
import argparse
from typing import Dict, Any, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Subset

# Import canonical training modules
sys.path.insert(0, os.path.dirname(__file__))
from train_garment_classifier import (
    AuraGarmentDataset,
    AuraSigLIPBackbone,
    AuraLightweightHeads,
    MultiTaskFashionLoss
)
from benchmark_lora_throughput import CachedPreprocessedDataset

DATASET_PATH = "data/garment/metadata/dataset-v0.5-500.json"
TAXONOMY_PATH = "data/garment/metadata/canonical_taxonomy.json"
BACKBONE_NAME = "google/siglip-so400m-patch14-384"
OUT_DIR = "training/runs/garment-exp-0015/forensics/selective_lora"
CACHE_DIR = "training/cache/preprocessed"


def get_layer_configurations() -> List[Dict[str, Any]]:
    return [
        {
            "id": "CONFIG_A",
            "name": "Last 4 Blocks (Layers 23-26)",
            "num_layers": 4,
            "layer_indices": list(range(23, 27)),
        },
        {
            "id": "CONFIG_B",
            "name": "Last 8 Blocks (Layers 19-26)",
            "num_layers": 8,
            "layer_indices": list(range(19, 27)),
        },
        {
            "id": "CONFIG_C",
            "name": "Last 12 Blocks (Layers 15-26)",
            "num_layers": 12,
            "layer_indices": list(range(15, 27)),
        },
        {
            "id": "CONFIG_D",
            "name": "All 27 Blocks (Layers 0-26)",
            "num_layers": 27,
            "layer_indices": list(range(0, 27)),
        }
    ]


def run_selective_benchmark(device: torch.device, sample_indices: List[int]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)

    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        taxonomy = json.load(f)

    # Base dataset wrapped with deterministic tensor cache
    base_ds = AuraGarmentDataset(DATASET_PATH, TAXONOMY_PATH, split="train", processor_name=BACKBONE_NAME)
    cached_ds = CachedPreprocessedDataset(base_ds, cache_dir=CACHE_DIR, enable_cache=True)
    subset_ds = Subset(cached_ds, sample_indices)

    # Ensure cache is pre-populated
    for idx in range(len(subset_ds)):
        _ = subset_ds[idx]

    configs = get_layer_configurations()
    benchmark_results = []
    param_records = []
    mem_records = []
    throughput_records = []

    total_backbone_params = 429220928
    head_params = 310586
    total_model_params = total_backbone_params + head_params

    print("\n" + "=" * 80)
    print(" AURA — PHASE 13D.2 SELECTIVE-LAYER LORA PERFORMANCE BENCHMARK")
    print(f" Hardware: {torch.cuda.get_device_name(device)} ({torch.cuda.get_device_properties(device).total_memory / (1024**2):.1f} MB VRAM)")
    print(f" Fixed Controls: Batch Size=1, Grad Accum=16, Workers=0, Preprocessing Cache=ON, N={len(sample_indices)}")
    print("=" * 80)

    for cfg in configs:
        cid = cfg["id"]
        cname = cfg["name"]
        num_layers = cfg["num_layers"]
        layers = cfg["layer_indices"]

        print(f"\n[*] Benchmarking {cid}: {cname}...")

        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats(device)

        # Setup model with exact selective layers
        backbone = AuraSigLIPBackbone(
            model_name=BACKBONE_NAME,
            unfreeze_last_n_layers=0,
            use_lora=True,
            lora_rank=8,
            lora_alpha=16.0,
            lora_dropout=0.05,
            lora_target_modules=["q_proj", "v_proj"],
            lora_num_layers=num_layers
        ).to(device)

        heads = AuraLightweightHeads(taxonomy, input_dim=1152, bottleneck_dim=256, dropout=0.3).to(device)
        loss_fn = MultiTaskFashionLoss({})

        lora_params = sum(p.numel() for n, p in backbone.named_parameters() if "lora_" in n)
        lora_tensors = sum(1 for n, _ in backbone.named_parameters() if "lora_" in n)
        total_trainable = lora_params + head_params
        trainable_pct = (total_trainable / total_model_params) * 100.0

        param_record = {
            "config_id": cid,
            "name": cname,
            "adapted_layers": num_layers,
            "layer_indices": layers,
            "lora_tensors": lora_tensors,
            "lora_parameters": lora_params,
            "head_parameters": head_params,
            "total_trainable_parameters": total_trainable,
            "total_model_parameters": total_model_params,
            "trainable_percentage": round(trainable_pct, 4)
        }
        param_records.append(param_record)

        params_to_opt = [p for p in backbone.parameters() if p.requires_grad] + [p for p in heads.parameters() if p.requires_grad]
        optimizer = optim.AdamW(params_to_opt, lr=1e-4)

        loader = DataLoader(subset_ds, batch_size=1, shuffle=False, num_workers=0)

        # 1. Warmup step
        t_warm_start = time.perf_counter()
        for batch in loader:
            targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
            with torch.amp.autocast('cuda', dtype=torch.float16):
                feats = backbone(batch["pixel_values"].to(device))
                preds = heads(feats)
                loss, _ = loss_fn(preds, targets)
                loss_scaled = loss / 16
            loss_scaled.backward()
            optimizer.zero_grad()
            break
        torch.cuda.synchronize(device)
        warmup_sec = time.perf_counter() - t_warm_start

        torch.cuda.reset_peak_memory_stats(device)

        # 2. Measured loop
        fwd_times = []
        bwd_times = []
        opt_times = []
        samples_processed = 0
        optimizer_steps = 0

        t_measure_start = time.perf_counter()

        for step, batch in enumerate(loader):
            targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features", "pixel_values"]}
            pix = batch["pixel_values"].to(device)

            # Forward pass
            t_f0 = time.perf_counter()
            with torch.amp.autocast('cuda', dtype=torch.float16):
                feats = backbone(pix)
                preds = heads(feats)
                loss, _ = loss_fn(preds, targets)
                loss_scaled = loss / 16
            torch.cuda.synchronize(device)
            fwd_times.append(time.perf_counter() - t_f0)

            # Backward pass
            t_b0 = time.perf_counter()
            loss_scaled.backward()
            torch.cuda.synchronize(device)
            bwd_times.append(time.perf_counter() - t_b0)

            samples_processed += 1

            if (step + 1) % 16 == 0 or (step + 1) == len(loader):
                t_o0 = time.perf_counter()
                optimizer.step()
                optimizer.zero_grad()
                torch.cuda.synchronize(device)
                opt_times.append(time.perf_counter() - t_o0)
                optimizer_steps += 1

        measured_sec = time.perf_counter() - t_measure_start

        peak_vram_mb = torch.cuda.max_memory_allocated(device) / (1024 ** 2)
        alloc_mb = torch.cuda.memory_allocated(device) / (1024 ** 2)
        res_mb = torch.cuda.memory_reserved(device) / (1024 ** 2)

        sec_per_sample = measured_sec / max(1, samples_processed)
        samp_per_sec = samples_processed / max(1e-5, measured_sec)
        avg_fwd = sum(fwd_times) / len(fwd_times)
        avg_bwd = sum(bwd_times) / len(bwd_times)
        avg_opt = sum(opt_times) / max(1, len(opt_times))

        # Extrapolations based on measured throughput
        # Total dataset training samples = 459
        est_epoch_sec = 459 * sec_per_sample
        est_15_epoch_hr = (est_epoch_sec * 15) / 3600.0
        est_20_epoch_hr = (est_epoch_sec * 20) / 3600.0
        est_50_epoch_hr = (est_epoch_sec * 50) / 3600.0

        print(f"    -> Warmup: {warmup_sec:.2f}s | Measured: {measured_sec:.2f}s ({samples_processed} samples)")
        print(f"    -> Speed: {samp_per_sec:.3f} samp/s ({sec_per_sample:.3f} s/sample)")
        print(f"    -> Avg Forward: {avg_fwd*1000:.1f}ms | Avg Backward: {avg_bwd*1000:.1f}ms | Avg Step: {avg_opt*1000:.1f}ms")
        print(f"    -> Peak VRAM: {peak_vram_mb:.1f} MB (Alloc: {alloc_mb:.1f} MB, Res: {res_mb:.1f} MB)")
        print(f"    -> Projected 1 Epoch: {est_epoch_sec / 60.0:.2f} min | 20 Epochs: {est_20_epoch_hr:.2f}h | 50 Epochs: {est_50_epoch_hr:.2f}h")

        res_record = {
            "config_id": cid,
            "name": cname,
            "num_layers": num_layers,
            "layer_indices": layers,
            "lora_parameters": lora_params,
            "head_parameters": head_params,
            "total_trainable_parameters": total_trainable,
            "trainable_percentage": round(trainable_pct, 4),
            "warmup_seconds": round(warmup_sec, 4),
            "measured_seconds": round(measured_sec, 4),
            "samples_processed": samples_processed,
            "samples_per_second": round(samp_per_sec, 4),
            "seconds_per_sample": round(sec_per_sample, 4),
            "avg_forward_ms": round(avg_fwd * 1000, 2),
            "avg_backward_ms": round(avg_bwd * 1000, 2),
            "avg_optimizer_step_ms": round(avg_opt * 1000, 2),
            "peak_vram_mb": round(peak_vram_mb, 2),
            "gpu_allocated_mb": round(alloc_mb, 2),
            "gpu_reserved_mb": round(res_mb, 2),
            "spills_to_system_ram": peak_vram_mb > 3800.0,
            "oom": False,
            "estimated_epoch_seconds": round(est_epoch_sec, 2),
            "estimated_epoch_minutes": round(est_epoch_sec / 60.0, 2),
            "estimated_15_epoch_hours": round(est_15_epoch_hr, 2),
            "estimated_20_epoch_hours": round(est_20_epoch_hr, 2),
            "estimated_50_epoch_hours": round(est_50_epoch_hr, 2)
        }
        benchmark_results.append(res_record)

        mem_records.append({
            "config_id": cid,
            "name": cname,
            "peak_vram_mb": round(peak_vram_mb, 2),
            "allocated_mb": round(alloc_mb, 2),
            "reserved_mb": round(res_mb, 2),
            "safe_for_gtx_1650_4gb": peak_vram_mb <= 3500.0
        })

        throughput_records.append({
            "config_id": cid,
            "name": cname,
            "samples_per_second": round(samp_per_sec, 4),
            "seconds_per_sample": round(sec_per_sample, 4),
            "speedup_vs_full_27": None, # computed below
            "estimated_epoch_minutes": round(est_epoch_sec / 60.0, 2),
            "estimated_20_epoch_hours": round(est_20_epoch_hr, 2),
            "estimated_50_epoch_hours": round(est_50_epoch_hr, 2)
        })

        del backbone, heads, optimizer, loader
        gc.collect()
        torch.cuda.empty_cache()

    # Compute speedups relative to Config D (all 27)
    full_sec_sample = benchmark_results[-1]["seconds_per_sample"]
    for tr in throughput_records:
        tr["speedup_vs_full_27"] = round(full_sec_sample / max(1e-5, tr["seconds_per_sample"]), 2)

    # Determine recommended configuration
    # Criteria: fits comfortably in 4GB, fastest throughput, scientifically defensible
    # Rank candidates by throughput
    viable = [r for r in benchmark_results if not r["spills_to_system_ram"] and not r["oom"]]
    if viable:
        fastest_viable = max(viable, key=lambda x: x["samples_per_second"])
    else:
        fastest_viable = benchmark_results[0]

    rec_cfg = {
        "recommended_config_id": fastest_viable["config_id"],
        "recommended_name": fastest_viable["name"],
        "num_layers": fastest_viable["num_layers"],
        "layer_indices": fastest_viable["layer_indices"],
        "lora_parameters": fastest_viable["lora_parameters"],
        "head_parameters": fastest_viable["head_parameters"],
        "total_trainable_parameters": fastest_viable["total_trainable_parameters"],
        "samples_per_second": fastest_viable["samples_per_second"],
        "seconds_per_sample": fastest_viable["seconds_per_sample"],
        "speedup_factor": round(full_sec_sample / max(1e-5, fastest_viable["seconds_per_sample"]), 2),
        "peak_vram_mb": fastest_viable["peak_vram_mb"],
        "estimated_epoch_minutes": fastest_viable["estimated_epoch_minutes"],
        "estimated_20_epoch_hours": fastest_viable["estimated_20_epoch_hours"],
        "estimated_50_epoch_hours": fastest_viable["estimated_50_epoch_hours"],
        "decision": "SELECTIVE_LORA_" + str(fastest_viable["num_layers"])
    }

    # Write machine-readable JSON artifacts
    with open(os.path.join(OUT_DIR, "layer_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(benchmark_results, f, indent=2)

    with open(os.path.join(OUT_DIR, "parameter_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(param_records, f, indent=2)

    with open(os.path.join(OUT_DIR, "memory_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(mem_records, f, indent=2)

    with open(os.path.join(OUT_DIR, "throughput_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(throughput_records, f, indent=2)

    with open(os.path.join(OUT_DIR, "recommended_configuration.json"), "w", encoding="utf-8") as f:
        json.dump(rec_cfg, f, indent=2)

    print("\n" + "=" * 80)
    print(" BENCHMARK COMPLETED — RESULTS SUMMARY:")
    print("=" * 80)
    print(f"{'Config':<10} | {'Layers':<6} | {'LoRA Params':<12} | {'Samp/s':<8} | {'Sec/Samp':<9} | {'Peak VRAM':<10} | {'1 Epoch':<9} | {'50 Epochs':<9}")
    print("-" * 80)
    for r in benchmark_results:
        print(f"{r['config_id']:<10} | {r['num_layers']:<6} | {r['lora_parameters']:<12,d} | {r['samples_per_second']:<8.3f} | {r['seconds_per_sample']:<9.3f} | {r['peak_vram_mb']:<8.1f}MB | {r['estimated_epoch_minutes']:<6.1f}m | {r['estimated_50_epoch_hours']:<6.1f}h")
    print("-" * 80)
    print(f"RECOMMENDED CONFIGURATION: {rec_cfg['recommended_config_id']} ({rec_cfg['recommended_name']})")
    print(f"Throughput Speedup: {rec_cfg['speedup_factor']}x faster than full 27-layer LoRA")
    print(f"50-Epoch Runtime: {rec_cfg['estimated_50_epoch_hours']:.1f}h (vs {benchmark_results[-1]['estimated_50_epoch_hours']:.1f}h for full 27)")
    print("=" * 80)

    return benchmark_results, rec_cfg


def main():
    parser = argparse.ArgumentParser(description="Selective LoRA Throughput Benchmark")
    parser.add_argument("--samples", type=int, default=32, help="Number of samples to benchmark")
    args = parser.parse_args()

    if not torch.cuda.is_available():
        print("[!] Fatal: CUDA required for benchmark.")
        sys.exit(1)

    device = torch.device("cuda:0")
    sample_indices = list(range(args.samples))
    run_selective_benchmark(device, sample_indices)


if __name__ == "__main__":
    main()
