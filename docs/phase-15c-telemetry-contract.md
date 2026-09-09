# AURA Phase 15C — Production Rollout Telemetry Contract

## 1. Executive Summary & Privacy Principles
Phase 15C instruments the production wardrobe garment creation flow with privacy-preserving telemetry to measure model performance, confidence gate behavior, and user interactions without uploading, storing, or inspecting user photos.

### Strict Privacy Guarantee
- **Zero Raw Images**: No image pixels, file URIs, local paths, base64 strings, EXIF metadata, or crop bitmaps are ever transmitted or recorded.
- **Zero PII**: No user identifiers, names, locations, or personal attributes.
- **Coarse Bucketing**: Continuous values (confidence, latency, aspect ratios) are mapped into privacy-preserving discrete buckets.
- **Observational Only**: Telemetry is used exclusively to observe production system behavior, not to automatically train models or auto-tune thresholds.

---

## 2. Event Specification

| Event Type | Trigger | Payload / Metadata |
| :--- | :--- | :--- |
| `GARMENT_IMAGE_SELECTED` | User selects or snaps a photo | `image_orientation` (`portrait`, `landscape`, `square`) |
| `GARMENT_SELECTION_STARTED` | GarmentRegionSelector opens | `image_orientation` |
| `GARMENT_SELECTION_CONFIRMED`| User confirms crop bounding box | `selection_method`, `crop_aspect_ratio_bucket` |
| `GARMENT_SELECTION_CANCELED` | User cancels or retakes photo | `error_code: 'USER_CANCELLED'` |
| `GARMENT_SELECTION_RESET` | User taps Reset CTA | Standard metadata |
| `GARMENT_SUGGESTION_SHOWN` | Automatic heuristic chips rendered | `suggestion_count` |
| `GARMENT_SUGGESTION_ACCEPTED`| User taps a suggestion chip | `selection_method: 'suggested'`, `category_predicted` |
| `GARMENT_SUGGESTION_OVERRIDDEN`| User manually adjusts suggestion | `selection_method: 'suggested_then_manual'` |
| `GARMENT_CROP_CREATED` | CropService applies 5% padding | `crop_aspect_ratio_bucket` |
| `GARMENT_INFERENCE_STARTED` | Inference requested through router | `inference_mode`, `selection_method` |
| `GARMENT_INFERENCE_SUCCESS` | Model returns classification | `result_status: 'SUCCESS'`, `production_accepted`, `confidence_bucket`, `latency_bucket`, `category_predicted` |
| `GARMENT_INFERENCE_REFUSED` | Confidence < 0.65 threshold | `result_status: 'REFUSED'`, `production_accepted: false`, `confidence_bucket`, `latency_bucket` |
| `GARMENT_INFERENCE_ERROR` | Network/runtime/model failure | `result_status: 'ERROR'`, `error_code`, `latency_bucket` |
| `GARMENT_SAVE_SUCCESS` | Garment saved to closet | `has_inferred_attributes: boolean` |
| `GARMENT_PREDICTION_FEEDBACK`| User voluntary feedback | `feedback: 'CORRECT' \| 'INCORRECT' \| 'NOT_SURE'` |

---

## 3. Metadata Bucketing Schemes

### Confidence Buckets
- `<0.25`
- `0.25-0.49`
- `0.50-0.64` (Refusal range)
- `0.65-0.79` (Production Accepted range)
- `0.80-0.89`
- `>=0.90`

### Latency Buckets
- `<250ms`
- `250-500ms`
- `500-1000ms`
- `1-2s`
- `>2s`

### Error Taxonomy
- `INVALID_IMAGE`
- `INVALID_CROP`
- `MODEL_UNAVAILABLE`
- `MODEL_LOAD_ERROR`
- `INFERENCE_TIMEOUT`
- `INFERENCE_ERROR`
- `SAVE_ERROR`
- `USER_CANCELLED`

---

## 4. Model Governance & Version Tagging
Every telemetry event generated during inference carries:
- `model_version: "aura-garment-v1-exp0015"`
- Model governance status: `EXPERIMENTAL`
- Production gate: `< 0.65` strictly enforced.
