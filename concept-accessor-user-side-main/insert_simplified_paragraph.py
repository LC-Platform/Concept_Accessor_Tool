#!/usr/bin/env python3
"""
Script to update chapter_id in paraphrase collection
Run: python update_chapter_id.py
"""

import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")  # Default to local MongoDB if not set
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client["concept_accessor"]
paraphrase_col = db["paraphrase"]

OLD_CHAPTER_ID = "biology_chapter_3_plant_kingdom"
NEW_CHAPTER_ID = "chapter_e36b81d0_7c842520"

async def update_chapter_id():
    """Update chapter_id in paraphrase collection"""
    try:
        # Update all documents with old chapter_id to new chapter_id
        result = await paraphrase_col.update_many(
            {"chapter_id": OLD_CHAPTER_ID},
            {"$set": {"chapter_id": NEW_CHAPTER_ID}}
        )
        
        print(f"✅ Updated {result.modified_count} document(s) in paraphrase collection")
        print(f"   Changed from '{OLD_CHAPTER_ID}' to '{NEW_CHAPTER_ID}'")
        
        # Verify the update
        count = await paraphrase_col.count_documents({"chapter_id": NEW_CHAPTER_ID})
        print(f"\n🔍 Verification: Found {count} document(s) with new chapter_id")
        
        return result.modified_count
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0

async def main():
    print("=" * 60)
    print("🔄 UPDATING CHAPTER_ID IN PARAPHRASE COLLECTION")
    print("=" * 60)
    print(f"Old chapter_id: {OLD_CHAPTER_ID}")
    print(f"New chapter_id: {NEW_CHAPTER_ID}")
    print("-" * 60)
    
    await update_chapter_id()

if __name__ == "__main__":
    asyncio.run(main())