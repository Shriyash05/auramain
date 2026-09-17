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
    def user(self, token: str) -> str:
        try: return jwt.decode(token, self.settings.jwt_secret, algorithms=["HS256"], audience="authenticated")["sub"]
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
def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "): raise HTTPException(401,"Authentication required")
    return service.user(authorization[7:])
@app.get("/health")
def health(): return {"status":"ok","message":"VTO GPU service active and ready."}
@app.get("/ready")
def ready(): return {"ready": service is not None and service.pipeline is not None}
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
