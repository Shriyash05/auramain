# Free GPU deployment decision

## Selected option: controlled Colab development session

Colab Free can provide a GPU at no charge, but availability and quota are not guaranteed. Its own FAQ says free managed runtimes may terminate and explicitly lists remote-control/SSH and primarily web-UI interaction as restricted; a public FastAPI tunnel is therefore not a viable reliable service or production deployment ([Colab FAQ](https://research.google.com/colaboratory/intl/en-GB/faq.html)). Kaggle provides GPU notebook sessions subject to weekly quota ([Kaggle GPU usage](https://www.kaggle.com/docs/efficient-gpu-usage)) and is likewise unsuitable as a persistent mobile API host.

Use either option only to perform a manually supervised, authenticated development run. Do **not** expose a public unauthenticated tunnel. A persistent public GPU API cannot be honestly supplied under the no-cost constraint.

## Controlled Colab run

1. Enable a free GPU only if offered. Run `nvidia-smi`; stop if under 12 GB.
2. Clone the authorized AURA checkout, download only the pinned artifacts from `docs/vto/VTO_ARTIFACT_MANIFEST.json`, and install `services/vto_gpu/requirements.txt` plus the pinned model runtime.
3. Apply `supabase/migrations/20260918000000_vto_jobs.sql` to a **test** Supabase project and create private buckets (`vto_inputs`, `vto_results`).
4. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VTO_JWT_SECRET`, `VTO_WEIGHTS_DIR`, `VTO_MODEL_RESOLUTION=672,432`, `VTO_INPUT_BUCKET`, and `VTO_OUTPUT_BUCKET` only in the runtime environment. Never place them in notebook output, source, or Expo variables.
5. Start `uvicorn services.vto_gpu.app:app --host 127.0.0.1 --port 8001`. Verify `/health` and `/ready` locally. If an authenticated temporary tunnel is permitted by the environment, set only its temporary HTTPS URL as `EXPO_PUBLIC_VTO_API_URL` for the test build; otherwise test with a local client in the same environment.
6. Run one T-shirt and one jeans job; record output hashes, GPU metrics, and visual review. Stop the runtime, revoke tunnel access, and rotate the test service-role/JWT secrets.

No permanent deployment, tunnel URL, credentials, migration application, or inference result is created by this repository.
