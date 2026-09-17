# AURA VTO — Temporary Kaggle GPU Service Deployment Guide

**Document Status**: Active Reference  
**Deployment Target**: Kaggle GPU Notebook (Temporary Development & Integration Environment)  
**Current Production Status**: `AURA_VTO_BLOCKED`  
**Governance Standard**: Real Neural Inference · Zero Fake 2D Overlays · Zero Commercial AI APIs · Zero Service-Role Leaks

---

## 1. Overview & Architectural Role

Kaggle is used exclusively as a **temporary, free GPU development environment** to run the self-hosted AURA VTO FastAPI service (`services/vto_gpu/app.py`) powered by the decoupled FASHN VTON MMDiT and DWPose ONNX pipeline.

### Core Constraints
1. **Temporary & Quota-Limited**: Kaggle is quota-constrained (up to 30 hours/week of GPU time, maximum 12-hour session lifetime, and idle disconnect timeouts). It is **not** a persistent cloud infrastructure and cannot serve as a permanent production backend.
2. **Zero Commercial Hosted AI APIs**: Neither the mobile app nor the GPU worker transmits user photos to OpenAI, Gemini, Claude, Replicate, Fal, or hosted FASHN endpoints. All neural operations execute locally on the Kaggle GPU worker.
3. **Strict License & Weight Integrity**: Operates strictly on verified Apache-2.0 FASHN VTON v1.5 weights (`model.safetensors`, SHA-256 `d6cd3828...`) and DWPose ONNX (`yolox_l.onnx`, `dw-ll_ucoco_384.onnx`).
4. **Owner-Only Security**: All input garments and user reference photos reside in private Supabase buckets (`vto_inputs`, `vto_results`) protected by PostgreSQL Row-Level Security (RLS). Service-role keys are strictly server-only and must never enter mobile configuration.

---

## 2. Kaggle Environment & Hardware Configuration

### Notebook Settings
In the Kaggle Notebook editor, configure the following settings under the **Settings** panel (right sidebar):
- **Accelerator**: `GPU T4 x2` (Preferred: 2× 15 GB VRAM) or `GPU P100` (1× 16 GB VRAM).
- **Language**: Python 3.
- **Environment**: Always use latest environment.
- **Internet**: **ON** (Required for Hugging Face weight downloads and Supabase API communication; phone-verified Kaggle account required).

### VRAM Feasibility
The FASHN VTON MMDiT flow-matching transformer requires approximately **7.31 – 9.02 GB peak VRAM** during Euler forward-pass sampling at `(672, 432)` resolution (or ~9.69 GB at 576×864).
- **Kaggle Tesla T4 (15 GB)**: Sola and comfortably accommodates static weights (1.94 GB) + pose models (0.35 GB) + attention activations.
- **Kaggle Tesla P100 (16 GB)**: High memory bandwidth with full headroom.

### 2.1 Dependency Isolation & Warning Handling Policy
1. **Preserve Preinstalled PyTorch**: Kaggle's environment includes PyTorch (`2.10.0+cu128` / CUDA 12.8) and NumPy 2.0 / Pillow 11.3. Step 3 avoids reinstalling or downgrading `torch` or `torchvision`.
2. **Pinned ONNX Runtime GPU**: `onnxruntime-gpu==1.20.2` is pinned and verified with `CUDAExecutionProvider`.
3. **Subprocess Installation**: Uses `subprocess.check_call([sys.executable, "-m", "pip", "install", "--no-warn-conflicts", ...])` targeting only AURA VTO packages (`safetensors`, `huggingface_hub`, `einops`, `opencv-python-headless`, `fastapi`, `uvicorn`, `python-jose`, `supabase`).
4. **Warning Classification**: Pip conflict warnings with unrelated preinstalled packages (e.g. `bigframes`, `datasets`, `google-colab`, `dopamine-rl`, `moviepy`, `gradio`, `ydf`) are treated as **non-fatal warnings**.
5. **Fail-Closed Verification**: After installation, Step 3 and Step 4b systematically verify each core AURA VTO import (`torch`, `torchvision`, `onnxruntime`, `cv2`, `numpy`, `PIL`, `einops`, `safetensors`, `huggingface_hub`, `fastapi`, `uvicorn`, `jose`, `supabase`, `Wholebody`). If any AURA core import or `CUDAExecutionProvider` fails, the notebook halts immediately.
6. **Integrity Standard**: Standard output reports:
   `"AURA VTO dependencies verified; unrelated Kaggle package conflicts may remain."`

---

## 3. Required Environment Variables & Secrets

All server credentials must be configured through **Kaggle User Secrets** (**Add-ons → Secrets**) or interactive runtime prompts. **Never commit secret values or place them in cell outputs.**

| Environment Variable | Description | Security Scope |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Your Supabase project URL (`https://<ref>.supabase.co`) | Server-only / Safe HTTPS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key | **STRICTLY SERVER-ONLY**. Never expose to mobile client. |
| `VTO_JWT_SECRET` | Supabase JWT Secret (from Supabase Project Settings → API) | Server-only. Used by GPU worker to verify user tokens. |
| `VTO_WEIGHTS_DIR` | Absolute or relative path to weights directory (`services/vto/weights`) | Server runtime |
| `VTO_MODEL_RESOLUTION` | Model sampling resolution: `672,432` | Server runtime |
| `VTO_INPUT_BUCKET` | Private Supabase storage bucket for input images (`vto_inputs`) | Server runtime |
| `VTO_OUTPUT_BUCKET` | Private Supabase storage bucket for completed renders (`vto_results`) | Server runtime |
| `NGROK_AUTHTOKEN` | *(Optional)* ngrok auth token if setting up temporary tunnel | User secret (Optional) |

---

## 4. Model Artifacts & Weight Verification

The notebook automatically verifies local weights against official SHA-256 signatures before launching the service:

| Artifact | Pinned HF Revision | SHA-256 Signature | License |
| :--- | :--- | :--- | :--- |
| `services/vto/weights/model.safetensors` | `7720683168567eb5...` | `d6cd38286885bc29fa487ea9383f80ffeb95862e7747c630d42c5d3c05bdd35a` | Apache-2.0 |
| `services/vto/weights/dwpose/yolox_l.onnx` | `548b5df25b84d9f4...` | `7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411` | Apache-2.0 |
| `services/vto/weights/dwpose/dw-ll_ucoco_384.onnx` | `548b5df25b84d9f4...` | `724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843` | Apache-2.0 |

### 4.1 DWPose Architecture & Step 4b Diagnostic Verification

The decoupled FASHN VTON pipeline utilizes DWPose (Apache-2.0) with ONNX Runtime GPU for whole-body keypoint detection (134 landmarks including body, hands, and face).

- **Canonical Package Path**: `services.vto.fashn.dwpose.wholebody`
- **Compatibility Alias Path**: `services.vto_gpu.fashn.dwpose.wholebody` (re-exports `Wholebody`)
- **Key Modules in `services/vto/fashn/dwpose/`**:
  - `wholebody.py`: Instantiates YOLOX detector and DWPose estimator ONNX sessions; processes neck joint insertion and COCO/OpenPose keypoint permutation.
  - `dwpose.py`: High-level `DWposeDetector` wrapper with headless scoring and area weighting.
  - `onnxdet.py`: YOLOX object detection ONNX runner with letterbox preprocessing and multi-class NMS.
  - `onnxpose.py`: DWPose heatmap regression ONNX runner with affine transform warping.
  - `utils.py`: Pose skeleton drawing utilities (`draw_pose`, `draw_bodypose`, `draw_handpose`, `draw_facepose`).
- **Diagnostic Verification (Step 4b)**:
  A dedicated diagnostic cell in [docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb](file:///d:/Personal%20projects/aura/docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb) executes before the FastAPI service starts:
  1. Prints the repository commit SHA (`git rev-parse HEAD`).
  2. Discovers and prints the DWPose source directory and all constituent Python files.
  3. Validates `wholebody.py` presence and fails closed if missing.
  4. Verifies SHA-256 signatures of `yolox_l.onnx` and `dw-ll_ucoco_384.onnx`.
  5. Imports `Wholebody` via both canonical and alias paths and asserts they resolve to the same class.
  6. Checks ONNX `CUDAExecutionProvider` availability and runs a live smoke inference on a dummy tensor.


---

## 5. Kaggle Networking & Reachability Reality

### The Network Boundary
- **Inside Kaggle**: The service listens securely on `http://127.0.0.1:8001`. In-notebook tests, local job submissions, and batch evaluations communicate with the service directly.
- **Outside Kaggle (Mobile App)**: Kaggle notebook containers are isolated and do **not** assign a public IP or forward inbound ports. Direct access from the internet or mobile phone to `127.0.0.1:8001` is physically impossible without a reverse tunnel.
- **Optional Temporary Tunnel**: If permitted by your environment and policy, you can establish an authenticated, temporary reverse tunnel (e.g. via Cloudflare Tunnel or ngrok) by supplying your own auth token in Kaggle Secrets (`NGROK_AUTHTOKEN` or `CLOUDFLARE_TUNNEL_TOKEN`).
- **Temporary Scope**: Any generated tunnel URL is strictly temporary and invalidates as soon as the Kaggle notebook stops.
- **Security Rule**: NEVER hardcode or commit tunnel URLs or auth tokens into repository source control or client configurations.

---

## 6. Service Lifecycle & Process Management

In [docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb](file:///d:/Personal%20projects/aura/docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb), the service is managed as a controlled background process:

```python
# Launching the service in the background
server_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "services.vto_gpu.app:app", "--host", "127.0.0.1", "--port", "8001"],
    cwd=str(AURA_ROOT),
    stdout=log_file,
    stderr=subprocess.STDOUT
)
```

### Health & Readiness Check
- `GET /health` → `{"status": "ok", "message": "VTO GPU service active and ready."}` (confirms FastAPI process is responsive).
- `GET /ready` → `{"ready": true}` (confirms MMDiT checkpoint and DWPose ONNX detectors are resident in GPU VRAM).

### Controlled Shutdown
```python
# Stopping the service cleanly
server_process.terminate()
server_process.wait(timeout=10)
# Clearing runtime credentials
os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
os.environ.pop("VTO_JWT_SECRET", None)
```

---

## 7. Exact Manual Steps Required from You

The Supabase database migration and private bucket configuration have been **successfully applied and verified** on your remote project (`https://xwltkmeurazlonohqtpd.supabase.co`). You do NOT need to run the SQL migration manually.

Your remaining actions are focused entirely on Kaggle and mobile testing:

### Step 1: Configure Kaggle Secrets
In your Kaggle Notebook editor, open **Add-ons → Secrets** and add:
- `SUPABASE_URL`: `https://xwltkmeurazlonohqtpd.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>` (from Supabase Dashboard → Settings → API → `service_role secret`)
- `VTO_JWT_SECRET`: `<your-supabase-jwt-secret>` (from Supabase Dashboard → Settings → API → `JWT Secret`)
- *(Optional)* `NGROK_AUTHTOKEN`: `<your-ngrok-token>` (if connecting mobile device/emulator over a reverse tunnel)

### Step 2: Run the Kaggle Deployment Notebook
1. Open [docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb](file:///d:/Personal%20projects/aura/docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb) in Kaggle (re-upload if you previously uploaded the earlier version).
2. Under Notebook Settings, select **Accelerator: GPU T4 x2** (or **P100**) and toggle **Internet: ON**.
3. Run Step 1 (Environment Detection & Repository Setup):
   - It scans candidate paths (`/kaggle/working/aura`, `/kaggle/working/auramain`, `/kaggle/working`, `/kaggle/input/*`).
   - If not present, it clones `https://github.com/Shriyash05/auramain.git` into `/kaggle/working/aura`.
   - It verifies and bootstraps `tools/validate_vto_deployment.py` and `services/vto_gpu/` into `AURA_ROOT`.
4. Run Steps 2 through 5:
   - Step 5 resolves `AURA_ROOT / "tools" / "validate_vto_deployment.py"`, validates runtime secrets, verifies bucket privacy, scans for leaks, and exits cleanly with Code 0.
5. Run Step 6 to start the background FastAPI GPU service, and verify `/health` and `/ready` in Step 7.

### Step 3: (Optional) Connect Mobile App & Run Try-On
1. If testing with the Android emulator or device, run Step 8 in the notebook to start the temporary tunnel.
2. In your local AURA `.env` file, update:
   ```env
   EXPO_PUBLIC_VTO_API_URL=https://<temporary-tunnel-url>
   ```
3. Launch the mobile app (`npm run android`), navigate to Closet/Studio Try-On, and verify the live job flow.
4. When finished, shut down the notebook (Step 10) and revert `EXPO_PUBLIC_VTO_API_URL` in `.env`.

---

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `partially initialized module 'torchvision' has no attribute 'extension'` | Active Jupyter kernel cached a partially initialized module state | Restart the Kaggle session/kernel (**Kernel → Restart** or **Session → Restart Session**). Re-open or upload the updated notebook and run cells sequentially from Step 1. |
| `Preflight validator script does not exist` | Repository was not cloned or validator missing from checkout | Re-upload updated `AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb`. Step 1 automatically clones the repo and bootstraps `validate_vto_deployment.py`. |
| `Preflight validation failed (Exit Code 1)` | Missing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `VTO_JWT_SECRET` | Configure required secrets in Kaggle Add-ons → Secrets or provide values in the secure prompt. |
| `BLOCKED: No CUDA GPU available` | Accelerator not enabled in Kaggle | In Settings panel, set Accelerator to `GPU T4 x2` or `P100` and restart session. |

### 8.1 Torchvision Kernel Contamination Recovery Procedure
When running in an interactive Jupyter environment (like Kaggle or Colab), if `torchvision` was imported before `torch` was fully initialized, or if `pip` was executed multiple times within the same running Python process, `sys.modules['torchvision']` can become cached in a partially initialized state without C++ extension bindings.

**Recovery Steps**:
1. **Restart Kernel**: In the Kaggle notebook top bar, click **Kernel → Restart** (or **Session → Restart Session**).
2. **Do Not Reinstall PyTorch**: Kaggle's native environment has `torch==2.10.0+cu128` and `torchvision` pre-compiled with CUDA support. Reinstalling breaks C++ links.
3. **Run Sequentially**: Re-run cells strictly from Step 1 through Step 10. Step 3 includes a clean subprocess verification that guarantees clean loading.
| `BLOCKED: GPU VRAM below 12 GB` | Insufficient GPU assigned | Restart session with `GPU T4 x2` or `GPU P100`. |
| `/ready` timeout or false | Model weights failed to load or mismatch | Inspect `/kaggle/working/vto_service.log` for CUDA or shape errors. Check `VTO_MODEL_RESOLUTION=672,432`. |
| HTTP 401 on `/v1/vto/jobs` | Invalid or expired Supabase JWT token | Refresh user session on mobile or pass valid Bearer access token. |
| HTTP 403 on `/v1/vto/jobs` | User does not own the requested `garment_id` | Ensure garment was created by the authenticated user in `garments` table. |
| Storage upload error on mobile | Storage bucket missing or public | Ensure migration was executed and `vto_inputs` bucket exists and is private. |

---

## 9. Final Gate Status

```
==================================================
CURRENT STATUS: AURA_VTO_BLOCKED
==================================================
The Kaggle deployment package (docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb)
and documentation (docs/vto/KAGGLE_DEPLOYMENT.md) are complete and verified.
However, because Kaggle GPU sessions are temporary, manual, and unpersisted,
and live authenticated mobile-to-Kaggle execution has not yet been triggered
by the user, the project status remains strictly AURA_VTO_BLOCKED until
a verified mobile -> Supabase -> Kaggle GPU -> result flow is completed.
==================================================
```
