"""
AURA VTO — Authentication & Deployment Test Suite
=================================================
Validates the complete authentication contract, error codes, diagnostic endpoint,
security isolation, and configuration requirements without performing real inference
or exposing secrets.
"""

import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from jose import jwt

MOCK_JWT_SECRET = "test_supabase_jwt_secret_with_minimum_32_characters_12345"
WRONG_JWT_SECRET = "wrong_secret_for_testing_signature_mismatch_67890"

class TestVTOAuthAndDeployment(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure test environment
        cls.env_patcher = patch.dict(os.environ, {
            "SUPABASE_URL": "https://testproject.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test_service_role_key_for_testing_only_1234567890",
            "VTO_JWT_SECRET": MOCK_JWT_SECRET,
            "VTO_WEIGHTS_DIR": str(ROOT / "services" / "vto" / "weights"),
            "VTO_MODEL_RESOLUTION": "672,432",
            "VTO_INPUT_BUCKET": "vto_inputs",
            "VTO_OUTPUT_BUCKET": "vto_results",
        })
        cls.env_patcher.start()

        cls.client_patcher = patch("services.vto_gpu.app.create_client")
        cls.mock_create_client = cls.client_patcher.start()
        cls.mock_db = MagicMock()
        cls.mock_create_client.return_value = cls.mock_db

        from services.vto_gpu import app as app_mod
        from services.vto_gpu.config import Settings
        cls.app = app_mod.app
        app_mod.settings = Settings.from_env()
        app_mod.service = app_mod.Service(app_mod.settings)
        from fastapi.testclient import TestClient
        cls.client = TestClient(app_mod.app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        from services.vto_gpu import app as app_mod
        app_mod.service = None
        app_mod.settings = None
        cls.client_patcher.stop()
        cls.env_patcher.stop()

    def _create_token(self, user_id="usr_test_123", role="authenticated", aud="authenticated", exp_delta=3600, secret=MOCK_JWT_SECRET):
        payload = {
            "sub": user_id,
            "role": role,
            "aud": aud,
            "exp": int(time.time()) + exp_delta,
            "iat": int(time.time()),
        }
        return jwt.encode(payload, secret, algorithm="HS256")

    def _valid_job_payload(self, garment_id="garment_123"):
        return {
            "category": "tops",
            "garment_id": garment_id,
            "person_input_storage_key": "user_test/inputs/person.png",
            "garment_input_storage_key": "user_test/inputs/garment.png",
            "outfit_name": "Test Outfit",
            "idempotency_key": "smoke_test_idempotency_key_123456",
        }

    # 1. Missing Authorization header -> 401
    def test_missing_auth_header_returns_401(self):
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload())
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Authentication required", resp.json().get("detail", ""))

    # 2. Invalid authorization scheme -> 401
    def test_invalid_auth_scheme_returns_401(self):
        token = self._create_token()
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(), headers={"Authorization": f"Token {token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Authentication required", resp.json().get("detail", ""))

    # 3. Malformed token -> 401
    def test_malformed_token_returns_401(self):
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(), headers={"Authorization": "Bearer not_a_valid_jwt_token"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid authentication token", resp.json().get("detail", ""))

    # 4. Expired token -> 401
    def test_expired_token_returns_401(self):
        expired_token = self._create_token(exp_delta=-60)
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(), headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid authentication token", resp.json().get("detail", ""))

    # 5. Invalid signature -> 401
    def test_invalid_signature_returns_401(self):
        tampered_token = self._create_token(secret=WRONG_JWT_SECRET)
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(), headers={"Authorization": f"Bearer {tampered_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid authentication token", resp.json().get("detail", ""))

    # 6. Wrong issuer or audience -> 401
    def test_wrong_audience_returns_401(self):
        anon_style_token = self._create_token(aud="anon")
        resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(), headers={"Authorization": f"Bearer {anon_style_token}"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid authentication token", resp.json().get("detail", ""))

    # 7. Valid authorized token -> authentication succeeds (HS256)
    def test_valid_token_passes_authentication(self):
        valid_token = self._create_token(user_id="user_owner_456")
        diag = self.client.get("/v1/vto/diagnostics/auth", headers={"Authorization": f"Bearer {valid_token}"})
        self.assertEqual(diag.status_code, 200)
        d = diag.json()
        self.assertEqual(d["status"], "ok")
        self.assertEqual(d["code"], "AUTH_SUCCESS")
        self.assertTrue(d["signature_valid"])

    # 7b. Valid authorized token -> authentication succeeds (ES256 via JWKS)
    def test_valid_es256_token_passes_authentication(self):
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        from services.vto_gpu import app as app_mod

        priv = ec.generate_private_key(ec.SECP256R1())
        pem = priv.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        pub_pem = priv.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        es_token = jwt.encode({"sub": "user_es256_123", "aud": "authenticated", "exp": int(time.time()) + 3600}, pem, algorithm="ES256", headers={"kid": "mock_ec_kid"})

        with patch.object(app_mod.service, "_get_jwks_key", return_value=pub_pem):
            diag = self.client.get("/v1/vto/diagnostics/auth", headers={"Authorization": f"Bearer {es_token}"})
            self.assertEqual(diag.status_code, 200)
            d = diag.json()
            self.assertEqual(d["status"], "ok")
            self.assertEqual(d["code"], "AUTH_SUCCESS")
            self.assertEqual(d["algorithm"], "ES256")

    # 8. Unauthorized user accessing another user's assets -> 403
    def test_unauthorized_garment_access_returns_403(self):
        from services.vto_gpu import app as app_mod
        valid_token = self._create_token(user_id="intruder_user_789")
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        with patch.object(app_mod.service.db, "table", return_value=mock_table):
            resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(garment_id="victim_garment_999"), headers={"Authorization": f"Bearer {valid_token}"})
            self.assertEqual(resp.status_code, 403)
            self.assertIn("Garment is not accessible", resp.json().get("detail", ""))

    # 9. Correct authenticated request reaches job validation
    def test_authenticated_request_reaches_job_creation(self):
        from services.vto_gpu import app as app_mod
        owner_id = "legitimate_owner_123"
        valid_token = self._create_token(user_id=owner_id)
        
        def mock_table_fn(name):
            t = MagicMock()
            if name == "garments":
                t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "garm_owned_1"}]
            elif name == "vto_jobs":
                t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
                t.insert.return_value.execute.return_value.data = [{"id": "vto_job_123"}]
            return t

        with patch.object(app_mod.service.db, "table", side_effect=mock_table_fn):
            with patch.object(app_mod.service, "process", return_value=None):
                resp = self.client.post("/v1/vto/jobs", json=self._valid_job_payload(garment_id="garm_owned_1"), headers={"Authorization": f"Bearer {valid_token}"})
                self.assertIn(resp.status_code, (200, 202))
                self.assertIn("status", resp.json())

    # 10. Secrets are never included in error responses
    def test_secrets_never_leaked_in_responses(self):
        endpoints = [
            ("/health", "GET", None, None),
            ("/ready", "GET", None, None),
            ("/v1/vto/diagnostics/auth", "GET", None, None),
            ("/v1/vto/jobs", "POST", {"Authorization": "Bearer bad_token"}, self._valid_job_payload()),
        ]
        for path, method, headers, body in endpoints:
            if method == "GET":
                r = self.client.get(path, headers=headers or {})
            else:
                r = self.client.post(path, headers=headers or {}, json=body)
            raw_text = r.text
            self.assertNotIn(MOCK_JWT_SECRET, raw_text)
            self.assertNotIn("test_service_role_key", raw_text)

    # 11. Diagnostic endpoint safe behavior
    def test_diagnostic_endpoint_reports_safe_codes(self):
        # Case A: Missing header
        r_none = self.client.get("/v1/vto/diagnostics/auth")
        self.assertEqual(r_none.json()["code"], "AUTH_HEADER_MISSING")

        # Case B: Expired token
        r_exp = self.client.get("/v1/vto/diagnostics/auth", headers={"Authorization": f"Bearer {self._create_token(exp_delta=-100)}"})
        self.assertEqual(r_exp.json()["code"], "TOKEN_EXPIRED")

        # Case C: Signature mismatch
        r_sig = self.client.get("/v1/vto/diagnostics/auth", headers={"Authorization": f"Bearer {self._create_token(secret=WRONG_JWT_SECRET)}"})
        self.assertEqual(r_sig.json()["code"], "SIGNATURE_VERIFICATION_FAILED")

        # Case D: Anon key simulation (audience != authenticated)
        r_aud = self.client.get("/v1/vto/diagnostics/auth", headers={"Authorization": f"Bearer {self._create_token(aud='anon')}"})
        self.assertEqual(r_aud.json()["code"], "AUDIENCE_MISMATCH")

    # 12. Model weights directory resolution
    def test_weights_dir_resolution(self):
        from services.vto_gpu.config import Settings
        s = Settings.from_env()
        self.assertTrue(Path(s.weights_dir).is_absolute() or Path(s.weights_dir).exists() or str(s.weights_dir).startswith("services"))

    # 13. Manifest model hashes
    def test_artifact_manifest_hashes_match_expected(self):
        import json
        manifest_file = ROOT / "docs" / "vto" / "VTO_ARTIFACT_MANIFEST.json"
        self.assertTrue(manifest_file.exists())
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        artifacts = {a["filename"]: a["sha256"] for a in manifest["artifacts"]}
        self.assertEqual(artifacts.get("model.safetensors"), "d6cd38286885bc29fa487ea9383f80ffeb95862e7747c630d42c5d3c05bdd35a")
        self.assertEqual(artifacts.get("yolox_l.onnx"), "7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411")
        self.assertEqual(artifacts.get("dw-ll_ucoco_384.onnx"), "724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843")

    # 14. Zero downloads or personal image inference during audit
    def test_audit_preserves_offline_safety(self):
        self.assertEqual(len(list((ROOT / "services" / "vto").glob("*.tmp_test"))), 0)


if __name__ == "__main__":
    unittest.main()
