import sys
from pathlib import Path

# Add services/cost to path
sys.path.insert(0, str(Path(__file__).parent))
from estimator import estimate_project_cost

def test_cost_estimator_india():
    elements = {
        "walls": [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 8]},
            {"start": [10, 8], "end": [0, 8]},
            {"start": [0, 8], "end": [0, 0]},
        ],
        "doors": [{"position": [5, 0], "width_m": 0.9}],
        "windows": [{"position": [5, 8], "width_m": 1.4}],
        "floor_bounds": {"min_x": 0, "min_y": 0, "max_x": 10, "max_y": 8},
    }
    result = estimate_project_cost(elements, region="india")
    assert result["region"] == "india"
    assert result["currency"] == "INR"
    assert len(result["items"]) == 7
    assert result["grand_total"]["mid"] > 0
    print("India cost test passed! Total mid:", result["grand_total"]["mid"])

def test_cost_estimator_us():
    elements = {
        "walls": [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 8]},
        ],
        "doors": [{"position": [5, 0]}],
        "windows": [],
    }
    result = estimate_project_cost(elements, region="us")
    assert result["region"] == "us"
    assert result["currency"] == "USD"
    assert len(result["items"]) == 7
    assert result["grand_total"]["mid"] > 0
    print("US cost test passed! Total mid:", result["grand_total"]["mid"])

if __name__ == "__main__":
    test_cost_estimator_india()
    test_cost_estimator_us()
    print("All estimator tests passed!")
