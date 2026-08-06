"""
English -> Telugu -> Gondi Translation API (FastAPI)
-------------------------------------------------------
One endpoint. Takes English text, calls the AnuvaadHub MT endpoints in
sequence:
  1. IndicTrans-v2-English-Telugu   (English -> Telugu)
  2. IIITH_Telugu_Gondi             (Telugu  -> Gondi)
and returns both the Telugu and Gondi translations.

AnuvaadHub MT contract (per model access grant):
  Request:  { "input_text": "..." }
  Header:   access-token: <token>
  Response: {
    "status": "success",
    "message": "Inference performed successfully",
    "data": { "output_text": "..." },
    "error": null,
    "code": 200
  }
  Constraint: max 50 words per request (enforced on both hops).

Env vars required (see .env.example):
  EN_TE_API_URL, EN_TE_ACCESS_TOKEN
  TE_GONDI_API_URL, TE_GONDI_ACCESS_TOKEN
  PORT (optional, default 8000)

Run:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import logging
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("translation-api")

# ---- Config pulled from env (never hardcode tokens in source) ----
EN_TE_API_URL = os.getenv("EN_TE_API_URL")
EN_TE_ACCESS_TOKEN = os.getenv("EN_TE_ACCESS_TOKEN")

TE_GONDI_API_URL = os.getenv("TE_GONDI_API_URL")
TE_GONDI_ACCESS_TOKEN = os.getenv("TE_GONDI_ACCESS_TOKEN")

REQUIRED_ENV = {
    "EN_TE_API_URL": EN_TE_API_URL,
    "EN_TE_ACCESS_TOKEN": EN_TE_ACCESS_TOKEN,
    "TE_GONDI_API_URL": TE_GONDI_API_URL,
    "TE_GONDI_ACCESS_TOKEN": TE_GONDI_ACCESS_TOKEN,
}
missing = [k for k, v in REQUIRED_ENV.items() if not v]
if missing:
    raise RuntimeError(
        f"Missing required environment variables: {', '.join(missing)}. "
        f"Check your .env file against .env.example."
    )

MAX_WORDS = 50

# ---- Rate limiting ----
# Telugu->Gondi only allows 20 requests/minute (tighter than English->Telugu's
# 150), so the whole endpoint is throttled to 20/min to avoid 429s upstream.
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

app = FastAPI(title="English -> Telugu -> Gondi Translation API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class ApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    logger.error("ApiError %s: %s", exc.status_code, exc.message)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})


# ---- Request / response schemas ----
class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="English text to translate (max 50 words)")


class TranslateResponse(BaseModel):
    input_text: str
    telugu_text: str
    gondi_text: str


def word_count(text: str) -> int:
    return len(text.split())


# ---- Helper: call a single AnuvaadHub MT endpoint ----
async def call_mt_api(
    api_url: str,
    access_token: str,
    input_text: str,
    source_language: str,
    target_language: str,
) -> str:
    if word_count(input_text) > MAX_WORDS:
        raise ApiError(
            400,
            f"{source_language}->{target_language} input exceeds {MAX_WORDS}-word "
            f"limit ({word_count(input_text)} words).",
        )

    headers = {
        "Content-Type": "application/json",
        "access-token": access_token,
    }
    payload = {"input_text": input_text}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(api_url, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise ApiError(504, f"Timeout calling {source_language}->{target_language} model")
    except httpx.RequestError as exc:
        raise ApiError(
            502, f"Network error calling {source_language}->{target_language} model: {exc}"
        )

    try:
        data = response.json()
    except ValueError:
        raise ApiError(
            502,
            f"Invalid JSON from {source_language}->{target_language} model: "
            f"{response.text[:200]}",
        )

    if response.status_code >= 400 or data.get("status") == "error":
        raise ApiError(
            response.status_code if response.status_code >= 400 else 502,
            f"{source_language}->{target_language} model returned an error: {data}",
        )

    output_text = extract_output_text(data)
    if output_text is None:
        raise ApiError(
            502,
            f"Could not find output_text in {source_language}->{target_language} "
            f"response: {data}",
        )

    return output_text


def extract_output_text(data: Any) -> Optional[str]:
    """AnuvaadHub MT response shape: {"data": {"output_text": "..."}}"""
    if isinstance(data, dict):
        inner = data.get("data")
        if isinstance(inner, dict):
            out = inner.get("output_text")
            if isinstance(out, str) and out:
                return out
    return None


async def translate_to_gondi(text: str):
    text = text.strip()

    if not text:
        raise ApiError(400, "Input text cannot be empty.")

    if word_count(text) > MAX_WORDS:
        raise ApiError(
            400,
            f"Input text exceeds {MAX_WORDS}-word limit ({word_count(text)} words).",
        )

    # English -> Telugu
    telugu_text = await call_mt_api(
        EN_TE_API_URL,
        EN_TE_ACCESS_TOKEN,
        text,
        "English",
        "Telugu",
    )

    # Telugu -> Gondi
    gondi_text = await call_mt_api(
        TE_GONDI_API_URL,
        TE_GONDI_ACCESS_TOKEN,
        telugu_text,
        "Telugu",
        "Gondi",
    )

    return {
        "telugu_text": telugu_text,
        "gondi_text": gondi_text,
    }
    
# ---- The one endpoint ----
@app.post("/api/translate", response_model=TranslateResponse)
@limiter.limit("20/minute")
async def translate(request: Request, body: TranslateRequest):
    text = body.text.strip()
    if not text:
        raise ApiError(400, 'Request body must include a non-empty "text" string.')

    if word_count(text) > MAX_WORDS:
        raise ApiError(400, f"Input text exceeds {MAX_WORDS}-word limit ({word_count(text)} words).")

    # Step 1: English -> Telugu
    telugu_text = await call_mt_api(
        EN_TE_API_URL, EN_TE_ACCESS_TOKEN, text, "English", "Telugu"
    )

    # Step 2: Telugu -> Gondi
    gondi_text = await call_mt_api(
        TE_GONDI_API_URL, TE_GONDI_ACCESS_TOKEN, telugu_text, "Telugu", "Gondi"
    )

    return TranslateResponse(input_text=text, telugu_text=telugu_text, gondi_text=gondi_text)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)