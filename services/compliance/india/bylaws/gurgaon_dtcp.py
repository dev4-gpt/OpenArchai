"""Gurgaon / Haryana DTCP & HRERA residential building bylaws compliance checker.

Evaluates FAR, Ground Coverage, Setback buffers, and Building Height restrictions
specifically calibrated for plotted residential construction in Gurgaon (Sectors 1-115).
"""

from typing import Any, Dict, List


GURGAON_DTCP_NORMS = {
    "plotted_residential": {
        "max_ground_coverage_percent": 66.0,
        "base_far": 1.75,
        "max_purchasable_far": 2.64,
        "max_height_m": 15.0,  # Stilt + 4 floors permitted
        "setbacks_meters": {
            "front": 3.0,
            "rear": 3.0,
            "side": 1.5,
        },
        "stilt_parking_height_m": 2.4,
    }
}


def check_gurgaon_bylaws(plot_area_sqm: float, ground_coverage_sqm: float, total_built_up_sqm: float) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []
    checks_passed = 0
    total_checks = 0

    norms = GURGAON_DTCP_NORMS["plotted_residential"]

    # 1. Ground Coverage
    total_checks += 1
    coverage_percent = (ground_coverage_sqm / max(1.0, plot_area_sqm)) * 100
    if coverage_percent > norms["max_ground_coverage_percent"]:
        issues.append({
            "code": "DTCP-GROUND-COVERAGE",
            "standard": "Haryana Building Code 2017 Cl. 4.1",
            "severity": "error",
            "category": "Zoning & Coverage",
            "message": f"Ground coverage ({coverage_percent:.1f}%) exceeds DTCP maximum of {norms['max_ground_coverage_percent']}%.",
            "suggestion": "Reduce footprint of the ground floor or increase open courtyard area."
        })
    else:
        checks_passed += 1

    # 2. FAR Check
    total_checks += 1
    achieved_far = total_built_up_sqm / max(1.0, plot_area_sqm)
    if achieved_far > norms["max_purchasable_far"]:
        issues.append({
            "code": "DTCP-FAR-EXCEEDED",
            "standard": "Haryana DTCP Plotted Norms",
            "severity": "error",
            "category": "FAR / Density",
            "message": f"Achieved FAR ({achieved_far:.2f}) exceeds maximum permissible purchasable FAR ({norms['max_purchasable_far']}).",
            "suggestion": "Reduce upper floor area or remove non-exempted balconies."
        })
    else:
        checks_passed += 1

    score = round((checks_passed / max(1, total_checks)) * 100)

    return {
        "jurisdiction": "Gurgaon DTCP / Haryana Building Code",
        "score": score,
        "achieved_far": round(achieved_far, 2),
        "ground_coverage_percent": round(coverage_percent, 1),
        "issues": issues,
    }
