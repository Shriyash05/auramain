# AURA — Phase 5 Implementation Plan
## Virtual Try-On / Mirror & Feasibility Audit

**Product:** AURA  
**Phase:** Phase 5 — Virtual Try-On / Mirror  
**Status:** Implementation Plan & Feasibility Audit  

---

## 1. Feasibility Audit & Provider Evaluation

### A. Evaluated VTO Approaches

| Approach | Technology / Provider | Latency | Cost | Image Quality | Mobile Compatibility | Privacy & Security |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Serverless Diffusion VTO API** | FASHN.ai / IDM-VTON Replicate Endpoint | 6–12s | ~$0.035 / image | State of the art (texture, drape, skin preservation) | High (Server-side proxy) | High (Ephemeral processing, authenticated endpoints) |
| **Option 2: Dedicated Self-Hosted Inference** | IDM-VTON / OOTDiffusion on RunPod / AWS g5.2xlarge | 4–8s | Fixed GPU cost (~$0.69/hr) | State of the art | High (Custom backend proxy) | Complete data sovereignty |
| **Option 3: Client-Side On-Device Inference** | CoreML / ONNX Mobile runtime | N/A (Fails) | $0 | Unusable / Heavy Artifacts | **UNFEASIBLE** (Requires >12GB VRAM; crashes mobile) | High local privacy |

### B. Chosen Architecture: Server-Side Replaceable Provider Boundary
- **Client Strategy**: React Native mobile app communicates strictly with an abstract `IVirtualTryOnProvider`.
- **Security**: **Zero API keys or provider secrets in client bundle**. Mobile calls the secure backend endpoint / proxy.
- **Honest Quality Policy**: Output is labeled as *"AI Try-On Preview"* with realistic lighting and drape simulation.
- **Graceful Fallback**: If network or provider is unavailable, AURA displays a high-fidelity *"Outfit Studio Preview"* and allows the user to retry or customize pieces in Mix & Match without blocking.

---

## 2. What Already Exists

1. **Garment & Outfit Foundation** ([`src/types/garment.ts`](file:///d:/Personal%20projects/aura/src/types/garment.ts), [`src/types/outfit.ts`](file:///d:/Personal%20projects/aura/src/types/outfit.ts)):
   - High-resolution processed garment images (`processed_image`) with transparent backgrounds and category metadata.
2. **Camera & Gallery Ingestion**:
   - `expo-image-picker` with permission handling and aspect ratio constraints.
3. **AI Stylist & Inspiration Integration**:
   - 1-tap "Try On" handoff from Home contextual recommendations, AI Stylist candidates, and Inspiration AURA versions.
4. **Mix & Match Studio Bridge**:
   - Fast piece-by-piece garment substitution.

---

## 3. What Needs to Change

- Introduce `TryOnSession` and `TryOnResult` data models.
- Add user model reference photo management (`user_photo_url`) with privacy controls and delete options.
- Create `VirtualTryOnProvider` with realistic asynchronous processing states (`uploading`, `segmenting`, `generating`, `completed`, `error`).
- Build the **AURA Mirror** interactive visual screen with side-by-side / slider comparison and 1-tap Studio customization.

---

## 4. New Entities & Data Structures

```typescript
export type TryOnStatus = 'idle' | 'preparing' | 'processing' | 'generating' | 'completed' | 'failed';

export interface TryOnResult {
  id: string;
  user_id: string;
  outfit_id: string;
  user_image_url: string;
  result_image_url: string;
  provider: 'aura_neural_vto' | 'cloud_diffusion' | 'fallback_preview';
  status: TryOnStatus;
  garment_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface TryOnSession {
  id: string;
  user_id: string;
  user_photo_url?: string;
  active_outfit_id?: string;
  last_result?: TryOnResult;
}
```

---

## 5. Storage Keys & Database

- `aura_tryon_sessions_{userId}`: Persistent cached try-on sessions.
- `aura_user_model_photo_{userId}`: Stored reference photo of the user for virtual try-on.
- Full user deletion support for GDPR / privacy compliance.

---

## 6. UI Screens & Experiences

1. **AURA Mirror / Try-On Studio Screen** ([`app/mirror/index.tsx`](file:///d:/Personal%20projects/aura/app/mirror/index.tsx)):
   - Dominant visual display of the try-on result.
   - Comparison switcher: **Original Photo vs AI Try-On vs Garment Breakdown**.
   - Direct action bar: "Try On Again", "Change Pieces in Studio", "Save Outfit Look".
2. **User Photo Capture & Guidance Modal** ([`app/mirror/capture.tsx`](file:///d:/Personal%20projects/aura/app/mirror/capture.tsx)):
   - Clear visual guidance: Full body visibility, straight posture, good lighting.
   - Camera & Gallery picker.
3. **Integration Touchpoints**:
   - AI Stylist Candidate: "Try On Look" button -> opens Mirror with look pre-loaded.
   - Inspiration AURA Version: "Try On Recreated Look" button -> opens Mirror.
   - Mix & Match Studio: "Try On" button -> opens Mirror.

---

## 7. Testing Strategy

- `__tests__/vtoProvider.test.ts`:
  - Validates request payload generation with constituent garment images.
  - Tests asynchronous processing states (`preparing` -> `generating` -> `completed`).
  - Tests failure handling and deterministic fallback.
  - Tests user data isolation.
- Quality gates: `npm run ts:check`, `npm test`, `npx expo export --platform web`.
