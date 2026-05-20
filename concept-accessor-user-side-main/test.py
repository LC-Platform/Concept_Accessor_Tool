from motor.motor_asyncio import AsyncIOMotorClient
from bson.binary import Binary
from gtts import gTTS
import asyncio
import tempfile
import os

# =========================
# MongoDB Configuration
# =========================
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "concept_accessor"
COLLECTION_NAME = "section_summaries"

# =========================
# Section Data
# =========================
documents = [
    {
        "section_id": "3.1",
        "chapter_id": "chapter_e36b81d0_7c842520",
        "section_summary": """
Algae are simple, chlorophyll-bearing, autotrophic and mostly aquatic organisms found in freshwater, marine habitats, moist soil, stones and wood. They vary in form from colonial types like Volvox to filamentous forms like Ulothrix and Spirogyra, and large marine kelps.

Algae reproduce vegetatively by fragmentation, asexually by spores such as zoospores, and sexually through fusion of gametes. Sexual reproduction may be isogamous, anisogamous or oogamous depending on the nature of gametes.

Algae are ecologically and economically important because they carry out a major portion of photosynthesis on Earth, increase dissolved oxygen, and form the base of aquatic food chains. Many algae are used as food and for commercial products like algin, carrageen and agar. The three main classes of algae are Chlorophyceae, Phaeophyceae and Rhodophyceae.
"""
    },
    {
        "section_id": "3.1.1",
        "chapter_id": "chapter_e36b81d0_7c842520",
        "section_summary": """
Chlorophyceae are commonly called green algae. Their plant body may be unicellular, colonial or filamentous. They appear grass green because of the presence of chlorophyll a and b pigments located in chloroplasts.

The chloroplasts may have different shapes such as discoid, plate-like, reticulate, cup-shaped, spiral or ribbon-shaped. Most members contain pyrenoids in chloroplasts for storage of proteins and starch, while some store food as oil droplets.

Green algae possess a rigid cell wall with an inner cellulose layer and an outer pectose layer. Vegetative reproduction occurs mainly through fragmentation, while asexual reproduction takes place by flagellated zoospores formed in zoosporangia.

Sexual reproduction may be isogamous, anisogamous or oogamous. Common examples of green algae include Chlamydomonas, Volvox, Ulothrix, Spirogyra and Chara.
"""
    }
]

# =========================
# Generate Audio Binary
# =========================
async def generate_audio_binary(text):
    tts = gTTS(text=text, lang="en")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        temp_path = tmp.name

    tts.save(temp_path)

    with open(temp_path, "rb") as f:
        audio_bytes = f.read()

    os.remove(temp_path)

    return Binary(audio_bytes)

# =========================
# Main Function
# =========================
async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    for doc in documents:
        print(f"Generating audio for Section {doc['section_id']}...")

        audio_binary = await generate_audio_binary(
            doc["section_summary"]
        )

        update_data = {
            "section_id": doc["section_id"],
            "chapter_id": doc["chapter_id"],
            "section_summary": doc["section_summary"],
            "audio_summary_en": audio_binary
        }

        await collection.update_one(
            {
                "section_id": doc["section_id"],
                "chapter_id": doc["chapter_id"]
            },
            {
                "$set": update_data
            },
            upsert=True
        )

        print(f"Stored audio binary for Section {doc['section_id']}")

    print("All audio summaries stored successfully.")

# =========================
# Run Script
# =========================
if __name__ == "__main__":
    asyncio.run(main())