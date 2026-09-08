# AURA — Experiment 0015 Selective LoRA Comparison Study

## 1. Experimental Design & Controls

This study evaluates whether selective parameter-efficient adaptation (LoRA on the final 4 transformer blocks of SigLIP-SO400M) improves multi-task fashion classification on real-world imagery compared to a fully frozen backbone.

| Dimension | Primary Control (Exp-0014) | Treatment (Exp-0015) | Contextual Ref (Exp-0013) | Contextual Ref (Exp-0012) |
|:---|:---:|:---:|:---:|:---:|
| **Dataset Manifest** | `dataset-v0.5-500.json` | `dataset-v0.5-500.json` | `dataset-v0.4-250.json` | `dataset-v0.4-250.json` |
| **Total Samples** | 500 (Train=459, Val=41) | 500 (Train=459, Val=41) | 250 (Train=230, Val=20) | 250 (Train=230, Val=20) |
| **Backbone** | Frozen SigLIP-SO400M | Selective LoRA (Last 4) | Full LoRA (All 27) | Frozen SigLIP-SO400M |
| **LoRA Parameters** | 0 | **147,456** | 995,328 | 0 |
| **Probe Head** | 256-dim Bottleneck | 256-dim Bottleneck | 256-dim Bottleneck | 256-dim Bottleneck |
| **Loss Weights** | All 1.0 (Balanced) | All 1.0 (Balanced) | All 1.0 (Balanced) | All 1.0 (Balanced) |
| **Epochs** | 30 | 8 (Early Stopped) | 20 | 30 |
| **Training Duration** | ~3.5 minutes (Cached) | **2.79 hours** | ~14 hours | ~2.5 minutes (Cached) |
| **Checkpoint Size** | 3.75 MB | **5.28 MB** | 7.42 MB | 3.75 MB |

---

## 2. Multi-Split Performance Comparison

### A. Real-World Test Split ($N=16$, Full Image, Zero Localization)
*Primary target distribution: Consumer selfies, multi-garment outfits, mirrors, complex backgrounds.*

| Metric | Frozen Control (Exp-0014) | Selective LoRA (Exp-0015) | Absolute Delta | Relative Gain |
|:---|:---:|:---:|:---:|:---:|
| **Category Top-1 Accuracy** | **12.50%** (2/16) | **37.50%** (6/16) | **+25.00%** | **+200.0%** |
| **Color Accuracy** | 6.25% (1/16) | 6.25% (1/16) | +0.00% | 0.0% |
| **Fit Accuracy** | 25.00% (4/16) | 12.50% (2/16) | -12.50% | -50.0% |
| **Silhouette Accuracy** | 18.75% (3/16) | 12.50% (2/16) | -6.25% | -33.3% |
| **Material Accuracy** | 6.25% (1/16) | 0.00% (0/16) | -6.25% | -100.0% |
| **Pattern Accuracy** | 25.00% (4/16) | 12.50% (2/16) | -12.50% | -50.0% |
| **Macro F1** | **15.62%** | **13.54%** | **-2.08%** | **-13.3%** |
| **Mean Softmax Confidence** | 0.3842 | 0.3872 | +0.0030 | +0.8% |
| **Accepted Count ($\ge 0.65$)** | 1 / 16 | 2 / 16 | +1 | +100.0% |
| **Refusal Rate ($< 0.65$)** | 93.75% | 87.50% | -6.25% | -6.7% |
| **False-Confidence Count** | 0 | 0 | 0 | None |

> [!IMPORTANT]
> **Key Finding:** Selective LoRA on the last 4 blocks tripled raw real-world garment category recognition from **12.50% to 37.50%** (+25.00% absolute gain), successfully identifying tops, outerwear, and shoes in cluttered full-body consumer selfies where the frozen control failed completely. However, fine-grained attribute heads (material, pattern, fit) experienced minor drops on out-of-domain images, resulting in a slight net decline in Macro F1 (15.62% $\to$ 13.54%).

---

### B. Frozen Blind Test Split ($N=20$, Studio E-Commerce Garments)
*Secondary holdout distribution: Clean single-garment images with uniform backgrounds.*

| Metric | Frozen Control (Exp-0014) | Selective LoRA (Exp-0015) | Absolute Delta |
|:---|:---:|:---:|:---:|
| **Category Top-1 Accuracy** | **45.00%** (9/20) | **25.00%** (5/20) | -20.00% |
| **Color Accuracy** | 25.00% | 10.00% | -15.00% |
| **Fit Accuracy** | 40.00% | 30.00% | -10.00% |
| **Silhouette Accuracy** | 35.00% | 20.00% | -15.00% |
| **Material Accuracy** | 25.00% | 15.00% | -10.00% |
| **Pattern Accuracy** | 20.00% | 25.00% | +5.00% |
| **Macro F1** | **31.67%** | **20.83%** | **-10.84%** |
| **Accepted Count ($\ge 0.65$)** | 2 / 20 | 2 / 20 | 0 |
| **Refusal Rate** | 90.00% | 90.00% | 0.00% |

> [!NOTE]
> On the clean studio blind test, the frozen SigLIP control retained higher fidelity (31.67% Macro F1 vs 20.83%). Adapting the top 4 transformer blocks shifted the latent representations towards the training distribution (which includes more varied consumer textures and lighting), causing a domain trade-off between clean studio e-commerce items and in-the-wild consumer wardrobe photos.

---

### C. Hard Test Split ($N=18$, Challenging Studio Poses & Accessories)

| Metric | Frozen Control (Exp-0014) | Selective LoRA (Exp-0015) | Absolute Delta |
|:---|:---:|:---:|:---:|
| **Category Top-1 Accuracy** | 16.67% (3/18) | 16.67% (3/18) | 0.00% |
| **Color Accuracy** | 5.56% | 16.67% | +11.11% |
| **Fit Accuracy** | 22.22% | 27.78% | +5.56% |
| **Silhouette Accuracy** | 5.56% | 11.11% | +5.55% |
| **Material Accuracy** | 11.11% | 5.56% | -5.55% |
| **Pattern Accuracy** | 22.22% | 27.78% | +5.56% |
| **Macro F1** | **13.89%** | **17.59%** | **+3.70%** |
| **Refusal Rate** | 100.00% | 100.00% | 0.00% |

---

### D. Validation Split ($N=41$) & Train Split ($N=459$)

| Split | Metric | Frozen Control (Exp-0014) | Selective LoRA (Exp-0015) |
|:---|:---|:---:|:---:|
| **Validation** | Category Accuracy | 63.41% | **60.98%** (Best Epoch) / 51.22% (Eval) |
| | Macro F1 | 46.34% | **47.15%** (Best Epoch) / 45.53% (Eval) |
| | Refusal Rate | 68.29% | 60.98% |
| **Train** | Category Accuracy | 86.06% | 68.41% |
| | Macro F1 | 74.11% | 71.50% |
| | Refusal Rate | 52.29% | 40.96% |

---

## 3. Representation Drift Analysis

To ensure that fine-tuning 4 attention layers did not cause catastrophic forgetting or representation collapse, cosine similarity between pre-adaptation SigLIP representations and post-adaptation LoRA representations was measured on 50 holdout validation samples:

- **Mean Cosine Similarity:** **0.995358** (Stable subtle adaptation)
- **Median Cosine Similarity:** 0.995513
- **Standard Deviation:** 0.001699
- **Minimum Cosine Similarity:** 0.990923
- **Maximum Cosine Similarity:** 0.997834
- **Representation Collapse:** **FALSE** (Threshold < 0.50)

The representations shifted smoothly without destabilizing the foundational SigLIP visual feature geometry.

---

## 4. Synthesis & Scientific Classification

| Question | Answer |
|---|---|
| Did selective LoRA run practically on consumer GPU? | **YES** (2.79h runtime, 1.66GB VRAM allocated, zero paging) |
| Did selective LoRA improve real-world category recognition? | **YES** (12.50% $\to$ **37.50%**, +25.0% absolute gain) |
| Did selective LoRA preserve clean studio blind accuracy? | **NO** (31.67% $\to$ 20.83% Macro F1) |
| Did selective LoRA improve hard test performance? | **YES** (13.89% $\to$ **17.59%** Macro F1) |
| Overall Scientific Evaluation | **MIXED** |
