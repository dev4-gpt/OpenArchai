"""Vastu Shastra automated compliance checker for Indian residential architecture.

Performs geometric cardinal orientation analysis for rooms and entrances relative to
the property centroid (Brahmasthan). Evaluates elemental zones:
- Ishanya (North-East, Water element): Pooja, open spaces
- Agni (South-East, Fire element): Kitchen
- Nairutya (South-West, Earth element): Master Bedroom, heavy structures
- Vayavya (North-West, Air element): Guest Room, Bathrooms
"""

import math
from typing import Any, Dict, List, Tuple


VASTU_RULES = {
    "kitchen": {
        "ideal": ["SE"],
        "acceptable": ["NW"],
        "negative": ["NE", "SW"],
        "title": "Kitchen (Agni Zone)",
        "recommendation": "Locate kitchen in the South-East zone so that cooking is done facing East.",
    },
    "master_bedroom": {
        "ideal": ["SW"],
        "acceptable": ["S", "W"],
        "negative": ["NE"],
        "title": "Master Bedroom (Nairutya Zone)",
        "recommendation": "Position master bedroom in South-West for stability and grounded energy. Avoid North-East.",
    },
    "pooja_room": {
        "ideal": ["NE"],
        "acceptable": ["N", "E"],
        "negative": ["S", "SW"],
        "title": "Pooja / Prayer Room (Ishanya Zone)",
        "recommendation": "Place prayer room in North-East to channel morning solar radiation and positive energy.",
    },
    "living_room": {
        "ideal": ["N", "NE", "E"],
        "acceptable": ["NW"],
        "negative": ["SW"],
        "title": "Living Room / Drawing Hall",
        "recommendation": "Keep living and social zones oriented towards North or East for maximum natural light.",
    },
    "bathroom": {
        "ideal": ["NW", "W"],
        "acceptable": ["SE"],
        "negative": ["NE", "SW"],
        "title": "Bathrooms & Water Closets",
        "recommendation": "Locate toilets in North-West or West zone. Never position in Ishanya (North-East).",
    },
}


def _get_cardinal_direction(dx: float, dy: float) -> str:
    """Calculates cardinal direction from plan center (x: East, y: North standard CAD)."""
    angle = math.degrees(math.atan2(dy, dx))  # -180 to 180
    if -22.5 <= angle < 22.5:
        return "E"
    elif 22.5 <= angle < 67.5:
        return "NE"
    elif 67.5 <= angle < 112.5:
        return "N"
    elif 112.5 <= angle < 157.5:
        return "NW"
    elif angle >= 157.5 or angle < -157.5:
        return "W"
    elif -157.5 <= angle < -112.5:
        return "SW"
    elif -112.5 <= angle < -67.5:
        return "S"
    else:
        return "SE"


def check_vastu_compliance(rooms: List[Dict[str, Any]], plan_center: Tuple[float, float] = (0.0, 0.0)) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    favorable_count = 0
    total_evaluated = 0

    if not rooms:
        return {
            "score": 85,
            "verdict": "Awaiting Room Placement",
            "issues": [{
                "code": "VASTU-NO-ROOMS",
                "severity": "info",
                "category": "Vastu Shastra",
                "message": "Add labeled rooms to calculate orientation compliance against the 8 directional zones.",
                "suggestion": "Assign room labels (Kitchen, Master Bedroom, Pooja Room) in the 2D editor."
            }]
        }

    for r in rooms:
        name = r.get("label", "").lower().replace(" ", "_")
        centroid = r.get("centroid", (0.0, 0.0))
        dx = centroid[0] - plan_center[0]
        dy = centroid[1] - plan_center[1]
        direction = _get_cardinal_direction(dx, dy)

        # Match Vastu rules
        rule_key = None
        for k in VASTU_RULES:
            if k in name:
                rule_key = k
                break

        if rule_key:
            total_evaluated += 1
            rule = VASTU_RULES[rule_key]

            if direction in rule["ideal"]:
                favorable_count += 1
            elif direction in rule["acceptable"]:
                favorable_count += 0.7
            elif direction in rule["negative"]:
                issues.append({
                    "code": f"VASTU-{rule_key.upper()}-ZONE",
                    "severity": "warning",
                    "category": "Vastu Alignment",
                    "direction": direction,
                    "message": f"{r.get('label')} is placed in the {direction} zone (unfavorable according to Vastu principles).",
                    "suggestion": rule["recommendation"],
                })
            else:
                favorable_count += 0.5

    score = round((favorable_count / max(1, total_evaluated)) * 100) if total_evaluated > 0 else 90

    return {
        "score": score,
        "favorable_rooms": round(favorable_count),
        "total_evaluated": total_evaluated,
        "issues": issues,
    }
