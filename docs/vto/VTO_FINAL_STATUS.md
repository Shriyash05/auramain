# AURA VTO Final Status — 2026-09-18

## Status: `AURA_VTO_BLOCKED`

### Summary of Audit & Readiness
1. **Kaggle GPU Environment**:
   - Model weights (MMDiT `model.safetensors` and DWPose ONNX detectors) loaded successfully on Kaggle Tesla T4 GPU.
   - Public readiness probe `GET /ready` returns `{"ready": true}` (HTTP 200).
   - Liveness probe `GET /health` returns `{"status": "ok"}` (HTTP 200).
   - ngrok tunnel forwards traffic securely to port 8001 with full CORS support.
2. **Authentication Audit**:
   - The protected route `POST /v1/vto/jobs` requires a valid Supabase GoTrue user access token (`Authorization: Bearer <token>`) signed with HMAC-SHA256 (`HS256`), with claims `aud: "authenticated"` and `sub: "<user_uuid>"`.
   - The reason for `HTTP 401 Unauthorized` was identified: requests must supply an active Supabase user session token signed with the matching `VTO_JWT_SECRET` (Supabase Project JWT Secret), rather than an Anon key, service role key, or expired session.
   - Safe diagnostic endpoint `GET /v1/vto/diagnostics/auth` has been added and verified across 14 unit test assertions in `tests/test_vto_auth_and_deployment.py`.

### Reason for Preserving `AURA_VTO_BLOCKED`
Per Phase 9 strict non-negotiable security requirements, VTO cannot be unblocked merely because the model loaded, `/health` and `/ready` return 200, the tunnel works, and authentication diagnostics pass.

The final status remains **`AURA_VTO_BLOCKED`** until ALL of the following criteria are independently satisfied:
- [ ] Genuine neural inference completed on GPU without mocked pipelines.
- [ ] Real generated output image exists and is recorded.
- [ ] Output SHA-256 hash is recorded in artifact manifests.
- [ ] Visual quality and alignment validation completed.
- [ ] Artifact provenance and licenses formally approved.
- [ ] Python end-to-end VTO tests pass against real inference.
- [ ] Production security, rate-limiting, and quota controls implemented.
- [ ] The full end-to-end run is confirmed reproducible.
