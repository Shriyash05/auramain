# GARMENT-EXP-0008 ERROR ANALYSIS
## Empirical Failure Modes & Bottleneck Analysis

**Experiment**: `garment-exp-0008`  
**Architecture**: SigLIP-SO400M (frozen) + 256-dim bottleneck + lightweight heads  
**Dataset**: AURA-Garment-Golden-v0.3 (N=166)

---

## 1. Primary Failure Modes

### 1.1 Information Bottleneck Too Aggressive for Fine-Grained Attributes

The `1152 → 256` projection compresses visual representations by 78%. While this prevents overfitting, it may discard fine-grained texture and shape cues needed for:
- **Material** classification (cotton vs linen vs wool): Blind Test accuracy was only 15.00%
- **Hard Test category** classification: dropped to 5.56% (only 1/18 correct)

**Evidence**: The Hard Test Macro F1 (13.89%) was lower than Exp-0007 (16.67%), suggesting the bottleneck discards exactly the subtle cues needed for ambiguous garments.

### 1.2 Best Checkpoint at Epoch 1 — Underfitting the Task

The best validation Macro F1 (0.1833) was achieved at Epoch 1, before any meaningful gradient updates. This means:
- The initial random head weights, projected through SigLIP features, already perform at peak validation accuracy
- All 49 subsequent epochs only memorized the training set (train loss dropped from 9.20 to 1.56 while val loss rose from 8.37 to 12.29)
- The model **never learned** from the training data in a way that transferred to validation

**Root Cause**: With N=92 samples and 310K parameters, even the lightweight head has 3,376 parameters per sample — still far above the ~10:1 ratio typically recommended for small-dataset transfer learning.

### 1.3 Confidence Calibration: 100% Unknown Refusal Rate

Every single prediction across all splits had category confidence < 0.65 (the AURA refusal threshold). This means:
- The model is appropriately uncertain but completely non-deployable
- The softmax probabilities are spread nearly uniformly across classes
- In production, the deterministic fallback would handle 100% of inputs

---

## 2. Split-Level Error Analysis

### Blind Test (N=20) — Best Generalization Split

Category accuracy: 30.00% (6/20 correct). Pattern of errors:
- Color improved to 20.00% (from Exp-0007's 15.00%)
- Pattern improved to 30.00% (from Exp-0007's 25.00%)
- Silhouette improved to 25.00% (from Exp-0007's 15.00%)
- Material improved to 15.00% (from Exp-0007's 5.00%)

The lightweight probe distributes errors more evenly across tasks rather than concentrating capacity on category at the expense of fine-grained attributes.

### Hard Test (N=18) — Worst Regression

Category accuracy collapsed to 5.56% (1/18). The hard test contains visually ambiguous garments where subtle texture/shape cues differentiate categories. The aggressive bottleneck appears to lose these distinguishing features.

### Real-World Test (N=16) — Strongest Improvement

Category accuracy: 31.25% (5/16), up from Exp-0007's 6.25% (1/16). The lightweight probe handles domain shift (backgrounds, lighting, wrinkles) better because it doesn't memorize training-specific visual artifacts.

---

## 3. Recommendations for Future Experiments

1. **Try intermediate bottleneck dimensions** (512 or 384) to find the optimal compression-generalization tradeoff
2. **Feature-space augmentation**: Apply dropout/noise to cached embeddings during training to simulate data augmentation
3. **Linear probe baseline**: Try direct `Linear(1152, K)` without any projection layer to establish the simplest possible baseline
4. **Dataset expansion**: The fundamental bottleneck is N=92 training samples; all head architectures will overfit at this scale
5. **Multi-layer SigLIP features**: Use intermediate transformer layer outputs instead of only the final pooled embedding
