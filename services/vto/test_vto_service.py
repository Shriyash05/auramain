import io
import base64
import unittest
from PIL import Image
from fastapi.testclient import TestClient
from services.vto.server import app

def generate_test_image_b64(width=128, height=128, color=(100, 150, 200)) -> str:
    """Generates a small test JPEG as base64 data URI."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

class TestVTOService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("vram_gb", data)
        self.assertIn("hardware_status", data)
        self.assertIn("license_status", data)
        self.assertIn("blockers", data)
        self.assertIsInstance(data["blockers"], list)
        self.assertGreater(len(data["blockers"]), 0)

    def test_license_audit_endpoint(self):
        response = self.client.get("/license-audit")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["engine"], "Aura-VTO-Service")
        self.assertIn("audits", data)
        # Verify fashn-vton-1.5, fashn-human-parser, and CatVTON are covered
        components = [a["component"] for a in data["audits"]]
        self.assertTrue(any("fashn-vton-1.5" in c for c in components))
        self.assertTrue(any("fashn-human-parser" in c for c in components))
        self.assertTrue(any("CatVTON" in c for c in components))

    def test_tryon_input_validation_empty(self):
        # Empty payload
        response = self.client.post("/tryon", json={})
        self.assertEqual(response.status_code, 422)

    def test_tryon_input_validation_invalid_category(self):
        payload = {
            "user_id": "test_user",
            "person_image": generate_test_image_b64(),
            "garment_image": generate_test_image_b64(),
            "category": "invalid_category_xyz"
        }
        response = self.client.post("/tryon", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_tryon_input_validation_corrupted_image(self):
        payload = {
            "user_id": "test_user",
            "person_image": "data:image/jpeg;base64,not_a_valid_image_string_at_all",
            "garment_image": generate_test_image_b64(),
            "category": "tops"
        }
        response = self.client.post("/tryon", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_tryon_execution_honest_blocker_reporting(self):
        """
        Verifies that when hardware VRAM < 8GB or non-commercial license constraints are present,
        the service does NOT fake a try-on, but reports HTTP 503 with exact diagnostic blockers.
        """
        payload = {
            "user_id": "user_real_test",
            "person_image": generate_test_image_b64(256, 384, (220, 200, 180)),
            "garment_image": generate_test_image_b64(256, 384, (50, 80, 140)),
            "category": "tops",
            "outfit_name": "Audited Test Look"
        }
        response = self.client.post("/tryon", json=payload)
        self.assertEqual(response.status_code, 503)
        data = response.json()
        self.assertEqual(data["status"], "engine_unavailable")
        self.assertEqual(data["error_code"], "VTO_BLOCKED")
        self.assertIn("error_message", data)
        self.assertIn("blockers", data)
        self.assertTrue(len(data["blockers"]) > 0)

if __name__ == "__main__":
    unittest.main()
