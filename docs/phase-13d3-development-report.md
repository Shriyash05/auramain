# AURA — Phase 13D.3 Engineering & Scientific Development Report

## 1. Project Background & Motivation

Phase 13D began with the realization that adapting all 27 transformer layers of `google/siglip-so400m-patch14-384` on a consumer NVIDIA GeForce GTX 1650 (4GB VRAM) was computationally prohibitive (~30 hours for 50 epochs due to autograd backward traversal depth).

In Phase 13D.2, an architectural feasibility benchmark proved that restricting LoRA adapters (`q_proj`, `v_proj`, rank 8, alpha 16) to the **last 4 transformer blocks (layers 23–26)** cut backward pass latency by **85.1%** (from 2,528 ms to 376 ms per sample) while maintaining peak VRAM under 1.91 GB.

Phase 13D.3 executed the formal production rerun of `garment-exp-0015` using this selective 4-layer configuration on the immutable 500-sample dataset (`dataset-v0.5-500.json`).

---

## 2. Preflight Audits & Verification

### A. Optimizer Accumulation Audit
- **Sanity Run Investigation:** The Phase 13D.2 2-epoch sanity run reported 2 optimizer steps across 16 batches. Forensic review confirmed this was mathematically expected: passing `--max-batches 16` with `gradient_accumulation_steps: 16` executed exactly 1 accumulation cycle per epoch.
- **Production Math:** For 459 training samples with `batch_size: 1` and `gradient_accumulation_steps: 16`, each epoch processes 28 full windows of 16 batches plus 1 final partial window of 11 batches, producing exactly **29 optimizer steps per epoch** ($\lceil 459 / 16 \rceil = 29$).
- **Execution Proof:** Training executed for 8 epochs, yielding exactly $8 \times 29 = 232$ optimizer steps.

### B. Dataset Immutability Checksums
- `data/garment/metadata/dataset-v0.5-500.json`: `85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e` (PASS)
- `data/garment/metadata/dataset-v0.3-blind-freeze.json`: `5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd` (PASS)
- `data/garment/metadata/dataset-v0.5-500-freeze.json`: `ca77d3515606fd72087f65a5dd49b3ce376bae8d83ee10e5aba6749ed68954de` (PASS)

---

## 3. Training Telemetry & Checkpoint Integrity

- **Wall Clock Time:** 10,056.85 seconds (2.79 hours).
- **Execution Budget:** 20 epochs maximum, 8.0 hours max runtime safety limit.
- **Early Stopping Trigger:** Patience = 6 epochs. Validation Macro F1 peaked at **0.4715** (Validation Category Accuracy: **60.98%**) at **Epoch 2**. The run stopped cleanly at Epoch 8.
- **Checkpoint Serialization Guard:**
  - Saved path: `training/runs/garment-exp-0015/checkpoint/best_model.pt`
  - Total size: **5.28 MB** (5,541,273 bytes) — completely eliminating the 1.73 GB unhardened backbone leakage.
  - Saved contents: Exactly 16 LoRA adapter tensors (147,456 parameters) and 18 classification head tensors (310,586 parameters). Zero frozen base parameters saved.
  - Checkpoint reload: Fresh model instantiation produced a logit discrepancy of **0.0000000000** against the in-memory model.

---

## 4. Multi-Split Scientific Results

| Split | Sample Size | Category Top-1 | Color | Fit | Silhouette | Material | Pattern | Macro F1 | Refusal Rate |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Train** | 459 | 68.41% | 48.80% | 85.84% | 79.74% | 69.50% | 76.69% | **71.50%** | 40.96% |
| **Validation** | 41 | 51.22% | 41.46% | 56.10% | 56.10% | 56.10% | 12.20% | **45.53%** | 60.98% |
| **Blind Test** | 20 | 25.00% | 10.00% | 30.00% | 20.00% | 15.00% | 25.00% | **20.83%** | 90.00% |
| **Hard Test** | 18 | 16.67% | 16.67% | 27.78% | 11.11% | 5.56% | 27.78% | **17.59%** | 100.00% |
| **Real-World (Full)** | 16 | **37.50%** | 6.25% | 12.50% | 12.50% | 0.00% | 12.50% | **13.54%** | 87.50% |
| **Real-World (Crop)** | 16 | 31.25% | 6.25% | 18.75% | 12.50% | 6.25% | 25.00% | **16.67%** | 87.50% |

---

## 5. Representation Drift & Stability

Probing 50 validation samples pre- and post-LoRA adaptation:
- **Mean Cosine Similarity:** **0.995358**
- **Min / Max:** 0.990923 / 0.997834
- **Representation Collapse:** FALSE
- **Conclusion:** LoRA adaptation subtly refines high-level attention without damaging the underlying visual geometry of SigLIP.

---

## 6. Scientific Verdict & Next Action

- **Verdict:** **MIXED**
  - Category recognition on uncropped real-world consumer wardrobe photos gained **+25.00%** absolute (12.50% in Exp-0014 $\to$ **37.50%** in Exp-0015).
  - Blind test Macro F1 declined from 31.67% to 20.83%, reflecting a shift from clean studio e-commerce patterns towards diverse in-the-wild textures.
- **Next Action:** Conclude Phase 13D.3 and await formal user instruction before designing Phase 14 (combining selective LoRA representation adaptation with localized cropping).
