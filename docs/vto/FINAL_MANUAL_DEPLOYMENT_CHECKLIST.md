# Final manual deployment checklist

Status: `AURA_VTO_BLOCKED`. Steps marked **you** require your credentials or a live environment.

1. **[VERIFIED] Supabase Project Linked**: CLI authenticated and linked to project `xwltkmeurazlonohqtpd` (`https://xwltkmeurazlonohqtpd.supabase.co`).
2. **[VERIFIED] Schema Applied**: Migrations `20260828000000_production_schema.sql`, `20260828000001_contributor_schema.sql`, and `20260918000000_vto_jobs.sql` applied cleanly via `supabase db push`. Table `public.vto_jobs` exists with RLS enabled and owner-only access policy.
3. **[VERIFIED] Private Storage Controls**: Buckets `vto_inputs` and `vto_results` exist with `public = false`. Storage RLS policies enforce `(storage.foldername(name))[1] = auth.uid()::text` for both input uploads and result reads.
4. **You — configure the service runtime.** In Kaggle User Secrets / Colab runtime secrets/environment, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VTO_JWT_SECRET`, `VTO_WEIGHTS_DIR`, `VTO_MODEL_RESOLUTION=672,432`, `VTO_INPUT_BUCKET=vto_inputs`, `VTO_OUTPUT_BUCKET=vto_results`. Expected: `python tools/validate_vto_deployment.py` exits 0 without printing values. Failure: missing value/path; correct the runtime secret or weights mount.
5. **You — start the temporary GPU service.** Follow `docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb` (or Colab `docs/vto/AURA_VTO_TEMP_SERVICE_COLAB.ipynb`); run `uvicorn services.vto_gpu.app:app --host 127.0.0.1 --port 8001`. Expected: model/DWPose load once. Failure: CUDA/dependency/checkpoint error; stop and diagnose, never edit model source.
6. **You — verify service.** `curl http://127.0.0.1:8001/health` then `/ready`. Expected: `ok`, then `ready: true`. Failure: ready false/startup failure means weights or runtime mismatch.
7. **You — configure the test app.** Set only `EXPO_PUBLIC_VTO_API_URL` to an authenticated temporary HTTPS service URL. Expected: no server secrets in Expo environment. Failure: network/offline service; display the unavailable state.
8. **You — authenticate and stage inputs.** Sign in; upload the garment and person image to private `vto_inputs`. Expected: `UploadedImageAsset` with bucket/objectKey. Failure: upload error; retry upload—never submit a device URI or URL-only garment.
9. **You — submit/poll.** Select a top, then a bottom; create a job and poll the opaque ID until terminal state. Expected: queued → processing → completed, with a temporary signed display URL. Failure: 401 means refresh session; 403 means ownership/policy; 5xx means inspect server logs without exposing them to the app.
10. **You — clean up.** Stop Uvicorn/tunnel/runtime, revoke temporary tunnel access, rotate the service-role/JWT secrets, and remove temporary test objects/results.

The existing Colab results satisfy prior neural-pipeline evidence; this checklist does not ask for a repeat model test. It verifies only the authenticated integration on Kaggle/Colab.
