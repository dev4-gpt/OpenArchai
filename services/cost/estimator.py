"""Automated Bill of Quantities (BOQ) and Cost Estimator for AtelierOS.

Consumes construction model elements (walls, doors, windows, bounds) and regional schedules of rates
(rates_india.json or rates_us.json) to produce an architect-grade cost estimate across
Budget, Mid-range, and Premium specifications.
"""

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional


def load_rates(region: str = "india") -> Dict[str, Any]:
    current_dir = Path(__file__).parent
    rates_file = current_dir / ("rates_india.json" if region == "india" else "rates_us.json")
    if not rates_file.exists():
        rates_file = current_dir / "rates_india.json"
    with open(rates_file, "r", encoding="utf-8") as f:
        return json.load(f)


def estimate_project_cost(
    elements: Optional[Dict[str, Any]] = None,
    region: str = "india",
    wall_height_m: float = 2.8,
) -> Dict[str, Any]:
    rates_data = load_rates(region)

    floor_area_sqm = 110.0
    wall_area_sqm = 175.0
    perimeter_m = 60.0
    door_count = 5
    window_count = 4

    if elements and "walls" in elements and len(elements["walls"]) > 0:
        door_count = len(elements.get("doors", []))
        window_count = len(elements.get("windows", []))

        total_wall_len = 0.0
        for w in elements["walls"]:
            if "start" in w and "end" in w:
                start = w["start"]
                end = w["end"]
                dx = end[0] - start[0]
                dy = end[1] - start[1]
                total_wall_len += math.hypot(dx, dy)
            elif "length" in w:
                total_wall_len += float(w["length"])
        perimeter_m = total_wall_len

        gross_wall_area = total_wall_len * wall_height_m * 1.8
        door_deduction = door_count * (0.9 * 2.1)
        win_deduction = window_count * (1.2 * 1.2)
        wall_area_sqm = max(20.0, gross_wall_area - (door_deduction + win_deduction))

        bounds = elements.get("floor_bounds", {})
        if bounds and bounds.get("max_x", 0) > bounds.get("min_x", 0):
            dx = bounds["max_x"] - bounds["min_x"]
            dy = bounds["max_y"] - bounds["min_y"]
            floor_area_sqm = dx * dy * 0.75
        else:
            floor_area_sqm = total_wall_len * 1.6

    floor_area_sqft = floor_area_sqm * 10.7639
    wall_masonry_sqft = (perimeter_m * wall_height_m) * 10.7639
    net_wall_paint_sqft = wall_area_sqm * 10.7639
    bathrooms_count = max(1, round(floor_area_sqm / 45.0))
    symbol = rates_data.get("symbol", "₹")

    is_india = region == "india"

    # Architect-grade per-element Schedule of Rates line items
    items = [
        {
            "category": "Civil & Structural Masonry",
            "description": f"AAC blockwork / 230mm brick masonry & double-coat sand plaster ({round(perimeter_m, 1)}m linear wall run)",
            "quantity": round(wall_masonry_sqft),
            "unit": "sqft",
            "rate_budget": 135 if is_india else 5.5,
            "rate_mid": 210 if is_india else 9.0,
            "rate_premium": 340 if is_india else 16.0,
        },
        {
            "category": "Flooring & Perimeter Skirting",
            "description": "Floor tiling / natural stone supply, mortar bed & 100mm perimeter skirting",
            "quantity": round(floor_area_sqft),
            "unit": "sqft",
            "rate_budget": 95 if is_india else 6.5,
            "rate_mid": 195 if is_india else 14.0,
            "rate_premium": 840 if is_india else 38.0,
        },
        {
            "category": "Net Wall Finishes & Emulsion",
            "description": "Surface putty, primer & luxury emulsion coats (net area deducting door/window voids)",
            "quantity": round(net_wall_paint_sqft),
            "unit": "sqft",
            "rate_budget": 18 if is_india else 1.8,
            "rate_mid": 36 if is_india else 3.2,
            "rate_premium": 165 if is_india else 12.0,
        },
        {
            "category": "Door Suites & Hardware",
            "description": "Engineered doors with hardwood frames, architraves & architectural mortise hardware",
            "quantity": max(1, door_count),
            "unit": "doors",
            "rate_budget": 8500 if is_india else 280,
            "rate_mid": 16500 if is_india else 550,
            "rate_premium": 28000 if is_india else 1100,
        },
        {
            "category": "Window Suites & Glazing",
            "description": "Acoustic & weather-sealed window suites with sub-frames & clear float glazing",
            "quantity": max(1, window_count),
            "unit": "windows",
            "rate_budget": 7200 if is_india else 260,
            "rate_mid": 14500 if is_india else 520,
            "rate_premium": 29500 if is_india else 1200,
        },
        {
            "category": "Electrical & Circadian Lighting",
            "description": "Concealed FRLS conduits, distribution board, modular switches & LED cove/downlights",
            "quantity": round(floor_area_sqft),
            "unit": "sqft",
            "rate_budget": 110 if is_india else 8.5,
            "rate_mid": 185 if is_india else 16.0,
            "rate_premium": 295 if is_india else 28.0,
        },
        {
            "category": "Plumbing, Wet Wall & Sanitaryware",
            "description": "CPVC water supply, soil/waste stack connections & luxury sanitaryware suites",
            "quantity": bathrooms_count,
            "unit": "baths",
            "rate_budget": 42000 if is_india else 1500,
            "rate_mid": 82000 if is_india else 3200,
            "rate_premium": 165000 if is_india else 6800,
        },
    ]

    total_b = sum(it["quantity"] * it["rate_budget"] for it in items)
    total_m = sum(it["quantity"] * it["rate_mid"] for it in items)
    total_p = sum(it["quantity"] * it["rate_premium"] for it in items)

    contingency_rate = rates_data.get("contingency_rate", 0.10)

    return {
        "region": region,
        "currency": rates_data.get("currency", "INR"),
        "symbol": symbol,
        "floor_area_sqm": round(floor_area_sqm, 1),
        "floor_area_sqft": round(floor_area_sqft),
        "wall_area_sqft": round(net_wall_paint_sqft),
        "linear_wall_meters": round(perimeter_m, 1),
        "door_count": door_count,
        "window_count": window_count,
        "bathrooms_count": bathrooms_count,
        "items": items,
        "subtotal": {
            "budget": round(total_b),
            "mid": round(total_m),
            "premium": round(total_p),
        },
        "contingency": {
            "budget": round(total_b * contingency_rate),
            "mid": round(total_m * contingency_rate),
            "premium": round(total_p * contingency_rate),
        },
        "grand_total": {
            "budget": round(total_b * (1 + contingency_rate)),
            "mid": round(total_m * (1 + contingency_rate)),
            "premium": round(total_p * (1 + contingency_rate)),
        },
    }
