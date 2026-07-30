from typing import Dict, Any, List

# Categories definitions
CATEGORIES = [
    { "key": "Logic", "name": "cognitive reasoning", "icon": "🧠", "maxTags": 5 },
    { "key": "Math", "name": "conceptual understanding", "icon": "🧮", "maxTags": 5 },
    { "key": "Data", "name": "language understanding", "icon": "📊", "maxTags": 5 },
    { "key": "Verbal", "name": "behavior", "icon": "✍️", "maxTags": 4 }
]

# Games metadata and category associations
GAMES = [
    { "id": "galactica", "name": "Galactica", "categories": ["Logic", "Data"], "icon": "🚀", "description": "Blast asteroids with correct biology answers!" },
    { "id": "logicGrid", "name": "Logical Deduction Grid", "categories": ["Logic", "Math"], "icon": "🧩", "description": "Use clues to deduce relationships." },
    { "id": "wordSearch", "name": "Word Search", "categories": ["Data", "Verbal"], "icon": "🔍", "description": "Find biology terms hidden in the grid!" },
    { "id": "riverCrossing", "name": "River Crossing", "categories": ["Logic"], "icon": "🛶", "description": "Transport organisms across the river safely." },
    { "id": "storyArrangement", "name": "Story Arrangement", "categories": ["Math", "Data"], "icon": "📝", "description": "Arrange images and sentences into sequence!" },
    { "id": "hangman", "name": "Biology Hangman", "categories": ["Verbal"], "icon": "🤔", "description": "Guess the biological term before time runs out!" },
    { "id": "pips", "name": "Pips", "categories": ["Math"], "icon": "🎲", "description": "Place dominoes satisfying grid logic." },
    { "id": "fourPics", "name": "4 Pics 1 Word", "categories": ["Logic", "Data"], "icon": "🖼️", "description": "Find the common biological term linking 4 images!" },
    { "id": "connections", "name": "Connections", "categories": ["Math", "Verbal"], "icon": "🔗", "description": "Group 16 words into 4 related categories!" },
    { "id": "oddOneOut", "name": "Odd One Out", "categories": ["Logic", "Math", "Data", "Verbal"], "icon": "❓", "description": "Identify the word that doesn't belong to Biology!" }
]

# Weights for scoring methods
WEIGHTS_A = { "Logic": 0.40, "Math": 0.30, "Data": 0.20, "Verbal": 0.10 }
WEIGHTS_B = { "Logic": 5/19, "Math": 5/19, "Data": 5/19, "Verbal": 4/19 }

def get_proficiency_level(score: float) -> str:
    if score >= 80:
        return "Expert"
    elif score >= 50:
        return "Intermediate"
    return "Basic"

def calculate_analysis(played_games: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes Raw scores, Category Percentages, Method A/B composite scores,
    and detailed game summaries based on the Multi-Category Scoring Methodology.
    """
    # 1. Normalize game scores & behavior scores
    normalized_scores = {}
    normalized_behaviors = {}
    
    for g in GAMES:
        g_id = g["id"]
        play_data = played_games.get(g_id)
        
        if play_data:
            raw = play_data.get("score") or 0
            max_val = play_data.get("maxScore") or 100
            normalized_scores[g_id] = (raw / max_val) if max_val > 0 else 0
            
            b_score = play_data.get("behaviorScore")
            if isinstance(b_score, (int, float)):
                normalized_behaviors[g_id] = min(1.0, max(0.0, float(b_score) / 100.0))
            else:
                normalized_behaviors[g_id] = None
        else:
            normalized_scores[g_id] = 0.0
            normalized_behaviors[g_id] = None

    # 2. Calculate raw category scores (R_j) and category percentages (P_j)
    category_raw_scores = {}
    category_percentages = {}
    
    for cat in CATEGORIES:
        cat_key = cat["key"]
        max_tags = cat["maxTags"]
        r_j = 0.0
        
        for g in GAMES:
            g_id = g["id"]
            if cat_key in g["categories"]:
                base_score = normalized_scores[g_id]
                behavior_score = normalized_behaviors[g_id]
                
                if cat_key == "Verbal" and behavior_score is not None:
                    r_j += (base_score + behavior_score) / 2.0
                else:
                    r_j += base_score
                    
        category_raw_scores[cat_key] = r_j
        category_percentages[cat_key] = (r_j / max_tags) * 100.0

    # 3. Calculate Composite Scores (T) for both Method A and Method B
    t_a = sum(category_percentages[cat["key"]] * WEIGHTS_A[cat["key"]] for cat in CATEGORIES)
    t_b = sum(category_percentages[cat["key"]] * WEIGHTS_B[cat["key"]] for cat in CATEGORIES)

    # 4. Generate Detailed Game Summary list for table visualization
    game_details = []
    for g in GAMES:
        g_id = g["id"]
        play_data = played_games.get(g_id)
        has_played = play_data is not None
        
        game_details.append({
            "id": g_id,
            "name": g["name"],
            "icon": g["icon"],
            "categories": g["categories"],
            "played": has_played,
            "score": play_data.get("score") if has_played else 0,
            "maxScore": play_data.get("maxScore") if has_played else 100,
            "behaviorScore": play_data.get("behaviorScore") if has_played else None,
            "normalized_contribution": normalized_scores[g_id]
        })

    return {
        "composite_score_a": t_a,
        "composite_score_b": t_b,
        "proficiency_level_a": get_proficiency_level(t_a),
        "proficiency_level_b": get_proficiency_level(t_b),
        "category_percentages": category_percentages,
        "category_raw_scores": category_raw_scores,
        "game_details": game_details,
        "weights_a": WEIGHTS_A,
        "weights_b": WEIGHTS_B,
        "categories_config": CATEGORIES
    }
