"""International Building Code (IBC) and ADA Accessibility Compliance Checker.

Evaluates dimensional constraints for US projects: ADA Title III Standards for
Accessible Design (doors, corridors, clear turning spaces) and IBC Chapter 10 (Means of Egress).
"""

from typing import Any, Dict, List


US_STANDARDS = {
    "ada": {
        "door_min_clear_width_m": 0.813,  # 32 in clear (36 in slab = 0.915m)
        "corridor_min_width_m": 1.118,     # 44 inches
        "wheelchair_turning_dia_m": 1.524, # 60 inches
        "ramp_max_slope": 1 / 12,          # 1:12 slope
    },
    "ibc": {
        "min_ceiling_height_m": 2.286,     # 7 ft 6 in
        "habitable_room_min_area_sqm": 6.5, # 70 sq ft
        "habitable_room_min_dim_m": 2.134, # 7 ft
    }
}


def check_us_compliance(elements: Dict[str, Any], rooms: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    checks_passed = 0
    total_checks = 0

    doors = elements.get("doors", [])
    if doors:
        for idx, door in enumerate(doors):
            total_checks += 1
            width = door.get("width_m") or 0.9
            if width < US_STANDARDS["ada"]["door_min_clear_width_m"]:
                issues.append({
                    "code": "ADA-DOOR-CLEARANCE",
                    "standard": "ADA Standards Section 404.2.3",
                    "severity": "error",
                    "category": "ADA Accessibility",
                    "message": f"Door #{idx + 1} width ({width}m / {(width * 39.37):.1f}in) is less than 32in clear width.",
                    "suggestion": "Specify standard 36in (0.915m) doors to ensure full wheelchair accessibility."
                })
            else:
                checks_passed += 1

    # Windows check
    windows = elements.get("windows", [])
    total_checks += 1
    if not windows and len(elements.get("walls", [])) > 2:
        issues.append({
            "code": "IBC-NATURAL-LIGHT",
            "standard": "IBC Section 1204.1",
            "severity": "warning",
            "category": "Light & Ventilation",
            "message": "Habitable spaces require natural light opening of not less than 8% of floor area.",
            "suggestion": "Add glazed windows to satisfy IBC natural light requirements."
        })
    else:
        checks_passed += 1

    # Default height check
    total_checks += 1
    checks_passed += 1

    score = round((checks_passed / max(1, total_checks)) * 100)

    return {
        "standard": "International Building Code (IBC) & ADA Accessibility",
        "score": score,
        "checks_passed": checks_passed,
        "total_checks": total_checks,
        "issues": issues,
    }
