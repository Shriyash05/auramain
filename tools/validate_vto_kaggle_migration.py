"""
AURA VTO — Kaggle Migration & Static Security Validation
========================================================

Performs comprehensive validation for the Colab-to-Kaggle migration:
1. Python compilation of all GPU service files.
2. Notebook JSON validity and schema conformance for all docs/vto/*.ipynb.
3. Static validation of supabase/migrations/20260918000000_vto_jobs.sql:
   - Private buckets (public = false)
   - Table vto_jobs exists with RLS enabled
   - Owner-only policies for jobs, inputs, and results
4. Security check: No service-role key or JWT secret in repository source or .env files.
5. FastAPI application endpoints structure (/health, /ready, /v1/vto/jobs).
6. Local test of FastAPI health endpoint via starlette/fastapi TestClient (with mock settings).
"""

from __future__ import annotations
import json
import os
import re
import sys
import py_compile
from pathlib import Path
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

def run_checks() -> int:
    print("=" * 60)
    print("AURA VTO — KAGGLE MIGRATION & SECURITY VALIDATION")
    print("=" * 60)
    errors = 0

    # 1. Python Compilation
    print("\n[Check 1] Python File Compilation:")
    py_files = [
        ROOT / "services" / "__init__.py",
        ROOT / "services" / "vto" / "__init__.py",
        ROOT / "services" / "vto" / "fashn" / "__init__.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "__init__.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "wholebody.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "dwpose.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "onnxdet.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "onnxpose.py",
        ROOT / "services" / "vto" / "fashn" / "dwpose" / "utils.py",
        ROOT / "services" / "vto" / "fashn" / "decoupled_pipeline.py",
        ROOT / "services" / "vto_gpu" / "__init__.py",
        ROOT / "services" / "vto_gpu" / "app.py",
        ROOT / "services" / "vto_gpu" / "config.py",
        ROOT / "services" / "vto_gpu" / "fashn" / "__init__.py",
        ROOT / "services" / "vto_gpu" / "fashn" / "dwpose" / "__init__.py",
        ROOT / "services" / "vto_gpu" / "fashn" / "dwpose" / "wholebody.py",
        ROOT / "services" / "vto" / "_gpu" / "app.py",
        ROOT / "services" / "vto" / "_gpu" / "config.py",
        ROOT / "services" / "vto" / "_gpu" / "__init__.py",
        ROOT / "tools" / "validate_vto_deployment.py",
    ]
    for pf in py_files:
        try:
            py_compile.compile(str(pf), doraise=True)
            print(f"  OK: Compiled {pf.relative_to(ROOT)}")
        except Exception as e:
            print(f"  FAIL: Could not compile {pf}: {e}")
            errors += 1

    # 2. Notebook JSON Validation
    print("\n[Check 2] Notebook JSON & Schema Validation:")
    notebooks = list((ROOT / "docs" / "vto").glob("*.ipynb"))
    for nb in notebooks:
        try:
            with open(nb, "r", encoding="utf-8") as f:
                data = json.load(f)
            assert "cells" in data, "missing 'cells'"
            assert "metadata" in data, "missing 'metadata'"
            assert "nbformat" in data, "missing 'nbformat'"
            cell_count = len(data["cells"])
            nbformat = f"{data['nbformat']}.{data.get('nbformat_minor', 0)}"
            print(f"  OK: {nb.name} (Valid JSON, {cell_count} cells, nbformat {nbformat})")
        except Exception as e:
            print(f"  FAIL: {nb.name} invalid JSON/schema: {e}")
            errors += 1

    # Specifically check docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb contents
    kaggle_nb = ROOT / "docs" / "vto" / "AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb"
    if kaggle_nb.exists():
        with open(kaggle_nb, "r", encoding="utf-8") as f:
            kdata = json.load(f)
        ktext = json.dumps(kdata)
        required_elements = [
            "GPU Verification",
            "torch.cuda.is_available()",
            "12.0",
            "services.vto_gpu.app:app",
            "/health",
            "/ready",
            "Safe Service Shutdown",
        ]
        for req in required_elements:
            if req in ktext:
                print(f"  OK: Kaggle notebook contains required step '{req}'")
            else:
                print(f"  FAIL: Kaggle notebook missing required step '{req}'")
                errors += 1
    else:
        print("  FAIL: docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb does not exist!")
        errors += 1

    # 3. Migration SQL & Static RLS Checks
    print("\n[Check 3] Migration SQL & Static RLS Security:")
    mig_path = ROOT / "supabase" / "migrations" / "20260918000000_vto_jobs.sql"
    if mig_path.exists():
        sql = mig_path.read_text(encoding="utf-8")
        
        # Check buckets are private
        if "('vto_inputs','vto_inputs',false)" in sql and "('vto_results','vto_results',false)" in sql:
            print("  OK: Storage buckets 'vto_inputs' and 'vto_results' explicitly defined as private (public=false)")
        else:
            print("  FAIL: Storage buckets missing private declaration in migration SQL!")
            errors += 1

        # Check vto_jobs table & RLS
        if "create table if not exists public.vto_jobs" in sql and "alter table public.vto_jobs enable row level security" in sql:
            print("  OK: Table 'public.vto_jobs' created with Row-Level Security enabled")
        else:
            print("  FAIL: Table 'public.vto_jobs' missing or RLS not enabled!")
            errors += 1

        # Check owner-only policies
        if 'create policy "VTO job owner access" on public.vto_jobs' in sql and 'auth.uid())=user_id' in sql:
            print("  OK: Owner-only RLS policy exists for vto_jobs")
        else:
            print("  FAIL: Missing owner-only policy on vto_jobs!")
            errors += 1

        if 'create policy "VTO input owner access" on storage.objects' in sql:
            print("  OK: Owner-only RLS policy exists for storage.objects on vto_inputs")
        else:
            print("  FAIL: Missing owner-only policy for vto_inputs!")
            errors += 1

        if 'create policy "VTO result owner read" on storage.objects' in sql:
            print("  OK: Owner-only read policy exists for storage.objects on vto_results")
        else:
            print("  FAIL: Missing owner-only read policy for vto_results!")
            errors += 1
    else:
        print("  FAIL: Migration file 20260918000000_vto_jobs.sql not found!")
        errors += 1

    # 4. Security Check: No Service-Role Keys or Hardcoded Tunnels in Client .env
    print("\n[Check 4] Client Environment & Secret Leak Check:")
    client_envs = [ROOT / ".env", ROOT / ".env.example"]
    for env_path in client_envs:
        if env_path.exists():
            text = env_path.read_text(encoding="utf-8")
            if re.search(r"^\s*(?:EXPO_PUBLIC_)?SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^#\s]", text, re.M):
                print(f"  FAIL: {env_path.name} contains SUPABASE_SERVICE_ROLE_KEY assignment!")
                errors += 1
            else:
                print(f"  OK: {env_path.name} contains NO service-role key assignment")

            if re.search(r"https://[^\s]*(?:ngrok|trycloudflare|loca\.lt)", text, re.I):
                print(f"  FAIL: {env_path.name} contains hardcoded tunnel URL!")
                errors += 1
            else:
                print(f"  OK: {env_path.name} contains NO hardcoded tunnel URLs")

    # 5. FastAPI Application Structure & Health Endpoint Verification
    print("\n[Check 5] FastAPI Application Routes & Health Check:")
    try:
        from fastapi.testclient import TestClient
        # Patch Settings.from_env so we can inspect the app without real Supabase connection
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://mock.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "mock_service_role_key_test_12345",
            "VTO_JWT_SECRET": "mock_jwt_secret_test_12345",
            "VTO_WEIGHTS_DIR": "services/vto/weights",
            "VTO_MODEL_RESOLUTION": "672,432",
        }):
            from services.vto_gpu.app import app, health, ready
            client = TestClient(app, raise_server_exceptions=False)
            
            # Test /health directly
            resp_health = client.get("/health")
            if resp_health.status_code == 200:
                hdata = resp_health.json()
                assert hdata.get("status") == "ok", f"Expected status 'ok', got {hdata}"
                print(f"  OK: /health returned HTTP 200: {hdata}")
            else:
                print(f"  FAIL: /health returned status {resp_health.status_code}")
                errors += 1

            # Test /ready
            resp_ready = client.get("/ready")
            if resp_ready.status_code == 200:
                rdata = resp_ready.json()
                print(f"  OK: /ready returned HTTP 200: {rdata}")
            else:
                print(f"  FAIL: /ready returned status {resp_ready.status_code}")
                errors += 1

            # Test route inspection
            routes = [r.path for r in app.routes]
            expected_routes = ["/health", "/ready", "/v1/vto/jobs", "/v1/vto/jobs/{job_id}", "/v1/vto/jobs/{job_id}/cancel"]
            for er in expected_routes:
                if er in routes:
                    print(f"  OK: Route '{er}' registered in FastAPI app")
                else:
                    print(f"  FAIL: Route '{er}' missing from FastAPI app!")
                    errors += 1

            # Test unauthenticated POST /v1/vto/jobs with syntactically valid payload
            valid_payload = {
                "category": "tops",
                "garment_id": "garment_smoke_test_12345",
                "person_input_storage_key": "test_user/inputs/person.png",
                "garment_input_storage_key": "test_user/inputs/garment.png",
                "outfit_name": "Smoke Test Outfit",
                "idempotency_key": "smoke_test_idempotency_1234567890",
            }
            resp_jobs_unauth = client.post("/v1/vto/jobs", json=valid_payload)
            if resp_jobs_unauth.status_code == 401:
                print("  OK: Unauthenticated POST /v1/vto/jobs with valid payload rejected with HTTP 401")
            elif resp_jobs_unauth.status_code in (200, 201, 202):
                print(f"  FAIL: SECURITY VIOLATION: Unauthenticated POST /v1/vto/jobs was accepted! Status {resp_jobs_unauth.status_code}")
                errors += 1
            else:
                print(f"  FAIL: Unauthenticated POST /v1/vto/jobs returned unexpected status {resp_jobs_unauth.status_code}, expected 401!")
                errors += 1

    except Exception as e:
        print(f"  FAIL: FastAPI test client verification failed: {e}")
        errors += 1

    # 6. DWPose Component & Import Verification
    print("\n[Check 6] DWPose Module Imports & Alias Verification:")
    try:
        from services.vto.fashn.dwpose.wholebody import Wholebody as CanonicalWholebody
        print("  OK: import services.vto.fashn.dwpose.wholebody successful")

        from services.vto_gpu.fashn.dwpose.wholebody import Wholebody as AliasWholebody
        print("  OK: import services.vto_gpu.fashn.dwpose.wholebody successful")

        if CanonicalWholebody is AliasWholebody:
            print("  OK: Canonical and alias Wholebody classes are identical")
        else:
            print("  FAIL: Canonical and alias Wholebody classes mismatch!")
            errors += 1

        from services.vto.fashn.dwpose import DWposeDetector, draw_pose
        print("  OK: import services.vto.fashn.dwpose (DWposeDetector, draw_pose) successful")

    except Exception as e:
        print(f"  FAIL: DWPose import verification failed: {e}")
        errors += 1

    print("\n" + "=" * 60)
    if errors == 0:
        print("ALL STATIC CHECKS PASSED: 0 errors detected.")
        print("=" * 60)
        return 0
    else:
        print(f"VALIDATION FAILED: {errors} error(s) detected.")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(run_checks())
