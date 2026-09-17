from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    jwt_secret: str
    weights_dir: str
    model_resolution: tuple[int, int]
    max_concurrent_jobs: int = 1
    inference_timeout_seconds: int = 600
    input_bucket: str = "vto_inputs"
    output_bucket: str = "vto_results"

    @classmethod
    def from_env(cls) -> "Settings":
        raw = os.getenv("VTO_MODEL_RESOLUTION", "672,432").split(",")
        if len(raw) != 2 or not all(x.strip().isdigit() for x in raw):
            raise RuntimeError("VTO_MODEL_RESOLUTION must be 'height,width'")
        required = ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VTO_JWT_SECRET")
        missing = [name for name in required if not os.getenv(name)]
        if missing: raise RuntimeError(f"Missing server configuration: {', '.join(missing)}")
        return cls(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"], os.environ["VTO_JWT_SECRET"], os.getenv("VTO_WEIGHTS_DIR", "services/vto/weights"), (int(raw[0]), int(raw[1])), input_bucket=os.getenv("VTO_INPUT_BUCKET", "vto_inputs"), output_bucket=os.getenv("VTO_OUTPUT_BUCKET", "vto_results"))
