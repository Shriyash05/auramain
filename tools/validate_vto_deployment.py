"""
AURA VTO — Safe Deployment Preflight Validator
===============================================
Ensures runtime environment variables, model weights directory, storage buckets,
and security policies are satisfied before launching the GPU VTO service.
Prints presence and validation status only — NEVER prints secret values.
"""
from __future__ import annotations
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

# Resolve ROOT: accept explicit CLI argument, or default to repository parent
if len(sys.argv) > 1 and Path(sys.argv[1]).is_dir():
    ROOT = Path(sys.argv[1]).resolve()
else:
    ROOT = Path(__file__).resolve().parents[1]

SERVER_ONLY = ("SUPABASE_SERVICE_ROLE_KEY", "VTO_JWT_SECRET")
REQUIRED = (
    "SUPABASE_URL",
    *SERVER_ONLY,
    "VTO_WEIGHTS_DIR",
    "VTO_MODEL_RESOLUTION",
    "VTO_INPUT_BUCKET",
    "VTO_OUTPUT_BUCKET",
)

def fail(message: str) -> None:
    print(f"FAIL: {message}")

def main() -> int:
    ok = True
    print(f"--- AURA VTO Deployment Preflight Check (Target: {ROOT}) ---")

    # 1. Environment variables presence
    for name in REQUIRED:
        present = bool(os.getenv(name))
        print(f"{'OK' if present else 'FAIL'}: {name} {'is set' if present else 'is missing'}")
        ok &= present

    # 2. Supabase URL format check (must be HTTPS)
    url = os.getenv("SUPABASE_URL", "")
    if url:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc:
            fail("SUPABASE_URL must be a valid HTTPS URL")
            ok = False
        else:
            print("OK: SUPABASE_URL scheme is HTTPS")

    # 3. Model resolution format check (height,width)
    resolution = os.getenv("VTO_MODEL_RESOLUTION", "")
    if resolution:
        if not re.fullmatch(r"\d{2,4},\d{2,4}", resolution):
            fail("VTO_MODEL_RESOLUTION must be in 'height,width' format (e.g. '672,432')")
            ok = False
        else:
            print(f"OK: VTO_MODEL_RESOLUTION format valid ({resolution})")

    # 4. Weights directory existence
    weights = os.getenv("VTO_WEIGHTS_DIR", "")
    if weights:
        weights_path = Path(weights)
        if not weights_path.is_dir():
            fail(f"VTO_WEIGHTS_DIR does not exist or is not a directory: {weights}")
            ok = False
        else:
            print(f"OK: VTO_WEIGHTS_DIR directory exists: {weights}")

    # 5. Bucket names non-empty
    for name in ("VTO_INPUT_BUCKET", "VTO_OUTPUT_BUCKET"):
        val = os.getenv(name, "")
        if not val.strip():
            fail(f"{name} must be a non-empty string")
            ok = False

    # 6. Security check on .env files in ROOT
    findings = []
    for path in (ROOT / ".env", ROOT / ".env.example"):
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="ignore")
            for key in SERVER_ONLY:
                if re.search(rf"^\s*(?:EXPO_PUBLIC_)?{key}\s*=\s*[^#\s]", text, re.M):
                    findings.append(f"{path.name} contains {key} assignment")
            if re.search(r"https://[^\s]*(?:ngrok|trycloudflare|loca\.lt)", text, re.I):
                findings.append(f"{path.name} contains hardcoded tunnel URL")

    # 7. Security check across tracked repository source files
    EXCLUDED_DIRS = {".git", "node_modules", ".venv", ".venv-aura-ml", "venv", "__pycache__", "dist", "web-build", ".expo", "cache"}
    for p in ROOT.rglob("*.py"):
        if any(part in EXCLUDED_DIRS for part in p.parts) or p.name in ("validate_vto_deployment.py", "validate_vto_kaggle_migration.py"):
            continue
        try:
            if p.stat().st_size < 1_000_000:
                txt = p.read_text(encoding="utf-8", errors="ignore")
                if "SUPABASE_SERVICE_ROLE_KEY=" in txt:
                    findings.append(f"Hardcoded service-role assignment in {p.name}")
        except Exception:
            pass

    if findings:
        for finding in findings:
            fail(f"Secret / tunnel security policy violation: {finding}")
        ok = False
    else:
        print("OK: No server-only secrets or hardcoded tunnel URLs found in repository files")

    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())

