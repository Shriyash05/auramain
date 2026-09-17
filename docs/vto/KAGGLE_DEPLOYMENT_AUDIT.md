# AURA VTO — Kaggle Deployment & Network Audit Report

**Date**: 2026-09-18  
**Status**: AUDITED & HARDENED  
**Environment**: Kaggle Cloud Notebook (2 × Tesla T4 GPUs)  

---

## 1. Network Architecture & Service Binding

```
+------------------+         HTTPS           +--------------------+
|  AURA Mobile App | ----------------------> | ngrok Public Cloud |
|  (Expo / React)  |                         | (*.ngrok-free.dev) |
+------------------+                         +--------------------+
                                                        |
                                                  Encrypted Tunnel
                                                        v
+-----------------------------------------------------------------+
| Kaggle Tesla T4 Runtime                                         |
|                                                                 |
|   +-------------------+        HTTP        +------------------+ |
|   | ngrok Agent       | -----------------> | FastAPI Service  | |
|   | (Port Forwarding) |                    | (0.0.0.0:8001)   | |
|   +-------------------+                    +------------------+ |
|                                                      |          |
|   +--------------------------------------------------+          |
|   | Pipelines: MMDiT (model.safetensors) + DWPose ONNX          |
|   +-------------------------------------------------------------+
+-----------------------------------------------------------------+
```

### Host & Port Binding
- **Host**: `0.0.0.0` (all interfaces within the Kaggle container)
- **Port**: `8001`
- **Process**: `uvicorn services.vto_gpu.app:app --host 0.0.0.0 --port 8001`
- **Verification**: ngrok forwards traffic directly to `127.0.0.1:8001` (or `http://localhost:8001`), maintaining low latency and zero external exposure outside the authenticated tunnel.

### ngrok Tunnel Analysis
- **Protocol**: External requests use HTTPS (`https://*.ngrok-free.dev`).
- **Path & Method Preservation**: ngrok preserves full URL paths (e.g. `/v1/vto/jobs`, `/ready`, `/health`) and HTTP methods (`GET`, `POST`, `OPTIONS`).
- **Header Forwarding**: Standard headers (`Authorization`, `Content-Type`, `User-Agent`) are forwarded intact. ngrok adds proxy headers (`X-Forwarded-For`, `X-Forwarded-Proto`).
- **CORS Support**: Added `CORSMiddleware` in [services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L82-L89) to guarantee preflight `OPTIONS` requests succeed across all origins.

---

## 2. Environment Variables Audit (Sanitized)

| Variable Name | Status | Type | Consumed By | Audit Finding / Validity |
| :--- | :--- | :--- | :--- | :--- |
| `VTO_JWT_SECRET` | Present & Non-Empty | HMAC Secret | `app.py:L25`, `config.py:L14` | Required for HS256 JWT decoding. Must match Supabase Project JWT Secret. |
| `VTO_WEIGHTS_DIR` | Present & Non-Empty | Filesystem Path | `config.py:L17`, `decoupled_pipeline.py` | Required for loading MMDiT and DWPose weights. Validated against official artifact hashes. |
| `VTO_MODEL_RESOLUTION` | Present & Non-Empty | String (`H,W`) | `config.py:L18-20` | Parsed to tuple `(672, 432)`. Matches model's native aspect ratio. |
| `VTO_INPUT_BUCKET` | Present & Non-Empty | Identifier | `config.py:L15` | Matches Supabase migration `vto_inputs` (private). |
| `VTO_OUTPUT_BUCKET` | Present & Non-Empty | Identifier | `config.py:L16` | Matches Supabase migration `vto_results` (private). |
| `SUPABASE_URL` | Present & Non-Empty | HTTPS URL | `config.py:L12`, `app.py:L22` | Connects service role client for job status updates. |
| `SUPABASE_SERVICE_ROLE_KEY` | Present & Non-Empty | JWT Token | `config.py:L13`, `app.py:L22` | Used by service backend to manage `vto_jobs` table. |

---

## 3. Model Weights Verification

Model weights reside in `services/vto/weights/` (and on Kaggle in `/kaggle/working/aura/services/vto/weights/`). All files match official Hugging Face SHA-256 hashes recorded in [docs/vto/VTO_ARTIFACT_MANIFEST.json](file:///d:/Personal%20projects/aura/docs/vto/VTO_ARTIFACT_MANIFEST.json):

1. **MMDiT Diffusion Model**:
   - Filename: `model.safetensors`
   - Expected SHA-256: `d6cd38286885bc29fa487ea9383f80ffeb95862e7747c630d42c5d3c05bdd35a`
   - Status: Verified.

2. **DWPose Human Detector**:
   - Filename: `yolox_l.onnx`
   - Expected SHA-256: `7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411`
   - Status: Verified.

3. **DWPose Pose Estimator**:
   - Filename: `dw-ll_ucoco_384.onnx`
   - Expected SHA-256: `724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843`
   - Status: Verified.

Zero model files were downloaded or altered during this audit.

---

## 4. Endpoints and Access Control

| Route | Method | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Public | Liveness probe returning service metadata. |
| `/ready` | `GET` | Public | Readiness probe (`{"ready": true/false}`). |
| `/v1/vto/diagnostics/auth` | `GET` | Public / Sanitized | Safe diagnostic endpoint returning validation codes without secrets. |
| `/v1/vto/jobs` | `POST` | Authenticated (`Bearer <JWT>`) | Submits a new VTO generation job. |
| `/v1/vto/jobs/{job_id}` | `GET` | Authenticated (`Bearer <JWT>`) | Retrieves job status and signed result URL. |
| `/v1/vto/jobs/{job_id}/cancel` | `POST` | Authenticated (`Bearer <JWT>`) | Cancels a queued job. |

---

## 5. Security & Isolation Summary

- **Fail-Closed Design**: Unauthenticated or improperly signed requests are rejected with 401 before any database queries or GPU operations occur.
- **Resource Protection**: Multi-tenant authorization prevents User A from accessing User B's garments or jobs.
- **Secret Redaction**: Error handlers never output exception payloads, tokens, or configuration strings to client responses or logs.
