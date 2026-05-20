import re
from collections import defaultdict

# Path to your text file
file_path = "/home/sashank/Desktop/Concept_Accessor_Tool/500 Usrs.txt"

# Dictionary to store segment_id occurrences
segment_ids = defaultdict(list)

# Regex to match segment_id
pattern = re.compile(r"<segment_id=(.*?)>")

# Read file
with open(file_path, "r", encoding="utf-8") as file:
    for line_number, line in enumerate(file, start=1):
        match = pattern.search(line)
        
        if match:
            segment_id = match.group(1).strip()
            segment_ids[segment_id].append(line_number)

# Find duplicates
duplicates = {
    seg_id: lines
    for seg_id, lines in segment_ids.items()
    if len(lines) > 1
}

# Print results
if duplicates:
    print("Repeated segment_ids found:\n")
    
    for seg_id, lines in duplicates.items():
        print(f"Segment ID: {seg_id}")
        print(f"Found at lines: {lines}")
        print("-" * 50)

else:
    print("No repeated segment_ids found.")