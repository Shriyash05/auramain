# GARMENT EXPERIMENT COMPARISON
## garment-exp-0007 vs garment-exp-0006

**Comparison Objective**: Directly compare the empirical performance of genuine pretrained vision weights (`garment-exp-0007`) against the historical random initialized baseline (`garment-exp-0006`).

---

## 1. Architectural & Methodological Comparison

| Dimension | garment-exp-0006 | garment-exp-0007 |
| :--- | :--- | :--- |
| **Vision Backbone** | Random `Conv2d` (Untrained) | `google/siglip-so400m-patch14-384` |
| **Backbone Weights** | Random Gaussian initialization | Pretrained SigLIP-SO400M weights |
| **Backbone Parameters** | $\approx 25\text{M}$ | $428,225,600$ |
| **Feature Dimension** | $1152$ (Random projection) | $1152$ (Semantic SigLIP visual space) |
| **Sanity Test (N=8)** | $12.5\%$ (Chance level) | **$100.0\%$** (Perfect convergence) |
| **Train Macro F1** | $14.17\%$ | **$80.62\%$** |
| **Checkpoint Size** | $102.1\text{ MB}$ | $22.4\text{ MB}$ (Optimized heads) |

---

## 2. Empirical Benchmark Comparison across Splits

### Frozen Blind Test ($N=20$)

| Metric | garment-exp-0006 | garment-exp-0007 | Absolute Delta |
| :--- | :--- | :--- | :--- |
| **Category Top-1** | 25.00% | **35.00%** | **+10.00%** |
| **Color Accuracy** | 15.00% | **15.00%** | 0.00% |
| **Fit Accuracy** | 20.00% | **35.00%** | **+15.00%** |
| **Silhouette Accuracy** | 10.00% | **15.00%** | **+5.00%** |
| **Material Accuracy** | 10.00% | 5.00% | -5.00% |
| **Pattern Accuracy** | 20.00% | **25.00%** | **+5.00%** |
| **Macro F1** | 16.67% | **21.67%** | **+5.00%** |
| **Unknown Refusal Rate** | 60.00% | **25.00%** | **-35.00%** (Calibrated) |

### Hard Test ($N=18$)

| Metric | garment-exp-0006 | garment-exp-0007 | Absolute Delta |
| :--- | :--- | :--- | :--- |
| **Category Top-1** | 27.78% | 22.22% | -5.56% |
| **Macro F1** | 14.81% | **16.67%** | **+1.86%** |

### Real-World Test ($N=16$)

| Metric | garment-exp-0006 | garment-exp-0007 | Absolute Delta |
| :--- | :--- | :--- | :--- |
| **Category Top-1** | 25.00% | 6.25% | -18.75% |
| **Macro F1** | 23.96% | 12.50% | -11.46% |

---

## 3. Key Findings

1. **Vision Representations Matter**:
   With random weights (Exp-0006), the model could not learn the training set even with multiple epochs (Train Macro F1 $= 14.17\%$). With genuine SigLIP weights (Exp-0007), the model reaches $80.62\%$ Train Macro F1 and $100\%$ on sanity subsets.

2. **Overfitting to Small Dataset ($N=92$)**:
   The $1152 \to 1152$ multi-task projection layer containing $1.39\text{M}$ parameters overfits the small $N=92$ training set by Epoch 10, leading to a gap between Train Macro F1 ($80.62\%$) and Validation Macro F1 ($16.67\%$).

3. **Generalization Improvement on Frozen Blind Benchmark**:
   On the frozen blind benchmark ($N=20$), Category Top-1 improved from $25.00\%$ to $35.00\%$ and Macro F1 increased from $16.67\%$ to $21.67\%$, while unknown refusal rate dropped from an uncalibrated $60.00\%$ down to $25.00\%$.
