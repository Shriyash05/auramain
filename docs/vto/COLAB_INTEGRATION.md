# AURA Virtual Try-On — Google Colab GPU Service Integration Guide

## 1. Executive Summary & Status

- **Component**: AURA Decoupled Neural Virtual Try-On (VTO)
- **Engine Architecture**: Self-hosted FastAPI service (`services/vto_gpu/app.py`) executing decoupled MMDiT diffusion and DWPose pose extraction on Tesla T4 GPU (Google Colab / Kaggle).
- **Public Tunnel**: ngrok HTTPS tunnel exposing port 8001.
- **Client Integration**: React Native / Expo application (`src/services/vto/vtoJobClient.ts`, `src/services/vto/vtoProvider.ts`, and `app/tryon.tsx`).
- **Current Status**: **`AURA_VTO_BLOCKED`** (Strict scientific honesty requirement: remains blocked until genuine end-to-end neural inference is performed and visually reviewed on a physical device).

---

## 2. Colab-to-AURA System Architecture

```
+-------------------------------------------------------------------------+
|                              AURA MOBILE APP                            |
|                                                                         |
|  [Personal AURA Model]             [Garment Cutout with Transparency]   |
|  (real user reference photo)       (isolated PNG cutout from closet)    |
|              |                                    |                     |
|              v                                    v                     |
|  +-------------------------------------------------------------------+  |
|  |                 CloudStorageService.uploadPrivateImage            |  |
|  |           Staged directly to Supabase Bucket: 'vto_inputs'        |  |
|  +-------------------------------------------------------------------+  |
|                                  |                                      |
|                                  v                                      |
|  +-------------------------------------------------------------------+  |
|  |                      vtoProvider / VTOJobClient                   |  |
|  |       Auth: Bearer <Supabase User JWT> (ES256 / HS256)            |  |
|  +-------------------------------------------------------------------+  |
+----------------------------------|--------------------------------------+
                                   | POST /v1/vto/jobs
                                   | (ngrok HTTPS tunnel)
                                   v
+-------------------------------------------------------------------------+
|                      GOOGLE COLAB TESLA T4 GPU SERVER                   |
|                        (port 8001 via pyngrok tunnel)                   |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                FastAPI Lifespan Startup & Auth Gate               |  |
|  |  - Validates Supabase JWT (dual JWKS ES256 & secret HS256)        |  |
|  |  - Verifies garment ownership via database lookup                 |  |
|  |  - DecoupledTryOnPipeline (MMDiT + DWPose) in GPU VRAM            |  |
|  +-------------------------------------------------------------------+  |
|                                  |                                      |
|                                  v                                      |
|  +-------------------------------------------------------------------+  |
|  |                     Inference Execution Worker                    |  |
|  |  1. Downloads person & garment images from 'vto_inputs' bucket    |  |
|  |  2. Executes MMDiT 30 timesteps with DWPose pose guidance         |  |
|  |  3. Uploads generated try-on result to 'vto_results' bucket       |  |
|  |  4. Updates database job status to 'completed'                    |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
                                   |
                                   | GET /v1/vto/jobs/{id}
                                   v
+-------------------------------------------------------------------------+
|                              AURA MOBILE APP                            |
|                                                                         |
|  - Receives completed status with result_signed_url                     |
|  - Renders genuine generated high-res neural image in tryon.tsx stage   |
|  - Provides toggle between Neural Render and 2D Drape Preview           |
+-------------------------------------------------------------------------+
```

---

## 3. Required Environment Variables

### A. Mobile Client (.env)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project API URL | `https://xyz.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | `eyJhbGciOi...` |
| `EXPO_PUBLIC_VTO_COLAB_URL` | **Development-only**: Colab ngrok tunnel HTTPS URL | `https://your-ngrok-subdomain.ngrok-free.dev` |
| `EXPO_PUBLIC_VTO_API_URL` | Staging / production backend proxy URL (fallback) | `https://xyz.supabase.co/functions/v1/vto-generate` |

> [!NOTE]
> `EXPO_PUBLIC_VTO_COLAB_URL` takes precedence over `EXPO_PUBLIC_VTO_API_URL` in `getVtoBaseUrl()`. Never commit real ngrok URLs to Git.

### B. Google Colab Server Secrets (Key Icon in Colab Sidebar)

| Secret Name | Description | Required? | Source |
| :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase project URL | **Yes** | Supabase Dashboard -> Project Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for storage and job table access | **Yes** | Supabase Dashboard -> Project Settings -> API |
| `NGROK_AUTHTOKEN` | Your ngrok authentication token | **Yes** | dashboard.ngrok.com |
| `VTO_JWT_SECRET` | Supabase JWT Secret | Optional | Optional if using Supabase ES256 JWKS |
| `VTO_WEIGHTS_DIR` | Path to weights directory | Optional | Defaults automatically to `/content/aura/services/vto/weights` (downloaded by Cell 4) |

---

## 4. API Request/Response Contract

### 1. Health Check
- **Endpoint**: `GET /health`
- **Auth**: None
- **Response**:
```json
{
  "status": "ok",
  "message": "VTO GPU service active and ready."
}
```

### 2. Readiness Check
- **Endpoint**: `GET /ready`
- **Auth**: None
- **Response**:
```json
{
  "ready": true
}
```

### 3. Safe Authentication Diagnostic
- **Endpoint**: `GET /v1/vto/diagnostics/auth`
- **Auth**: `Authorization: Bearer <token>`
- **Response**: Sanitized breakdown indicating whether the header was received, scheme is valid, segment count is 3, and signature verification outcome.

### 4. Create VTO Job
- **Endpoint**: `POST /v1/vto/jobs`
- **Auth**: `Authorization: Bearer <supabase_access_token>`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "category": "tops",
  "garment_id": "garm_12345",
  "person_input_storage_key": "user_id/person_user_id.jpg",
  "garment_input_storage_key": "user_id/garment_garm_12345_isolated.png",
  "outfit_name": "Silk Oxford Look",
  "idempotency_key": "vto_user_id_garm_12345_1726850000000"
}
```
- **Response (HTTP 202 Accepted)**:
```json
{
  "id": "vto_01920ac3-78b1-7b3b-80a1-432d5e6f7a8b",
  "status": "queued"
}
```

### 5. Poll VTO Job
- **Endpoint**: `GET /v1/vto/jobs/{job_id}`
- **Auth**: `Authorization: Bearer <supabase_access_token>`
- **Response (In-Progress)**:
```json
{
  "id": "vto_01920ac3-78b1-7b3b-80a1-432d5e6f7a8b",
  "status": "processing"
}
```
- **Response (Completed)**:
```json
{
  "id": "vto_01920ac3-78b1-7b3b-80a1-432d5e6f7a8b",
  "status": "completed",
  "result_signed_url": "https://xyz.supabase.co/storage/v1/object/sign/vto_results/user_id/job_id.png?token=..."
}
```

---

## 5. Step-by-Step: How to Start the Colab Server
 
1. Open Google Colab and upload [docs/vto/AURA_VTO_TEMP_SERVICE_COLAB.ipynb](file:///d:/Personal%20projects/aura/docs/vto/AURA_VTO_TEMP_SERVICE_COLAB.ipynb).
2. Set Runtime Type to GPU: **Runtime -> Change runtime type -> Hardware accelerator: T4 GPU**.
3. Configure Secrets in the left sidebar (**Key icon**):
   - Add `SUPABASE_URL`
   - Add `SUPABASE_SERVICE_ROLE_KEY`
   - Add `NGROK_AUTHTOKEN`
   - *(Optional)* `VTO_JWT_SECRET`
4. Run Cells 1 through 3 to verify the GPU, install dependencies, and load secrets:
   - Dependencies are installed directly from `services/vto/requirements.txt`.
   - Preserves Colab's pre-installed CUDA 12.x and PyTorch/TorchVision environment without corrupting GPU drivers.
   - Installs `onnxruntime-gpu` (CUDAExecutionProvider for DWPose on T4), `opencv-python-headless`, `safetensors`, `einops`, `fastapi`, `uvicorn`, `supabase`, `python-jose`, and `pyngrok`.
5. Run **Cell 4 (Direct Model-Weights Download & SHA-256 Verification)**:
   - Downloads `model.safetensors` (~1.94 GB), `yolox_l.onnx` (~216.7 MB), and `dw-ll_ucoco_384.onnx` (~134.4 MB) directly into `/content/aura/services/vto/weights/`.
   - Cryptographically validates every file against SHA-256 hashes from `VTO_ARTIFACT_MANIFEST.json`.
   - Idempotent: skips downloads if files are already present and verified.
6. Run **Cell 5 (ngrok Tunnel)**: copy the generated HTTPS URL:
   `https://xxxx-xx-xx-xx-xx.ngrok-free.dev`
7. Run **Cell 6** to start Uvicorn. Verify that:
   `[VTO LIFESPAN] >>> Lifespan startup completed: Service is READY. /ready will return true. <<<`
   is logged.

---

## 6. How to Update the ngrok URL in the App

1. Open your local `.env` file in `aura/`:
   ```env
   EXPO_PUBLIC_VTO_COLAB_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.dev
   ```
2. Save the file.
3. Restart Metro bundler to ensure environment variables are picked up:
   ```bash
   npx expo start -c
   ```

---

## 7. How to Test from the App

1. Sign in with your test account.
2. In **Profile -> Developer Diagnostics -> VTO Auth Diagnostic Tool**, click **"Run Diagnostic Test"**.
   - Confirm status code: `SUCCESS`.
   - Confirm `auth_status: "verified"`.
3. Go to **Closet** or **Studio**:
   - Ensure you have a **Personal AURA Model** configured with a real full-body photo.
   - Select a garment with a transparent background cutout.
   - Tap **"Try It On"** (`/tryon`).
4. Observe the flow:
   - Status updates: `Checking Model` -> `Processing` (Neural GPU diffusion).
   - Once completed, the stage renders the **actual neural generated image** with the badge **"GENUINE NEURAL VTO RESULT"**.
   - Toggle between **"Neural VTO"** and **"2D Drape Preview"** to inspect fabric drape alignment.

---

## 8. Known Limitations & Constraints

1. **Free ngrok Sessions**: Free ngrok tunnels expire or rotate URLs when the notebook disconnects. You must update `EXPO_PUBLIC_VTO_COLAB_URL` when starting a new session.
2. **Colab Inactivity Timeouts**: Colab runtimes may disconnect after 60-90 minutes of browser inactivity.
3. **Categories Supported**: Currently tops and bottoms (`tops`, `bottoms`). Outerwear and dresses can map to tops/bottoms or single-layer try-on.
4. **Cold Start**: On Colab restart, model weights loading takes ~45-60 seconds before `/ready` returns `true`.

---

## 9. Exact Remaining Blockers

The code integration is complete and tested. The following physical/operational steps remain before `AURA_VTO_BLOCKED` can be removed:

1. **Active Colab Session Execution**: The user must open Google Colab, execute `AURA_VTO_TEMP_SERVICE_COLAB.ipynb`, and obtain the live ngrok tunnel URL.
2. **First Real Neural Render Verification**: The user must run a try-on with a real personal photo and garment cutout and inspect the visual quality of the resulting try-on image.
3. **Removal of `AURA_VTO_BLOCKED`**: Once visually verified and signed off, the governance flag can be transitioned to active production.
