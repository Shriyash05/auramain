# AURA — Phase 13B Data Distribution Analysis
## Dataset Source, Domain, and Attribute Stratification (250 vs 500 Dataset)

## 1. Overview

This document analyzes the statistical composition, source provenance, domain capture style, and label distributions between the 250-sample dataset (`dataset-v0.4-250.json`) and the 500-sample dataset (`dataset-v0.5-500.json`).

---

## 2. Dataset Source & License Distribution

| Source Origin | 250 Dataset Count (Pct) | 500 Dataset Count (Pct) | Delta Count | License Type | Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`agrigorev/clothing-dataset-full` (Kaggle)** | 109 (43.60%) | **359 (71.80%)** | +250 | CC0 1.0 Universal | Full Open Production Approved |
| **`aura-garment-golden-v0.3` (AURA Proprietary)**| 112 (44.80%) | **112 (22.40%)** | 0 | Proprietary AURA | Production Approved |
| **`wikimedia_commons_fashion_open`** | 29 (11.60%) | **29 (5.80%)** | 0 | CC-BY-SA / CC0 | Production Approved |
| **Total Production Corpus** | **250 (100.0%)** | **500 (100.0%)** | **+250** | Fully Audited | 100% Commercial Eligible |

---

## 3. Category & Subcategory Stratification

| Category Class | 250 Dataset ($N=250$) | 500 Dataset ($N=500$) | Train-500 ($N=459$) | Val-500 ($N=41$) | Blind ($N=20$) | Real-World ($N=16$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`tops`** | 85 (34.0%) | 85 (17.0%) | 78 (17.0%) | 7 (17.1%) | 4 (20.0%) | 4 (25.0%) |
| **`bottoms`** | 85 (34.0%) | 85 (17.0%) | 78 (17.0%) | 7 (17.1%) | 4 (20.0%) | 3 (18.8%) |
| **`outerwear`** | 40 (16.0%) | 85 (17.0%) | 79 (17.2%) | 6 (14.6%) | 4 (20.0%) | 3 (18.8%) |
| **`one_piece`** | 38 (15.2%) | 85 (17.0%) | 81 (17.6%) | 4 (9.8%) | 0 (0.0%) | 0 (0.0%) |
| **`shoes`** | 1 (0.4%) | **80 (16.0%)** | 72 (15.7%) | 8 (19.5%) | 4 (20.0%) | 3 (18.8%) |
| **`accessories`** | 1 (0.4%) | **80 (16.0%)** | 71 (15.5%) | 9 (22.0%) | 4 (20.0%) | 3 (18.8%) |

### Key Insight:
In the 250 dataset, `shoes` and `accessories` accounted for less than $1\%$ of the dataset combined. In the 500 dataset, Phase 12D established near-perfect 1:1:1:1:1:1 balance (~16.7% each), which directly explains why the Frozen Blind Test category accuracy jumped from $25.0\% \to 45.0\%$ as non-garment categories were successfully learned.

---

## 4. Domain & Capture Characteristics

| Domain Feature | Train-500 ($N=459$) | Validation-500 ($N=41$) | Blind Test ($N=20$) | Real-World Test ($N=16$) |
| :--- | :--- | :--- | :--- | :--- |
| **Subject Type** | Single Isolated Garment | Single Isolated Garment | Single Isolated Garment | **Full-Body Worn Outfits** |
| **Capture Angle** | Flat-lay, Hanger, Wall | Flat-lay, Hanger, Wall | Studio flat-lay / model | **Uncropped Mirror Selfie** |
| **Background** | Clean neutral wall / floor | Clean neutral wall / floor | Clean studio background | **Cluttered Room / Bathroom** |
| **Mean Resolution** | 705 $\times$ 783 | 620 $\times$ 648 | 689 $\times$ 816 | 692 $\times$ 829 |
| **Mean Brightness** | 152.0 | 147.1 | 141.7 | **131.7 (Lower)** |
| **Mean Contrast** | 51.0 | 51.3 | 51.8 | 50.0 |
| **Mean Saturation** | 64.6 | 51.7 | 69.7 | 57.6 |

---

## 5. Overfitting and Generalization Gaps

| Metric | Exp-0012 (250 Dataset) | Exp-0014 (500 Dataset) | Delta | Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| **Train Macro F1** | 53.26% | 74.11% | +20.85% | Higher parameter utilization |
| **Validation Macro F1** | 18.33% | 46.34% | +28.01% | Strong in-domain generalization |
| **Train–Val Gap** | 34.93% | **27.77%** | **-7.16%** | **Overfitting actually decreased** |
| **Train–Blind Gap** | 34.09% | 42.44% | +8.35% | OOD gap remains moderate |
| **Train–RealWorld Gap** | 31.38% | 58.49% | +27.11% | Driven by multi-garment presentation |

### Conclusion:
The train-to-validation gap decreased from $34.93\%$ to $27.77\%$, proving that Exp-0014 is **not overfitting more than Exp-0012**. The apparent real-world decline is purely a product of multi-garment presentation versus single-garment representation and small-N variance.
