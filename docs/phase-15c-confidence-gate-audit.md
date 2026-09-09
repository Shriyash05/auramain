# AURA Phase 15C — Confidence Gate Audit Report

## 1. Objective & Gate Definition
The confidence gate protects user wardrobes from low-quality machine learning predictions and hallucinations.

### The Gate Rule
$$\text{Confidence} < 0.65 \implies \text{STATUS} = \text{REFUSED}$$

When refused:
1. Category is returned as `"unknown"`.
2. Attributes are strictly zeroed / cleared (no fabricated fit, material, or silhouette).
3. The UI presents an honest explanation:
   > "AURA could not confidently identify the garment."
4. Clear user actions are provided:
   - "Try a clearer crop"
   - "Retake photo"
   - "Continue manually"

---

## 2. Telemetry Funnel Audit

### Model Inference Success vs Production Acceptance
It is critical to distinguish between:
- **`MODEL_INFERENCE_SUCCESS`**: The model runtime executed and returned logits.
- **`PRODUCTION_ACCEPTED`**: The prediction exceeded the 0.65 threshold and was presented to the user.

A prediction with confidence $0.58$ is an inference success but a **production refusal**. Telemetry records:
- `event_type`: `GARMENT_INFERENCE_REFUSED`
- `production_accepted`: `false`
- `confidence_bucket`: `'0.50-0.64'`

### Conversion Funnel Formulation
```
images_selected
    ↓ (selection_conversion_pct)
selection_confirmed
    ↓
crop_created
    ↓
inference_started
    ↓ (inference_success_pct)
[ accepted  |  refused  |  error ]
    ↓ (save_conversion_pct)
saved_to_wardrobe
```

---

## 3. Scientific Verification
- Threshold remains fixed at $0.65$. No adaptive tuning from unverified production data.
- User feedback (`CORRECT`, `INCORRECT`, `NOT_SURE`) is observational and strictly decoupled from training weights.
- Exp-0015 remains classified as `EXPERIMENTAL`.
