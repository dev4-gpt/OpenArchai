#!/usr/bin/env python3
"""
Adversarial Simulation Rubric and Arithmetic Verification Harness
Tests scripts/mirofish_studio_simulation.py functions offline.
"""

import sys
import os

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.mirofish_studio_simulation import (
    CRITERION_PATTERNS,
    check_criterion,
    evaluate_rubric,
)

def run_tests():
    print("======================================================================")
    print("RUNNING ADVERSARIAL PYTHON SIMULATION HARNESS")
    print("======================================================================")

    passed = 0
    failed = 0

    def assert_true(cond, msg):
        nonlocal passed, failed
        if cond:
            passed += 1
            print(f"  ✔ {msg}")
        else:
            failed += 1
            print(f"  ✖ FAILED: {msg}")

    # -------------------------------------------------------------------------
    # Test 1: Mathematical Invariant Checks
    # -------------------------------------------------------------------------
    print("\n--- Test Suite 1: Mathematical Invariant Checks ---")
    
    # 1,200 sqft flat × (₹840 - ₹127.50) = ₹8,55,000 savings
    unit_delta = 840 - 127.50
    assert_true(unit_delta == 712.50, "Unit delta is exactly ₹712.50/sqft")
    
    total_savings = 1200 * unit_delta
    assert_true(total_savings == 855000.0, "Total savings is exactly ₹8,55,000")
    
    baseline_budget = 2850000
    capex_pct = (total_savings / baseline_budget) * 100
    assert_true(capex_pct == 30.0, "Capex reduction is exactly 30.0% of ₹28,50,000")
    
    lead_time_baseline = 16
    lead_time_proposed = 2
    lead_time_savings = lead_time_baseline - lead_time_proposed
    assert_true(lead_time_savings == 14, "Lead time reduction is exactly 14 weeks")

    # -------------------------------------------------------------------------
    # Test 2: Custom Area Scaling
    # -------------------------------------------------------------------------
    print("\n--- Test Suite 2: Custom Area Scaling Invariants ---")
    for area, expected_savings, expected_budget_pct in [
        (500, 356250.0, 12.5),
        (2500, 1781250.0, 62.5),
        (10000, 7125000.0, 250.0),
        (0, 0.0, 0.0)
    ]:
        savings = area * unit_delta
        assert_true(savings == expected_savings, f"Area {area} sqft produces exact savings {expected_savings}")
        pct = (savings / baseline_budget) * 100 if baseline_budget > 0 else 0
        assert_true(pct == expected_budget_pct, f"Area {area} sqft capex pct {pct}% matches {expected_budget_pct}%")

    # -------------------------------------------------------------------------
    # Test 3: Criterion Pattern Matching
    # -------------------------------------------------------------------------
    print("\n--- Test Suite 3: Criterion Pattern Robustness ---")
    
    # Test all 20 criteria patterns
    test_cases = {
        "20% Capex": "We achieved a 20% capex reduction down to 22.8L.",
        "84% NTG": "Pushing net-to-gross efficiency to 84% NTG across the plan.",
        "Usable area math": "We reclaim 96 sq ft of circulation, moving from 912 to 1,008 sq ft usable carpet area.",
        "Kajaria GVT / Marble swap": "Replaced imported Italian marble with Kajaria vitrified PGVT tiles.",
        "IS 1893 Zone IV": "Detailed in compliance with IS 1893:2016 for Zone IV seismic activity.",
        "300x300mm shaft": "Consolidated plumbing into a single 300x300mm vertical service shaft.",
        "6.0m x 7.2m grid": "Structural column grid spanning 6.0m x 7.2m structural bay.",
        "Sunken slab screed": "Utilizing a sunken slab with light screed and pre-sleeved penetrations.",
        "NBC 2016 Part 4 Table 2": "Compliant with NBC 2016 Part 4 Table 2 clear width requirements.",
        "0.9m clear width": "Clear door passage width exceeds 0.9m minimum clear opening.",
        "Travel distance < 30m": "The egress travel distance is 18.4m <= 30m to the exit door.",
        "0 dead ends": "Layout contains 0m dead-end corridor segments.",
        "STC 55 acoustic drywall": "Installed STC 56 tested Gyproc SoundStop partition drywall system.",
        "Asian Paints Royale Health Shield": "Asian Paints Royale Health Shield Zero-VOC luxury emulsion paint.",
        "98+ CRI circadian": "Circadian tunable lighting fixtures with 98+ CRI index.",
        "Vastu Agni/Nairutya": "Kitchen placed in Agni SE quadrant, Master in Nairutya SW zone per Vastu.",
        "Kiln-dried 8-12%": "IS 287 kiln-dried timber with 8-12% equilibrium moisture content.",
        "BWP 710 / WPC backer": "Marine-grade BWP 710 plywood backing board prevents swelling.",
        "C2TE S1 adhesive": "Tile bonded with IS 15477 C2TE S1 flexible polymer modified adhesive.",
        "Kota stone 2-3 wk lead time": "Honed Kota stone sourced from Rajasthan quarry with 2-3 weeks lead time.",
    }

    for criterion, text in test_cases.items():
        assert_true(check_criterion(criterion, text), f"Pattern '{criterion}' matches target text")

    # -------------------------------------------------------------------------
    # Test 4: Evaluate Rubric Robustness
    # -------------------------------------------------------------------------
    print("\n--- Test Suite 4: Rubric Evaluation Robustness ---")
    
    # Degraded response -> Total 0
    degraded_eval = evaluate_rubric("", source="degraded")
    assert_true(degraded_eval["total"] == 0, "Degraded response scores 0/100")
    assert_true(degraded_eval["degraded"] is True, "Degraded flag is correctly set")

    # Empty content -> Total 0
    empty_eval = evaluate_rubric("   ", source="model")
    assert_true(empty_eval["total"] == 0, "Empty content scores 0/100")

    # Auto-injected action trigger -> action score 0
    injected_eval = evaluate_rubric(
        "Here is a plan [ACTION: apply_layout] with 1200 sqft and NBC 2016.",
        source="model",
        action_injected=True
    )
    assert_true(injected_eval["scores"]["action_triggers"] == 0, "Injected action triggers score 0 pts")

    # Genuine action trigger -> action score 25
    genuine_eval = evaluate_rubric(
        "Here is a plan [ACTION: apply_layout] with 1200 sqft and NBC 2016.",
        source="model",
        action_injected=False
    )
    assert_true(genuine_eval["scores"]["action_triggers"] == 25, "Genuine action triggers score 25 pts")

    # Rich architectural response with all 4 dimensions
    rich_response = (
        "Under NBC 2016 Part 4 Table 2 and IS 1893 Zone IV, we recommend a 20% capex reduction "
        "from ₹28,50,000 down to ₹22,80,000 (savings = ₹8,55,000). Usable carpet area is 1,008 sq ft "
        "with 84% NTG efficiency (1200 × 0.84 = 1008 sq ft). Replaces marble with Kajaria vitrified PGVT tile. "
        "All drainage routes through a 300x300mm vertical shaft with pre-sleeved penetrations in the sunken slab screed. "
        "Clear door width is 0.9m and travel distance is 18.4m <= 30m with 0 dead ends. "
        "Partitions use Gyproc SoundStop STC 56 drywall with Rockwool cavity insulation, Asian Paints Royale Health Shield "
        "Zero-VOC paint, 98+ CRI circadian lighting, and kiln-dried 8-12% moisture timber with BWP 710 backer and C2TE S1 polymer mortar. "
        "[ACTION: apply_layout]"
    )
    rich_eval = evaluate_rubric(
        rich_response,
        expected_criteria=["20% Capex", "84% NTG", "Usable area math", "Kajaria GVT / Marble swap"],
        source="model",
        action_injected=False
    )
    assert_true(rich_eval["total"] >= 75, f"Rich architectural response scores high: {rich_eval['total']}/100 >= 75")
    assert_true(len(rich_eval["criteria_hits"]) == 4, "All 4 expected criteria hits registered")

    print("\n======================================================================")
    print(f"PYTHON SIMULATION HARNESS SUMMARY: {passed} PASSED, {failed} FAILED")
    print("======================================================================")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
