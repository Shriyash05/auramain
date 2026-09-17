# AURA VTO integration assessment — 2026-09-18

## Verified evidence

The supplied Colab notebook records genuine FASHN VTON pipeline executions on a Tesla T4 (14.56 GB): a T-shirt run at `(576, 384)` completed in 122.3 seconds (7.47 GB peak), a `(672, 432)` run completed in 176.6 seconds (7.31 GB peak), and the service wrapper reports a generated image extracted from `DecoupledPipelineOutput.images[0]`. A jeans output was saved from the same object type. This is evidence of notebook inference, not production end-to-end verification.

The notebook also edits `tryon_mmdit.py` in its cloned checkout to change input shape. The checked-in AURA service must not inherit that mutation without a deliberate, reviewed configuration change. The production target should use the known-good `(672, 432)` configuration through a non-mutating configuration value.

## Current architecture

- Mobile: Expo/React Native; `app/tryon.tsx` uses `VirtualTryOnService` and `AuraDiffusionVTOProvider`.
- Existing service: `services/vto/server.py` is synchronous, base64-input, local-only, and lacks authentication, job persistence, queuing, service-to-Supabase credentials, and output storage.
- Pipeline: `services/vto/fashn/decoupled_pipeline.py` already loads weights/DWPose and returns `DecoupledPipelineOutput(images=[...])`.
- Data: `public.vto_sessions` has owner RLS but lacks the asynchronous job contract, category, input-object keys, model configuration, safe result-object key, and job lifecycle metadata.
- Storage: `CloudStorageService` silently falls back to a device URI after upload/signing failures. That is unsuitable for a real VTO job because the GPU worker cannot access a device-local URI.

## Recommended integration boundary

Keep neural inference in a separate, authenticated GPU FastAPI service. The app uploads to private storage, submits only opaque storage object keys to `POST /v1/vto/jobs`, and polls `GET /v1/vto/jobs/{id}`. The GPU service validates the user JWT, resolves object ownership server-side, serializes one GPU job at a time, writes only a private result object, and returns status/metadata—not filesystem paths or model errors.

## Required scoped changes

1. New GPU-service job API, queue/concurrency guard, startup model loading, output extraction, and protected health/readiness routes.
2. New Supabase migration for VTO jobs plus private `vto_inputs`/`vto_results` storage policies; retain existing `vto_sessions` for compatibility rather than mutating it in place.
3. Mobile provider/service changes to upload inputs, submit/poll jobs, and display signed result URLs only after `completed`.
4. Tests for auth, ownership, job transitions, output extraction, concurrency, and storage failures.

## Must remain unchanged

The classifier, frozen datasets, model weights, current Closet/Studio flows, and unrelated navigation/UI. No Colab tunnel or hosted inference API should be made a production dependency.

## Blockers before implementation can be verified

There is no configured permanent GPU service endpoint or service-to-Supabase trust configuration in the repository. The supplied notebook is a successful temporary execution environment but cannot itself safely receive mobile traffic. Production integration therefore cannot be verified until a GPU host and its deployment/auth configuration are selected.
