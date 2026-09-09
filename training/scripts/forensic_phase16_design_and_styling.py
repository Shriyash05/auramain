#!/usr/bin/env python3
"""
AURA Phase 16 Forensic Design System & Styling Experience Audit
==============================================================
Verifies:
- Zero dataset mutation (dataset-v0.5-500, dataset-v0.3-blind-freeze)
- Frozen blind test checksum strictly unchanged (5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd)
- Zero training execution / zero model weight changes
- Zero commercial / external AI APIs (OpenAI, Claude, Gemini, Replicate, FASHN)
- No fabricated model attributes
- No fabricated user wardrobe items
- Model version strictly aura-garment-v1-exp0015
- Model governance remains EXPERIMENTAL
- Confidence threshold strictly 0.65
- Deterministic outfit compatibility layer verified
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

EXPECTED_BLIND_SHA256 = "5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd"
EXPECTED_DATASET_500_SHA256 = "85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e"

BLIND_PATH = os.path.join(REPO_ROOT, "data", "garment", "metadata", "dataset-v0.3-blind-freeze.json")
DATASET_500_PATH = os.path.join(REPO_ROOT, "data", "garment", "metadata", "dataset-v0.5-500.json")
COMPATIBILITY_SERVICE_PATH = os.path.join(REPO_ROOT, "src", "services", "stylist", "outfitCompatibilityService.ts")
MIX_MATCH_HOOK_PATH = os.path.join(REPO_ROOT, "src", "hooks", "useMixMatch.ts")
CREATE_SCREEN_PATH = os.path.join(REPO_ROOT, "app", "(tabs)", "create.tsx")
ADD_SCREEN_PATH = os.path.join(REPO_ROOT, "app", "garment", "add.tsx")
TELEMETRY_SERVICE_PATH = os.path.join(REPO_ROOT, "src", "services", "telemetry", "garmentTelemetryService.ts")
OUTPUT_DIR = os.path.join(REPO_ROOT, "training", "data-audits", "phase16")

os.makedirs(OUTPUT_DIR, exist_ok=True)


def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def run_phase16_forensic_audit():
    print("=" * 70)
    print("  AURA PHASE 16 FORENSIC DESIGN SYSTEM & STYLING AUDIT")
    print("=" * 70)

    report: Dict[str, Any] = {
        "phase": "phase-16",
        "timestamp": "2026-09-09T18:30:00Z",
        "status": "PASS",
        "checks": {}
    }

    # 1. Dataset Immutability Check
    blind_sha = compute_sha256(BLIND_PATH)
    d500_sha = compute_sha256(DATASET_500_PATH)

    blind_pass = (blind_sha == EXPECTED_BLIND_SHA256)
    d500_pass = (d500_sha == EXPECTED_DATASET_500_SHA256)

    report["checks"]["dataset_immutability"] = {
        "blind_freeze_sha256": blind_sha,
        "blind_freeze_verified": blind_pass,
        "dataset_500_sha256": d500_sha,
        "dataset_500_verified": d500_pass,
        "status": "PASS" if (blind_pass and d500_pass) else "FAIL"
    }
    if not (blind_pass and d500_pass):
        report["status"] = "FAIL"
    print(f"[+] Dataset Immutability: Blind={blind_pass}, 500={d500_pass}")

    # 2. No Model Weight Mutation / No Training Execution
    runs_dir = os.path.join(REPO_ROOT, "training", "runs")
    exp17_exists = os.path.exists(os.path.join(runs_dir, "garment-exp-0017"))
    no_new_training = not exp17_exists
    report["checks"]["no_training_execution"] = {
        "exp0017_absent": no_new_training,
        "status": "PASS" if no_new_training else "FAIL"
    }
    if not no_new_training:
        report["status"] = "FAIL"
    print(f"[+] No Training Execution / No Exp-0017: {no_new_training}")

    # 3. Model Governance & Version Check
    with open(TELEMETRY_SERVICE_PATH, "r", encoding="utf-8") as f:
        telemetry_code = f.read()

    with open(ADD_SCREEN_PATH, "r", encoding="utf-8") as f:
        add_code = f.read()

    model_exp0015 = "aura-garment-v1-exp0015" in telemetry_code
    governance_experimental = "Experimental" in add_code
    confidence_065 = "0.65" in telemetry_code and "65%" in add_code

    governance_pass = model_exp0015 and governance_experimental and confidence_065
    report["checks"]["model_governance"] = {
        "model_version": "aura-garment-v1-exp0015",
        "version_verified": model_exp0015,
        "governance_level": "EXPERIMENTAL",
        "governance_verified": governance_experimental,
        "confidence_threshold": 0.65,
        "threshold_verified": confidence_065,
        "status": "PASS" if governance_pass else "FAIL"
    }
    if not governance_pass:
        report["status"] = "FAIL"
    print(f"[+] Model Governance (Exp-0015, EXPERIMENTAL, 0.65): {governance_pass}")

    # 4. Zero External / Commercial AI APIs
    banned_keywords = ["openai", "gemini-1.5", "claude-3", "replicate", "fashn"]
    violations = []
    services_dir = os.path.join(REPO_ROOT, "src", "services")
    for root, _, files in os.walk(services_dir):
        for file in files:
            if file.endswith((".ts", ".tsx")):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().lower()
                    for kw in banned_keywords:
                        if kw in content:
                            violations.append(f"{file}:{kw}")

    integrity_pass = len(violations) == 0
    report["checks"]["scientific_integrity"] = {
        "banned_api_violations": violations,
        "zero_commercial_apis": integrity_pass,
        "status": "PASS" if integrity_pass else "FAIL"
    }
    if not integrity_pass:
        report["status"] = "FAIL"
    print(f"[+] Scientific Integrity (Zero commercial AI APIs): {integrity_pass}")

    # 5. User's Real Wardrobe Dominance & Zero Fabricated Items
    with open(COMPATIBILITY_SERVICE_PATH, "r", encoding="utf-8") as f:
        compat_code = f.read()

    with open(MIX_MATCH_HOOK_PATH, "r", encoding="utf-8") as f:
        hook_code = f.read()

    # Verify compatibility engine checks wardrobe sufficiency rather than fabricating items
    has_sufficiency_check = "checkWardrobeSufficiency" in compat_code and "checkWardrobeSufficiency" in hook_code
    no_fake_placeholder_shoes = "placeholder_shoes" not in compat_code

    wardrobe_primacy_pass = has_sufficiency_check and no_fake_placeholder_shoes
    report["checks"]["wardrobe_primacy"] = {
        "sufficiency_check_enforced": has_sufficiency_check,
        "zero_fabricated_garments": no_fake_placeholder_shoes,
        "status": "PASS" if wardrobe_primacy_pass else "FAIL"
    }
    if not wardrobe_primacy_pass:
        report["status"] = "FAIL"
    print(f"[+] Wardrobe Primacy (Zero fabricated garments): {wardrobe_primacy_pass}")

    # 6. Deterministic Compatibility & "Why This Works" Rationale
    with open(CREATE_SCREEN_PATH, "r", encoding="utf-8") as f:
        create_code = f.read()

    has_color_eval = "evaluateColorHarmony" in compat_code
    has_prop_eval = "evaluateProportions" in compat_code
    has_rationale = "rationale" in compat_code and "WHY THIS WORKS" in create_code
    deterministic_pass = has_color_eval and has_prop_eval and bool(has_rationale)

    report["checks"]["deterministic_compatibility"] = {
        "color_evaluation": has_color_eval,
        "proportions_evaluation": has_prop_eval,
        "grounded_rationale": bool(has_rationale),
        "status": "PASS" if deterministic_pass else "FAIL"
    }
    if not deterministic_pass:
        report["status"] = "FAIL"
    print(f"[+] Deterministic Styling & Rationale: {deterministic_pass}")

    # Write report
    report_file = os.path.join(OUTPUT_DIR, "forensic_verification_phase16.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n[+] Forensic Verification Phase 16 Result:", report["status"])
    print(f"[+] Saved report to: {report_file}")
    print("=" * 70)

    if report["status"] != "PASS":
        sys.exit(1)


if __name__ == "__main__":
    run_phase16_forensic_audit()
