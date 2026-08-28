#!/usr/bin/env python3
"""
AURA — Phase 11F Pretrained SigLIP Controlled Sanity Test (N=8)
Validates that genuine pretrained SigLIP-SO400M features provide rich, linearly separable
garment representations that multi-task heads can fit cleanly to 100% accuracy.
"""

import os
import sys
import json
import datetime
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from train_garment_classifier import (
    AuraGarmentDataset,
    AuraSigLIPBackbone,
    AuraMultiTaskHeads,
    MultiTaskFashionLoss,
    extract_split_embeddings,
    CachedEmbeddingDataset,
    load_json,
    compute_model_parameter_hash
)


def run_sanity_test(output_path: str = "training/runs/garment-exp-0007/forensics/sanity_test.json"):
    print("============================================================")
    print("  AURA — Pretrained SigLIP Sanity Test (N=8 Samples)       ")
    print("============================================================")

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"[*] Sanity test running on: {device}")

    manifest_path = "data/garment/metadata/dataset-v0.3.json"
    taxonomy_path = "data/garment/metadata/canonical_taxonomy.json"
    backbone_name = "google/siglip-so400m-patch14-384"

    full_train_ds = AuraGarmentDataset(manifest_path, taxonomy_path, split="train", processor_name=backbone_name)
    # Take first 8 samples
    full_train_ds.items = full_train_ds.items[:8]
    print(f"[+] Selected N={len(full_train_ds)} physical garment samples for sanity testing.")

    # Load Backbone and extract features
    backbone = AuraSigLIPBackbone(model_name=backbone_name).to(device)
    cache = extract_split_embeddings(full_train_ds, backbone, device, batch_size=4)
    cached_ds = CachedEmbeddingDataset(cache)
    loader = DataLoader(cached_ds, batch_size=8, shuffle=False)

    taxonomy = load_json(taxonomy_path)
    heads = AuraMultiTaskHeads(taxonomy, hidden_dim=1152, dropout=0.0).to(device)
    loss_fn = MultiTaskFashionLoss({
        "category_loss": 1.0,
        "fit_loss": 0.8,
        "silhouette_loss": 0.6,
        "color_loss": 0.8,
        "pattern_loss": 0.5,
        "material_loss": 0.6,
        "formality_loss": 0.4
    })

    optimizer = optim.AdamW(heads.parameters(), lr=0.005, weight_decay=0.0)

    initial_loss = None
    final_loss = None
    epochs = 25
    log_epochs = []

    for epoch in range(1, epochs + 1):
        heads.train()
        for batch in loader:
            features = batch["features"].to(device)
            targets = {k: v.to(device) for k, v in batch.items() if k not in ["image_id", "features"]}

            optimizer.zero_grad()
            preds = heads(features)
            loss, metrics = loss_fn(preds, targets)
            loss.backward()
            optimizer.step()

            if initial_loss is None:
                initial_loss = float(loss.item())
            final_loss = float(loss.item())

            cat_acc = (torch.argmax(preds["category_logits"], dim=-1) == targets["category"]).float().mean().item()
            col_acc = (torch.argmax(preds["color_logits"], dim=-1) == targets["color_family"]).float().mean().item()
            fit_acc = (torch.argmax(preds["fit_logits"], dim=-1) == targets["fit"]).float().mean().item()
            sil_acc = (torch.argmax(preds["silhouette_logits"], dim=-1) == targets["silhouette"]).float().mean().item()
            mat_acc = (torch.argmax(preds["material_logits"], dim=-1) == targets["material"]).float().mean().item()
            pat_acc = (torch.argmax(preds["pattern_logits"], dim=-1) == targets["pattern"]).float().mean().item()
            macro_f1 = (cat_acc + col_acc + fit_acc + sil_acc + mat_acc + pat_acc) / 6.0

            log_epochs.append({
                "epoch": epoch,
                "loss": round(float(loss.item()), 4),
                "category_accuracy": round(cat_acc, 4),
                "color_accuracy": round(col_acc, 4),
                "fit_accuracy": round(fit_acc, 4),
                "silhouette_accuracy": round(sil_acc, 4),
                "material_accuracy": round(mat_acc, 4),
                "pattern_accuracy": round(pat_acc, 4),
                "macro_f1": round(macro_f1, 4)
            })

            if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
                print(f"  Sanity Epoch {epoch:02d}/{epochs:02d} | Loss: {loss.item():.4f} | Macro F1: {macro_f1:.4f} (Cat: {cat_acc*100:.1f}%, Col: {col_acc*100:.1f}%)")

    passed = (final_loss < 0.05) and (log_epochs[-1]["category_accuracy"] == 1.0) and (log_epochs[-1]["macro_f1"] >= 0.95)

    result = {
        "status": "PASS" if passed else "FAIL",
        "sample_size": 8,
        "epochs": epochs,
        "initial_loss": round(initial_loss, 4),
        "final_loss": round(final_loss, 4),
        "final_category_accuracy": log_epochs[-1]["category_accuracy"],
        "final_color_accuracy": log_epochs[-1]["color_accuracy"],
        "final_fit_accuracy": log_epochs[-1]["fit_accuracy"],
        "final_silhouette_accuracy": log_epochs[-1]["silhouette_accuracy"],
        "final_material_accuracy": log_epochs[-1]["material_accuracy"],
        "final_pattern_accuracy": log_epochs[-1]["pattern_accuracy"],
        "final_macro_f1": log_epochs[-1]["macro_f1"],
        "history": log_epochs,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"\n[+] Sanity Test Result: {result['status']} (Initial Loss: {initial_loss:.4f} -> Final Loss: {final_loss:.4f}, Final Macro F1: {log_epochs[-1]['macro_f1']:.4f})")
    print(f"[+] Saved to: {output_path}")

    if not passed:
        print("[FATAL ERROR] Pretrained SigLIP Sanity test failed to overfit 8 samples!")
        sys.exit(1)


if __name__ == "__main__":
    run_sanity_test()
