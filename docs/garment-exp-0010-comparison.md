# GARMENT EXPERIMENT MULTI-STAGE COMPARISON
## garment-exp-0008 (Control) vs garment-exp-0010 (Loss-Weighted)

**Scope**: Direct controlled comparison of equal loss weighting (`garment-exp-0008`) against asymmetric loss weighting (`garment-exp-0010`), with historical reference to `garment-exp-0007` (1152-dim) and `garment-exp-0009` (512-dim).

---

## 1. Direct Controlled Comparison Matrix (Exp-0008 vs Exp-0010)

Both models share the **exact same architecture** and hyperparameters:
- Backbone: `google/siglip-so400m-patch14-384` (Frozen)
- Bottleneck Dimension: 256
- Trainable Parameters: **310,586**
- Head Dropout: 0.3, Weight Decay: 0.05, Learning Rate: 0.0005, Batch Size: 8, Epochs: 50

| Metric / Dimension | Exp-0008 (Equal/Baseline Weights) | Exp-0010 (Asymmetric Loss Weights) | Delta ($\Delta$) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Loss Weights $[w_{\text{cat}}, w_{\text{fit}}, w_{\text{sil}}, w_{\text{col}}, w_{\text{pat}}, w_{\text{mat}}, w_{\text{for}}]$** | $[1.0, 0.8, 0.6, 0.8, 0.5, 0.6, 0.4]$ | $[1.0, 0.75, 0.75, 1.25, 1.10, 1.50, 0.75]$ | Asymmetric shift | CONTROLLED |
| **Validation Macro F1** | 18.33% | **20.83%** | **+2.50%** | MEASURED |
| **Frozen Blind Macro F1** | **25.00%** | 18.33% | -6.67% | MEASURED |
| **Blind Category Top-1** | **30.00% (6/20)** | 20.00% (4/20) | -10.00% (-2 items) | MEASURED |
| **Blind Color Accuracy** | **20.00% (4/20)** | 15.00% (3/20) | -5.00% (-1 item) | MEASURED |
| **Blind Fit Accuracy** | **30.00% (6/20)** | 20.00% (4/20) | -10.00% (-2 items) | MEASURED |
| **Blind Silhouette Acc** | **25.00% (5/20)** | 15.00% (3/20) | -10.00% (-2 items) | MEASURED |
| **Blind Material Acc** | **15.00% (3/20)** | 10.00% (2/20) | -5.00% (-1 item) | MEASURED |
| **Blind Pattern Acc** | **30.00% (6/20)** | **30.00% (6/20)** | **0.00% (Tied)** | MEASURED |
| **Hard Category Top-1** | 5.56% (1/18) | 5.56% (1/18) | **0.00% (Tied)** | MEASURED |
| **Hard Macro F1** | **13.89%** | 12.96% | -0.93% | MEASURED |
| **Real-World Category Top-1** | **31.25% (5/16)** | 25.00% (4/16) | -6.25% (-1 item) | MEASURED |
| **Real-World Material Acc** | 18.75% (3/16) | **25.00% (4/16)** | **+6.25% (+1 item)** | MEASURED |
| **Real-World Macro F1** | **20.83%** | **20.83%** | **0.00% (Tied)** | MEASURED |
| **Train Macro F1** | 34.78% | 34.60% | -0.18% | MEASURED |
| **Train-Blind Gap** | **+9.78%** | **+16.27%** | +6.49% | MEASURED |

---

## 2. Broader Historical Context (Exp-0007 through Exp-0010)

| Metric | Exp-0007 (1152-dim) | Exp-0008 (256-dim) | Exp-0009 (512-dim) | Exp-0010 (256-dim LW) | Best Candidate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trainable Parameters** | 1,397,434 | **310,586** | 621,114 | **310,586** | Exp-0008 / Exp-0010 |
| **Validation Macro F1** | 16.67% | 18.33% | 18.33% | **20.83%** | **Exp-0010** |
| **Blind Macro F1** | 21.67% | **25.00%** | 21.67% | 18.33% | **Exp-0008** |
| **Blind Category Top-1** | **35.00%** | 30.00% | 30.00% | 20.00% | **Exp-0007** |
| **Hard Category Top-1** | **22.22%** | 5.56% | 16.67% | 5.56% | **Exp-0007** |
| **Real-World Category** | 6.25% | **31.25%** | **31.25%** | 25.00% | **Exp-0008 / Exp-0009** |
| **Real-World Material** | 6.25% | 18.75% | 0.00% | **25.00%** | **Exp-0010** |
| **Real-World Macro F1** | 12.50% | **20.83%** | 13.54% | **20.83%** | **Exp-0008 / Exp-0010** |

---

## 3. Key Findings

1. **Tradeoff on Fine-Grained vs Primary Category**: Upweighting material ($1.5\times$) produced a positive response on the Real-World split (Material accuracy rose to $25.00\%$), but at the cost of overall primary Category Top-1 on the Blind Test ($30.00\% \to 20.00\%$).
2. **Validation F1 Peak**: Exp-0010 achieved the highest validation Macro F1 to date (**$20.83\%$** vs $18.33\%$). However, holdout blind generalization dropped from $25.00\% \to 18.33\%$, suggesting that prioritizing multi-head fine-grained cross-entropy losses slightly increases training-set specific alignment.
3. **Best Blind Model Remains Exp-0008**: `garment-exp-0008` retains the strongest overall blind test Macro F1 ($25.00\%$) and Category Top-1 ($30.00\%$).
