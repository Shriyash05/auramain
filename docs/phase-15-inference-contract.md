# AURA — Phase 15 Production Inference Contract

## 1. Typed Request & Result Specification

### `GarmentSelection`
Defines the user's validated target garment region:
```typescript
interface GarmentSelection {
  imageUri: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  coordinateSpace: 'normalized' | 'pixel' | 'display';
  sourceWidth: number;
  sourceHeight: number;
  cropPadding: number; // Default: 0.05 (5%)
  selectionMethod: 'manual' | 'suggested';
  timestamp: string;
}
```

### `GarmentInferenceRequest`
```typescript
interface GarmentInferenceRequest {
  imageUri: string;
  selection: GarmentSelection;
  modelVersion: string; // 'aura-garment-v1-exp0015'
  inferenceMode: 'full_image' | 'manual_crop' | 'suggested_crop';
}
```

### `GarmentInferenceResult`
```typescript
interface GarmentInferenceResult {
  status: 'SUCCESS' | 'REFUSED' | 'ERROR';
  category: AuraCategory | 'unknown';
  confidence: number;
  attributes: GarmentAttributesPayload;
  modelVersion: string;
  selectionMethod: SelectionMethod;
  bbox: BoundingBoxCoordinates;
  latency: {
    crop_ms: number;
    inference_ms: number;
    total_ms: number;
  };
  refusalReason?: string;
  error?: string;
}
```

---

## 2. Crop Safety & Coordinate Rules

1. **Explicit Coordinate Spaces**:
   - `normalized`: All coordinates are in $[0, 1]$ relative to source width and height.
   - `pixel`: Absolute coordinates in $[0, \text{sourceWidth}]$ and $[0, \text{sourceHeight}]$.
   - `display`: Scaled rendered bounds on the user interface screen.
2. **Bounds Clamping**:
   - `x >= 0`, `y >= 0`, `width >= 0.01`, `height >= 0.01`
   - `x + width <= 1.0`, `y + height <= 1.0`
3. **Proportional Padding Margin**:
   - Principled default of **5%** padding margin applied uniformly around the target box to preserve boundary context (e.g. collars, hemlines) without adding excessive background noise.

---

## 3. Model Governance & Production Status

- **Active Inference Checkpoint**: `garment-exp-0015` (Selective LoRA on final 4 transformer blocks of SigLIP-SO400M + 256-dim classification head).
- **Production Status**: `EXPERIMENTAL`.
- **Confidence Gate**: Threshold = **0.65**. Any category prediction with confidence $< 0.65$ triggers `status: 'REFUSED'` with category `'unknown'`, completely blocking attribute fabrication.
- **Deterministic Fallback**: If GPU serverless or ML routing fails, the system safely falls back to local deterministic rule-based processing.
