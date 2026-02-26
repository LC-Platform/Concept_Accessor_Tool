from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
import tempfile, os, hashlib
from translator import translate_text
from dotenv import load_dotenv
import motor.motor_asyncio
from io import BytesIO
import base64
import time
import io
import motor.motor_asyncio
import os
from pydantic import BaseModel, EmailStr, validator
import bcrypt
import random
import string
import smtplib
from email.mime.text import MIMEText
from minio import Minio
from xml_to_image import xml_to_image
import datetime
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
        "http://10.2.8.12:3002",
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


def compute_pdf_hash(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()

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

from typing import List, Dict

class QAPairModel(BaseModel):
    question: str
    answer: str

class SaveQARequest(BaseModel):
    chapter_id: str
    qa_pairs: List[QAPairModel]
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
     # For debugging; remove in production
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
            "tokens_with_pos": d.get("tokens_with_pos", [])
        })
    
    if not existing_terms:
        return {"chapter_id": chapter_id, "terms": [], "message": "No domain terms found. Generate via POST /extract-domain-terms/ first."}
    
    return {"chapter_id": chapter_id, "terms": existing_terms}

# @app.get("/domain-term/{chapter_id}/{domain_id}")
# async def get_domain_term_details(chapter_id: str, domain_id: str):
#     """
#     Retrieve a specific domain term with all details (definition, audio, translations, word structure, etc.)
#     """
#     doc = await domain_words_col.find_one({"chapter_id": chapter_id, "domain_id": domain_id})
#     if not doc:
#         return {"error": f"Domain term not found for domain_id: {domain_id}"}
    
#     audio_binary = doc.get("audio_binary")
#     audio_b64 = base64.b64encode(audio_binary).decode("utf-8") if audio_binary else None
    
#     return {
#         "chapter_id": chapter_id,
#         "domain_id": domain_id,
#         "name": doc.get("name"),
#         "definition": doc.get("definition"),
#         "audio_binary": audio_b64,
#         "translations": doc.get("translations", {}),
#         "word_structure": doc.get("word_structure", {}),
#         "is_mwe": doc.get("is_mwe", False),
#         "mwe_type": doc.get("mwe_type", ""),
#         "tokens_with_pos": doc.get("tokens_with_pos", [])
#     }

# @app.get("/translate/full-summary/")
# async def get_translated_full_summary(chapter_id: str, target_language: str):
#     """
#     Retrieve translated full summary from MongoDB.
#     """
#     translated_doc = await translated_full_summary_col.find_one({"chapter_id": chapter_id, "language": target_language})
#     if not translated_doc or "translated_summary" not in translated_doc:
#         return {"error": f"Translated summary not found for language: {target_language}. Generate via POST /translate/full-summary/ first."}
    
#     return {
#         "chapter_id": chapter_id,
#         "language": target_language,
#         "translated_summary": translated_doc["translated_summary"]
#     }

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

# @app.get("/translate/chapter/")
# async def get_translated_chapter(chapter_id: str, target_language: str):
#     """
#     Retrieve translated chapter from MongoDB.
#     """
#     translated_doc = await translated_chapter_col.find_one({"chapter_id": chapter_id, "language": target_language})
#     if translated_doc and "translated_text" in translated_doc:
#         return {
#             "chapter_id": chapter_id,
#             "language": target_language,
#             "translated_text": translated_doc["translated_text"]
#         }
#     else:
#         raise HTTPException(status_code=404, detail="Translated chapter not found")

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
    image_doc = await labeled_image_col.find_one({"domain_id": domain_id})

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
@app.post("/translate/sentence/")
async def translate_sentence(chapter_id: str = Body(..., embed=True), sentence: str = Body(..., embed=True), target_language: str = Body(..., embed=True)):
    """
    Translate a sentence and save to MongoDB.
    """
    doc = await chapters_col.find_one({"chapter_id": chapter_id})
    if not doc or "pdf_text" not in doc:
        return {"error": "PDF not found. Upload via /read-pdf/ first."}
    
    translated = translate_text(sentence, "eng", target_language)
    
    await translated_sentence_col.update_one(
        {"chapter_id": chapter_id, "sentence": sentence, "language": target_language},
        {"$set": {
            "chapter_id": chapter_id,
            "sentence": sentence,
            "language": target_language,
            "translated_sentence": translated
        }},
        upsert=True
    )
    return {
        "chapter_id": chapter_id,
        "sentence": sentence,
        "language": target_language,
        "translated_sentence": translated,
        "message": "Translated & stored"
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