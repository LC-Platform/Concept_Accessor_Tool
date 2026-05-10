from pymongo import MongoClient
import re
from rapidfuzz import fuzz

# 🔹 MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["concept_accessor"]
collection = db["sentences"]


# -----------------------------
# 🔹 TEXT CLEANING + NORMALIZE
# -----------------------------
def clean_sentence(text):
    text = re.sub(r'\.\s+', ' ', text)   # remove weird ". " splits
    text = re.sub(r'\s+', ' ', text)     # normalize spaces
    return text.strip()


def normalize_text(text):
    text = text.lower()
    return re.sub(r'[^a-z0-9]', '', text)


# -----------------------------
# 🔹 PARSE USR FILE
# -----------------------------
def parse_usr_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    segments = re.findall(
        r'<segment_id=(.*?)>(.*?)</segment_id>',
        content,
        re.DOTALL
    )

    parsed_segments = []

    for seg_id, seg_content in segments:
        match = re.search(r'#(.*)', seg_content)

        if not match:
            continue

        sentence = match.group(1).strip()
        sentence = clean_sentence(sentence)

        parsed_segments.append({
            "segment_id": seg_id.strip(),
            "sentence": sentence,
            "normalized": normalize_text(sentence),
            "usr_text": seg_content.strip()
        })

    return parsed_segments


# -----------------------------
# 🔹 GROUP a/b/c SEGMENTS
# -----------------------------
def group_segments(segments):
    grouped = []
    temp_group = []

    for seg in segments:
        seg_id = seg["segment_id"]

        # detect suffix a/b/c
        match = re.match(r'(.*?)([a-z])$', seg_id)

        if match:
            base_id = match.group(1)

            if temp_group:
                prev_base = re.match(r'(.*?)([a-z])$', temp_group[0]["segment_id"])
                prev_base = prev_base.group(1) if prev_base else temp_group[0]["segment_id"]

                if base_id != prev_base:
                    grouped.append(temp_group)
                    temp_group = []

            temp_group.append(seg)

        else:
            if temp_group:
                grouped.append(temp_group)
                temp_group = []

            grouped.append([seg])

    if temp_group:
        grouped.append(temp_group)

    return grouped


# -----------------------------
# 🔹 FUZZY MATCHING
# -----------------------------
def find_best_match(normalized_usr, threshold=85):
    best_doc = None
    best_score = 0

    for doc in collection.find({}, {"normalized_sentence": 1}):
        db_sentence = doc.get("normalized_sentence", "")

        score = fuzz.ratio(normalized_usr, db_sentence)

        if score > best_score:
            best_score = score
            best_doc = doc

    if best_score >= threshold:
        return best_doc, best_score

    return None, best_score


# -----------------------------
# 🔹 MATCH + UPDATE DB
# -----------------------------
def match_and_update(usr_groups):
    for group in usr_groups:
        combined_sentence = " ".join([seg["sentence"] for seg in group])
        combined_sentence = clean_sentence(combined_sentence)

        normalized_combined = normalize_text(combined_sentence)

        doc, score = find_best_match(normalized_combined)

        if doc:
            print(f"✅ Match ({score}%): {combined_sentence}")

            collection.update_one(
                {"_id": doc["_id"]},
                {
                    "$push": {
                        "usr_segments": {
                            "$each": [
                                {
                                    "segment_id": seg["segment_id"],
                                    "usr_text": seg["usr_text"]
                                } for seg in group
                            ]
                        }
                    }
                }
            )
        else:
            print(f"❌ No match ({score}%): {combined_sentence}")


# -----------------------------
# 🔹 MAIN PIPELINE
# -----------------------------
def process_usr(file_path):
    print("🔹 Parsing USR file...")
    segments = parse_usr_file(file_path)

    print(f"🔹 Total segments found: {len(segments)}")

    print("🔹 Grouping segments...")
    grouped = group_segments(segments)

    print(f"🔹 Total grouped sentences: {len(grouped)}")

    print("🔹 Matching with DB...")
    match_and_update(grouped)

    print("✅ Done!")


# -----------------------------
# 🔹 RUN
# -----------------------------
if __name__ == "__main__":
    process_usr("/home/sashank/Desktop/Concept_Accessor_Tool/concept-accessor-user-side-main/USR.txt")