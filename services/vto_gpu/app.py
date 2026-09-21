"""Run with: uvicorn services.vto_gpu.app:app --host 127.0.0.1 --port 8001."""
import asyncio, io, os, tempfile, time, traceback, uuid
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, Header, HTTPException, status
from jose import JWTError, jwt
from PIL import Image
from pydantic import BaseModel, Field
from supabase import create_client
from .config import Settings

class JobCreate(BaseModel):
    category: str = Field(pattern="^(tops|bottoms)$")
    person_input_storage_key: str = Field(pattern=r"^[A-Za-z0-9_./-]+$")
    garment_input_storage_key: str = Field(pattern=r"^[A-Za-z0-9_./-]+$")
    garment_id: str = Field(min_length=1, max_length=128)
    outfit_name: str | None = Field(default=None, max_length=100)
    idempotency_key: str = Field(min_length=16, max_length=128)

class Service:
    def __init__(self, settings: Settings):
        self.settings=settings; self.db=create_client(settings.supabase_url, settings.supabase_service_role_key)
        self.pipeline=None; self.lock=asyncio.Semaphore(settings.max_concurrent_jobs)
    def _get_jwks_key(self, kid: str | None = None):
        if not hasattr(self, "_jwks_cache") or not self._jwks_cache:
            import urllib.request, json
            from jose import jwk
            url = f"{self.settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            req = urllib.request.Request(url, headers={"User-Agent": "AURA-VTO-Service/1.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                jwks_data = json.loads(res.read().decode("utf-8"))
            keys_dict = {}
            for k in jwks_data.get("keys", []):
                key_obj = jwk.construct(k)
                if "kid" in k:
                    keys_dict[k["kid"]] = key_obj
                if "_default" not in keys_dict:
                    keys_dict["_default"] = key_obj
            self._jwks_cache = keys_dict
        if kid and kid in self._jwks_cache:
            return self._jwks_cache[kid]
        return self._jwks_cache.get("_default")

    def user(self, token: str) -> str:
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")
            if alg == "ES256":
                key = self._get_jwks_key(unverified_header.get("kid"))
                return jwt.decode(token, key, algorithms=["ES256"], audience="authenticated")["sub"]
            return jwt.decode(token, self.settings.jwt_secret, algorithms=["HS256"], audience="authenticated")["sub"]
        except (JWTError, KeyError): raise HTTPException(401, "Invalid authentication token")
    def load(self):
        if self.pipeline is None:
            print("[VTO SERVICE] Loading DecoupledTryOnPipeline (MMDiT + DWPose)...", flush=True)
            try:
                from services.vto.fashn.decoupled_pipeline import DecoupledTryOnPipeline
                pipeline = DecoupledTryOnPipeline(self.settings.weights_dir, input_shape=self.settings.model_resolution)
                self.pipeline = pipeline
                print("[VTO SERVICE] >>> Readiness flag set to true (both MMDiT and DWPose loaded successfully) <<<", flush=True)
            except Exception:
                print(f"[VTO SERVICE ERROR] Failed to load DecoupledTryOnPipeline:\n{traceback.format_exc()}", flush=True)
                raise
    def _owned_garment(self, user_id: str, garment_id: str):
        data=self.db.table("garments").select("id").eq("id",garment_id).eq("user_id",user_id).execute().data
        if not data: raise HTTPException(403,"Garment is not accessible")
    async def process(self, job_id: str):
        async with self.lock:
            row=self.db.table("vto_jobs").select("*").eq("id",job_id).single().execute().data
            if row["status"] == "cancelled": return
            self.db.table("vto_jobs").update({"status":"processing","started_at":"now()"}).eq("id",job_id).execute()
            started=time.monotonic()
            try:
                self.load()
                # Storage keys, never client paths; files are isolated and removed automatically.
                with tempfile.TemporaryDirectory(prefix="aura-vto-") as temp:
                    p=Path(temp); person=p/"person"; garment=p/"garment"; output=p/"result.png"
                    person.write_bytes(self.db.storage.from_(self.settings.input_bucket).download(row["person_input_storage_key"]))
                    garment.write_bytes(self.db.storage.from_(self.settings.input_bucket).download(row["garment_input_storage_key"]))
                    a,b=Image.open(person).convert("RGB"),Image.open(garment).convert("RGB")
                    result=self.pipeline(a,b,category=row["category"],garment_photo_type="flat-lay",num_samples=1,num_timesteps=30,guidance_scale=1.5,seed=42)
                    image=result.images[0]; image.save(output,"PNG")
                    if self.db.table("vto_jobs").select("status").eq("id",job_id).single().execute().data["status"] == "cancelled": return
                    key=f"{row['user_id']}/{job_id}.png"; self.db.storage.from_(self.settings.output_bucket).upload(key, output.read_bytes(), {"content-type":"image/png","upsert":"false"})
                self.db.table("vto_jobs").update({"status":"completed","output_storage_key":key,"completed_at":"now()","processing_duration_ms":round((time.monotonic()-started)*1000)}).eq("id",job_id).execute()
            except Exception:
                self.db.table("vto_jobs").update({"status":"failed","error_code":"INFERENCE_FAILED","safe_error_message":"VTO processing failed.","failed_at":"now()"}).eq("id",job_id).execute()

settings: Settings | None = None; service: Service | None = None
@asynccontextmanager
async def lifespan(app: FastAPI):
    global settings, service
    print("[VTO LIFESPAN] >>> Starting AURA GPU VTO lifespan initialization <<<", flush=True)
    try:
        settings = Settings.from_env()
        service = Service(settings)
        print(f"[VTO LIFESPAN] Settings loaded. Starting model loading in thread pool...", flush=True)
        await asyncio.to_thread(service.load)
        print("[VTO LIFESPAN] >>> Lifespan startup completed: Service is READY. /ready will return true. <<<", flush=True)
    except Exception:
        print(f"[VTO LIFESPAN FATAL ERROR] Model initialization failed during lifespan startup:\n{traceback.format_exc()}", flush=True)
        raise
    yield
    print("[VTO LIFESPAN] Lifespan shutdown: Cleaning up service...", flush=True)
    service = None
    settings = None
app=FastAPI(title="AURA GPU VTO", lifespan=lifespan)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(401,"Authentication required")
    if service is None or service.settings is None: raise HTTPException(503, "VTO service is starting up and not yet ready")
    return service.user(authorization[7:])
@app.get("/health")
def health(): return {"status":"ok","message":"VTO GPU service active and ready."}
@app.get("/ready")
def ready(): return {"ready": service is not None and service.pipeline is not None}
@app.get("/v1/vto/diagnostics/auth")
def auth_diagnostics(authorization: str | None = Header(default=None)):
    """Safe, sanitized authentication diagnostic endpoint.
    Exposes NO secrets, NO tokens, NO personal claims, NO file paths, and NO bucket names.
    Returns safe structural diagnostic codes to help identify why POST /v1/vto/jobs returns 401.
    """
    secret_configured = bool(service and service.settings and service.settings.jwt_secret)
    if not authorization:
        return {
            "status": "fail",
            "code": "AUTH_HEADER_MISSING",
            "message": "Authorization header is missing or was stripped by proxy/tunnel.",
            "header_present": False,
            "scheme_valid": False,
            "token_structure_valid": False,
            "jwt_secret_configured": secret_configured,
        }
    if not authorization.startswith("Bearer "):
        return {
            "status": "fail",
            "code": "AUTH_SCHEME_INVALID",
            "message": "Authorization scheme must be 'Bearer <token>'.",
            "header_present": True,
            "scheme_valid": False,
            "token_structure_valid": False,
            "jwt_secret_configured": secret_configured,
        }
    token = authorization[7:].strip()
    parts = token.split(".")
    if len(parts) != 3:
        return {
            "status": "fail",
            "code": "TOKEN_STRUCTURE_INVALID",
            "message": "Token does not have 3 dot-separated JWT segments.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": False,
            "jwt_secret_configured": secret_configured,
        }
    try:
        from jose import jwt as jose_jwt
        unverified_header = jose_jwt.get_unverified_header(token)
        unverified_claims = jose_jwt.get_unverified_claims(token)
    except Exception:
        return {
            "status": "fail",
            "code": "TOKEN_PARSE_ERROR",
            "message": "Failed to decode unverified JWT structure.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": False,
            "jwt_secret_configured": secret_configured,
        }
    token_alg = unverified_header.get("alg")
    has_sub = "sub" in unverified_claims
    aud = unverified_claims.get("aud")
    is_aud_authenticated = (aud == "authenticated")
    exp = unverified_claims.get("exp")
    is_expired = (exp is not None and exp < time.time())

    if token_alg not in ("HS256", "ES256"):
        return {
            "status": "fail",
            "code": "ALGORITHM_MISMATCH",
            "message": f"Token algorithm '{token_alg}' is neither HS256 nor ES256.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": has_sub,
            "is_aud_authenticated": is_aud_authenticated,
            "is_expired": is_expired,
            "jwt_secret_configured": secret_configured,
        }
    if not is_aud_authenticated:
        return {
            "status": "fail",
            "code": "AUDIENCE_MISMATCH",
            "message": f"Token audience is not 'authenticated' (found: '{aud}'). Anon keys cannot authenticate user jobs.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": has_sub,
            "is_aud_authenticated": False,
            "is_expired": is_expired,
            "jwt_secret_configured": secret_configured,
        }
    if not has_sub:
        return {
            "status": "fail",
            "code": "MISSING_SUB_CLAIM",
            "message": "Token is missing 'sub' claim. A user access token is required, not an anon key.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": False,
            "is_aud_authenticated": is_aud_authenticated,
            "is_expired": is_expired,
            "jwt_secret_configured": secret_configured,
        }
    if is_expired:
        return {
            "status": "fail",
            "code": "TOKEN_EXPIRED",
            "message": "Token has expired. Client must refresh the Supabase session.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": has_sub,
            "is_aud_authenticated": is_aud_authenticated,
            "is_expired": True,
            "jwt_secret_configured": secret_configured,
        }
    try:
        if token_alg == "ES256":
            key = service._get_jwks_key(unverified_header.get("kid"))
            jose_jwt.decode(token, key, algorithms=["ES256"], audience="authenticated")
        else:
            jose_jwt.decode(token, service.settings.jwt_secret, algorithms=["HS256"], audience="authenticated")
        return {
            "status": "ok",
            "code": "AUTH_SUCCESS",
            "message": "Token is structurally valid, signed correctly, and authorized for VTO jobs.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": True,
            "is_aud_authenticated": True,
            "is_expired": False,
            "signature_valid": True,
            "jwt_secret_configured": True,
        }
    except Exception:
        return {
            "status": "fail",
            "code": "SIGNATURE_VERIFICATION_FAILED",
            "message": "Cryptographic signature verification failed. The signing key does not match this token.",
            "header_present": True,
            "scheme_valid": True,
            "token_structure_valid": True,
            "algorithm": token_alg,
            "has_sub": True,
            "is_aud_authenticated": True,
            "is_expired": False,
            "signature_valid": False,
            "jwt_secret_configured": True,
        }

@app.post("/v1/vto/jobs", status_code=202)
async def create_job(body: JobCreate, user_id: str=Depends(current_user)):
    service._owned_garment(user_id,body.garment_id)
    existing=service.db.table("vto_jobs").select("id,status").eq("user_id",user_id).eq("idempotency_key",body.idempotency_key).execute().data
    if existing:return existing[0]
    job_id="vto_"+uuid.uuid4().hex; data=body.model_dump()|{"id":job_id,"user_id":user_id,"status":"queued","model_version":"fashn-vton-1.5","model_resolution":list(settings.model_resolution),"inference_parameters":{"num_timesteps":30,"guidance_scale":1.5,"seed":42}}
    service.db.table("vto_jobs").insert(data).execute(); asyncio.create_task(service.process(job_id)); return {"id":job_id,"status":"queued"}
@app.get("/v1/vto/jobs/{job_id}")
def job(job_id:str,user_id:str=Depends(current_user)):
    row=service.db.table("vto_jobs").select("*").eq("id",job_id).eq("user_id",user_id).single().execute().data
    if not row: raise HTTPException(404,"Job not found")
    if row.get("output_storage_key"): row["result_signed_url"]=service.db.storage.from_(settings.output_bucket).create_signed_url(row["output_storage_key"],300)["signedURL"]
    return row
@app.post("/v1/vto/jobs/{job_id}/cancel")
def cancel(job_id:str,user_id:str=Depends(current_user)):
    service.db.table("vto_jobs").update({"status":"cancelled","cancelled_at":"now()"}).eq("id",job_id).eq("user_id",user_id).eq("status","queued").execute(); return {"id":job_id,"status":"cancelled"}
