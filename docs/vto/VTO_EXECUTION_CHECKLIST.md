# Controlled execution checklist

- [ ] Colab/Kaggle free GPU is manually enabled; no billing details entered.
- [ ] Preflight reports CUDA and at least 12 GB VRAM.
- [ ] Manifest revision, official source, and hashes validate.
- [ ] Artifact download/reuse succeeds and all hashes match.
- [ ] Sample AURA inputs selected, or current-session personal consent is explicitly enabled.
- [ ] `RUN_ONE_CONTROLLED_INFERENCE` is manually changed to `True`.
- [ ] One output/evidence record is created and visually reviewed.
- [ ] Status remains `AURA_VTO_BLOCKED` unless every readiness condition is separately evidenced.
