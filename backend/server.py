from bson.errors import InvalidId
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt as pyjwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from seed_data import PROGRAMS, JOBS, EVENTS, JOB_FEEDS, EVENT_FEEDS
from jobbank_scraper import fetch_live_jobs
from emailer import send_email, closing_soon_html, UndeliverableRecipient

JWT_ALGORITHM = "HS256"
APP_STATUSES = ("saved", "applied", "interviewed", "hired")


# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="Halifax Youth Hub API")


@app.exception_handler(InvalidId)
async def invalid_id_handler(_request, _exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})
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
        "email_reminders": u.get("email_reminders", True),
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
    audiences: List[str] = ["youth"]
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
    slug: Optional[str] = None
    title: str
    employer: str
    category: str
    audiences: List[str] = ["youth"]
    location: str
    wage: Optional[str] = None
    type: Optional[str] = None
    age_min: int = 15
    tags: List[str] = []
    short_description: str
    description: str
    apply_url: Optional[str] = None
    deadline: Optional[str] = None
    posted_at: Optional[str] = None


class EventIn(BaseModel):
    slug: Optional[str] = None
    title: str
    host: str
    category: str
    audiences: List[str] = ["youth"]
    location: str
    starts_at: str = ""
    host_url: Optional[str] = None
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


class AISummaryIn(BaseModel):
    summary: Optional[str] = ""
    headline: Optional[str] = ""
    skills: List[str] = []
    roles: List[str] = []


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


class PreferencesIn(BaseModel):
    email_reminders: bool


@api.patch("/me/preferences")
async def update_preferences(payload: PreferencesIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"email_reminders": payload.email_reminders}})
    user["email_reminders"] = payload.email_reminders
    return serialize_user(user)


@api.delete("/me")
async def delete_my_account(response: Response, user: dict = Depends(get_current_user)):
    """User-initiated permanent deletion of their account and everything tied to it."""
    uid = str(user["_id"])
    for coll in (db.resumes, db.cover_letters, db.saved_jobs, db.saved_programs, db.rsvps, db.digest_log):
        await coll.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": user["_id"]})
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
    audience: Optional[str] = None,
):
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"name": {"$regex": re.escape(q), "$options": "i"}},
            {"organization": {"$regex": re.escape(q), "$options": "i"}},
            {"description": {"$regex": re.escape(q), "$options": "i"}},
            {"tags": {"$regex": re.escape(q), "$options": "i"}},
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
    if audience and audience != "all":
        filt["audiences"] = audience
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
    doc["seeded"] = False
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
    audience: Optional[str] = None,
):
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"title": {"$regex": re.escape(q), "$options": "i"}},
            {"employer": {"$regex": re.escape(q), "$options": "i"}},
            {"description": {"$regex": re.escape(q), "$options": "i"}},
        ]
    if category and category != "all":
        filt["category"] = category
    if location:
        filt["location"] = {"$regex": re.escape(location), "$options": "i"}
    if audience and audience != "all":
        filt["audiences"] = audience
    docs = await db.jobs.find(filt).sort("posted_at", -1).to_list(500)
    return [_serialize_doc(d) for d in docs]


@api.get("/job-feeds")
async def list_job_feeds(audience: Optional[str] = None):
    filt: dict = {}
    if audience and audience != "all":
        filt["audiences"] = audience
    docs = await db.job_feeds.find(filt).to_list(200)
    return [_serialize_doc(d) for d in docs]


@api.get("/event-feeds")
async def list_event_feeds(audience: Optional[str] = None):
    filt: dict = {}
    if audience and audience != "all":
        filt["audiences"] = audience
    docs = await db.event_feeds.find(filt).to_list(200)
    return [_serialize_doc(d) for d in docs]


@api.get("/live-jobs")
async def list_live_jobs(audience: Optional[str] = None, limit: int = 24):
    """Live Halifax jobs scraped from Job Bank Canada (cached 30 min).
    Audience filters: 'youth' → entry-level only; 'immigrant' → everything else."""
    aud = audience if audience in ("youth", "immigrant") else "all"
    return await fetch_live_jobs(audience=aud, limit=limit)


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
    doc["seeded"] = False
    res = await db.jobs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, _admin: dict = Depends(require_admin)):
    await db.jobs.delete_one({"_id": ObjectId(job_id)})
    return {"ok": True}


# ---------- Events ----------
@api.get("/events")
async def list_events(audience: Optional[str] = None):
    filt: dict = {}
    if audience and audience != "all":
        filt["audiences"] = audience
    docs = await db.events.find(filt).to_list(200)
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
    doc["seeded"] = False
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
    status_by_id = {s["program_id"]: s.get("status", "saved") for s in saved}
    obj_ids = []
    for x in status_by_id:
        try:
            obj_ids.append(ObjectId(x))
        except Exception:
            pass
    docs = await db.programs.find({"_id": {"$in": obj_ids}}).to_list(500)
    out = []
    for d in docs:
        item = _serialize_doc(d)
        item["status"] = status_by_id.get(item["id"], "saved")
        out.append(item)
    return out


class StatusIn(BaseModel):
    status: str


def _check_status(status: str) -> str:
    if status not in APP_STATUSES:
        raise HTTPException(400, f"status must be one of {', '.join(APP_STATUSES)}")
    return status


@api.patch("/saved/programs/{program_id}/status")
async def set_program_status(program_id: str, payload: StatusIn, user: dict = Depends(get_current_user)):
    status = _check_status(payload.status)
    res = await db.saved_programs.update_one(
        {"user_id": str(user["_id"]), "program_id": program_id},
        {"$set": {"status": status, "status_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Saved program not found")
    return {"ok": True, "status": status}


# ---------- Saved Jobs (snapshot — live Job Bank postings are ephemeral) ----------
class SavedJobIn(BaseModel):
    job_id: str
    title: str
    employer: Optional[str] = None
    location: Optional[str] = None
    wage: Optional[str] = None
    apply_url: str
    source: str = "Job Bank"
    posted_at: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None


@api.post("/saved/jobs")
async def save_job(payload: SavedJobIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"user_id": str(user["_id"]), "created_at": datetime.now(timezone.utc).isoformat()})
    await db.saved_jobs.update_one(
        {"user_id": str(user["_id"]), "job_id": payload.job_id},
        {"$set": doc, "$setOnInsert": {"status": "saved"}},
        upsert=True,
    )
    return {"ok": True}


@api.patch("/saved/jobs/{job_id}/status")
async def set_job_status(job_id: str, payload: StatusIn, user: dict = Depends(get_current_user)):
    status = _check_status(payload.status)
    res = await db.saved_jobs.update_one(
        {"user_id": str(user["_id"]), "job_id": job_id},
        {"$set": {"status": status, "status_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Saved job not found")
    return {"ok": True, "status": status}


@api.delete("/saved/jobs/{job_id}")
async def unsave_job(job_id: str, user: dict = Depends(get_current_user)):
    await db.saved_jobs.delete_one({"user_id": str(user["_id"]), "job_id": job_id})
    return {"ok": True}


@api.get("/me/saved-jobs")
async def my_saved_jobs(user: dict = Depends(get_current_user)):
    docs = await db.saved_jobs.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d.setdefault("status", "saved")
    return docs


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
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    prompt = f"Role/Job Title: {payload.role}\nEmployer: {payload.company or 'N/A'}\nNotes from candidate: {payload.notes or 'None'}\n\nGenerate the bullets."
    try:
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")

    lines = [ln.strip().lstrip("-•").strip() for ln in str(text).splitlines() if ln.strip()]
    bullets = [ln for ln in lines if len(ln) > 5][:4]
    return {"bullets": bullets, "raw": str(text)}


@api.post("/resumes/ai-summary")
async def ai_summary(payload: AISummaryIn, _user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(500, "AI assistant unavailable")
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    if not (payload.summary or payload.headline or payload.skills or payload.roles):
        raise HTTPException(400, "Add a headline, skills or a draft summary first")
    system = (
        "You are a resume coach for Halifax youth and newcomers to Canada. "
        "Write or polish a professional resume summary of 2-3 sentences (max 60 words), first-person implied (no 'I'), "
        "Canadian English, confident and plain. Return ONLY the summary text."
    )
    chat = LlmChat(api_key=api_key, session_id=f"resume-summary-{uuid.uuid4()}", system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    prompt = (
        f"Headline: {payload.headline or 'N/A'}\nSkills: {', '.join(payload.skills) or 'N/A'}\n"
        f"Roles held: {', '.join(payload.roles) or 'N/A'}\nDraft summary: {payload.summary or 'None'}"
    )
    try:
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")
    return {"summary": str(text).strip().strip('"')}


# ---------- Cover Letters ----------
class CoverLetterGenIn(BaseModel):
    resume_id: str
    job_title: str
    employer: Optional[str] = ""
    job_description: Optional[str] = ""
    job_id: Optional[str] = None
    apply_url: Optional[str] = None


class CoverLetterUpdateIn(BaseModel):
    content: str
    title: Optional[str] = None


def _resume_text(r: dict) -> str:
    exp = "\n".join(
        f"- {e.get('role','')} at {e.get('company','')} ({e.get('start','')}–{e.get('end','')}): " + "; ".join(e.get("bullets") or [])
        for e in r.get("experience") or []
    )
    edu = "\n".join(f"- {e.get('program','')} — {e.get('school','')}" for e in r.get("education") or [])
    return (
        f"Name: {r.get('full_name','')}\nHeadline: {r.get('headline','')}\nLocation: {r.get('location','')}\n"
        f"Summary: {r.get('summary','')}\nSkills: {', '.join(r.get('skills') or [])}\nExperience:\n{exp or '- none yet'}\nEducation:\n{edu or '- none listed'}"
    )


@api.post("/cover-letters/generate")
async def generate_cover_letter(payload: CoverLetterGenIn, user: dict = Depends(get_current_user)):
    resume = await db.resumes.find_one({"_id": ObjectId(payload.resume_id), "user_id": str(user["_id"])})
    if not resume:
        raise HTTPException(404, "Resume not found")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(500, "AI assistant unavailable")
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    system = (
        "You are a career coach writing cover letters for Halifax, Nova Scotia youth and newcomers to Canada. "
        "Write a complete, ready-to-send cover letter in Canadian English: 3 short paragraphs, 180-260 words, "
        "warm but professional, first person, no clichés, no placeholders in square brackets. "
        "Use only facts from the resume — never invent experience. Open with 'Dear Hiring Manager,' and close with "
        "'Sincerely,' followed by the candidate's name on its own line. Return ONLY the letter text."
    )
    chat = LlmChat(api_key=api_key, session_id=f"cover-{uuid.uuid4()}", system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    prompt = (
        f"JOB\nTitle: {payload.job_title}\nEmployer: {payload.employer or 'the employer'}\n"
        f"Posting details: {payload.job_description or 'not provided'}\n\nCANDIDATE RESUME\n{_resume_text(resume)}"
    )
    try:
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": str(user["_id"]),
        "resume_id": payload.resume_id,
        "title": f"{payload.job_title}" + (f" — {payload.employer}" if payload.employer else ""),
        "job_title": payload.job_title,
        "employer": payload.employer or "",
        "job_id": payload.job_id,
        "apply_url": payload.apply_url,
        "content": str(text).strip(),
        "created_at": now,
        "updated_at": now,
    }
    res = await db.cover_letters.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _serialize_doc(doc)


@api.get("/cover-letters")
async def list_cover_letters(user: dict = Depends(get_current_user)):
    docs = await db.cover_letters.find({"user_id": str(user["_id"])}).sort("updated_at", -1).to_list(200)
    return [_serialize_doc(d) for d in docs]


@api.put("/cover-letters/{letter_id}")
async def update_cover_letter(letter_id: str, payload: CoverLetterUpdateIn, user: dict = Depends(get_current_user)):
    update = {"content": payload.content, "updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.title:
        update["title"] = payload.title
    res = await db.cover_letters.update_one({"_id": ObjectId(letter_id), "user_id": str(user["_id"])}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Cover letter not found")
    return _serialize_doc(await db.cover_letters.find_one({"_id": ObjectId(letter_id)}))


@api.delete("/cover-letters/{letter_id}")
async def delete_cover_letter(letter_id: str, user: dict = Depends(get_current_user)):
    await db.cover_letters.delete_one({"_id": ObjectId(letter_id), "user_id": str(user["_id"])})
    return {"ok": True}


# ---------- Interview Prep Coach ----------
class InterviewQuestionsIn(BaseModel):
    job_id: str
    resume_id: Optional[str] = None


class InterviewChatIn(BaseModel):
    job_id: str
    session_id: Optional[str] = None
    message: Optional[str] = Field(default=None, max_length=2000)
    resume_id: Optional[str] = None


def _llm_chat(system: str, session_id: str):
    try:
        from emergentintegrations.llm.chat import LlmChat
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(500, "AI assistant unavailable")
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    return LlmChat(api_key=api_key, session_id=session_id, system_message=system).with_model("anthropic", "claude-sonnet-4-6")


async def _interview_context(user: dict, job_id: str, resume_id: Optional[str]) -> tuple[dict, str]:
    job = await db.saved_jobs.find_one({"user_id": str(user["_id"]), "job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Saved job not found")
    if job.get("status") not in ("interviewed", "hired"):
        raise HTTPException(400, "Mark this job as Interviewed to unlock interview prep")
    resume = None
    if resume_id:
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": str(user["_id"])})
    if not resume:
        resume = await db.resumes.find_one({"user_id": str(user["_id"])}, sort=[("updated_at", -1)])
    ctx = (
        f"JOB\nTitle: {job['title']}\nEmployer: {job.get('employer') or 'unknown'}\nLocation: {job.get('location') or 'Halifax'}\n"
        f"Details: {job.get('description') or 'not provided'}\n\nCANDIDATE RESUME\n{_resume_text(resume) if resume else 'No resume saved yet — assume an entry-level candidate.'}"
    )
    return job, ctx


@api.post("/interview-prep/questions")
async def interview_questions(payload: InterviewQuestionsIn, user: dict = Depends(get_current_user)):
    job, ctx = await _interview_context(user, payload.job_id, payload.resume_id)
    system = (
        "You are an interview coach for Halifax, Nova Scotia youth and newcomers to Canada. "
        "Produce exactly 8 realistic interview questions for the job, tailored to the candidate's resume: "
        "2 about motivation/fit, 3 behavioural (STAR), 2 role-specific/practical, 1 'questions for us'. "
        "For each give a short tip (max 25 words) and a sample answer (60-90 words, first person, drawn only from the resume facts; "
        "if the resume lacks something, show how to answer honestly). Plain Canadian English. "
        'Return ONLY JSON: {"questions":[{"question":"...","tip":"...","sample_answer":"..."}]}'
    )
    chat = _llm_chat(system, f"interview-q-{uuid.uuid4()}")
    from emergentintegrations.llm.chat import UserMessage
    try:
        text = str(await chat.send_message(UserMessage(text=ctx)))
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")
    import json as _json
    m = re.search(r"\{.*\}", text, re.S)
    try:
        data = _json.loads(m.group(0) if m else text)
        questions = [q for q in data.get("questions", []) if q.get("question")][:8]
    except Exception:
        raise HTTPException(502, "AI returned an unexpected format — try again")
    if not questions:
        raise HTTPException(502, "AI returned no questions — try again")
    now = datetime.now(timezone.utc).isoformat()
    await db.interview_preps.update_one(
        {"user_id": str(user["_id"]), "job_id": payload.job_id},
        {"$set": {"user_id": str(user["_id"]), "job_id": payload.job_id, "job_title": job["title"], "employer": job.get("employer"), "questions": questions, "updated_at": now}},
        upsert=True,
    )
    return {"job_id": payload.job_id, "job_title": job["title"], "employer": job.get("employer"), "questions": questions, "updated_at": now}


@api.get("/interview-prep/{job_id}")
async def get_interview_prep(job_id: str, user: dict = Depends(get_current_user)):
    doc = await db.interview_preps.find_one({"user_id": str(user["_id"]), "job_id": job_id}, {"_id": 0})
    session = await db.interview_sessions.find_one({"user_id": str(user["_id"]), "job_id": job_id}, {"_id": 0}, sort=[("updated_at", -1)])
    return {"prep": doc, "session": session}


MOCK_SYSTEM = (
    "You are a friendly but realistic hiring manager running a mock interview for the job below, with a Halifax youth or newcomer candidate. "
    "Ask ONE question at a time. After each candidate answer: give 2-3 sentences of specific, encouraging feedback (what worked, one concrete improvement), "
    "then ask the next question. Cover motivation, behavioural (STAR), and role-specific questions over the session. "
    "After the 6th answer, instead of a new question give a short overall summary (strengths, top 2 things to practise, a confidence score out of 10) and end with 'Interview complete.' "
    "Keep each reply under 140 words. Plain Canadian English. Never invent facts about the candidate.\n\n"
)


@api.post("/interview-prep/chat")
async def interview_chat(payload: InterviewChatIn, user: dict = Depends(get_current_user)):
    job, ctx = await _interview_context(user, payload.job_id, payload.resume_id)
    uid = str(user["_id"])
    now = datetime.now(timezone.utc).isoformat()
    session = None
    if payload.session_id:
        session = await db.interview_sessions.find_one({"session_id": payload.session_id, "user_id": uid}, {"_id": 0})
    if not session:
        session = {"session_id": str(uuid.uuid4()), "user_id": uid, "job_id": payload.job_id, "job_title": job["title"], "messages": [], "created_at": now, "updated_at": now}
    if session.get("complete"):
        raise HTTPException(400, "This mock interview is finished — restart to run it again")
    history = session["messages"]
    if payload.message and payload.message.strip():
        history.append({"role": "user", "content": payload.message.strip(), "at": now})
    transcript = "\n".join(f"{'CANDIDATE' if m['role'] == 'user' else 'INTERVIEWER'}: {m['content']}" for m in history)
    answers = sum(1 for m in history if m["role"] == "user")
    prompt = f"{ctx}\n\nTRANSCRIPT SO FAR ({answers} candidate answers):\n{transcript or '(none — open the interview with a warm one-line welcome and the first question)'}\n\nRespond as the interviewer now."
    chat = _llm_chat(MOCK_SYSTEM, f"interview-chat-{session['session_id']}-{len(history)}")
    from emergentintegrations.llm.chat import UserMessage
    try:
        reply = re.sub(r"\*+", "", str(await chat.send_message(UserMessage(text=prompt)))).strip()
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(502, "AI request failed")
    history.append({"role": "assistant", "content": reply, "at": datetime.now(timezone.utc).isoformat()})
    session["updated_at"] = datetime.now(timezone.utc).isoformat()
    session["complete"] = "interview complete" in reply.lower()
    await db.interview_sessions.update_one({"session_id": session["session_id"]}, {"$set": session}, upsert=True)
    return {"session_id": session["session_id"], "messages": history, "complete": session["complete"]}


@api.delete("/interview-prep/sessions/{session_id}")
async def reset_interview_session(session_id: str, user: dict = Depends(get_current_user)):
    await db.interview_sessions.delete_one({"session_id": session_id, "user_id": str(user["_id"])})
    return {"ok": True}


# ---------- Progress & streaks ----------
@api.get("/me/progress")
async def my_progress(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    saved_jobs = await db.saved_jobs.find({"user_id": uid}, {"_id": 0, "status": 1, "status_updated_at": 1, "created_at": 1}).to_list(1000)
    letters = await db.cover_letters.find({"user_id": uid}, {"_id": 0, "created_at": 1}).to_list(1000)
    sessions = await db.interview_sessions.find({"user_id": uid}, {"_id": 0, "updated_at": 1, "complete": 1, "messages": 1}).to_list(1000)
    resumes = await db.resumes.find({"user_id": uid}, {"_id": 0, "updated_at": 1}).to_list(100)

    events: list[tuple[datetime, str]] = []
    for j in saved_jobs:
        events.append((_parse_dt(j.get("created_at")), "saved"))
        if j.get("status") in ("applied", "interviewed", "hired") and j.get("status_updated_at"):
            events.append((_parse_dt(j["status_updated_at"]), "applied"))
    for l in letters:
        events.append((_parse_dt(l.get("created_at")), "letter"))
    for s_ in sessions:
        if sum(1 for m in s_.get("messages", []) if m.get("role") == "user") >= 1:
            events.append((_parse_dt(s_.get("updated_at")), "mock"))
    for r in resumes:
        events.append((_parse_dt(r.get("updated_at")), "resume"))
    events = [(d, k) for d, k in events if d]

    def week_key(d: datetime) -> int:
        return (d - timedelta(days=d.weekday())).date().toordinal() // 7

    active_weeks = {week_key(d) for d, _ in events}
    this_week = week_key(now)
    streak = 0
    wk = this_week if this_week in active_weeks else this_week - 1
    while wk in active_weeks:
        streak += 1
        wk -= 1

    this_week_counts = {"saved": 0, "applied": 0, "letter": 0, "mock": 0, "resume": 0}
    for d, k in events:
        if d >= week_start:
            this_week_counts[k] += 1
    totals = {
        "applied": sum(1 for j in saved_jobs if j.get("status") in ("applied", "interviewed", "hired")),
        "interviewed": sum(1 for j in saved_jobs if j.get("status") in ("interviewed", "hired")),
        "hired": sum(1 for j in saved_jobs if j.get("status") == "hired"),
        "letters": len(letters),
        "mocks": sum(1 for s_ in sessions if s_.get("complete")),
        "saved": len(saved_jobs),
    }

    nudges = []
    if not resumes:
        nudges.append({"key": "resume", "text": "Start with a resume — it powers your cover letters and interview prep.", "to": "/resume"})
    if totals["saved"] == 0:
        nudges.append({"key": "save", "text": "Save a job you'd actually apply to this week.", "to": "/jobs"})
    elif this_week_counts["applied"] == 0:
        nudges.append({"key": "apply", "text": "You've saved jobs but haven't marked one Applied this week — pick one and send it.", "to": "/dashboard"})
    if totals["saved"] > totals["letters"] and resumes:
        nudges.append({"key": "letter", "text": "Write a cover letter for a saved job — AI drafts it from your resume in seconds.", "to": "/dashboard"})
    if totals["interviewed"] > 0 and totals["mocks"] == 0:
        started = any(s_.get("messages") for s_ in sessions)
        nudges.append({"key": "mock", "text": "You started a mock interview — finish all six questions to get your score." if started else "You have an interview lined up — run one mock interview before the real thing.", "to": "/dashboard"})
    if streak >= 2:
        nudges.insert(0, {"key": "streak", "text": f"{streak}-week streak — keep it alive with one action before Sunday.", "to": "/jobs"})

    last_active = max((d for d, _ in events), default=None)
    return {
        "streak_weeks": streak,
        "active_this_week": this_week in active_weeks,
        "this_week": this_week_counts,
        "totals": totals,
        "nudges": nudges[:3],
        "last_active": last_active.isoformat() if last_active else None,
        "week_start": week_start.isoformat(),
    }


# ---------- Closing-soon digest (daily cron) ----------
def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


async def run_closing_soon_digest(run_id: str) -> dict:
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=7)
    today = now.date().isoformat()
    dashboard_url = f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/dashboard"
    saved = await db.saved_jobs.find({"deadline": {"$ne": None}, "status": {"$ne": "hired"}}, {"_id": 0}).to_list(5000)
    by_user: dict[str, list] = {}
    for s in saved:
        d = _parse_dt(s.get("deadline"))
        if d and now <= d <= horizon:
            s["closes_label"] = d.strftime("%a %b %d")
            by_user.setdefault(s["user_id"], []).append(s)
    sent = skipped = failed = 0
    for user_id, jobs in by_user.items():
        already = await db.digest_log.find_one({"user_id": user_id, "day": today})
        if already:
            skipped += 1
            continue
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user = None
        if not user:
            continue
        if user.get("email_reminders", True) is False:
            skipped += 1
            continue
        jobs.sort(key=lambda j: j["deadline"])
        try:
            await send_email(
                to=user["email"],
                subject=f"{len(jobs)} saved job{'s' if len(jobs) != 1 else ''} closing this week",
                html=closing_soon_html(name=(user.get("name") or "there").split(" ")[0], jobs=jobs, dashboard_url=dashboard_url),
            )
            await db.digest_log.insert_one({"user_id": user_id, "day": today, "run_id": run_id, "count": len(jobs), "sent_at": now.isoformat()})
            sent += 1
        except UndeliverableRecipient:
            failed += 1
            await db.users.update_one({"_id": user["_id"]}, {"$set": {"email_reminders": False, "email_bounced_at": now.isoformat()}})
            logger.warning(f"digest: {user['email']} undeliverable — reminders disabled for user {user_id}")
        except Exception as e:
            failed += 1
            logger.error(f"digest send failed for {user_id}: {e}")
    result = {"sent": sent, "skipped": skipped, "failed": failed, "users_with_closing_jobs": len(by_user)}
    await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"finished_at": datetime.now(timezone.utc).isoformat(), "result": result}})
    logger.info(f"closing-soon digest {run_id}: {result}")
    return result


@api.post("/cron/closing-soon-digest")
async def cron_closing_soon(request: Request, background: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth = request.headers.get("authorization", "")
    expected = os.environ["WEBHOOK_CRON_SECRET"]
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(401, "Unauthorized")
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("x-webhook-id") or body.get("run_id") or str(uuid.uuid4())
    existing = await db.cron_runs.find_one({"run_id": run_id})
    if existing:
        return {"accepted": True, "duplicate": True}
    await db.cron_runs.insert_one({"run_id": run_id, "job": "closing-soon-digest", "started_at": datetime.now(timezone.utc).isoformat()})
    background.add_task(run_closing_soon_digest, run_id)
    return {"accepted": True}


@api.post("/me/closing-soon-digest/preview")
async def send_my_digest_now(user: dict = Depends(get_current_user)):
    """Lets a signed-in user email themselves their own closing-soon list on demand (max once per hour)."""
    now = datetime.now(timezone.utc)
    recent = await db.digest_log.find_one({"user_id": str(user["_id"]), "manual": True, "sent_at": {"$gte": (now - timedelta(hours=1)).isoformat()}})
    if recent:
        raise HTTPException(429, "You already emailed yourself in the last hour — check your inbox")
    horizon = now + timedelta(days=7)
    saved = await db.saved_jobs.find({"user_id": str(user["_id"]), "deadline": {"$ne": None}, "status": {"$ne": "hired"}}, {"_id": 0}).to_list(500)
    jobs = []
    for s in saved:
        d = _parse_dt(s.get("deadline"))
        if d and now <= d <= horizon:
            s["closes_label"] = d.strftime("%a %b %d")
            jobs.append(s)
    if not jobs:
        raise HTTPException(400, "None of your saved jobs close in the next 7 days")
    jobs.sort(key=lambda j: j["deadline"])
    dashboard_url = f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/dashboard"
    email_id = await send_email(
        to=user["email"],
        subject=f"{len(jobs)} saved job{'s' if len(jobs) != 1 else ''} closing this week",
        html=closing_soon_html(name=(user.get("name") or "there").split(" ")[0], jobs=jobs, dashboard_url=dashboard_url),
    )
    await db.digest_log.insert_one({"user_id": str(user["_id"]), "manual": True, "day": now.date().isoformat(), "count": len(jobs), "sent_at": now.isoformat()})
    return {"ok": True, "count": len(jobs), "email_id": email_id}


# ---------- Health & Stats ----------
@api.get("/")
async def root():
    return {"name": "Halifax Youth Hub API", "ok": True}


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

    # Seed programs (upsert + remove programs that are no longer in seed_data.py)
    seed_program_slugs = [p["slug"] for p in PROGRAMS]
    await db.programs.delete_many({"slug": {"$nin": seed_program_slugs}, "seeded": {"$ne": False}})
    for p in PROGRAMS:
        doc = {**p, "seeded": True}
        await db.programs.update_one(
            {"slug": p["slug"]},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
    # Seed jobs (upsert by slug + cleanup unrelated entries)
    seed_job_slugs = [j["slug"] for j in JOBS]
    await db.jobs.delete_many({"slug": {"$nin": seed_job_slugs}, "seeded": {"$ne": False}})
    for j in JOBS:
        doc = {**j, "seeded": True}
        await db.jobs.update_one(
            {"slug": j["slug"]},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
    # Seed events (upsert by slug + cleanup)
    seed_event_slugs = [e["slug"] for e in EVENTS]
    await db.events.delete_many({"slug": {"$nin": seed_event_slugs}, "seeded": {"$ne": False}})
    for e in EVENTS:
        doc = {**e, "seeded": True}
        await db.events.update_one(
            {"slug": e["slug"]},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
    # Seed job_feeds (upsert by slug)
    seed_feed_slugs = [f["slug"] for f in JOB_FEEDS]
    await db.job_feeds.delete_many({"slug": {"$nin": seed_feed_slugs}})
    for f in JOB_FEEDS:
        doc = dict(f)
        await db.job_feeds.update_one(
            {"slug": f["slug"]},
            {"$set": doc},
            upsert=True,
        )
    # Seed event_feeds (upsert by slug)
    seed_efeed_slugs = [f["slug"] for f in EVENT_FEEDS]
    await db.event_feeds.delete_many({"slug": {"$nin": seed_efeed_slugs}})
    for f in EVENT_FEEDS:
        doc = dict(f)
        await db.event_feeds.update_one(
            {"slug": f["slug"]},
            {"$set": doc},
            upsert=True,
        )
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
