# Verified artifact download design

The notebook performs GPU preflight before reading/downloading artifacts. It accepts only `APPROVED_FOR_FREE_EXPERIMENT_ONLY` entries from `VTO_ARTIFACT_MANIFEST.json`, HTTPS Hugging Face URLs matching the pinned repository/revision, and a 64-character SHA-256. It invokes the official `huggingface_hub.hf_hub_download` client with an immutable revision, downloads into the required local destination, verifies SHA-256, and deletes a mismatch. Existing files are reused only after their hash passes. No token is supplied; a gated/authenticated source stops the run.

This prevents model substitution but is not a production supply-chain system. It does not override the unresolved commercial/legal approval recorded in the status documents.
