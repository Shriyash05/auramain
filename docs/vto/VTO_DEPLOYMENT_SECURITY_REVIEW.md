# Deployment security review

| Control | Status |
|---|---|
| Service-role key | Server environment only; never Expo-prefixed. Manual deployment must preserve this. |
| Storage | Migration creates private `vto_inputs`/`vto_results`; owner RLS policies are present statically, but not applied/verified remotely. |
| Object keys | Client checks reject URI-like keys; worker accepts database-stored keys only. |
| IDOR | API filters jobs and garments by JWT user id; RLS provides separate database protection. |
| Signed URLs | Returned only for completed display and not stored in the job schema. |
| Errors | Worker persists generic safe error text. |
| GPU concurrency | One-process semaphore limits active inference to one job. |
| Temporary files | `TemporaryDirectory` removes worker image files after processing. |
| CORS/tunnel | No CORS middleware is enabled. A browser/mobile tunnel must be HTTPS and authenticated; do not expose it publicly. |
| Remaining hardening | Add deployment-level request rate limiting, HTTPS ingress, process supervision, JWT asymmetric/JWKS validation if Supabase uses asymmetric keys, and remote policy tests before production. |
