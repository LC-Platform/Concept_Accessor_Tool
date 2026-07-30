import asyncio
from io import BytesIO

from motor.motor_asyncio import AsyncIOMotorClient
from bson.binary import Binary
from gtts import gTTS


# =====================================
# MongoDB
# =====================================

MONGO_URI = "mongodb://10.4.16.167:27017"

client = AsyncIOMotorClient(MONGO_URI)

db_mongo = client["concept_accessor"]

section_summary_col = db_mongo["section_summary"]
translated_section_summary_col = db_mongo["translated_section_summary"]


# =====================================
# Language Mapping
# =====================================

LANGUAGE_MAP = {
    "eng": "en",
    "hin": "hi",
    "tel": "te",
    "tam": "ta",
    "kan": "kn",
    "mal": "ml",
    "ben": "bn",
    "guj": "gu",
    "mar": "mr",
    "pan": "pa",
    "urd": "ur"
}


# =====================================
# Generate Audio
# =====================================

async def generate_audio(text: str, lang_code: str):

    fp = BytesIO()

    tts = gTTS(
        text=text,
        lang=lang_code
    )

    tts.write_to_fp(fp)

    fp.seek(0)

    return Binary(fp.read())


# =====================================
# English Section Summary Audio
# =====================================

async def process_section_summary():

    cursor = section_summary_col.find({})

    async for doc in cursor:

        summary_text = doc.get("section_summary")

        if not summary_text:
            print(f"Skipping {doc['_id']} -> No section_summary")
            continue

        # Skip if audio already exists
        if doc.get("audio_summary_en"):
            print(f"Skipping {doc['_id']} -> Audio exists")
            continue

        try:

            audio_binary = await generate_audio(
                summary_text,
                "en"
            )

            await section_summary_col.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "audio_summary_en": audio_binary
                    }
                }
            )

            print(f"Updated English audio -> {doc['_id']}")

        except Exception as e:
            print(f"Error -> {doc['_id']} -> {str(e)}")


# =====================================
# Translated Section Summary Audio
# =====================================

async def process_translated_section_summary():

    cursor = translated_section_summary_col.find({})

    async for doc in cursor:

        language = doc.get("language")

        translated_obj = doc.get("translated_section_summary", {})

        summary_text = translated_obj.get("data")

        if not language or not summary_text:
            print(f"Skipping {doc['_id']} -> Missing language/text")
            continue

        tts_lang = LANGUAGE_MAP.get(language)

        if not tts_lang:
            print(f"Unsupported language -> {language}")
            continue

        field_name = f"audio_summary_{language}"

        # Skip if already exists
        if doc.get(field_name):
            print(f"Skipping {doc['_id']} -> Audio exists")
            continue

        try:

            audio_binary = await generate_audio(
                summary_text,
                tts_lang
            )

            await translated_section_summary_col.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        field_name: audio_binary
                    }
                }
            )

            print(
                f"Updated translated audio -> "
                f"{doc['_id']} ({language})"
            )

        except Exception as e:
            print(f"Error -> {doc['_id']} -> {str(e)}")


# =====================================
# Main
# =====================================

async def main():

    print("\nProcessing English summaries...\n")
    await process_section_summary()

    print("\nProcessing translated summaries...\n")
    await process_translated_section_summary()

    print("\nDone!\n")


if __name__ == "__main__":
    asyncio.run(main())