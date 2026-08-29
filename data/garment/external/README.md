# AURA External Garment Data Ingestion Pool

This directory is reserved for partitioned external garment datasets ingesting under the **AURA Dataset Governance Policy V1**.

## Directory Layout
- `tier_b_permissive/`: External datasets with verified commercial training licenses (CC0, CC-BY with attribution).
- `tier_c_research_only/`: External non-commercial academic datasets (DeepFashion, ModaNet) strictly marked `production_eligible: false`.

## Rules
1. Never place unverified or research-only images in the production training manifest.
2. Every asset in this folder must have a corresponding entry in `data/garment/metadata/external-dataset-registry.json`.
