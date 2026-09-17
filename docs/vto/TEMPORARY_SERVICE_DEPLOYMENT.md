# Temporary free GPU VTO service deployment

## Environment

Use Kaggle GPU notebook sessions (Tesla T4 x2 or P100) or Google Colab sessions only as temporary development infrastructure. The previous verified model evidence recorded 14.56 GB VRAM; `(672, 432)` T-shirt/jeans runs completed in about 176.6 seconds with approximately 7.31–9.02 GB peak VRAM. This is historical inference evidence, not a newly performed deployment test.

Kaggle/Colab free sessions are not persistent and do not provide a suitable reliable public API. A tunnel is optional and must be HTTPS, authenticated, temporary, and created manually in accordance with the environment's rules. Never commit its URL or token.

## Deployment Notebooks

- Primary Kaggle Deployment: `docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb`
- Historical Colab Deployment: `docs/vto/AURA_VTO_TEMP_SERVICE_COLAB.ipynb`

## One-time Supabase setup (COMPLETED & VERIFIED)

The remote Supabase project (`https://xwltkmeurazlonohqtpd.supabase.co`) is linked and fully verified:
1. All migrations (`20260828000000_production_schema.sql`, `20260828000001_contributor_schema.sql`, `20260918000000_vto_jobs.sql`) are applied to the remote database.
2. Private storage buckets (`vto_inputs`, `vto_results`) exist and are private (`public = false`).
3. Storage RLS policies enforce user-isolated owner access (`(storage.foldername(name))[1] = auth.uid()::text`).
4. Table `public.vto_jobs` exists with RLS enabled and owner-only access policy (`auth.uid() = user_id`).
5. Performance indexes on `vto_jobs(id)`, `vto_jobs(user_id, idempotency_key)`, `vto_jobs(status)`, and `vto_jobs(created_at DESC)` exist.

## Runtime variables

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VTO_JWT_SECRET`, `VTO_WEIGHTS_DIR`, `VTO_MODEL_RESOLUTION=672,432`, `VTO_INPUT_BUCKET=vto_inputs`, `VTO_OUTPUT_BUCKET=vto_results`.

## Start and verify

In the Colab notebook, install the server and model requirements, set environment variables through a secret/runtime mechanism, then run:

```bash
uvicorn services.vto_gpu.app:app --host 127.0.0.1 --port 8001
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/ready
```

`/ready` is true only after the checkpoint and DWPose load once at startup. A failed startup is a safe failure: fix the runtime dependency, exact artifact, or configured resolution; do not change model source/defaults.

For a temporary mobile test, set only the temporary HTTPS service URL in the test build's `EXPO_PUBLIC_VTO_API_URL`, authenticate the tunnel, test the full object-key/job flow, then shut down the runtime and rotate all test credentials.
