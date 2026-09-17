# VTO code audit — 2026-09-17

Status: `AURA_VTO_BLOCKED`.

| Finding | Evidence class | Result |
|---|---|---|
| Neural path | Source inspection | `VTOEngine.run_inference` calls `DecoupledTryOnPipeline`, which loads local `model.safetensors`, executes DWPose and `TryOnModel.forward_for_cfg`, then encodes the generated PIL result. |
| Parser exclusion | Source inspection | `decoupled_pipeline.py` imports DWPose and TryOnModel only; no `fashn-human-parser` import or setup method exists. This does not prove every transitive package at execution time. |
| RGB inputs | Source inspection | Server decodes person/garment payloads, normalizes them to RGB/RGBA, and passes them to the pipeline. Declared MIME now must agree with decoded format. |
| Actual weights | Source inspection | Local files exist and are hash-recorded in `license_inventory.json`; their source provenance/license is not independently verified. |
| External inference | Source inspection | Python runtime has no HTTP call in normal local-weight execution. The checkpoint helper can download only if passed a repo ID; the engine passes a local path. Mobile code calls only configured `EXPO_PUBLIC_VTO_API_URL`. |
| Fake success | Source inspection and change | Removed the Jest-only `completed` response with the source image. A completed mobile result now requires a non-empty service output. |
| Local inference | Blocked | This run has no importable Python `torch`; historical GTX 1650 OOM claims were not rerun, by design. |

The upstream model card describes the intended architecture as maskless pixel-space MMDiT with DWPose and flat-lay support, matching the local code shape, but this has not been verified by a real inference in this audit ([model card](https://huggingface.co/fashn-ai/fashn-vton-1.5)).
