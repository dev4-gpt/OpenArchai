"""National Building Code of India (NBC 2016) automated compliance checker.

Evaluates architectural drawings and extracted room/wall elements against Part 3 & Part 4
of the NBC: minimum room sizes, ceiling heights, circulation corridor widths,
door clearances, ventilation requirements, travel distance, and dead-end limits.

All check logic mirrors the deterministic TypeScript calculators in
apps/web/src/lib/calculators/nbc-egress.ts so results are consistent across
the Python and TypeScript layers.
"""

import math
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# NBC 2016 Constants
# ---------------------------------------------------------------------------
NBC_CONSTANTS = {
    "occupant_load_factor_m2": 9.3,          # Part 4 Table 1: m² per person (residential)
    "egress_width_factor_mm": 3.81,          # Part 4 Table 2: mm per occupant
    "min_exit_door_width_m": 0.9,            # Part 4 Table 2: internal exit door
    "min_common_corridor_m": 1.2,            # Part 4 Table 2: common/shared corridor
    "min_passage_width_m": 0.9,              # Part 4 Table 2: private residential spine
    "max_travel_dist_unsprinklered_m": 30.0, # Part 4 Cl. 4.5.1
    "max_travel_dist_sprinklered_m": 45.0,   # Part 4 Cl. 4.5.1
    "max_dead_end_m": 6.0,                   # Part 4 Cl. 4.6
    "min_clear_height_m": 2.75,              # Part 3 Cl. 12.1 (habitable rooms)
    "window_to_floor_ratio": 0.10,           # Part 8 Sec 1: min 10% glazed area
}

NBC_STANDARDS = {
    "rooms": {
        "master_bedroom": {"min_area_sqm": 9.5, "min_width_m": 2.4, "label": "Master Bedroom"},
        "bedroom": {"min_area_sqm": 9.5, "min_width_m": 2.4, "label": "Bedroom"},
        "living_room": {"min_area_sqm": 9.5, "min_width_m": 3.0, "label": "Living Room"},
        "kitchen": {"min_area_sqm": 5.0, "min_width_m": 1.8, "label": "Kitchen"},
        "dining_room": {"min_area_sqm": 7.5, "min_width_m": 2.4, "label": "Dining Room"},
        "bathroom": {"min_area_sqm": 1.8, "min_width_m": 1.2, "label": "Bathroom (combined)"},
        "wc": {"min_area_sqm": 1.1, "min_width_m": 0.9, "label": "Water Closet (WC)"},
        "store_room": {"min_area_sqm": 3.0, "min_width_m": 1.2, "label": "Store Room"},
        "pooja_room": {"min_area_sqm": 2.0, "min_width_m": 1.2, "label": "Pooja Room"},
    },
    "circulation": {
        "corridor_min_width_m": 1.0,
        "habitable_door_min_width_m": 0.9,
        "bath_door_min_width_m": 0.75,
        "main_entry_min_width_m": 1.0,
        "min_clear_height_m": 2.75,
    },
    "ventilation": {
        "window_to_floor_area_ratio": 0.10,
    },
}


# ---------------------------------------------------------------------------
# Deterministic Sub-Checks (pure functions)
# ---------------------------------------------------------------------------

def calc_occupant_load(carpet_area_sqm: float) -> int:
    """
    NBC 2016 Part 4 Table 1: Occupant load factor = 9.3 m²/person (residential).
    Returns the design occupant count (rounded up).
    """
    if carpet_area_sqm <= 0:
        raise ValueError("carpet_area_sqm must be > 0")
    return math.ceil(carpet_area_sqm / NBC_CONSTANTS["occupant_load_factor_m2"])


def calc_required_egress_width_mm(occupants: int) -> float:
    """
    NBC 2016 Part 4 Table 2: Required clear egress width in mm.
    = occupants × 3.81 mm/occupant, minimum 900 mm.
    """
    return max(occupants * NBC_CONSTANTS["egress_width_factor_mm"],
               NBC_CONSTANTS["min_exit_door_width_m"] * 1000)


def check_corridor_width(
    corridors: List[Dict[str, Any]],
    is_common: bool = False,
) -> List[Dict[str, Any]]:
    """
    Checks each corridor element's width against the NBC minimum.
    is_common=True applies the 1.2 m common-corridor standard;
    is_common=False applies the 0.9 m private-spine standard.
    """
    issues = []
    limit = (NBC_CONSTANTS["min_common_corridor_m"] if is_common
             else NBC_CONSTANTS["min_passage_width_m"])
    clause = ("NBC 2016 Part 4 Table 2 (common corridor: 1.2 m)"
              if is_common else "NBC 2016 Part 4 Table 2 (private spine: 0.9 m)")
    for idx, corridor in enumerate(corridors):
        width = corridor.get("width_m", None)
        if width is None:
            continue
        if width < limit:
            issues.append({
                "code": "NBC-CORR-WIDTH",
                "standard": clause,
                "severity": "error",
                "category": "Circulation",
                "message": (
                    f"Corridor #{idx + 1} clear width ({width:.2f} m) is below "
                    f"the NBC minimum of {limit} m."
                ),
                "suggestion": f"Increase corridor clear width to at least {limit} m.",
            })
    return issues


def check_travel_distance(
    corridors: List[Dict[str, Any]],
    sprinklered: bool = False,
) -> List[Dict[str, Any]]:
    """
    NBC 2016 Part 4 Cl. 4.5.1: Maximum travel distance to nearest exit stair.
    Unsprinklered: 30 m. Sprinklered: 45 m.
    Each corridor element may carry a 'travel_distance_m' field.
    """
    issues = []
    limit = (NBC_CONSTANTS["max_travel_dist_sprinklered_m"] if sprinklered
             else NBC_CONSTANTS["max_travel_dist_unsprinklered_m"])
    clause = (
        "NBC 2016 Part 4 Cl. 4.5.1 (sprinklered: 45 m max)"
        if sprinklered
        else "NBC 2016 Part 4 Cl. 4.5.1 (unsprinklered: 30 m max)"
    )
    for idx, corridor in enumerate(corridors):
        dist = corridor.get("travel_distance_m", None)
        if dist is None:
            continue
        if dist > limit:
            issues.append({
                "code": "NBC-TRAVEL-DIST",
                "standard": clause,
                "severity": "error",
                "category": "Egress",
                "message": (
                    f"Corridor #{idx + 1} travel distance ({dist:.1f} m) exceeds "
                    f"the NBC maximum of {limit} m."
                ),
                "suggestion": (
                    "Relocate the exit stair or add a secondary egress to bring the "
                    f"worst-case path to ≤ {limit} m."
                ),
            })
    return issues


def check_dead_end(corridors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    NBC 2016 Part 4 Cl. 4.6: Dead-end corridors must not exceed 6.0 m.
    Each corridor element may carry a 'dead_end_m' field.
    """
    issues = []
    limit = NBC_CONSTANTS["max_dead_end_m"]
    clause = "NBC 2016 Part 4 Cl. 4.6 (dead-end: 6.0 m max)"
    for idx, corridor in enumerate(corridors):
        dead_end = corridor.get("dead_end_m", None)
        if dead_end is None:
            continue
        if dead_end > limit:
            issues.append({
                "code": "NBC-DEAD-END",
                "standard": clause,
                "severity": "error",
                "category": "Egress",
                "message": (
                    f"Corridor #{idx + 1} dead-end length ({dead_end:.1f} m) exceeds "
                    f"the NBC maximum of {limit} m."
                ),
                "suggestion": (
                    "Provide a second means of egress at the dead-end or shorten the "
                    f"blind pocket to ≤ {limit} m."
                ),
            })
    return issues


def check_ceiling_height(elements: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    NBC 2016 Part 3 Cl. 12.1: Minimum clear ceiling height 2.75 m for habitable rooms.
    Reads 'ceiling_height_m' from the elements dict.
    """
    issues = []
    height = elements.get("ceiling_height_m", None)
    if height is None:
        # Cannot verify without data — skip rather than unconditionally pass
        return issues
    limit = NBC_CONSTANTS["min_clear_height_m"]
    if height < limit:
        issues.append({
            "code": "NBC-CEIL-HEIGHT",
            "standard": "NBC 2016 Part 3 Cl. 12.1",
            "severity": "error",
            "category": "Habitable Space",
            "message": (
                f"Ceiling height ({height:.2f} m) is below the NBC minimum of {limit} m "
                "for habitable rooms."
            ),
            "suggestion": f"Raise finished ceiling to at least {limit} m.",
        })
    return issues


# ---------------------------------------------------------------------------
# Main Public Function
# ---------------------------------------------------------------------------

def check_nbc_compliance(
    elements: Dict[str, Any],
    rooms: Optional[List[Dict[str, Any]]] = None,
    sprinklered: bool = False,
) -> Dict[str, Any]:
    """
    Comprehensive NBC 2016 compliance check.

    Args:
        elements: Dict containing any of:
            - doors      list[{width_m, ...}]
            - windows    list[{...}]
            - walls      list[{...}]
            - corridors  list[{width_m?, travel_distance_m?, dead_end_m?}]
            - ceiling_height_m  float
        rooms: Optional list of labeled room dicts with {label, area, ...}
        sprinklered: True if the floor is fully sprinklered

    Returns:
        Dict with standard, score (0–100), checks_passed, total_checks, issues.
    """
    issues: List[Dict[str, Any]] = []
    checks_passed = 0
    total_checks = 0

    # 1. Door widths
    doors = elements.get("doors", [])
    if doors:
        for idx, door in enumerate(doors):
            total_checks += 1
            width = door.get("width_m") or 0.9
            if width < NBC_STANDARDS["circulation"]["bath_door_min_width_m"]:
                issues.append({
                    "code": "NBC-DOOR-WIDTH",
                    "standard": "NBC 2016 Part 3 Cl. 12.18",
                    "severity": "error",
                    "category": "Circulation",
                    "message": (
                        f"Door #{idx + 1} clear width ({width}m) is below the NBC "
                        "minimum of 0.75m."
                    ),
                    "suggestion": (
                        "Increase door opening to at least 0.9m for standard rooms "
                        "or 0.75m for bathrooms."
                    ),
                })
            else:
                checks_passed += 1

    # 2. Windows & ventilation ratio
    windows = elements.get("windows", [])
    total_checks += 1
    if not windows and len(elements.get("walls", [])) > 2:
        issues.append({
            "code": "NBC-VENT-MISSING",
            "standard": "NBC 2016 Part 8 Sec 1",
            "severity": "warning",
            "category": "Ventilation & Light",
            "message": (
                "No external windows detected in floor plan. NBC mandates opening area "
                ">= 10% of floor area."
            ),
            "suggestion": (
                "Add windows on perimeter walls to satisfy natural light and "
                "ventilation norms."
            ),
        })
    else:
        checks_passed += 1

    # 3. Room dimensions
    if rooms:
        for room in rooms:
            name = room.get("label", "").lower().replace(" ", "_")
            area = room.get("area", 0)
            std_key = None
            for key in NBC_STANDARDS["rooms"]:
                if key in name:
                    std_key = key
                    break
            if std_key:
                total_checks += 1
                std = NBC_STANDARDS["rooms"][std_key]
                if area < std["min_area_sqm"]:
                    issues.append({
                        "code": "NBC-ROOM-AREA",
                        "standard": "NBC 2016 Part 3 Cl. 12.2",
                        "severity": "error",
                        "category": "Habitable Space",
                        "message": (
                            f"{room.get('label')} area ({area:.1f} m²) is below NBC "
                            f"minimum requirement ({std['min_area_sqm']} m²)."
                        ),
                        "suggestion": (
                            f"Expand {room.get('label')} to at least {std['min_area_sqm']} m²."
                        ),
                    })
                else:
                    checks_passed += 1

    # 4. Ceiling height (only checked if data is provided — no unconditional pass)
    ceiling_issues = check_ceiling_height(elements)
    if ceiling_issues:
        total_checks += 1
        issues.extend(ceiling_issues)
    elif elements.get("ceiling_height_m") is not None:
        total_checks += 1
        checks_passed += 1
    # If ceiling_height_m not provided: skip (no phantom pass)

    # 5. Corridor width (if corridor data provided)
    corridors = elements.get("corridors", [])
    if corridors:
        corr_issues = check_corridor_width(corridors)
        for _ in corridors:
            total_checks += 1
        issues.extend(corr_issues)
        checks_passed += len(corridors) - len(corr_issues)

    # 6. Travel distance (if data provided)
    travel_issues = check_travel_distance(corridors, sprinklered=sprinklered)
    travel_checked = [c for c in corridors if c.get("travel_distance_m") is not None]
    for _ in travel_checked:
        total_checks += 1
    issues.extend(travel_issues)
    checks_passed += len(travel_checked) - len(travel_issues)

    # 7. Dead-end check (if data provided)
    dead_end_issues = check_dead_end(corridors)
    dead_end_checked = [c for c in corridors if c.get("dead_end_m") is not None]
    for _ in dead_end_checked:
        total_checks += 1
    issues.extend(dead_end_issues)
    checks_passed += len(dead_end_checked) - len(dead_end_issues)

    score = round((checks_passed / max(1, total_checks)) * 100)

    return {
        "standard": "National Building Code of India (NBC 2016)",
        "score": score,
        "checks_passed": checks_passed,
        "total_checks": total_checks,
        "issues": issues,
    }
