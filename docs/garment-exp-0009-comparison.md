# GARMENT EXPERIMENT THREE-WAY COMPARISON
## garment-exp-0007 vs garment-exp-0008 vs garment-exp-0009

**Scope**: Empirical comparison of three genuine pretrained SigLIP-SO400M probe architectures across three bottleneck capacity regimes.

---

## 1. Architectural & Capacity Dimensions

| Dimension | Exp-0007 (Full 1152-dim) | Exp-0008 (Bottleneck 256-dim) | Exp-0009 (Bottleneck 512-dim) |
| :--- | :--- | :--- | :--- |
| **Vision Backbone** | `google/siglip-so400m-patch14-384` | `google/siglip-so400m-patch14-384` | `google/siglip-so400m-patch14-384` |
| **Backbone Status** | Frozen Pretrained | Frozen Pretrained | Frozen Pretrained |
| **Projection Layer** | `Linear(1152, 1152)` | `Linear(1152, 256)` | `Linear(1152, 512)` |
| **Head Dimension** | 1152 | 256 | 512 |
| **Dropout** | 0.1 | 0.3 | 0.3 |
| **Weight Decay** | 0.01 | 0.05 | 0.05 |
| **Learning Rate** | 0.001 | 0.0005 | 0.0005 |
| **Trainable Params** | 1,397,434 | 310,586 | **621,114** |
| **Params / Sample ($N=92$)**| 15,190 | 3,376 | **6,751** |
| **Checkpoint Size** | 22.4 MB | 3.75 MB | **7.48 MB** |

---

## 2. Multi-Split Empirical Performance Comparison

### Frozen Blind Test ($N=20$)

| Metric | Exp-0007 (1152-dim) | Exp-0008 (256-dim) | Exp-0009 (512-dim) | Best Model |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | **35.00%** | 30.00% | 30.00% | Exp-0007 |
| **Color Accuracy** | 15.00% | **20.00%** | 15.00% | Exp-0008 |
| **Fit Accuracy** | 35.00% | 30.00% | **40.00%** | **Exp-0009** |
| **Silhouette Acc** | 15.00% | **25.00%** | 20.00% | Exp-0008 |
| **Material Acc** | 5.00% | **15.00%** | 5.00% | Exp-0008 |
| **Pattern Acc** | 25.00% | **30.00%** | 20.00% | Exp-0008 |
| **Macro F1** | 21.67% | **25.00%** | 21.67% | **Exp-0008** |
| **Unknown Refusal** | 25.00% | 100.00% | 100.00% | Calibrated (Exp-0007) |

### Hard Test ($N=18$) — Ambiguous / Fine-Grained Stress Test

| Metric | Exp-0007 (1152-dim) | Exp-0008 (256-dim) | Exp-0009 (512-dim) | Best Model |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | **22.22%** | 5.56% | **16.67%** | Exp-0007 |
| **Macro F1** | **16.67%** | 13.89% | 12.96% | Exp-0007 |

*Finding*: 512-dim partially recovers Category Top-1 on Hard Test ($16.67\%$ vs $5.56\%$), suggesting 256-dim was indeed too compressed for ambiguous silhouettes/cuts.

### Real-World Test ($N=16$) — Domain Shift Test

| Metric | Exp-0007 (1152-dim) | Exp-0008 (256-dim) | Exp-0009 (512-dim) | Best Model |
| :--- | :--- | :--- | :--- | :--- |
| **Category Top-1** | 6.25% | **31.25%** | **31.25%** | **Exp-0008 / Exp-0009** |
| **Macro F1** | 12.50% | **20.83%** | 13.54% | **Exp-0008** |

*Finding*: Both 256-dim and 512-dim probes achieve $31.25\%$ Category Top-1 on Real-World test (a $5\times$ improvement over Exp-0007's $6.25\%$).

### Overfitting Spectrum Analysis

| Metric | Exp-0007 (1152-dim) | Exp-0008 (256-dim) | Exp-0009 (512-dim) | Trend |
| :--- | :--- | :--- | :--- | :--- |
| **Train Macro F1** | 80.62% | 34.78% | 44.02% | Monotonic with params |
| **Blind Macro F1** | 21.67% | 25.00% | 21.67% | Peaks at 256-dim |
| **Train-Blind Generalization Gap** | **+58.95%** (Severe) | **+9.78%** (Controlled) | **+22.35%** (Moderate) | Intermediate gap |

---

## 3. Key Scientific Conclusions

1. **Tradeoff Verified**: Exp-0009's train-blind generalization gap ($+22.35\%$) sits right between Exp-0007 ($+58.95\%$) and Exp-0008 ($+9.78\%$), validating that head capacity directly dictates the memorization rate on $N=92$ samples.
2. **Hard-Test Recovery**: Expanding from 256 to 512 restored Hard Test category accuracy from $5.56\% \to 16.67\%$, supporting the hypothesis that 256-dim was discarding subtle structural cues.
3. **Real-World Category Generalization**: Both regularized probes (256-dim and 512-dim) maintain $31.25\%$ category accuracy on real-world photos vs $6.25\%$ for the unregularized Exp-0007 head.
4. **Validation Dynamics**: Across both Exp-0008 and Exp-0009, peak validation performance occurred at Epoch 1. On small sample regimes ($N=92$), multi-task gradient descent quickly overfits to idiosyncratic training artifacts.
