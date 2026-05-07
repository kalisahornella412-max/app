from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt as pyjwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from seed_data import PROGRAMS, JOBS, EVENTS

JWT_ALGORITHM = "HS256"


# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="Halifax Youth Programs API")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60 * 24),
        "type": "access",
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=60 * 60 * 24, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=60 * 60 * 24 * 7, path="/")


def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "user"),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProgramIn(BaseModel):
    slug: str
    name: str
    organization: str
    category: str
    age_min: int = 12
    age_max: int = 30
    neighbourhood: str = "All HRM"
    tags: List[str] = []
    short_description: str
    description: str
    image_url: Optional[str] = None
    apply_url: Optional[str] = None
    is_featured: bool = False


class JobIn(BaseModel):
    title: str
    employer: str
    category: str
    location: str
    wage: Optional[str] = None
    type: Optional[str] = None
    age_min: int = 15
    tags: List[str] = []
    short_description: str
    description: str
    apply_url: Optional[str] = None
    deadline: Optional[str] = None


class EventIn(BaseModel):
    title: str
    host: str
    category: str
    location: str
    starts_at: str
    duration_minutes: int = 60
    description: str
    image_url: Optional[str] = None


class ResumeIn(BaseModel):
    title: str = "My Resume"
    template: str = "classic"
    full_name: str = ""
    headline: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    skills: List[str] = []
    experience: List[dict] = []
    education: List[dict] = []
    projects: List[dict] = []


class AIAssistIn(BaseModel):
    role: str
    company: Optional[str] = ""
    notes: Optional[str] = ""


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    user_id = str(res.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = res.inserted_id
    return serialize_user(doc)


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, request: Request):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        locked_until = rec.get("locked_until")
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=60 * 60 * 24, path="/")
        return {"ok": True}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Programs ----------
def _serialize_doc(d: dict) -> dict:
    d = dict(d)
    d["id"] = str(d.pop("_id"))
    return d


@api.get("/programs")
async def list_programs(
    q: Optional[str] = None,
    category: Optional[str] = None,
    neighbourhood: Optional[str] = None,
    age: Optional[int] = None,
    featured: Optional[bool] = None,
):
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"organization": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    if category and category != "all":
        filt["category"] = category
    if neighbourhood and neighbourhood != "all":
        filt["neighbourhood"] = neighbourhood
    if age is not None:
        filt["age_min"] = {"$lte": age}
        filt["age_max"] = {"$gte": age}
    if featured:
        filt["is_featured"] = True
    docs = await db.programs.find(filt).to_list(500)
    return [_serialize_doc(d) for d in docs]


@api.get("/programs/{program_id}")
async def get_program(program_id: str):
    try:
        doc = await db.programs.find_one({"_id": ObjectId(program_id)})
    except Exception:
        doc = None
    if not doc:
        # try slug
        doc = await db.programs.find_one({"slug": program_id})
    if not doc:
        raise HTTPException(404, "Program not found")
    return _serialize_doc(doc)


@api.post("/programs")
async def create_program(payload: ProgramIn, _admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.programs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.put("/programs/{program_id}")
async def update_program(program_id: str, payload: ProgramIn, _admin: dict = Depends(require_admin)):
    await db.programs.update_one({"_id": ObjectId(program_id)}, {"$set": payload.model_dump()})
    doc = await db.programs.find_one({"_id": ObjectId(program_id)})
    return _serialize_doc(doc)


@api.delete("/programs/{program_id}")
async def delete_program(program_id: str, _admin: dict = Depends(require_admin)):
    await db.programs.delete_one({"_id": ObjectId(program_id)})
    return {"ok": True}


# ---------- Jobs ----------
@api.get("/jobs")
async def list_jobs(
    q: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
):
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"employer": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if category and category != "all":
        filt["category"] = category
    if location:
        filt["location"] = {"$regex": location, "$options": "i"}
    docs = await db.jobs.find(filt).to_list(500)
    return [_serialize_doc(d) for d in docs]


@api.get("/jobs/{job_id}")
async def get_job(job_id: str):
    doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(404, "Job not found")
    return _serialize_doc(doc)


@api.post("/jobs")
async def create_job(payload: JobIn, _admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.jobs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, _admin: dict = Depends(require_admin)):
    await db.jobs.delete_one({"_id": ObjectId(job_id)})
    return {"ok": True}


# ---------- Events ----------
@api.get("/events")
async def list_events():
    docs = await db.events.find({}).sort("starts_at", 1).to_list(200)
    return [_serialize_doc(d) for d in docs]


@api.get("/events/{event_id}")
async def get_event(event_id: str):
    doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not doc:
        raise HTTPException(404, "Event not found")
    return _serialize_doc(doc)


@api.post("/events")
async def create_event(payload: EventIn, _admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.events.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.delete("/events/{event_id}")
async def delete_event(event_id: str, _admin: dict = Depends(require_admin)):
    await db.events.delete_one({"_id": ObjectId(event_id)})
    return {"ok": True}


@api.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, user: dict = Depends(get_current_user)):
    await db.rsvps.update_one(
        {"event_id": event_id, "user_id": str(user["_id"])},
        {"$set": {"event_id": event_id, "user_id": str(user["_id"]), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/events/{event_id}/rsvp")
async def unrsvp_event(event_id: str, user: dict = Depends(get_current_user)):
    await db.rsvps.delete_one({"event_id": event_id, "user_id": str(user["_id"])})
    return {"ok": True}


@api.get("/me/rsvps")
async def my_rsvps(user: dict = Depends(get_current_user)):
    rsvps = await db.rsvps.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(500)
    return rsvps


# ---------- Saved Programs ----------
@api.post("/saved/programs/{program_id}")
async def save_program(program_id: str, user: dict = Depends(get_current_user)):
    await db.saved_programs.update_one(
        {"user_id": str(user["_id"]), "program_id": program_id},
        {"$set": {"user_id": str(user["_id"]), "program_id": program_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/saved/programs/{program_id}")
async def unsave_program(program_id: str, user: dict = Depends(get_current_user)):
    await db.saved_programs.delete_one({"user_id": str(user["_id"]), "program_id": program_id})
    return {"ok": True}


@api.get("/me/saved-programs")
async def my_saved_programs(user: dict = Depends(get_current_user)):
    saved = await db.saved_programs.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(500)
    ids = [s["program_id"] for s in saved]
    obj_ids = []
    for x in ids:
        try:
            obj_ids.append(ObjectId(x))
        except Exception:
            pass
    docs = await db.programs.find({"_id": {"$in": obj_ids}}).to_list(500)
    return [_serialize_doc(d) for d in docs]


# ---------- Resumes ----------
@api.get("/resumes")
async def list_resumes(user: dict = Depends(get_current_user)):
    docs = await db.resumes.find({"user_id": str(user["_id"])}).to_list(100)
    return [_serialize_doc(d) for d in docs]


@api.get("/resumes/{resume_id}")
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(404, "Resume not found")
    return _serialize_doc(doc)


@api.post("/resumes")
async def create_resume(payload: ResumeIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = str(user["_id"])
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    res = await db.resumes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.put("/resumes/{resume_id}")
async def update_resume(resume_id: str, payload: ResumeIn, user: dict = Depends(get_current_user)):
    update = payload.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.resumes.update_one(
        {"_id": ObjectId(resume_id), "user_id": str(user["_id"])},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Resume not found")
    doc = await db.resumes.find_one({"_id": ObjectId(resume_id)})
    return _serialize_doc(doc)


@api.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    await db.resumes.delete_one({"_id": ObjectId(resume_id), "user_id": str(user["_id"])})
    return {"ok": True}


# ---------- AI Resume Helper ----------
@api.post("/resumes/ai-assist")
async def ai_assist(payload: AIAssistIn, _user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(500, "AI assistant unavailable")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    session_id = f"resume-assist-{uuid.uuid4()}"
    system = (
        "You are a resume coach for Halifax youth (ages 14-30). "
        "Generate 4 concise, action-oriented resume bullet points for the role provided. "
        "Use strong action verbs, quantify impact when possible, and keep each bullet under 22 words. "
        "Return ONLY the 4 bullet points, one per line, starting each with a hyphen."
    )
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    prompt = f"Role/Job Title: {payload.role}\nEmployer: {payload.company or 'N/A'}\nNotes from candidate: {payload.notes or 'None'}\n\nGenerate the bullets."
    try:
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")

    lines = [ln.strip().lstrip("-•").strip() for ln in str(text).splitlines() if ln.strip()]
    bullets = [ln for ln in lines if len(ln) > 5][:4]
    return {"bullets": bullets, "raw": str(text)}


# ---------- Health & Stats ----------
@api.get("/")
async def root():
    return {"name": "Halifax Youth Programs API", "ok": True}


@api.get("/stats")
async def stats():
    return {
        "programs": await db.programs.count_documents({}),
        "jobs": await db.jobs.count_documents({}),
        "events": await db.events.count_documents({}),
        "users": await db.users.count_documents({}),
    }


# ---------- Startup: indexes + seed ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.programs.create_index("slug", unique=True)
    await db.login_attempts.create_index("identifier")

    # Admin seeding
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@halifaxyouth.ca")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Halifax Youth Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})
        logger.info("Updated admin password")

    # Seed programs (upsert so updates to seed_data.py propagate)
    for p in PROGRAMS:
        doc = dict(p)
        await db.programs.update_one(
            {"slug": p["slug"]},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
    # Seed jobs (only if collection empty)
    if await db.jobs.count_documents({}) == 0:
        for j in JOBS:
            doc = dict(j)
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.jobs.insert_one(doc)
    # Seed events (only if empty)
    if await db.events.count_documents({}) == 0:
        for e in EVENTS:
            doc = dict(e)
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.events.insert_one(doc)
    logger.info("Startup seed complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Mount router & CORS ----------
app.include_router(api)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed = [frontend_url, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
