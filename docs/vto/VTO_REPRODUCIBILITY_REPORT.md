# VTO reproducibility report

Implemented: immutable official Hugging Face source/revision manifest and a dependency preflight. The selected vendored runtime imports torch, torchvision, safetensors, ONNX Runtime, OpenCV, NumPy, einops, Pillow and tqdm; it does not import transformers or diffusers. The notebook pins `huggingface_hub==1.5.0`, compatible with the reported `transformers==5.16.1` requirement, while avoiding both optional packages in its VTO import path. Automatically verified only when the notebook is run: GPU preflight, imports, model construction, downloaded artifact hashes, and evidence record. Tested with real local artifact hashes: model and both DWPose hashes match the pinned cache revisions. Tested with a real GPU: **not run**. Genuine inference: **not run**. Visual validation: **not run**.

No successful-inference report exists because no generated image exists. Status: `AURA_VTO_BLOCKED`.
