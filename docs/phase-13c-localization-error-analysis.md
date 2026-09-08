# AURA — Phase 13C Localization Error Analysis
## Analysis of Localization Failures, Occlusions, and Spatial Proposal Boundaries

## 1. Overview

This document categorizes the primary localization and classification failure modes identified when proposing garment regions and evaluating cropped images from `real_world_test`.

---

## 2. Localization & Proposal Failure Taxonomy

### 2.1 Spatial Boundary Errors
- **Small Accessory Camouflage:** Items like sunglasses (`garm_v3_160`) or jewellery are too small (<10% of frame) for broad spatial heuristics and require high-resolution feature attention.
- **Extreme Aspect Ratios:** Trench coats and maxi dresses span from shoulders to ankles ($>80\%$ vertical height), overlapping both upper and lower body zones.

### 2.2 Occlusion and Multi-Layer Overlap
- **Layered Garments:** When a jacket is unzipped over a shirt (`garm_v3_156`), both garments share the upper-torso region $[0.15, 0.15, 0.70, 0.50]$, making non-semantic bounding boxes insufficient without user region selection or multi-label head support.

### 2.3 Image Lighting and Domestic Environment
- **Mirror Reflection & Glare:** Flash reflections in mirror selfies distort color histograms and patch embeddings.
- **Low Illumination:** Dark rooms cause black/navy/grey pants to blend into background shadows.

---

## 3. Recommended Production Integration Flow

```
Full User Photo
      ↓
Heuristic / Attention Region Proposal (Top-3 Zones)
      ↓
User Confirmation / Interactive Bounding Box Tap
      ↓
Normalized Oracle Crop
      ↓
AURA Garment Model (LoRA Adapted)
      ↓
Multi-Task Attribute Extraction (Category, Fit, Color, Material)
```
