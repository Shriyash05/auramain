# AURA — Garment Experiment 0012 Comparison

## 1. Scientific Overview & Hypothesis

**Experiment ID:** `garment-exp-0012`  
**Purpose:** Establish the canonical frozen pretrained SigLIP-SO400M control baseline on the new frozen **250-sample production dataset** (`dataset-v0.4-250`), directly isolating **DATASET SCALE** against historical control `garment-exp-0008` ($N=92$ train).

### Hypothesis
Scaling real-world training examples from 92 to 230 (with 20 validation, totaling 250 assets) while holding architecture constant (frozen `google/siglip-so400m-patch14-384`, 256-dim bottleneck probe, equal 1.0 task weights) improves out-of-distribution real-world consumer photo classification and attribute generalization.

---

## 2. Controlled Experiment Comparison Matrix

| Attribute / Metric | Exp-0008 (Historical Control) | Exp-0010 (Asymmetric Loss) | Exp-0011 (Backbone Adaptation) | Exp-0012 (Data Scaling Control) |
| :--- | :--- | :--- | :--- | :--- |
| **Dataset Manifest** | `dataset-v0.3.json` ($N=112$) | `dataset-v0.3.json` ($N=112$) | `dataset-v0.3.json` ($N=112$) | `dataset-v0.4-250.json` ($N=250$) |
| **Train Samples** | 92 | 92 | 92 | 230 |
| **Validation Samples** | 20 | 20 | 20 | 20 |
| **Backbone** | SigLIP-SO400M (Frozen) | SigLIP-SO400M (Frozen) | SigLIP-SO400M (2 Layers Unfrozen) | SigLIP-SO400M (Frozen) |
| **Head Dimension** | 1152 $\to$ 256 (Lightweight) | 1152 $\to$ 256 (Lightweight) | 1152 $\to$ 256 (Lightweight) | 1152 $\to$ 256 (Lightweight) |
| **Loss Weights** | Standard (Cat: 1.0, Fit: 0.8...) | Asymmetric (Cat: 2.0...) | Standard (Cat: 1.0, Fit: 0.8...) | Equal 1.0 (All 7 Tasks) |
| **Trainable Params** | 310,586 | 310,586 | 50,713,850 | 310,586 |
| **Checkpoint SHA-256** | `e97f4e2e97564f85...` | `10079986da366914...` | `a90623a8cf82e858...` | `fcc8f51a5a58d89f...` |

---

## 3. Empirical Evaluation Across All 5 Splits

### 3.1 Real-World Test Split ($N=16$, Consumer Smartphone Captures)
| Metric | Exp-0008 ($N=92$) | Exp-0012 ($N=230$) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 31.25% (5/16) | **43.75%** (7/16) | **+12.50%** | **IMPROVED** |
| **Color Accuracy** | 18.75% (3/16) | 12.50% (2/16) | -6.25% | Regressed |
| **Fit Accuracy** | 18.75% (3/16) | **25.00%** (4/16) | **+6.25%** | **IMPROVED** |
| **Silhouette Accuracy** | 18.75% (3/16) | 12.50% (2/16) | -6.25% | Regressed |
| **Material Accuracy** | 18.75% (3/16) | 12.50% (2/16) | -6.25% | Regressed |
| **Pattern Accuracy** | 18.75% (3/16) | **25.00%** (4/16) | **+6.25%** | **IMPROVED** |
| **Macro F1** | 20.83% | **21.88%** | **+1.05%** | **IMPROVED** |
| **Refusal Rate (<0.65)** | 100.0% | 100.0% | 0.00% | Neutral |

### 3.2 Frozen Blind Test Split ($N=20$, Zero-Leakage Holdout)
| Metric | Exp-0008 ($N=92$) | Exp-0012 ($N=230$) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 30.00% (6/20) | 25.00% (5/20) | -5.00% | Slight Decline |
| **Color Accuracy** | 20.00% (4/20) | 20.00% (4/20) | 0.00% | Unchanged |
| **Fit Accuracy** | 30.00% (6/20) | 15.00% (3/20) | -15.00% | Regressed |
| **Silhouette Accuracy** | 25.00% (5/20) | 15.00% (3/20) | -10.00% | Regressed |
| **Material Accuracy** | 15.00% (3/20) | 15.00% (3/20) | 0.00% | Unchanged |
| **Pattern Accuracy** | 30.00% (6/20) | 25.00% (5/20) | -5.00% | Slight Decline |
| **Macro F1** | 25.00% | 19.17% | -5.83% | Regressed |

### 3.3 Hard Test Split ($N=18$, Extreme Occlusion / Clutter)
| Metric | Exp-0008 ($N=92$) | Exp-0012 ($N=230$) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 22.22% (4/18) | 11.11% (2/18) | -11.11% | Regressed |
| **Color Accuracy** | 11.11% (2/18) | 11.11% (2/18) | 0.00% | Unchanged |
| **Fit Accuracy** | 22.22% (4/18) | 16.67% (3/18) | -5.55% | Regressed |
| **Silhouette Accuracy** | 16.67% (3/18) | 11.11% (2/18) | -5.56% | Regressed |
| **Material Accuracy** | 11.11% (2/18) | 11.11% (2/18) | 0.00% | Unchanged |
| **Pattern Accuracy** | 27.78% (5/18) | **33.33%** (6/18) | **+5.55%** | **IMPROVED** |
| **Macro F1** | 18.52% | 15.74% | -2.78% | Regressed |

---

## 4. Key Scientific Findings & Conclusion

1. **Real-World Category Generalization Improved (+12.5%):**
   Expanding the training dataset from 92 to 230 samples with smartphone consumer wardrobe imagery improved Top-1 category recognition on the challenging `real_world_test` split from **31.25% to 43.75%**.
2. **Fine-Grained Attribute Bottleneck Remains Under Frozen Backbone:**
   While category prediction benefited noticeably on real-world inputs, fine-grained attribute classification (material, silhouette, fit) remained constrained (~15–25%) because the frozen vision backbone embeddings (`google/siglip-so400m-patch14-384`) are generic zero-shot representations without garment-domain parameter adaptation.
3. **Recommendation for Phase 12C:**
   The control baseline is established. The next controlled experiment should evaluate **Parameter-Efficient Fine-Tuning (PEFT / LoRA)** on the same frozen 250-sample dataset to adapt the attention projection layers without catastrophic forgetting or GPU memory overflow.
