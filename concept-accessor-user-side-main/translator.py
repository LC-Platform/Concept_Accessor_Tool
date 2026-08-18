# translator.py
import requests
from deep_translator import GoogleTranslator

CANVAS_BASE = "https://canvas.iiit.ac.in/sandboxbeprod/check_model_status_and_infer"

# Per-language model config — each language has its own model ID and access token
LANG_CONFIGS = {
    "hin": {
        "model_name": "IIITH-Bhashaverse-English-Hindi",
        "api_url": f"{CANVAS_BASE}/6872172f4f34535ffa89b8fd",
        "access_token": (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJ1c2VyX2lkIjoiNjk4YWZmMTU3ZDhmNTEyNDk0Y2U1OWIzIiwibW9kZWxfaWQiOiI2ODcyMTcy"
            "ZjRmMzQ1MzVmZmE4OWI4ZmQiLCJyZXF1ZXN0c19wZXJfbWludXRlIjo3LCJhY2Nlc3Nfc3RhcnRf"
            "ZGF0ZSI6IjIwMjYtMDMtMjVUMDA6MDA6MDAiLCJhY2Nlc3NfZW5kX2RhdGUiOiIyMDMwLTEyLTMx"
            "VDIzOjU5OjU5IiwiaGFzaGVkX3Bhc3N3b3JkIjoiJDJiJDEyJHl1VThMNFcvTktRWXFiZGk4OXNQ"
            "UGV4RDZHWmg5bEZRWHZ5aTZtMVF2d3ZpcC5RaG9iQUMyIiwiZXhwIjoxOTI0OTkxOTk5fQ."
            "Iv2-ruq4Tfw1u7AD44XU96ghrffs9IhT1Pf_D_-P7Ac"
        ),
    },
    "ben": {
        "model_name": "IIITH-Bhashaverse-English-Bengali",
        "api_url": f"{CANVAS_BASE}/6872172f4f34535ffa89b8f8",
        "access_token": (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJ1c2VyX2lkIjoiNjk4YWZmMTU3ZDhmNTEyNDk0Y2U1OWIzIiwibW9kZWxfaWQiOiI2ODcyMTcy"
            "ZjRmMzQ1MzVmZmE4OWI4ZjgiLCJyZXF1ZXN0c19wZXJfbWludXRlIjo3LCJhY2Nlc3Nfc3RhcnRf"
            "ZGF0ZSI6IjIwMjYtMDMtMjVUMDA6MDA6MDAiLCJhY2Nlc3NfZW5kX2RhdGUiOiIyMDMwLTEyLTMx"
            "VDIzOjU5OjU5IiwiaGFzaGVkX3Bhc3N3b3JkIjoiJDJiJDEyJHl1VThMNFcvTktRWXFiZGk4OXNQ"
            "UGV4RDZHWmg5bEZRWHZ5aTZtMVF2d3ZpcC5RaG9iQUMyIiwiZXhwIjoxOTI0OTkxOTk5fQ."
            "E6Vz5dRkDJ_PDi9i45Sj9smS68ORAzX8rqdLe0TmwB0"
        ),
    },
    "tel": {
        "model_name": "IIITH-Bhashaverse-English-Telugu",
        "api_url": f"{CANVAS_BASE}/6872172f4f34535ffa89b90f",
        "access_token": (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJ1c2VyX2lkIjoiNjk4YWZmMTU3ZDhmNTEyNDk0Y2U1OWIzIiwibW9kZWxfaWQiOiI2ODcyMTcy"
            "ZjRmMzQ1MzVmZmE4OWI5MGYiLCJyZXF1ZXN0c19wZXJfbWludXRlIjo3LCJhY2Nlc3Nfc3RhcnRf"
            "ZGF0ZSI6IjIwMjYtMDMtMjVUMDA6MDA6MDAiLCJhY2Nlc3NfZW5kX2RhdGUiOiIyMDMwLTEyLTMx"
            "VDIzOjU5OjU5IiwiaGFzaGVkX3Bhc3N3b3JkIjoiJDJiJDEyJHl1VThMNFcvTktRWXFiZGk4OXNQ"
            "UGV4RDZHWmg5bEZRWHZ5aTZtMVF2d3ZpcC5RaG9iQUMyIiwiZXhwIjoxOTI0OTkxOTk5fQ."
            "XMXKBPVVqy2qRDa5r9KI8juyVJ_LzLT76kcCyUaNshs"
        ),
    },
}

# Google Translate language codes for our supported targets.
# "gon" (Gondi) has no Google Translate equivalent, so it's intentionally omitted —
# fallback will report itself unavailable for that language rather than mistranslate.
GOOGLE_LANG_CODES = {
    "hin": "hi",
    "ben": "bn",
    "tel": "te",
}


def _translate_with_google(text: str, target_language: str) -> dict:
    """
    Fallback translator using Google Translate (via deep-translator), used when
    the primary Canvas/Bhashaverse model is unreachable or errors out.
    """
    google_code = GOOGLE_LANG_CODES.get(target_language)
    if not google_code:
        return {
            "error": (
                f"No Google Translate fallback available for target language "
                f"'{target_language}'."
            )
        }

    try:
        output_text = GoogleTranslator(source="en", target=google_code).translate(text)
        if not output_text:
            return {"error": "Google Translate returned an empty result."}

        return {
            "data": output_text,
            "model": "Google Translate (fallback)",
            "target_language": target_language,
        }
    except Exception as e:
        return {"error": f"Google Translate fallback failed: {str(e)}"}


def translate_text(text: str, source_language: str = "eng", target_language: str = "hin") -> dict:
    """
    Translate text using IIIT Canvas Bhashaverse API, falling back to
    Google Translate if the primary model is unreachable or errors out.

    Args:
        text:            The English text to translate.
        source_language: Currently always "eng" (ignored by the model endpoint).
        target_language: One of "hin", "tel", "ben" (fallback also needs "gon" excluded).

    Returns:
        dict with key "data" (translated string) on success,
        or "error" (string) on failure of BOTH primary and fallback.
    """
    config = LANG_CONFIGS.get(target_language)
    if not config:
        # Unsupported by primary model — still worth trying the fallback if it
        # knows the language (keeps behavior consistent for e.g. "gon" later).
        return _translate_with_google(text, target_language) if target_language in GOOGLE_LANG_CODES else {
            "error": (
                f"Target language '{target_language}' is not supported. "
                f"Choose from: {list(LANG_CONFIGS.keys())}"
            )
        }

    if not text or not text.strip():
        return {"error": "Input text is empty."}

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "access-token": config["access_token"],
    }

    payload = {"input_text": text}
    primary_error = None

    try:
        response = requests.post(
            config["api_url"],
            json=payload,
            headers=headers,
            timeout=(10, 120),  # (connect timeout, read timeout)
        )

        if response.status_code != 200:
            primary_error = f"Canvas API returned HTTP {response.status_code}: {response.text[:200]}"
        else:
            result = response.json()

            # Expected shape: {"status": "success", "data": {"output_text": "..."}, ...}
            if result.get("status") != "success":
                primary_error = result.get("error") or f"Unexpected response status: {result.get('status')}"
            else:
                output_text = result.get("data", {}).get("output_text")
                if not output_text:
                    primary_error = "No output_text in API response."
                else:
                    return {
                        "data": output_text,
                        "model": config["model_name"],
                        "target_language": target_language,
                    }

    except requests.exceptions.Timeout:
        primary_error = "Translation request timed out (120 s read timeout)."
    except requests.exceptions.ConnectionError as e:
        primary_error = f"Connection error: {str(e)}"
    except Exception as e:
        primary_error = f"Translation failed: {str(e)}"

    # Primary failed — try Google Translate as fallback.
    fallback_result = _translate_with_google(text, target_language)
    if "data" in fallback_result:
        return fallback_result

    # Both failed — surface both errors so it's clear what happened.
    return {
        "error": (
            f"Primary translation failed: {primary_error}. "
            f"Fallback also failed: {fallback_result.get('error')}"
        )
    }