# translator.py
import requests
import json

MT_URL = "https://ssmt.iiit.ac.in/onemt"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

SUPPORTED_LANGS = {"hin", "tel", "ben"}  # add more if needed

def translate_text(text: str, source_language="eng", target_language="hin") -> dict:
    """
    Translate given text using IIIT-H MT API.
    Returns dict with translated text and metadata.
    """

    if target_language not in SUPPORTED_LANGS:
        return {
            "error": f"Target language '{target_language}' not supported. Use one of {list(SUPPORTED_LANGS)}."
        }

    payload = {
        "text": text,
        "source_language": source_language,
        "target_language": target_language,
        "mode": "versionvMD"
    }

    try:
        # Increase read timeout (e.g., 120 seconds)
        response = requests.post(
            MT_URL,
            json=payload,
            headers=HEADERS,
            timeout=(10, 120)  # connect timeout, read timeout
        )

        if response.status_code != 200:
            return {"error": f"Translation API error {response.status_code}"}

        result = response.json()

        return {
            "data": result.get("data"),
            "languages": result.get("languages"),
            "version": result.get("version")
        }

    except Exception as e:
        return {"error": f"Translation failed: {str(e)}"}