"""Automated Bill of Quantities (BOQ) and Cost Estimator for OpenArchai.

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
    wall_area_sqft = wall_area_sqm * 10.7639
    symbol = rates_data.get("symbol", "₹")

    is_india = region == "india"
    multiplier_budget = 1.0
    multiplier_mid = 1.55
    multiplier_premium = 2.65

    # Civil & finishing line items
    base_rate = 140 if is_india else 4.5
    items = [
        {
            "category": "Civil & Structural",
            "description": "Blockwork/Framing, structural plaster & curing",
            "quantity": round(wall_area_sqft),
            "unit": "sqft",
            "rate_budget": base_rate,
            "rate_mid": round(base_rate * multiplier_mid),
            "rate_premium": round(base_rate * multiplier_premium),
        },
        {
            "category": "Flooring",
            "description": "Natural stone / tiles / hardwood supply and fixing",
            "quantity": round(floor_area_sqft),
            "unit": "sqft",
            "rate_budget": 90 if is_india else 6.0,
            "rate_mid": round((90 if is_india else 6.0) * 1.9),
            "rate_premium": round((90 if is_india else 6.0) * 4.5),
        },
        {
            "category": "Wall Finishes & Paint",
            "description": "Surface putty, primer & luxury emulsion coats",
            "quantity": round(wall_area_sqft),
            "unit": "sqft",
            "rate_budget": 18 if is_india else 1.8,
            "rate_mid": 32 if is_india else 2.8,
            "rate_premium": 55 if is_india else 5.2,
        },
        {
            "category": "Openings & Joinery",
            "description": "Factory doors & aluminum/uPVC window suites",
            "quantity": max(1, door_count + window_count),
            "unit": "units",
            "rate_budget": 7500 if is_india else 250,
            "rate_mid": 13000 if is_india else 500,
            "rate_premium": 24000 if is_india else 950,
        },
        {
            "category": "Electrical & Plumbing",
            "description": "Concealed conduit services & fixture rough-ins",
            "quantity": round(floor_area_sqft),
            "unit": "sqft",
            "rate_budget": 110 if is_india else 8.5,
            "rate_mid": 175 if is_india else 15.0,
            "rate_premium": 280 if is_india else 27.0,
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
        "wall_area_sqft": round(wall_area_sqft),
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
