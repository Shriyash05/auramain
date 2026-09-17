# GPU VTO job service

The GPU worker is `services/vto_gpu/app.py`. It is intentionally separate from Expo and must run on a GPU host with the verified local weights mounted outside source control.

## Server environment

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VTO_JWT_SECRET`, `VTO_WEIGHTS_DIR`, and `VTO_MODEL_RESOLUTION=672,432`. The service-role key is server-only. Install `pip install -r services/vto_gpu/requirements.txt` plus the verified FASHN runtime dependencies, then run `uvicorn services.vto_gpu.app:app --host 127.0.0.1 --port 8001` behind an authenticated HTTPS reverse proxy.

Endpoints: `POST /v1/vto/jobs`, `GET /v1/vto/jobs/{id}`, `POST /v1/vto/jobs/{id}/cancel`, `/health`, `/ready`. Every job route requires `Authorization: Bearer <Supabase access token>`. Inputs are object keys in private `vto_inputs`, never device paths. The worker permits one active GPU job.

## Temporary Colab development

Install the same requirements, mount the authorized checkout/weights, set only temporary server environment variables, run the migration against a test Supabase project, start Uvicorn, and expose it only through an authenticated temporary tunnel. Do not commit tunnel URLs, tokens, weights, or private inputs. Shut down the runtime and revoke test credentials after a T-shirt and jeans run.

This is not production-ready: deploy durable queue/worker supervision, a secure HTTPS ingress, and a permanent GPU host before relying on it.
