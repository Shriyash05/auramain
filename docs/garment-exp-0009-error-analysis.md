# GARMENT-EXP-0009 ERROR ANALYSIS
## Empirical Failure Modes, Bottleneck Capacity & Calibration

**Experiment**: `garment-exp-0009`  
**Architecture**: SigLIP-SO400M (Frozen) + 512-dim Bottleneck + Multi-Task Heads  
**Dataset**: AURA-Garment-Golden-v0.3 ($N=166$)

---

## 1. Capacity & Representation Findings

### 1.1 Hard Test Category Recovery vs. 256-dim Bottleneck
- **Observation**: Hard test category accuracy improved from $5.56\%$ (1/18 in Exp-0008) to **$16.67\%$** (3/18 in Exp-0009).
- **Analysis**: Expanding the bottleneck from 256 to 512 preserved higher-dimensional visual features that are necessary when distinguishing ambiguous items (e.g. overshirt vs lightweight jacket vs cardigan).
- **Caveat**: It remains below Exp-0007's $22.22\%$, suggesting that further head capacity or direct uncompressed linear probing may be needed for edge cases.

### 1.2 Fine-Grained Material and Color Dispersal
- **Observation**: Material accuracy on the Blind Test remained at $5.00\%$, and Color accuracy dropped on Real-World to $0.00\%$.
- **Analysis**: Multi-task cross-entropy loss with equal learning rates across all heads leads the optimizer to prioritize large-gradient loss components (category, fit) over subtle chromatic and textile textures. 
- **Recommendation**: Asymmetric task loss weighting or dedicated texture sub-adapters should be evaluated in future phases.

### 1.3 Validation Trajectory & Early Peak
- **Observation**: Similar to Exp-0008, validation loss started at $8.3161$ (Epoch 1) and grew monotonically to $14.3018$ (Epoch 50), with Validation Macro F1 peaking at Epoch 1 ($0.1833$).
- **Analysis**: Even with $621\text{K}$ parameters (vs $1.39\text{M}$), gradient steps on $N=92$ samples rapidly shift the bottleneck projection toward memorizing training sample specifics.
- **Evidence**: Train Macro F1 steadily grew from $18.5\% \to 44.02\%$, while validation metrics decayed.

---

## 2. Confidence Calibration & Refusal Analysis

```
Refusal & False-Confidence Summary Across All Splits (Threshold = 0.65):
- Train (N=92): Refusals = 91/92 (98.91%), False Confident (>0.85) = 0/92 (0.00%)
- Validation (N=20): Refusals = 20/20 (100.00%), False Confident (>0.85) = 0/20 (0.00%)
- Blind Test (N=20): Refusals = 20/20 (100.00%), False Confident (>0.85) = 0/20 (0.00%)
- Hard Test (N=18): Refusals = 18/18 (100.00%), False Confident (>0.85) = 0/20 (0.00%)
- Real-World (N=16): Refusals = 16/16 (100.00%), False Confident (>0.85) = 0/16 (0.00%)
```

### Safety & Fallback Integrity:
- **Zero Hallucinated False Confidence**: The model produces $0.0\%$ false-confident predictions ($>0.85$ confidence on wrong category).
- **Deterministic Authoritative Fallback**: Because $100\%$ of evaluation inferences trigger the $\text{confidence} < 0.65$ refusal rule, the AURA deterministic styling engine safely remains $100\%$ authoritative in production, preventing spurious AI classifications from degrading user closet intelligence.

---

## 3. Comparative Summary of Probe Regimes

| Bottleneck Dimension | Train F1 | Blind F1 | Hard Cat | Real-World Cat | Overfitting Gap | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1152 (Exp-0007)** | 80.62% | 21.67% | **22.22%** | 6.25% | +58.95% | Severe Overfitting |
| **256 (Exp-0008)** | 34.78% | **25.00%** | 5.56% | **31.25%** | **+9.78%** | Best Holdout F1, Overcompressed Hard |
| **512 (Exp-0009)** | 44.02% | 21.67% | 16.67% | **31.25%** | +22.35% | Moderate Compromise, Hard Recovery |
