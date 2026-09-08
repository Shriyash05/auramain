# AURA — Phase 14A Proposal Set & Reranking Analysis

## 1. Multi-Proposal Coverage Analysis

The heuristic localization service produces 4 canonical proposals per image:
1. `proposal_1`: Tops / Outerwear (`[0.10, 0.10, 0.80, 0.45]`, confidence 0.85)
2. `proposal_2`: Bottoms (`[0.15, 0.45, 0.70, 0.40]`, confidence 0.80)
3. `proposal_3`: Shoes (`[0.20, 0.80, 0.60, 0.18]`, confidence 0.75)
4. `proposal_4`: One-Piece / Full Outfit (`[0.05, 0.05, 0.90, 0.90]`, confidence 0.70)

### Top-K Coverage Against Target Garments ($N=16$)

| Proposal Set | IoU $\ge 0.30$ Coverage | IoU $\ge 0.50$ Coverage | IoU $\ge 0.70$ Coverage | Best Match Rank Frequency |
| :--- | :---: | :---: | :---: | :---: |
| **Top-1** | 50.0% (8 / 16) | 43.8% (7 / 16) | 12.5% (2 / 16) | Rank 1: 6 samples (37.5%) |
| **Top-2** | 81.3% (13 / 16) | 68.8% (11 / 16) | 12.5% (2 / 16) | Rank 2: 4 samples (25.0%) |
| **Top-3** | 93.8% (15 / 16) | 81.3% (13 / 16) | 12.5% (2 / 16) | Rank 3: 3 samples (18.8%) |
| **Top-4** | 93.8% (15 / 16) | 81.3% (13 / 16) | 25.0% (4 / 16) | Rank 4: 3 samples (18.8%) |

Expanding from Top-1 to Top-3 nearly doubles target garment coverage at $\text{IoU} \ge 0.50$ from **43.8% to 81.3%**, because the target garment is distributed evenly across upper body, lower body, and footwear.

---

## 2. Classifier-as-Reranker Evaluation

Without retraining, we tested feeding all Top-K candidate crops through the Exp-0016 classifier and choosing the proposal with the highest predicted category confidence:

| Inference Pipeline | Real-World Category Accuracy | Accepted Count ($\ge 0.65$) | False Confidence ($>0.85$) |
| :--- | :---: | :---: | :---: |
| **Full Image Baseline** | **37.50% (6 / 16)** | 2 / 16 | 0.0% |
| **Oracle Crop (Upper Bound)** | **31.25% (5 / 16)** | 2 / 16 | 0.0% |
| **Automated Top-1 Crop** | **31.25% (5 / 16)** | 2 / 16 | 0.0% |
| **Classifier-Reranked Top-2** | **31.25% (5 / 16)** | 2 / 16 | 0.0% |
| **Classifier-Reranked Top-3** | **25.00% (4 / 16)** | 2 / 16 | 0.0% |

### Why Did Reranking Degrade Accuracy from 31.25% to 25.00%?
The Exp-0016 classification head was trained to output class probabilities conditioned on cropped images of clothes. It has **no awareness of bounding box quality or user intent**. 
When given a cropped shoe or pant leg, the classifier frequently outputs a false-confident prediction (e.g. 0.62 probability for "outerwear" on a textured fabric patch), which overrides the actual top-body target garment.

---

## 3. Crop Geometry Diagnostic (Padding Analysis)

| Padding Level | Oracle Crop Accuracy | Best Auto Proposal Accuracy |
| :--- | :---: | :---: |
| **Tight (0% padding)** | 31.25% | **31.25%** |
| **+5% Padding** | 37.50% | 25.00% |
| **+10% Padding** | 37.50% | 31.25% |
| **+15% Padding** | 37.50% | 31.25% |

Adding 5–15% padding helped oracle crops by preserving collar and sleeve context, but degraded automated crops by incorporating adjacent garments and messy backgrounds. A tight bounding box or modest +5% padding remains the principled recommendation.
