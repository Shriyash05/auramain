# Free VTO proof of concept

`AURA_VTO_BLOCKED` remains the status. These notebooks are a controlled experiment, not an application backend and not permission to upload customer images.

1. In Google Colab, choose **Runtime → Change runtime type → T4 GPU** only if it is shown as free. In Kaggle, enable the free GPU accelerator only if available. Do not enter payment or billing information.
2. Upload a local AURA repository archive or clone your own authorized repository into the notebook. The notebook uses its vendored `services/vto/fashn/decoupled_pipeline.py`; it does not call any hosted inference API.
3. Run preflight. It prints GPU/VRAM, verifies the three model hashes, rejects <12 GB VRAM conservatively, and checks that `fashn-human-parser` is absent from the runtime import path.
4. Use repository sample images by default. For a personal image, deliberately set `I_CONFIRM_PERSONAL_IMAGE = True` and upload it manually. Do not use an image without consent. Uploaded notebook data and notebook outputs may persist under platform policies.
5. Set `RUN_ONE_CONTROLLED_INFERENCE = True` only after preflight passes. The notebook executes exactly one 30-step inference, writes a JSON evidence record and output only on successful generation, then clears CUDA cache.

Failure means blocked, not successful VTO. No retries are automatic. A successful output still needs human visual review and legal approval; it does not make the mobile app ready.
