# # translator.py
# import requests
# import json

# MT_URL = "https://ssmt.iiit.ac.in/onemt"
# HEADERS = {
#     "Content-Type": "application/json",
#     "Accept": "application/json"
# }

# SUPPORTED_LANGS = {"hin", "tel", "ben"}  # add more if needed

# def translate_text(text: str, source_language="eng", target_language="hin") -> dict:
#     """
#     Translate given text using IIIT-H MT API.
#     Returns dict with translated text and metadata.
#     """

#     if target_language not in SUPPORTED_LANGS:
#         return {
#             "error": f"Target language '{target_language}' not supported. Use one of {list(SUPPORTED_LANGS)}."
#         }

#     payload = {
#         "text": text,
#         "source_language": source_language,
#         "target_language": target_language,
#         "mode": "versionvMD"
#     }

#     try:
#         # Increase read timeout (e.g., 120 seconds)
#         response = requests.post(
#             MT_URL,
#             json=payload,
#             headers=HEADERS,
#             timeout=(10, 120)  # connect timeout, read timeout
#         )

#         if response.status_code != 200:
#             return {"error": f"Translation API error {response.status_code}"}

#         result = response.json()

#         return {
#             "data": result.get("data"),
#             "languages": result.get("languages"),
#             "version": result.get("version")
#         }

#     except Exception as e:
#         return {"error": f"Translation failed: {str(e)}"}



# translator.py
import requests

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


def translate_text(text: str, source_language: str = "eng", target_language: str = "hin") -> dict:
    """
    Translate text using IIIT Canvas Bhashaverse API.

    Args:
        text:            The English text to translate.
        source_language: Currently always "eng" (ignored by the model endpoint).
        target_language: One of "hin", "tel", "ben".

    Returns:
        dict with key "data" (translated string) on success,
        or "error" (string) on failure.
    """
    config = LANG_CONFIGS.get(target_language)
    if not config:
        return {
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

    try:
        response = requests.post(
            config["api_url"],
            json=payload,
            headers=headers,
            timeout=(10, 120),  # (connect timeout, read timeout)
        )

        if response.status_code != 200:
            return {
                "error": f"Canvas API returned HTTP {response.status_code}: {response.text[:200]}"
            }

        result = response.json()

        # Expected shape: {"status": "success", "data": {"output_text": "..."}, ...}
        if result.get("status") != "success":
            return {
                "error": result.get("error") or f"Unexpected response status: {result.get('status')}"
            }

        output_text = result.get("data", {}).get("output_text")
        if not output_text:
            return {"error": "No output_text in API response."}

        return {
            "data": output_text,
            "model": config["model_name"],
            "target_language": target_language,
        }

    except requests.exceptions.Timeout:
        return {"error": "Translation request timed out (120 s read timeout)."}
    except requests.exceptions.ConnectionError as e:
        return {"error": f"Connection error: {str(e)}"}
    except Exception as e:
        return {"error": f"Translation failed: {str(e)}"}