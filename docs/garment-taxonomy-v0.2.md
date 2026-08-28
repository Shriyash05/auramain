# AURA Master Garment Taxonomy Specification — Version 0.2

**Product:** AURA  
**Document:** Master Fashion Taxonomy, Hierarchical Structures & Ambiguity Rules  
**Version:** 0.2 (Phase 10B Update)  
**Status:** **ACTIVE TAXONOMY SPECIFICATION**  

---

## 1. Executive Summary & Root-Cause Resolutions

Phase 10 evaluation revealed three critical taxonomy boundary ambiguities:
1. **Oversized vs Relaxed:** In flat-lay or hanging garments without human body scale, distinguishing high-volume relaxed tailoring from intentional oversized cuts is visually fluid.
2. **Nylon vs Synthetic:** Nylon is a specific polymer subtype of synthetic performance textiles.
3. **Cream vs Off-White:** Studio lighting washes out warm undertones, leading to white vs cream label variance.

**Version 0.2 introduces Hierarchical Taxonomy Trees** and explicit **Ambiguity & Unknown Handling**.

---

## 2. Hierarchical Taxonomy Trees

### A. Fit Hierarchy
```text
Root Fit
├── Fitted (Body-contouring / tight)
├── Slim (Narrow cut, tailored close to limbs)
├── Regular (Standard classic proportions)
└── Relaxed (Comfort ease / generous cut)
    ├── Relaxed Classic (Casual drape)
    └── Oversized (Exaggerated drop-shoulder / exaggerated volume)
└── Unknown (Cannot be determined reliably from image)
```

### B. Material Hierarchy
```text
Root Material
├── Natural Fibers
│   ├── Cotton
│   ├── Linen
│   ├── Wool
│   ├── Cashmere
│   └── Silk
├── Leather & Suede
│   ├── Genuine Leather
│   ├── Suede
│   └── Vegan Leather
├── Synthetic / Technical (Super-Class)
│   ├── Nylon (Lightweight ripstop / technical weave)
│   ├── Polyester / Tech-Knit
│   └── Fleece / Performance Synthetic
└── Unknown / Unspecified
```

### C. Color Family Hierarchy
```text
Color Family
├── Neutrals Light
│   ├── Optic White
│   ├── Off-White / Ivory
│   └── Cream
├── Neutrals Dark
│   ├── Pitch Black
│   ├── Charcoal
│   └── Dark Grey
├── Earth Tones (Beige, Tan, Brown, Olive, Khaki)
├── Cool Tones (Navy, Slate Blue, Sky Blue, Forest Green)
└── Warm & Accent Tones (Red, Burgundy, Rust, Yellow, Orange, Pink, Purple, Multi)
```

---

## 3. Ambiguity & Unknown Refusal Policy

1. **Refusal Over Hallucination:** If visual evidence is insufficient (e.g. flat lay with ambiguous scale), the model returns `fit: "unknown"` with low confidence rather than forcing `fit: "Regular"`.
2. **Hierarchical Partial Credit in Evaluation:** Predicting the correct super-class (`synthetic` for `nylon`, or `relaxed` for `oversized`) receives calibrated partial credit (0.75x) in the benchmark evaluator.
