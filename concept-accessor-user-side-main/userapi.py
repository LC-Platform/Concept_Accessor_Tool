from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
import tempfile, os, hashlib
from translator import translate_text
from dotenv import load_dotenv
import motor.motor_asyncio
from typing import List, Dict, Any
import re
from rapidfuzz import fuzz
from io import BytesIO
import base64
import time
from pymongo import UpdateOne
import io
import motor.motor_asyncio
import os
from pydantic import BaseModel, EmailStr, validator
from scoring import GAMES, CATEGORIES, WEIGHTS_A, WEIGHTS_B, calculate_analysis
import bcrypt
import random
import string
import smtplib
from bson import ObjectId
from email.mime.text import MIMEText
from minio import Minio
from xml_to_image import xml_to_image
import datetime
from anuvaad_gondi import translate_to_gondi
import pdfplumber
import re
import nltk
from nltk.tokenize import sent_tokenize
from typing import List, Dict


from typing import Optional


app = FastAPI(title="Concept Accessor User API")

# -----------------------------------
# Setup & Initialization
# -----------------------------------
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "10.2.8.12:9001")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "concept-accessor")
MINIO_SECURE = os.getenv("MINIO_SECURE", "False").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://10.2.8.12:3003","http://localhost:3000", "http://localhost:3003"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MinIO client setup
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

nltk.download('punkt')

# MongoDB setup
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db_mongo = client["concept_accessor"]
chapters_col = db_mongo["chapters"]
full_summary_col = db_mongo["full_summary"]
section_summary_col = db_mongo["section_summary"]
domain_words_col = db_mongo["domain_words"]
translated_full_summary_col = db_mongo["translated_full_summary"]
translated_section_summary_col = db_mongo["translated_section_summary"]
translated_chapter_col = db_mongo["translated_chapter"]
translated_section_col = db_mongo["translated_section"]
translated_sentence_col = db_mongo["translated_sentence"]
taxonomy_col = db_mongo["taxonomy"]
labeled_image_col = db_mongo["labeled_images"]
process_video_col = db_mongo["process_video"]
paraphrase_col = db_mongo["paraphrase"]
users_col = db_mongo["users"]
reset_codes_col = db_mongo["reset_codes"]
qa_col = db_mongo["qa"]  
reading_progress_col = db_mongo["reading_progress"]
sentences_col = db_mongo["sentences"]
questions_col = db_mongo["questions"]
reports_col = db_mongo["reports"]


def compute_pdf_hash(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()

def convert_binary_to_bytes(binary_data) -> bytes:
    """
    Convert binary data to bytes.
    Handles both direct bytes and base64-encoded strings.
    """
    if isinstance(binary_data, bytes):
        return binary_data
    elif isinstance(binary_data, str):
        return base64.b64decode(binary_data)
    else:
        raise ValueError(f"Unsupported binary data type: {type(binary_data)}")



# -----------------------------
# NORMALIZE FUNCTION
# -----------------------------
def normalize(s):
    return "".join(e.lower() for e in s if e.isalnum())


# -----------------------------
# CLEAN PDF TEXT
# -----------------------------
def clean_pdf_text(text):
    # Remove line breaks
    text = re.sub(r'\n+', ' ', text)

    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)

    # Remove section headings like 3.1 Algae
    text = re.sub(r'\b\d+(\.\d+)+\s+[A-Z][a-zA-Z]+\b', '', text)

    # Remove standalone numbers
    text = re.sub(r'\b\d+\b', '', text)

    return text.strip()


# -----------------------------
# FILTER VALID SENTENCES
# -----------------------------
def is_valid_sentence(s):
    s = s.strip()

    if len(s) < 15:
        return False

    # Must contain verb (basic heuristic)
    if not re.search(r'\b(is|are|was|were|has|have|had|do|does|did)\b', s):
        return False

    # Must end properly
    if not re.search(r'[.!?]$', s):
        return False

    return True


# -----------------------------
# EXTRACT TEXT FROM PDF
# -----------------------------
def extract_text_from_pdf(pdf_path):
    full_text = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

    return full_text


# -----------------------------
# MAIN SENTENCE EXTRACTION
# -----------------------------
def extract_sentences_from_pdf(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)

    cleaned_text = clean_pdf_text(raw_text)

    raw_sentences = sent_tokenize(cleaned_text)

    sentences = []
    for s in raw_sentences:
        s = s.strip()

        if is_valid_sentence(s):
            sentences.append(s)

    return sentences

class ChapterRequest(BaseModel):
    chapter_id: str

# -----------------------------------
# Pydantic models for user signup/login
# -----------------------------------
class SignupModel(BaseModel):
    username: str
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    standard: str

    @validator("password")
    def password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v

    @validator("standard")
    def validate_standard(cls, v):
        if v not in ["11", "12"]:
            raise ValueError("Standard must be 11 or 12")
        return v

class LoginModel(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str
    confirm_password: str

    @validator("new_password")
    def password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class SimplifiedParagraphRequest(BaseModel):
    chapter_id: str
    original_paragraph: str
    simplified_paragraph: str
    sentences: List[Dict[str, Any]]  

class PinPosition(BaseModel):
    page: int
    yOffset: Optional[float] = 0

class ReadingProgressRequest(BaseModel):
    user_id: str  # TODO: Replace with authenticated user from session/JWT
    pin_position: Optional[PinPosition] = None

class ReadingProgressResponse(BaseModel):
    chapter_id: str
    user_id: str
    pin_position: Optional[PinPosition] = None
    last_updated: Optional[str] = None
    
class ReportSubmitRequest(BaseModel):
    user_id: str
    played_games: Dict[str, Any]

class UserProfileResponse(BaseModel):
    user_id: str
    username: str
    name: str
    email: EmailStr
    standard: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    standard: Optional[str] = None

    @validator("standard")
    def validate_standard(cls, v):
        if v is not None and v not in ["11", "12"]:
            raise ValueError("Standard must be 11 or 12")
        return v
    

class QAPairModel(BaseModel):
    question: str
    answer: str

class SaveQARequest(BaseModel):
    chapter_id: str
    qa_pairs: List[QAPairModel]

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @validator("new_password")
    def password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v
    
def send_email(to_email, subject, body):
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        print("SMTP not configured. Skipping email send.")
        return
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
    except Exception as e:
        print(f"Failed to send email: {e}")


async def store_sentences_in_db(chapter_id, sentences):
    docs = []

    for idx, sent in enumerate(sentences):
        clean_sent = " ".join(sent.split())

        doc = {
            "chapter_id": chapter_id,
            "sentence_index": idx,  # 🔥 IMPORTANT
            "sentence": clean_sent,
            "normalized_sentence": normalize(clean_sent)
        }

        docs.append(doc)

    if docs:
        await sentences_col.insert_many(docs)

    return len(docs)

@app.options("/{rest_of_path:path}")
async def options_handler(rest_of_path: str):
    return Response(status_code=200)

# Signup route
@app.post("/signup/")
async def signup(user: SignupModel):
    # Check for existing username or email
    existing_user = await users_col.find_one({"$or": [{"username": user.username}, {"email": user.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    # Hash password
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    user_doc = {
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "standard": user.standard,
        "password_hash": hashed_pw.decode("utf-8"),
    }
    await users_col.insert_one(user_doc)
    return {"message": "Signup successful", "username": user.username, "email": user.email, "standard": user.standard}

# Login route
@app.post("/login/")
async def login(credentials: LoginModel):
    user_doc = await users_col.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    pw_hash = user_doc.get("password_hash", "").encode("utf-8")
    if not bcrypt.checkpw(credentials.password.encode("utf-8"), pw_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
    "message": "Login successful",
    "user_id": str(user_doc["_id"]),
    "username": user_doc["username"],
    "email": user_doc["email"]
    }


@app.post("/forgot-password/")
async def forgot_password(req: ForgotPasswordRequest):
    user_doc = await users_col.find_one({"email": req.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Email not registered")
    code = ''.join(random.choices(string.digits, k=6))
    await reset_codes_col.update_one(
        {"email": req.email},
        {"$set": {"code": code, "verified": False}},
        upsert=True
    )
    send_email(
        req.email,
        "Your Password Reset Code",
        f"Your password reset code is: {code}"
    )
    print(f"Reset code for {req.email}: {code}")  # For debugging; remove in production
    return {"message": "Password reset code sent to your email"}
  
     
@app.post("/verify-reset-code/")
async def verify_reset_code(req: VerifyCodeRequest):
    doc = await reset_codes_col.find_one({"email": req.email, "code": req.code})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid code or email")
    await reset_codes_col.update_one(
        {"email": req.email},
        {"$set": {"verified": True}}
    )
    return {"message": "Code verified. You may now reset your password."}

@app.post("/reset-password/")
async def reset_password(req: ResetPasswordRequest):
    doc = await reset_codes_col.find_one({"email": req.email, "code": req.code, "verified": True})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or unverified code")
    hashed_pw = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt())
    await users_col.update_one(
        {"email": req.email},
        {"$set": {"password_hash": hashed_pw.decode("utf-8")}},
    )
    await reset_codes_col.delete_one({"email": req.email})
    return {"message": "Password reset successful"}


# -----------------------------------
# Profile Routes
# -----------------------------------

@app.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_profile(user_id: str):
    """
    Retrieve a user's profile details.
    """
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfileResponse(
        user_id=str(user_doc["_id"]),
        username=user_doc.get("username"),
        name=user_doc.get("name"),
        email=user_doc.get("email"),
        standard=user_doc.get("standard"),
    )


@app.put("/profile/{user_id}")
async def update_profile(user_id: str, update: UpdateProfileRequest):
    """
    Update a user's profile details (name, username, email, standard).
    Only fields provided in the request body are updated.
    """
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    # Check username/email uniqueness against other users
    if "username" in update_fields or "email" in update_fields:
        conflict_query = {"$or": [], "_id": {"$ne": user_obj_id}}
        if "username" in update_fields:
            conflict_query["$or"].append({"username": update_fields["username"]})
        if "email" in update_fields:
            conflict_query["$or"].append({"email": update_fields["email"]})

        existing = await users_col.find_one(conflict_query)
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already in use")

    await users_col.update_one(
        {"_id": user_obj_id},
        {"$set": update_fields}
    )

    updated_doc = await users_col.find_one({"_id": user_obj_id})

    return {
        "message": "Profile updated successfully",
        "profile": UserProfileResponse(
            user_id=str(updated_doc["_id"]),
            username=updated_doc.get("username"),
            name=updated_doc.get("name"),
            email=updated_doc.get("email"),
            standard=updated_doc.get("standard"),
        )
    }


@app.patch("/profile/{user_id}/password")
async def change_password(user_id: str, req: ChangePasswordRequest):
    """
    Change a user's password. Requires the current password for verification.
    """
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    pw_hash = user_doc.get("password_hash", "").encode("utf-8")
    if not bcrypt.checkpw(req.current_password.encode("utf-8"), pw_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hash = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt())
    await users_col.update_one(
        {"_id": user_obj_id},
        {"$set": {"password_hash": new_hash.decode("utf-8")}}
    )

    return {"message": "Password updated successfully"}


@app.delete("/profile/{user_id}")
async def delete_profile(user_id: str, req: LoginModel):
    """
    Delete a user's account. Requires re-entering email + password for confirmation.
    """
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if user_doc.get("email") != req.email:
        raise HTTPException(status_code=400, detail="Email does not match this account")

    pw_hash = user_doc.get("password_hash", "").encode("utf-8")
    if not bcrypt.checkpw(req.password.encode("utf-8"), pw_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    await users_col.delete_one({"_id": user_obj_id})
    return {"message": "Account deleted successfully"}


# -----------------------------------
# Profile Stats / Progress & Gamification
# -----------------------------------

LEVELS = [
    {"name": "Beginner",  "min_xp": 0},
    {"name": "Explorer",  "min_xp": 150},
    {"name": "Scholar",   "min_xp": 400},
    {"name": "Achiever",  "min_xp": 800},
    {"name": "Master",    "min_xp": 1500},
]

def compute_level(xp: int) -> Dict[str, Any]:
    """
    Given total XP, return current level info and progress toward next level.
    """
    current = LEVELS[0]
    next_level = None

    for i, lvl in enumerate(LEVELS):
        if xp >= lvl["min_xp"]:
            current = lvl
            next_level = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
        else:
            break

    if next_level:
        span = next_level["min_xp"] - current["min_xp"]
        progress = xp - current["min_xp"]
        percent_to_next = round((progress / span) * 100, 1) if span > 0 else 100
    else:
        percent_to_next = 100  # maxed out

    return {
        "level_name": current["name"],
        "xp": xp,
        "current_level_min_xp": current["min_xp"],
        "next_level_name": next_level["name"] if next_level else None,
        "next_level_min_xp": next_level["min_xp"] if next_level else None,
        "percent_to_next_level": percent_to_next,
    }


@app.get("/profile/{user_id}/stats")
async def get_profile_stats(user_id: str):
    """
    Aggregate reading progress and game performance into a profile stats summary,
    including a derived level/XP for gamification.
    """
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # ---- Chapters progress ----
    total_chapters = await chapters_col.count_documents({})

    started_chapter_ids = await reading_progress_col.distinct(
        "chapter_id", {"user_id": user_id}
    )
    chapters_started = len(started_chapter_ids)

    # Most recently touched chapter (for "continue reading")
    last_progress = await reading_progress_col.find_one(
        {"user_id": user_id},
        sort=[("last_updated", -1)]
    )
    continue_reading = None
    if last_progress:
        chapter_doc = await chapters_col.find_one({"chapter_id": last_progress["chapter_id"]})
        continue_reading = {
            "chapter_id": last_progress["chapter_id"],
            "chapter_name": chapter_doc.get("chapter_name") if chapter_doc else "Unknown",
            "pin_position": last_progress.get("pin_position"),
            "last_updated": last_progress.get("last_updated"),
        }

    # ---- Games / reports progress ----
    cursor = reports_col.find({"user_id": user_id}).sort("created_at", -1)
    reports = await cursor.to_list(length=1000)

    games_played_count = len(reports)

    total_score_pct = 0
    scored_reports = 0
    best_report = None
    best_pct = -1

    for report in reports:
        played_games = report.get("played_games", {})
        for game_id, game_data in played_games.items():
            score = game_data.get("score")
            max_score = game_data.get("maxScore")
            if score is not None and max_score:
                pct = (score / max_score) * 100
                total_score_pct += pct
                scored_reports += 1
                if pct > best_pct:
                    best_pct = pct
                    best_report = {"game_id": game_id, "score": score, "maxScore": max_score, "percent": round(pct, 1)}

    average_score_pct = round(total_score_pct / scored_reports, 1) if scored_reports > 0 else 0

    total_games_available = len(GAMES) if isinstance(GAMES, (list, dict)) else 0

    # Latest analysis (from most recent report, if calculate_analysis stored one)
    latest_analysis = reports[0].get("analysis") if reports else None

    # ---- XP & Level ----
    # Transparent formula: reward starting chapters, playing games, and doing well.
    xp = (
        chapters_started * 50
        + games_played_count * 20
        + round(total_score_pct / 10)  # sums percentage contributions across all scored games
    )
    level_info = compute_level(xp)

    return {
        "user_id": user_id,
        "chapters": {
            "total": total_chapters,
            "started": chapters_started,
            "continue_reading": continue_reading,
        },
        "games": {
            "total_available": total_games_available,
            "played": games_played_count,
            "average_score_percent": average_score_pct,
            "best_game": best_report,
            "latest_analysis": latest_analysis,
        },
        "level": level_info,
    }
    
@app.get("/section-summary/")
async def get_section_summary(chapter_id: str, section_id: str):
    """
    Retrieve summary for a specific section from MongoDB.
    """
    summary_doc = await section_summary_col.find_one({"chapter_id": chapter_id, "section_id": section_id})
    if not summary_doc or "section_summary" not in summary_doc:
        return {"error": f"Section summary not found. Generate via POST /section-summary/ first."}
    return {
        "chapter_id": chapter_id,
        "section_id": section_id,
        "section_summary": summary_doc["section_summary"]
    }

@app.get("/extract-domain-terms/")
async def get_domain_terms(chapter_id: str):
    """
    Retrieve all domain terms for a chapter from MongoDB.
    """
    existing_terms = []
    async for d in domain_words_col.find({"chapter_id": chapter_id}):
        audio_binary = d.get("audio_binary")
        audio_b64 = base64.b64encode(audio_binary).decode("utf-8") if audio_binary else None
        existing_terms.append({
            "domain_id": d.get("domain_id"),
            "name": d.get("name"),
            "definition": d.get("definition"),
            "audio_binary": audio_b64,
            "translations": d.get("translations", {}),
            "word_structure": d.get("word_structure", {}),
            "is_mwe": d.get("is_mwe", False),
            "mwe_type": d.get("mwe_type", ""),
            "tokens_with_pos": d.get("tokens_with_pos", []),
            "names": d.get("names", {}).get("ner", "")
        })
    
    if not existing_terms:
        return {"chapter_id": chapter_id, "terms": [], "message": "No domain terms found. Generate via POST /extract-domain-terms/ first."}
    
    return {"chapter_id": chapter_id, "terms": existing_terms}


@app.get("/translate/section-summary/")
async def get_translated_section_summary(chapter_id: str, section_id: str, target_language: str):
    """
    Retrieve translated section summary from MongoDB.
    """
    translated_doc = await translated_section_summary_col.find_one({"chapter_id": chapter_id, "section_id": section_id, "language": target_language})
    if translated_doc and "translated_section_summary" in translated_doc:
        return {
            "chapter_id": chapter_id,
            "section_id": section_id,
            "language": target_language,
            "translated_section_summary": translated_doc["translated_section_summary"]
        }
    else:
        raise HTTPException(status_code=404, detail="Translated section summary not found")

@app.get("/translate/definition/")
async def get_translated_definition(chapter_id: str, domain_id: str, target_language: str):
    """
    Retrieve translated definition from MongoDB.
    Fetches the definition translation from the domain_words collection's translations object.
    """
    doc = await domain_words_col.find_one({"chapter_id": chapter_id, "domain_id": domain_id})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Domain term not found")
    
    # Get translations object
    translations = doc.get("translations", {})
    
    # Get the translated definition for the target language
    translated_definition = translations.get(target_language)
    
    if not translated_definition:
        raise HTTPException(
            status_code=404, 
            detail=f"Translated definition not found for language: {target_language}"
        )
    
    return {
        "chapter_id": chapter_id,
        "domain_id": domain_id,
        "language": target_language,
        "translated_definition": translated_definition
    }

@app.get("/translate/section/")
async def get_translated_section(chapter_id: str, section_id: str, target_language: str):
    """
    Retrieve translated section from MongoDB.
    """
    translated_doc = await translated_section_col.find_one({"chapter_id": chapter_id, "section_id": section_id, "language": target_language})
    if translated_doc and "translated_section" in translated_doc:
        return {
            "chapter_id": chapter_id,
            "section_id": section_id,
            "language": target_language,
            "translated_section": translated_doc["translated_section"]
        }
    else:
        raise HTTPException(status_code=404, detail="Translated section not found")


@app.get("/api/get-section-summary-audio")
async def get_section_summary_audio(
    chapter_id: str,
    section_id: str
):

    doc = await section_summary_col.find_one(
        {
            "chapter_id": chapter_id,
            "section_id": section_id
        }
    )

    if not doc or not doc.get("audio_summary_en"):
        return {"status": "error", "message": "Audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc["audio_summary_en"]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )

@app.get("/api/get-section-summary-audio-translation")
async def get_section_summary_audio_translation(
    chapter_id: str,
    section_id: str,
    language: str
):

    field_name = f"audio_summary_{language}"

    doc = await translated_section_summary_col.find_one(
        {
            "chapter_id": chapter_id,
            "section_id": section_id,
            "language": language
        }
    )

    if not doc or not doc.get(field_name):
        return {"status": "error", "message": "Translated audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc[field_name]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )
    
@app.get("/translate/sentence/")
async def get_translated_sentence(chapter_id: str, sentence: str, target_language: str):
    """
    Retrieve translated sentence from MongoDB.
    """
    translated_doc = await translated_sentence_col.find_one({"chapter_id": chapter_id, "sentence": sentence, "language": target_language})
    if translated_doc and "translated_sentence" in translated_doc:
        return {
            "chapter_id": chapter_id,
            "sentence": sentence,
            "language": target_language,
            "translated_sentence": translated_doc["translated_sentence"]
        }
    else:
        raise HTTPException(status_code=404, detail="Translated sentence not found")


@app.post("/add-ner-tags/")
async def add_ner_tags(
    chapter_id: str = Body(...),
    domain_ids: list[str] = Body(...)
):
    try:
        # normalize domain_ids
        normalized_ids = [d.strip().lower() for d in domain_ids]

        # prepare bulk operations
        operations = []

        for domain_id in normalized_ids:
            operations.append(
                UpdateOne(
                    {
                        "chapter_id": chapter_id,
                        "domain_id": domain_id
                    },
                    {
                        "$set": {"names.ner": "yes"}
                    }
                )
            )

        # execute bulk update
        if operations:
            result = await domain_words_col.bulk_write(operations)
            modified = result.modified_count
        else:
            modified = 0

        return {
            "status": "success",
            "chapter_id": chapter_id,
            "input_count": len(domain_ids),
            "updated_count": modified
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/taxonomy-image/{chapter_id}/{domain_id}")
async def get_taxonomy_image_on_demand(chapter_id: str, domain_id: str):
    """
    Fetch XML code from database and generate image on-demand.
    If XML code has changed, generates new image automatically.
    
    Path Parameters:
    - chapter_id: The chapter ID
    - domain_id: The domain term ID
    
    Returns: SVG image as response
    """
    try:
        # Fetch taxonomy document from database
        taxonomy_doc = await taxonomy_col.find_one({
            "chapter_id": chapter_id,
            "domain_id": domain_id
        })
        
        if not taxonomy_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Taxonomy XML not found for domain_id: {domain_id}"
            )
        
        xml_code = taxonomy_doc.get("taxonomy_xml")
        if not xml_code:
            raise HTTPException(
                status_code=404,
                detail=f"No XML code found for domain_id: {domain_id}"
            )
        
        domain_name = taxonomy_doc.get("domain_name", "unknown")
        xml_version = taxonomy_doc.get("xml_version", 1)
        
        # Generate SVG image from XML code
        try:
            svg_bytes = xml_to_image(xml_code, domain_name)
            
            if svg_bytes is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate image from XML for {domain_name}"
                )
            
            # Update the database with generated image and timestamp
            await taxonomy_col.update_one(
                {"chapter_id": chapter_id, "domain_id": domain_id},
                {"$set": {
                    "taxonomy_image": svg_bytes,
                    "last_generated": datetime.datetime.utcnow(),
                    "xml_version": xml_version
                }}
            )
            
            filename = f"taxonomy_{domain_name.replace(' ', '_')}.svg"
            
            return Response(
                content=svg_bytes,
                media_type="image/svg+xml",
                headers={
                    "Content-Disposition": f"inline; filename={filename}",
                    "X-Domain-Name": domain_name,
                    "X-XML-Version": str(xml_version),
                    "Cache-Control": "public, max-age=3600",
                    "Content-Type": "image/svg+xml; charset=utf-8"
                }
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error generating SVG image: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving taxonomy image: {str(e)}")


@app.get("/image/{domain_id}")
async def get_labelled_image(domain_id: str):
    image_doc = await labeled_image_col.find_one(
        {
            "domain_id": domain_id,
            "status": "approved"
        },
        sort=[("approved_at", -1)]
    )

    if not image_doc:
        raise HTTPException(status_code=404, detail="Labelled image not found")

    image_base64 = image_doc.get("image_base64")
    if not image_base64:
        raise HTTPException(status_code=404, detail="No image data found")

    try:
        # Split data URL
        header, encoded = image_base64.split(",", 1)

        # Detect image type
        if "jpeg" in header or "jpg" in header:
            media_type = "image/jpeg"
            ext = "jpg"
        elif "png" in header:
            media_type = "image/png"
            ext = "png"
        else:
            raise HTTPException(status_code=400, detail="Unsupported image format")

        image_bytes = base64.b64decode(encoded)

        return Response(
            content=image_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f"inline; filename=labelled_image_{domain_id}.{ext}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        

@app.get("/video/{domain_id}")
async def get_process_video(domain_id: str):
    """
    Retrieve process video for a specific domain_id.
    Returns the video file decoded from base64 binary format as MP4 stream.
    """
    try:
        video_doc = await process_video_col.find_one({"domain_id": domain_id})
        
        if not video_doc:
            raise HTTPException(
                status_code=404, 
                detail=f"Process video not found for domain_id: {domain_id}"
            )
        
        if "video_b64" not in video_doc or not video_doc["video_b64"]:
            raise HTTPException(
                status_code=404, 
                detail=f"No video data found for domain_id: {domain_id}"
            )
        
        video_b64 = video_doc["video_b64"]
        video_b64_clean = video_b64.strip().replace('\n', '').replace('\r', '')
        
        try:
            video_binary = base64.b64decode(video_b64_clean)
        except Exception as decode_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Error decoding base64 video data: {str(decode_error)}"
            )
        
        def generate_video_stream():
            video_io = io.BytesIO(video_binary)
            chunk_size = 1024 * 1024
            while True:
                chunk = video_io.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        
        return StreamingResponse(
            generate_video_stream(),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"inline; filename=process_video_{domain_id}.mp4",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(video_binary))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error processing video: {str(e)}"
        )

@app.get("/get-qa/")
async def get_qa(chapter_id: str):
    """
    Fetch all question-answer pairs for a chapter.
    """
    doc = await qa_col.find_one({"chapter_id": chapter_id})
    if not doc or "qa_pairs" not in doc:
        return {"chapter_id": chapter_id, "qa_pairs": [], "message": "No QA pairs found"}
    return {"chapter_id": chapter_id, "qa_pairs": doc["qa_pairs"]}


def serialize_mongo(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def split_text(text: str, max_len: int = 200) -> list[str]:
    """Split text into chunks at sentence boundaries under max_len chars."""
    sentences = text.split(".")
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) < max_len:
            current += s + "."
        else:
            if current.strip():
                chunks.append(current.strip())
            current = s + "."
    if current.strip():
        chunks.append(current.strip())
    return chunks


@app.post("/translate/sentence/")
async def translate_sentence(
    chapter_id: str = Body(..., embed=True),
    sentence: str = Body(..., embed=True),
    target_language: str = Body(..., embed=True),
):
    doc = await chapters_col.find_one({"chapter_id": chapter_id})
    if not doc or "pdf_text" not in doc:
        return {"error": "PDF not found"}

    # Normalise whitespace
    sentence = " ".join(sentence.split())

    # Return cached result if available
    existing = await translated_sentence_col.find_one({
        "chapter_id": chapter_id,
        "sentence": sentence,
        "language": target_language,
    })
    if existing:
        return serialize_mongo(existing)

    # Translate chunk by chunk
    translated_parts = []

    for chunk in split_text(sentence):
        chunk = chunk.strip()
        if not chunk:
            continue

    try:
            if target_language.lower() in ["gon", "gondi"]:
                result = await translate_to_gondi(chunk)
                translated_parts.append(result["gondi_text"])

            else:
                result = translate_text(chunk, "eng", target_language)

                # Existing translator response
                if "error" in result:
                    print(f"⚠️ Translation error for chunk: {result['error']}")
                    translated_parts.append(chunk)  # fallback
                else:
                    translated_parts.append(result["data"])

    except Exception as e:
            print(f"❌ Chunk failed: {e}")
            translated_parts.append(chunk)           # fallback: original text

    translated = " ".join(translated_parts)

    print("INPUT :", sentence)
    print("OUTPUT:", translated)

    await translated_sentence_col.update_one(
        {
            "chapter_id": chapter_id,
            "sentence": sentence,
            "language": target_language,
        },
        {"$set": {
            "chapter_id": chapter_id,
            "sentence": sentence,
            "language": target_language,
            "translated_sentence": translated,
        }},
        upsert=True,
    )

    return {
        "chapter_id": chapter_id,
        "sentence": sentence,
        "language": target_language,
        "translated_sentence": translated,
        "message": "Translated & stored",
    }
    
@app.get("/chapters/")
async def get_all_chapters():
    """
    Retrieve list of all chapters with metadata and PDF URLs.
    Returns: chapter_id, chapter_name, chapter_no, standard, subject, board, pdf_path, pdf_url, section_ids
    """
    try:
        chapters = []
        async for chapter in chapters_col.find({}, {
            "chapter_id": 1,
            "chapter_name": 1,
            "chapter_no": 1,
            "standard": 1,
            "subject": 1,
            "board": 1,
            "pdf_path": 1,
            "sections": 1
        }):
            chapters.append({
                "chapter_id": chapter.get("chapter_id"),
                "chapter_name": chapter.get("chapter_name"),
                "chapter_no": chapter.get("chapter_no"),
                "standard": chapter.get("standard"),
                "subject": chapter.get("subject"),
                "board": chapter.get("board"),
                "pdf_path": chapter.get("pdf_path"),
                "pdf_url": f"/pdf/{chapter.get('chapter_id')}",
                "section_ids": list(chapter.get("sections", {}).keys()),
                "total_sections": len(chapter.get("sections", {}))
            })
        
        if not chapters:
            return {
                "status": "success",
                "total": 0,
                "chapters": [],
                "message": "No chapters found"
            }
        
        return {
            "status": "success",
            "total": len(chapters),
            "chapters": chapters,
            "message": f"Found {len(chapters)} chapters"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chapters: {str(e)}")


@app.get("/chapters/filter/")
async def get_chapters_by_filter(
    standard: str = None,
    subject: str = None,
    board: str = None
):
    """
    Retrieve chapters filtered by standard, subject, and/or board.
    Includes PDF URL for each chapter.
    
    Query Parameters:
    - standard: "11" or "12" (optional)
    - subject: "Biology", "Chemistry", or "Physics" (optional)
    - board: "IPE" or "NCERT" (optional)
    
    Example: /chapters/filter/?standard=12&subject=Biology&board=NCERT
    """
    try:
        # Build filter query
        filter_query = {}
        
        if standard:
            if standard not in ["11", "12"]:
                raise HTTPException(status_code=400, detail="Standard must be 11 or 12")
            filter_query["standard"] = standard
        
        if subject:
            if subject not in ["Biology", "Chemistry", "Physics"]:
                raise HTTPException(status_code=400, detail="Subject must be Biology, Chemistry, or Physics")
            filter_query["subject"] = subject
        
        if board:
            if board not in ["IPE", "NCERT"]:
                raise HTTPException(status_code=400, detail="Board must be IPE or NCERT")
            filter_query["board"] = board
        
        # If no filters provided, return all
        if not filter_query:
            return await get_all_chapters()
        
        chapters = []
        async for chapter in chapters_col.find(filter_query, {
            "chapter_id": 1,
            "chapter_name": 1,
            "chapter_no": 1,
            "standard": 1,
            "subject": 1,
            "board": 1,
            "pdf_path": 1,
            "sections": 1
        }):
            chapters.append({
                "chapter_id": chapter.get("chapter_id"),
                "chapter_name": chapter.get("chapter_name"),
                "chapter_no": chapter.get("chapter_no"),
                "standard": chapter.get("standard"),
                "subject": chapter.get("subject"),
                "board": chapter.get("board"),
                "pdf_path": chapter.get("pdf_path"),
                "pdf_url": f"/pdf/{chapter.get('chapter_id')}",
                "section_ids": list(chapter.get("sections", {}).keys()),
                "total_sections": len(chapter.get("sections", {}))
            })
        
        if not chapters:
            return {
                "status": "success",
                "total": 0,
                "chapters": [],
                "message": "No chapters found matching filters",
                "filters": filter_query
            }
        
        return {
            "status": "success",
            "total": len(chapters),
            "chapters": chapters,
            "message": f"Found {len(chapters)} chapters",
            "filters": filter_query
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chapters: {str(e)}")


@app.get("/chapters/{chapter_id}")
async def get_chapter_by_id(chapter_id: str):
    """
    Retrieve a specific chapter with all metadata, section details, and PDF URL.
    
    Path Parameter:
    - chapter_id: The unique chapter ID
    """
    try:
        chapter = await chapters_col.find_one({"chapter_id": chapter_id})
        
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter not found: {chapter_id}")
        
        return {
            "status": "success",
            "chapter_id": chapter.get("chapter_id"),
            "chapter_name": chapter.get("chapter_name"),
            "chapter_no": chapter.get("chapter_no"),
            "standard": chapter.get("standard"),
            "subject": chapter.get("subject"),
            "board": chapter.get("board"),
            "pdf_path": chapter.get("pdf_path"),
            "pdf_url": f"/pdf/{chapter_id}",
            "section_ids": list(chapter.get("sections", {}).keys()),
            "total_sections": len(chapter.get("sections", {})),
            "message": "Chapter retrieved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chapter: {str(e)}")


@app.get("/pdf/{chapter_id}")
async def get_pdf(chapter_id: str):
    """
    Retrieve PDF file for a specific chapter from MinIO.
    Returns the PDF as a streaming response for frontend display.
    """
    try:
        chapter = await chapters_col.find_one({"chapter_id": chapter_id})
        
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter not found: {chapter_id}")
        
        pdf_path = chapter.get("pdf_path")
        if not pdf_path:
            raise HTTPException(status_code=404, detail=f"No PDF path found for chapter: {chapter_id}")
        
        # Extract object name from pdf_path (assumes it's stored as "bucket/object_name" or just "object_name")
        object_name = pdf_path.split("/")[-1] if "/" in pdf_path else pdf_path
        
        try:
            response = minio_client.get_object(MINIO_BUCKET, object_name)
            
            chapter_name = chapter.get("chapter_name", "document").replace(" ", "_")
            
            return StreamingResponse(
                response.stream(32*1024),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"inline; filename={chapter_name}.pdf",
                    "Cache-Control": "public, max-age=3600"
                }
            )
        except Exception as minio_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Error retrieving PDF from MinIO: {str(minio_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")



@app.get("/reading-progress/{chapter_id}")
async def get_reading_progress(chapter_id: str, user_id: str):
    """
    Get the saved reading progress (pin position) for a chapter and user.
    
    Path Parameters:
    - chapter_id: The chapter ID
    
    Query Parameters:
    - user_id: The user ID (TODO: Get from authenticated session)
    
    Returns: Pin position if exists, else null
    """
    try:
        # Verify chapter exists
        chapter = await chapters_col.find_one({"chapter_id": chapter_id})
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter not found: {chapter_id}")
        
        # Find reading progress
        progress = await reading_progress_col.find_one({
            "user_id": user_id,
            "chapter_id": chapter_id
        })
        
        if progress and progress.get("pin_position"):
            pin_data = progress["pin_position"]
            return ReadingProgressResponse(
                chapter_id=chapter_id,
                user_id=user_id,
                pin_position=PinPosition(
                    page=pin_data.get("page"),
                    yOffset=pin_data.get("yOffset", 0)
                ),
                last_updated=progress.get("last_updated")
            )
        
        # Return empty progress if not found
        return ReadingProgressResponse(
            chapter_id=chapter_id,
            user_id=user_id,
            pin_position=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving reading progress: {str(e)}"
        )


@app.post("/reading-progress/{chapter_id}")
async def save_reading_progress(
    chapter_id: str,
    request: ReadingProgressRequest
):
    """
    Save reading progress (pin position) for a chapter and user.
    
    Path Parameters:
    - chapter_id: The chapter ID
    
    Request Body:
    - user_id: The user ID (TODO: Get from authenticated session)
    - pin_position: Pin position object with page and yOffset (null to remove pin)
    
    Returns: Success message
    """
    try:
        # Verify chapter exists
        chapter = await chapters_col.find_one({"chapter_id": chapter_id})
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter not found: {chapter_id}")
        
        # Prepare pin data
        pin_data = None
        if request.pin_position:
            pin_data = {
                "page": request.pin_position.page,
                "yOffset": request.pin_position.yOffset
            }
        
        # Update or insert reading progress
        await reading_progress_col.update_one(
            {
                "user_id": request.user_id,
                "chapter_id": chapter_id
            },
            {
                "$set": {
                    "user_id": request.user_id,
                    "chapter_id": chapter_id,
                    "pin_position": pin_data,
                    "last_updated": datetime.datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Reading progress saved" if pin_data else "Pin removed",
            "chapter_id": chapter_id,
            "user_id": request.user_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saving reading progress: {str(e)}"
        )


@app.delete("/reading-progress/{chapter_id}")
async def delete_reading_progress(chapter_id: str, user_id: str):
    """
    Delete reading progress for a specific chapter and user.
    
    Path Parameters:
    - chapter_id: The chapter ID
    
    Query Parameters:
    - user_id: The user ID (TODO: Get from authenticated session)
    
    Returns: Success message
    """
    try:
        result = await reading_progress_col.delete_one({
            "user_id": user_id,
            "chapter_id": chapter_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="No reading progress found to delete"
            )
        
        return {
            "success": True,
            "message": "Reading progress deleted",
            "chapter_id": chapter_id,
            "user_id": user_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting reading progress: {str(e)}"
        )


@app.get("/reading-progress/user/{user_id}")
async def get_all_user_progress(user_id: str):
    """
    Get all reading progress for a specific user across all chapters.
    
    Path Parameters:
    - user_id: The user ID
    
    Returns: List of all reading progress entries
    """
    try:
        progress_list = []
        
        async for progress in reading_progress_col.find({"user_id": user_id}):
            pin_data = progress.get("pin_position")
            
            # Get chapter name for convenience
            chapter = await chapters_col.find_one({"chapter_id": progress.get("chapter_id")})
            chapter_name = chapter.get("chapter_name", "Unknown") if chapter else "Unknown"
            
            progress_list.append({
                "chapter_id": progress.get("chapter_id"),
                "chapter_name": chapter_name,
                "pin_position": PinPosition(
                    page=pin_data.get("page"),
                    yOffset=pin_data.get("yOffset", 0)
                ).dict() if pin_data else None,
                "last_updated": progress.get("last_updated")
            })
        
        return {
            "success": True,
            "user_id": user_id,
            "total": len(progress_list),
            "progress": progress_list
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving user progress: {str(e)}"
        )


@app.get("/api/get-section-summary-audio")
async def get_section_summary_audio(
    chapter_id: str,
    section_id: str
):

    doc = await section_summary_col.find_one(
        {
            "chapter_id": chapter_id,
            "section_id": section_id
        }
    )

    if not doc or not doc.get("audio_summary_en"):
        return {"status": "error", "message": "Audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc["audio_summary_en"]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )


@app.get("/api/get-section-summary-audio-translation")
async def get_section_summary_audio_translation(
    chapter_id: str,
    section_id: str,
    language: str
):

    field_name = f"audio_summary_{language}"

    doc = await translated_section_summary_col.find_one(
        {
            "chapter_id": chapter_id,
            "section_id": section_id,
            "language": language
        }
    )

    if not doc or not doc.get(field_name):
        return {"status": "error", "message": "Translated audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc[field_name]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )
@app.get("/api/get-definition-audio")
async def get_definition_audio(
    chapter_id: str,
    domain_id: str
):

    doc = await domain_words_col.find_one(
        {
            "chapter_id": chapter_id,
            "domain_id": domain_id
        }
    )

    if not doc or not doc.get("audio_definition_en"):
        return {"status": "error", "message": "Definition audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc["audio_definition_en"]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )
@app.get("/api/get-definition-audio-translation")
async def get_definition_audio_translation(
    chapter_id: str,
    domain_id: str,
    language: str
):

    field_name = f"audio_definition_{language}"

    doc = await domain_words_col.find_one(
        {
            "chapter_id": chapter_id,
            "domain_id": domain_id
        }
    )

    if not doc or not doc.get(field_name):
        return {"status": "error", "message": "Translated definition audio not found"}

    audio_bytes = convert_binary_to_bytes(
        doc[field_name]
    )

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg"
    )
    
@app.get("/check-sentences/")
async def check_sentences(chapter_id: str):
    existing = await sentences_col.find_one({"chapter_id": chapter_id})

    return {
        "chapter_id": chapter_id,
        "exists": True if existing else False
    }  
    
from fastapi import Query

 

class USRToGraphRequest(BaseModel):
    usr_text: str

def split_segments(usr_text: str) -> List[Dict]:
    """Split USR text into individual segments"""
    pattern = r'<segment_id=(.*?)>(.*?)</segment_id>'
    matches = re.findall(pattern, usr_text, re.DOTALL)
    
    segments = []
    for seg_id, content in matches:
        # Extract English sentence
        sentence_match = re.search(r'#(.*?)(?:\n|$)', content)
        english_sentence = sentence_match.group(1).strip() if sentence_match else ""
        
        segments.append({
            "segId": seg_id.strip(),
            "text": content.strip(),
            "englishSentence": english_sentence
        })
    
    return segments

def parse_segment(segment_text: str) -> Dict[str, Any]:
    """Parse a single USR segment into nodes and edges"""
    lines = segment_text.strip().split('\n')
    
    nodes = []
    edges = []
    root_id = None
    
    # Skip header lines until we find the # line
    start_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('#'):
            start_idx = i + 1
            break
    
    for line in lines[start_idx:]:
        line = line.strip()
        if not line or line.startswith('%'):
            continue
        
        parts = line.split('\t')
        if len(parts) < 5:
            continue
        
        # Parse USR line format:
        # pred\tidx\ttense\tneg\targs\tdiscourse\tcoref\taspect\t...
        pred = parts[0].strip()
        idx = parts[1].strip()
        
        # Extract arguments (usually in position 4)
        args_str = parts[4].strip() if len(parts) > 4 else ""
        
        # Parse arguments like "2:k1", "4:rblak", etc.
        arg_links = []
        if args_str and args_str != '-':
            for arg in args_str.split(','):
                arg = arg.strip()
                if ':' in arg:
                    target, role = arg.split(':')
                    arg_links.append({
                        "target": int(target) if target.isdigit() else target,
                        "role": role
                    })
        
        # Create node
        node = {
            "id": idx,
            "predicate": pred,
            "label": pred,
            "args": arg_links
        }
        nodes.append(node)
        
        # Create edges from arguments
        for arg_link in arg_links:
            target = arg_link["target"]
            role = arg_link["role"]
            
            edge = {
                "from": idx,
                "to": str(target) if isinstance(target, int) else target,
                "label": role
            }
            edges.append(edge)
        
        # Check if this is the root (has '0:main' argument)
        if '0:main' in args_str:
            root_id = idx
    
    # If no root found, use first node
    if not root_id and nodes:
        root_id = nodes[0]["id"]
    
    return {
        "nodes": nodes,
        "edges": edges,
        "rootId": root_id,
        "englishSentence": extract_english_sentence(segment_text)
    }

def extract_english_sentence(segment_text: str) -> str:
    """Extract the English sentence from USR segment"""
    match = re.search(r'#(.*?)(?:\n|$)', segment_text)
    return match.group(1).strip() if match else ""

@app.post("/usr-to-graph/")
async def usr_to_graph(request: USRToGraphRequest):
    """Convert USR text to graph JSON for visualization"""
    try:
        usr_text = request.usr_text
        
        if not usr_text:
            raise HTTPException(status_code=400, detail="USR text required")
        
        # Split into segments
        segments = split_segments(usr_text)
        
        result = []
        for seg in segments:
            parsed = parse_segment(seg["text"])
            result.append({
                "segment_id": seg["segId"],
                "nodes": parsed["nodes"],
                "edges": parsed["edges"],
                "root": parsed["rootId"],
                "sentence": parsed["englishSentence"]
            })
        
        return {"graph": result, "success": True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-usr/")
async def get_usr(
    chapter_id: str = Query(...),
    sentence: str = Query(...)
):
    """Fetch USR for a selected sentence using fuzzy matching"""
    try:
        # Normalize input
        normalized_input = normalize_text(sentence)
        
        # Find best match in database
        best_doc = None
        best_score = 0
        
        cursor = sentences_col.find({"chapter_id": chapter_id})
        docs = await cursor.to_list(length=1000)
        
        for doc in docs:
            db_sentence = doc.get("normalized_sentence", "")
            score = fuzz.ratio(normalized_input, db_sentence)
            
            if score > best_score:
                best_score = score
                best_doc = doc
        
        if not best_doc or best_score < 80:
            raise HTTPException(status_code=404, detail="USR not found")
        
        return {
            "sentence": best_doc.get("sentence"),
            "match_score": best_score,
            "usr_segments": best_doc.get("usr_segments", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def normalize_text(text: str) -> str:
    """Normalize text for matching"""
    text = text.lower()
    return re.sub(r'[^a-z0-9]', '', text)


@app.get("/get-sentence-with-paragraph/")
async def get_sentence_with_paragraph(
    chapter_id: str = Query(...),
    sentence: str = Query(...)
):
    """Fetch a sentence along with its full paragraph"""
    try:
        # Normalize the input sentence
        normalized_input = normalize_text(sentence)
        
        # Find the sentence in database
        best_doc = None
        best_score = 0
        
        cursor = sentences_col.find({"chapter_id": chapter_id})
        docs = await cursor.to_list(length=10000)
        
        for doc in docs:
            db_sentence = doc.get("normalized_sentence", "")
            score = fuzz.ratio(normalized_input, db_sentence)
            
            if score > best_score:
                best_score = score
                best_doc = doc
        
        if not best_doc or best_score < 80:
            raise HTTPException(status_code=404, detail="Sentence not found")
        
        # IMPORTANT: Get the paragraph field from the document
        # In your database, 'paragraph' is a string field containing the full paragraph
        paragraph_text = best_doc.get("paragraph", "")
        
        # Debug logging
        print(f"🔍 Found sentence: {best_doc.get('sentence', '')[:50]}...")
        print(f"📄 Paragraph from DB: {paragraph_text[:100] if paragraph_text else 'EMPTY'}...")
        
        # If paragraph is empty or None, use the sentence itself as fallback
        if not paragraph_text or paragraph_text == "":
            print("⚠️ No paragraph field found, using sentence as fallback")
            paragraph_text = best_doc.get("sentence", sentence)
        
        # Split paragraph into sentences
        import re
        # Clean up the paragraph text (remove extra newlines)
        paragraph_text = re.sub(r'\n+', ' ', paragraph_text)
        paragraph_text = re.sub(r'\s+', ' ', paragraph_text).strip()
        
        # Split on periods, question marks, exclamation marks followed by space
        sentences_in_paragraph = [s.strip() for s in re.split(r'(?<=[.!?])\s+', paragraph_text) if s.strip()]
        
        # If no sentences found, use the whole paragraph as one sentence
        if len(sentences_in_paragraph) == 0:
            sentences_in_paragraph = [paragraph_text]
        
        # Format as expected by frontend
        paragraph_data = {
            "fullParagraph": paragraph_text,
            "sentences": sentences_in_paragraph
        }
        
        print(f"✅ Returning paragraph with {len(sentences_in_paragraph)} sentences")
        print(f"📄 Paragraph preview: {paragraph_text[:100]}...")
        
        return {
            "success": True,
            "sentence": best_doc.get("sentence"),
            "match_score": best_score,
            "paragraph": paragraph_data,
            "usr_segments": best_doc.get("usr_segments", [])
        }
        
    except Exception as e:
        print(f"❌ Error in get_sentence_with_paragraph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/store-simplified-paragraph/")
async def store_simplified_paragraph(request: SimplifiedParagraphRequest):
    """
    Store simplified paragraph with USR data for each sentence
    """
    try:
        # Store in paraphrase collection with structured data
        doc = {
            "chapter_id": request.chapter_id,
            "original_paragraph": request.original_paragraph,
            "simplified_paragraph": request.simplified_paragraph,
            "sentences": request.sentences,  # Each sentence with its USR
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
        
        # Upsert to avoid duplicates
        await paraphrase_col.update_one(
            {
                "chapter_id": request.chapter_id,
                "original_paragraph": request.original_paragraph
            },
            {"$set": doc},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Simplified paragraph stored successfully",
            "chapter_id": request.chapter_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/get-simplified-paragraph/")
async def get_simplified_paragraph(
    chapter_id: str = Query(...),
    original_sentence: str = Query(...)
):
    """
    Retrieve simplified paragraph with USR data for a given original sentence
    """
    try:
        # First find which paragraph contains this sentence
        # We'll use fuzzy matching to find the right paragraph
        
        # Get all simplified paragraphs for this chapter
        cursor = paraphrase_col.find({"chapter_id": chapter_id})
        paragraphs = await cursor.to_list(length=100)
        
        best_match = None
        best_score = 0
        
        for para_doc in paragraphs:
            original_para = para_doc.get("original_paragraph", "")
            if original_para:
                # Check if the original sentence is in this paragraph
                if original_sentence in original_para:
                    score = fuzz.ratio(original_sentence, original_para)
                    if score > best_score:
                        best_score = score
                        best_match = para_doc
        
        if not best_match:
            return {
                "success": False,
                "error": "No simplified paragraph found for this sentence",
                "sentences": []
            }
        
        # Return the simplified paragraph with USR data
        return {
            "success": True,
            "simplified_paragraph": best_match.get("simplified_paragraph", ""),
            "sentences": best_match.get("sentences", []),
            "original_paragraph": best_match.get("original_paragraph", "")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/get-sentence-usr/")
async def get_sentence_usr(
    chapter_id: str = Query(...),
    sentence_text: str = Query(...)
):
    """
    Get USR data for a specific sentence from the simplified paragraph
    """
    try:
        # Search in paraphrase collection
        cursor = paraphrase_col.find({
            "chapter_id": chapter_id,
            "sentences.sentence": sentence_text
        })
        
        async for doc in cursor:
            for sentence in doc.get("sentences", []):
                if sentence.get("sentence") == sentence_text:
                    return {
                        "success": True,
                        "sentence": sentence_text,
                        "usr_segments": sentence.get("usr_segments", []),
                        "has_usr": len(sentence.get("usr_segments", [])) > 0
                    }
        
        # If not found in simplified, try the main sentences collection
        sentence_doc = await sentences_col.find_one({
            "chapter_id": chapter_id,
            "sentence": sentence_text
        })
        
        if sentence_doc and sentence_doc.get("usr_segments"):
            return {
                "success": True,
                "sentence": sentence_text,
                "usr_segments": sentence_doc.get("usr_segments", []),
                "has_usr": True
            }
        
        return {
            "success": False,
            "error": "No USR found for this sentence",
            "has_usr": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



    

@app.post("/get-paragraph-with-usr-status/")
async def get_paragraph_with_usr_status(request: Request):
    """Fetch simplified paragraph and check USR status for each sentence"""
    try:
        from rapidfuzz import fuzz
        
        body = await request.json()
        chapter_id = body.get("chapter_id")
        sentence_text = body.get("sentence_text")
        
        if not chapter_id or not sentence_text:
            raise HTTPException(status_code=400, detail="Missing chapter_id or sentence_text")
        
        print(f"\n🔍 Searching for simplified paragraph for chapter: {chapter_id}")
        print(f"   Sentence: {sentence_text[:150]}...")
        
        # Initialize selected_paragraph
        selected_paragraph = None
        
        # Get all simplified paragraphs for this chapter
        cursor = paraphrase_col.find({"chapter_id": chapter_id})
        paragraphs = await cursor.to_list(length=100)
        
        print(f"📊 Found {len(paragraphs)} paragraphs in database")
        
        if not paragraphs:
            print("❌ No paragraphs found in database for chapter_id:", chapter_id)
            return {
                "success": False,
                "error": f"No simplified paragraphs found for chapter: {chapter_id}",
                "paragraph": "",
                "sentences": [],
                "hasSimplified": False
            }
        
        # Try exact match first
        for para in paragraphs:
            original_para = para.get("original_paragraph", "")
            if original_para and sentence_text.strip() == original_para.strip():
                print("✅ Found exact match by original_paragraph!")
                selected_paragraph = para
                break
        
        # If not found, try partial match
        if not selected_paragraph:
            for para in paragraphs:
                original_para = para.get("original_paragraph", "")
                if original_para and sentence_text in original_para:
                    print("✅ Found partial match by original_paragraph!")
                    selected_paragraph = para
                    break
        
        # If still not found, try keyword matching
        if not selected_paragraph:
            print("⚠️ No direct match, trying keyword matching...")
            
            # Check for Whittaker-related content
            whittaker_keywords = ["Whittaker", "Five Kingdom", "broad classification", "living organisms"]
            is_whittaker = any(keyword.lower() in sentence_text.lower() for keyword in whittaker_keywords)
            
            if is_whittaker:
                print("✅ Matched Whittaker keywords")
                for para in paragraphs:
                    if "Robert H. Whittaker" in para.get("simplified_paragraph", ""):
                        selected_paragraph = para
                        break
            
            # Check for plant kingdom content
            if not selected_paragraph:
                plant_keywords = ["plant kingdom", "understanding", "changed over time", "cyanobacteria"]
                is_plant = any(keyword.lower() in sentence_text.lower() for keyword in plant_keywords)
                
                if is_plant:
                    print("✅ Matched Plant Kingdom keywords")
                    for para in paragraphs:
                        if "must emphasize that our understanding" in para.get("simplified_paragraph", ""):
                            selected_paragraph = para
                            break
        
        # Use fuzzy matching as last resort
        if not selected_paragraph:
            print("⚠️ No keyword match, using fuzzy matching...")
            best_match = None
            best_score = 0
            
            for para in paragraphs:
                original = para.get("original_paragraph", "")
                if original:
                    score = fuzz.ratio(sentence_text.lower(), original.lower())
                    if score > best_score:
                        best_score = score
                        best_match = para
                        print(f"   Score {score:.2f} for paragraph with original: {original[:50]}...")
            
            if best_match and best_score > 50:
                selected_paragraph = best_match
                print(f"✅ Fuzzy match found with score: {best_score:.2f}")
        
        if not selected_paragraph:
            print("❌ No matching paragraph found!")
            return {
                "success": False,
                "error": "No simplified paragraph found for this sentence",
                "paragraph": "",
                "sentences": [],
                "hasSimplified": False
            }
        
        # Build the response with sentences and their USR data
        sentences_with_usr = []
        for sent in selected_paragraph.get("sentences", []):
            usr_segments = sent.get("usr_segments", [])
            has_usr = len(usr_segments) > 0
            
            sentences_with_usr.append({
                "text": sent.get("sentence", ""),
                "hasUSR": has_usr,
                "usr_segments": usr_segments
            })
        
        print(f"\n📊 Returning {len(sentences_with_usr)} sentences:")
        for idx, sent in enumerate(sentences_with_usr, 1):
            print(f"   {idx}. hasUSR: {sent['hasUSR']} - {sent['text'][:60]}...")
        
        return {
            "success": True,
            "paragraph": selected_paragraph.get("simplified_paragraph", ""),
            "sentences": sentences_with_usr,
            "original_paragraph": selected_paragraph.get("original_paragraph", ""),
            "currentSentence": sentence_text,
            "hasSimplified": True,
            "from_cache": True
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "paragraph": "Error loading paragraph",
            "sentences": [],
            "hasSimplified": False
        }

@app.post("/get-sentence-usrs-batch/")
async def get_sentence_usrs_batch(request: Request):
    """Fetch USR data for all sentences in a simplified paragraph in one batch request."""
    try:
        from rapidfuzz import fuzz
        import re
        import datetime
        
        # Parse JSON body
        body = await request.json()
        chapter_id = body.get("chapter_id")
        simplified_paragraph = body.get("simplified_paragraph")
        original_paragraph = body.get("original_paragraph")
        sentences = body.get("sentences", [])
        
        if not chapter_id or not simplified_paragraph:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        print(f"\n🚀 Processing batch USR request for chapter: {chapter_id}")
        print(f"   Number of sentences: {len(sentences)}")
        
        result_sentences = []
        
        # First, try to find if we already have this simplified paragraph stored
        existing_doc = await paraphrase_col.find_one({
            "chapter_id": chapter_id,
            "simplified_paragraph": simplified_paragraph
        })
        
        if existing_doc and existing_doc.get("sentences"):
            print(f"📦 Found cached paragraph with {len(existing_doc['sentences'])} sentences")
            
            # Return cached data with properly formatted USRs
            for idx, sent_data in enumerate(existing_doc.get("sentences", [])):
                usr_segments = sent_data.get("usr_segments", [])
                
                # Format each USR segment with proper XML tags
                formatted_segments = []
                for seg_idx, seg in enumerate(usr_segments):
                    segment_id = seg.get("segment_id", f"seg_{idx}_{seg_idx}")
                    usr_text = seg.get("text", "")
                    english_sentence = seg.get("english_sentence", "")
                    
                    # Wrap in proper XML format
                    formatted_usr = f"""<segment_id={segment_id}>
                    # {english_sentence}

                    {usr_text}
                    </segment_id>"""
                    
                    formatted_segments.append({
                        "segId": segment_id,
                        "text": formatted_usr,
                        "englishSentence": english_sentence
                    })
                
                # Parse USRs for this sentence
                parsed_usrs = []
                for seg in formatted_segments:
                    parsed = parse_usr_segment(seg["text"], seg["segId"])
                    if parsed and parsed.get("nodes"):
                        parsed_usrs.append(parsed)
                
                has_usr = len(usr_segments) > 0
                
                result_sentences.append({
                    "text": sent_data.get("sentence", ""),
                    "hasUSR": has_usr,
                    "usr_segments": formatted_segments,
                    "parsed_usrs": parsed_usrs,
                    "coref_resolved": len(parsed_usrs) > 0
                })
            
            return {
                "success": True,
                "paragraph": simplified_paragraph,
                "sentences": result_sentences,
                "from_cache": True
            }
        
        # If not cached, process each sentence
        print(f"🆕 No cached data found, processing {len(sentences)} sentences")
        
        for idx, sentence_obj in enumerate(sentences):
            sentence_text = sentence_obj.get("sentence", "")
            
            # Try to find USR for this sentence
            usr_segments = []
            
            # Method 1: Check sentences collection
            sentence_doc = await sentences_col.find_one({
                "chapter_id": chapter_id,
                "sentence": sentence_text
            })
            
            if sentence_doc and sentence_doc.get("usr_segments"):
                usr_segments = sentence_doc.get("usr_segments", [])
                print(f"📚 Found USR in sentences_col for sentence {idx + 1}")
            else:
                # Method 2: Search by similarity
                cursor = sentences_col.find({"chapter_id": chapter_id})
                docs = await cursor.to_list(length=1000)
                
                best_match = None
                best_score = 0
                normalized_input = re.sub(r'[^a-z0-9]', '', sentence_text.lower())
                
                for doc in docs:
                    db_sentence = doc.get("normalized_sentence", "")
                    if db_sentence:
                        score = fuzz.ratio(normalized_input, db_sentence)
                        if score > best_score:
                            best_score = score
                            best_match = doc
                
                if best_match and best_score > 70:
                    usr_segments = best_match.get("usr_segments", [])
                    print(f"🔍 Found USR by similarity for sentence {idx + 1} (score: {best_score})")
            
            # Format each USR segment
            formatted_segments = []
            for seg_idx, seg in enumerate(usr_segments):
                segment_id = seg.get("segment_id", f"seg_{idx}_{seg_idx}")
                usr_text = seg.get("text", "")
                english_sentence = seg.get("english_sentence", "")
                
                # Wrap in proper XML format
                formatted_usr = f"""<segment_id={segment_id}>
                # {english_sentence}

                {usr_text}
                </segment_id>"""
                
                formatted_segments.append({
                    "segId": segment_id,
                    "text": formatted_usr,
                    "englishSentence": english_sentence
                })
            
            # Parse USRs for this sentence
            parsed_usrs = []
            for seg in formatted_segments:
                parsed = parse_usr_segment(seg["text"], seg["segId"])
                if parsed and parsed.get("nodes"):
                    parsed_usrs.append(parsed)
            
            has_usr = len(usr_segments) > 0
            
            result_sentences.append({
                "text": sentence_text,
                "hasUSR": has_usr,
                "usr_segments": formatted_segments,
                "parsed_usrs": parsed_usrs,
                "coref_resolved": len(parsed_usrs) > 0
            })
            
            if has_usr:
                print(f"✅ Sentence {idx + 1}: {len(parsed_usrs)} USR segments parsed")
            else:
                print(f"⚠️ Sentence {idx + 1}: No USR found")
        
        # Cache the result
        if result_sentences:
            await paraphrase_col.update_one(
                {
                    "chapter_id": chapter_id,
                    "simplified_paragraph": simplified_paragraph
                },
                {
                    "$set": {
                        "chapter_id": chapter_id,
                        "simplified_paragraph": simplified_paragraph,
                        "original_paragraph": original_paragraph,
                        "sentences": [
                            {
                                "sentence": s["text"],
                                "usr_segments": s["usr_segments"]
                            } for s in result_sentences
                        ],
                        "created_at": datetime.datetime.utcnow(),
                        "updated_at": datetime.datetime.utcnow()
                    }
                },
                upsert=True
            )
            print("💾 Cached results in database")
        
        return {
            "success": True,
            "paragraph": simplified_paragraph,
            "sentences": result_sentences,
            "from_cache": False
        }
        
    except Exception as e:
        print(f"❌ Error in batch USR fetch: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
     
 

def parse_usr_segment(usr_text: str, seg_id: str) -> Dict[str, Any]:
    """Parse a USR segment into nodes and edges for visualization while preserving original format."""
    if not usr_text or not usr_text.strip():
        return {
            "segId": seg_id, 
            "nodes": {}, 
            "edges": [], 
            "rootId": None, 
            "englishSentence": "", 
            "fullText": ""
        }
    
    # Store the original formatted text EXACTLY as is
    full_text = usr_text.strip()
    
    lines = usr_text.strip().split('\n')
    
    # Extract English sentence (starts with #)
    english_sentence = ""
    for line in lines:
        line_stripped = line.strip()
        if line_stripped.startswith('#'):
            english_sentence = line_stripped.replace('#', '').strip()
            break
    
    # Find the actual data lines (between <segment_id> and </segment_id>)
    data_lines = []
    in_data = False
    for line in lines:
        line_stripped = line.strip()
        if line_stripped.startswith('<segment_id'):
            in_data = True
            continue
        if line_stripped.startswith('</segment_id>'):
            in_data = False
            continue
        if in_data and line_stripped and not line_stripped.startswith('#') and not line_stripped.startswith('%'):
            data_lines.append(line_stripped)
    
    nodes = {}
    edges = []
    root_id = None
    
    # Parse each data line - PRESERVE ALL COLUMNS
    for line in data_lines:
        parts = line.split('\t')
        if len(parts) < 2:
            continue
        
        word = parts[0].strip()
        index = parts[1].strip()
        
        # Get ALL columns for reconstruction
        # Column indices: 0:word, 1:index, 2:tense, 3:neg, 4:args, 5:discourse, 6:coref, 7:aspect, 8:other
        tense = parts[2].strip() if len(parts) > 2 else "-"
        neg = parts[3].strip() if len(parts) > 3 else "-"
        args_str = parts[4].strip() if len(parts) > 4 else ""
        discourse = parts[5].strip() if len(parts) > 5 else "-"
        coref = parts[6].strip() if len(parts) > 6 else "-"
        aspect = parts[7].strip() if len(parts) > 7 else "-"
        other = parts[8].strip() if len(parts) > 8 else "-"
        
        # Parse arguments like "2:k1", "0:main", etc.
        arg_links = []
        if args_str and args_str != '-':
            for arg in args_str.split(','):
                arg = arg.strip()
                if ':' in arg:
                    target, role = arg.split(':', 1)
                    arg_links.append({
                        "target": target.strip(),
                        "role": role.strip()
                    })
        
        # Store node with ALL original data
        nodes[index] = {
            "id": index,
            "label": word,
            "isRoot": False,
            "parentRel": "",
            "tense": tense,
            "neg": neg,
            "args": args_str,
            "discourse": discourse,
            "coref": coref,
            "aspect": aspect,
            "other": other,
            "original_line": line  # Store the original line for reconstruction
        }
        
        # Create edges from arguments (skip '0' as it's the root marker)
        for arg_link in arg_links:
            if arg_link["target"] != '0':  # Skip root marker for edges
                edge = {
                    "from": arg_link["target"],
                    "to": index,
                    "label": arg_link["role"]
                }
                edges.append(edge)
            else:
                # This is the root node
                root_id = index
                nodes[index]["isRoot"] = True
        
        # Also check for root in args
        if '0:main' in args_str or '0:begin' in args_str:
            root_id = index
            nodes[index]["isRoot"] = True
    
    # If no root found, use first node
    if not root_id and nodes:
        root_id = list(nodes.keys())[0]
        if root_id in nodes:
            nodes[root_id]["isRoot"] = True
    
    print(f"📊 Parsed segment {seg_id}: {len(nodes)} nodes, {len(edges)} edges, root: {root_id}")
    
    return {
        "segId": seg_id,
        "nodes": nodes,
        "edges": edges,
        "rootId": root_id,
        "englishSentence": english_sentence,
        "fullText": full_text  # Return the EXACT original text
    }
    
# -----------------------------------
# Questions Routes
# -----------------------------------
@app.get("/api/questions")
async def get_all_games():
    cursor = questions_col.find({}, {"game_id": 1, "_id": 0})
    games = await cursor.to_list(length=100)
    return [g["game_id"] for g in games]

@app.get("/api/questions/metadata")
async def get_game_metadata():
    return {
        "games": GAMES,
        "categories": CATEGORIES,
        "weights_a": WEIGHTS_A,
        "weights_b": WEIGHTS_B
    }

@app.get("/api/questions/{game_id}")
async def get_game_questions(game_id: str):
    game_doc = await questions_col.find_one({"game_id": game_id}, {"_id": 0})
    if not game_doc:
        raise HTTPException(status_code=404, detail=f"No questions found for game: {game_id}")
    if "questions" in game_doc:
        return game_doc["questions"]
    elif "data" in game_doc:
        return game_doc["data"]
    return game_doc


# -----------------------------------
# Reports Routes
# -----------------------------------
def serialize_report(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    serialized = {**doc}
    if "_id" in serialized:
        serialized["id"] = str(serialized["_id"])
        del serialized["_id"]
    return serialized

@app.post("/api/reports")
async def create_report(request: ReportSubmitRequest):
    try:
        user_obj_id = ObjectId(request.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_doc = await users_col.find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    analysis = calculate_analysis(request.played_games)

    full_report = {
        "user_id": request.user_id,
        "played_games": request.played_games,
        "created_at": datetime.datetime.utcnow().isoformat(),
        "analysis": analysis
    }
    result = await reports_col.insert_one(full_report)

    return {
        "success": True,
        "message": "Report saved successfully",
        "report_id": str(result.inserted_id),
        "analysis": analysis
    }

@app.get("/api/reports")
async def get_reports(user_id: Optional[str] = None):
    query = {"user_id": user_id} if user_id else {}
    cursor = reports_col.find(query).sort("created_at", -1)
    reports = await cursor.to_list(length=100)
    return [serialize_report(r) for r in reports]

@app.delete("/api/reports")
async def clear_reports(user_id: Optional[str] = None):
    query = {"user_id": user_id} if user_id else {}
    result = await reports_col.delete_many(query)
    return {
        "success": True,
        "message": f"Successfully cleared {result.deleted_count} progress report(s)"
    }