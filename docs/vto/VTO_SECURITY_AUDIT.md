# VTO security and privacy audit — 2026-09-17

| Area | Evidence / outcome | State |
|---|---|---|
| Network exposure | `__main__` binds `127.0.0.1`; no public server is configured. | Source-inspected |
| CORS | Replaced wildcard + credentials with explicit `AURA_VTO_ALLOWED_ORIGINS`; no browser origin is allowed by default. | Fixed |
| Authentication / authorization | No auth exists. Keep this local-only; add authenticated gateway and per-user authorization before any network deployment. | Blocked |
| Payloads | 15 MB request-header limit, 10 MB decoded image limit, MIME check, dimensions, and Pillow pixel limit exist. MIME/content mismatch is now rejected. Chunked bodies can bypass header-only limit. | Partially mitigated |
| Decompression bombs | Pillow maximum pixels and full decode are used. Verify behavior under deployed Pillow version. | Source-inspected |
| Files / SSRF / commands | Endpoint is base64-only and writes no user image. No shelling, URL fetch, or deserialization of user objects observed. | Source-inspected |
| Errors / logs | Internal exception text was removed from API response. Application/reverse-proxy logging remains unverified. | Fixed / unverified |
| DoS / rate limit | No concurrency limit, queue, timeout, or rate limit. Diffusion is expensive. | Blocked |
| Model integrity | Local hashes are recorded but not enforced by engine; provenance verification is incomplete. | Blocked |
| Retention | In-memory request images are dereferenced and GC requested; no persistence observed. Notebook/output retention is user-controlled. | Source-inspected |

This service is not secure for public deployment. The notebook is intentionally not an application backend.
