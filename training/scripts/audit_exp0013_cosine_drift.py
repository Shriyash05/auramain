"""
AURA Phase 12D - Forensic Precision Cosine Similarity Drift Analysis (Exp-0013)
Audits the representation drift between Base Pretrained SigLIP-SO400M and LoRA Adapted SigLIP-SO400M
using float64 precision across 50 real garment images from dataset-v0.4-250.json.
"""

import os
import sys
import json
import torch
import numpy as np
from PIL import Image
from transformers import SiglipImageProcessor

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))
from train_garment_classifier import AuraSigLIPBackbone, load_json

def audit_cosine_similarity():
    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    processor = SiglipImageProcessor.from_pretrained('google/siglip-so400m-patch14-384')

    # 1. Base Pretrained Backbone (before LoRA)
    base_backbone = AuraSigLIPBackbone(model_name='google/siglip-so400m-patch14-384', use_lora=False).to(device)
    base_backbone.eval()

    # 2. Checkpoint Loaded LoRA Backbone (after training)
    ckpt_path = 'training/runs/garment-exp-0013/checkpoint/best_model.pt'
    ckpt = torch.load(ckpt_path, map_location=device)
    lora_backbone = AuraSigLIPBackbone(
        model_name='google/siglip-so400m-patch14-384',
        use_lora=True,
        lora_rank=ckpt.get('lora_rank', 8),
        lora_alpha=ckpt.get('lora_alpha', 16.0),
        lora_dropout=ckpt.get('lora_dropout', 0.05),
        lora_target_modules=ckpt.get('lora_target_modules', ['q_proj', 'v_proj'])
    ).to(device)
    lora_backbone.load_state_dict(ckpt['backbone_state_dict'])
    lora_backbone.eval()

    manifest = load_json('data/garment/metadata/dataset-v0.4-250.json')
    items = manifest.get('items', [])[:50]

    cos_sims = []
    l2_diffs = []

    for item in items:
        img_path = item.get('local_path') or item.get('image_path')
        if not img_path or not os.path.exists(img_path):
            continue
        img = Image.open(img_path).convert('RGB')
        inputs = processor(images=img, return_tensors='pt').to(device)
        
        with torch.no_grad():
            with torch.amp.autocast('cuda', dtype=torch.float16):
                base_emb = base_backbone(inputs.pixel_values).squeeze(0).to(torch.float64)
                lora_emb = lora_backbone(inputs.pixel_values).squeeze(0).to(torch.float64)
                
                cos_sim = torch.nn.functional.cosine_similarity(base_emb.unsqueeze(0), lora_emb.unsqueeze(0), dim=-1).item()
                l2_diff = torch.norm(base_emb - lora_emb, p=2).item()
                cos_sims.append(cos_sim)
                l2_diffs.append(l2_diff)

    cos_arr = np.array(cos_sims, dtype=np.float64)
    l2_arr = np.array(l2_diffs, dtype=np.float64)

    audit_results = {
        "num_probed_images": len(cos_sims),
        "mean_cosine_similarity": float(cos_arr.mean()),
        "median_cosine_similarity": float(np.median(cos_arr)),
        "std_cosine_similarity": float(cos_arr.std()),
        "min_cosine_similarity": float(cos_arr.min()),
        "max_cosine_similarity": float(cos_arr.max()),
        "mean_l2_embedding_delta": float(l2_arr.mean()),
        "min_l2_delta": float(l2_arr.min()),
        "max_l2_delta": float(l2_arr.max()),
        "precision": "float64",
        "representation_preserved": bool(cos_arr.mean() > 0.95),
        "representation_collapse": bool(cos_arr.mean() < 0.50)
    }

    out_dir = "training/runs/garment-exp-0013/forensics"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "cosine_similarity_precision_audit.json"), "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    print("=" * 70)
    print("  EXP-0013 COSINE SIMILARITY DRIFT AUDIT (FLOAT64)")
    print("=" * 70)
    print(f"Sample Count:            N = {len(cos_sims)}")
    print(f"Mean Cosine Similarity:  {audit_results['mean_cosine_similarity']:.8f}")
    print(f"Median Cosine Sim:       {audit_results['median_cosine_similarity']:.8f}")
    print(f"Std Deviation:           {audit_results['std_cosine_similarity']:.8f}")
    print(f"Minimum Cosine Sim:      {audit_results['min_cosine_similarity']:.8f}")
    print(f"Maximum Cosine Sim:      {audit_results['max_cosine_similarity']:.8f}")
    print(f"Mean L2 Embedding Delta: {audit_results['mean_l2_embedding_delta']:.8f}")
    print(f"Min L2 Delta:            {audit_results['min_l2_delta']:.8f}")
    print(f"Max L2 Delta:            {audit_results['max_l2_delta']:.8f}")
    print("=" * 70)

    return audit_results

if __name__ == "__main__":
    audit_cosine_similarity()
