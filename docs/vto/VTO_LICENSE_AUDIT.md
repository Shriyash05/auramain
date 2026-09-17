# VTO license audit — 2026-09-17

This is an engineering inventory, not legal advice. The machine-readable record is `services/vto/license_inventory.json`.

| Component | Executed/imported | Verified | Unverified / restriction |
|---|---:|---|---|
| FASHN source | Yes | Upstream repository LICENSE is Apache-2.0 ([source](https://github.com/fashn-AI/fashn-vton-1.5/blob/main/LICENSE)). | Local vendored revision is not pinned to an upstream commit. |
| FASHN weights | Yes if engine loads | Model card declares Apache-2.0 ([card](https://huggingface.co/fashn-ai/fashn-vton-1.5)). | Local artifact provenance, model-card revision, and training-data permissions are unverified. Do not infer training-data rights from the source license. |
| DWPose/YOLOX ONNX | Yes if engine loads | Model card identifies DWPose and YOLOX as third-party components. | Exact ONNX asset licenses, source revisions, and training terms are unverified. |
| Python libraries | Yes | None at exact installed versions: there is no Python lockfile. | Pin and inventory before any deployment. |
| `fashn-human-parser` | No | Excluded by local source inspection. | Its upstream license is irrelevant only while it remains absent from runtime and downloads. |

Commercial deployment is **not approved** by this audit. Preserve notices and obtain counsel approval for weights and dependency chain before changing status.
