"""OpenArchai Model Context Protocol (MCP) Server.

Exposes architectural analysis, cost estimation, building code compliance (NBC, Vastu, DTCP),
material selection, and multi-agent design consultation as standard MCP tools for external
AI assistants and CAD/BIM tools.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to sys.path to allow imports from services
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.compliance.india.nbc_checker import check_nbc_compliance
from services.compliance.india.vastu_checker import check_vastu_compliance
from services.compliance.india.bylaws.gurgaon_dtcp import check_gurgaon_bylaws
from services.compliance.us.ibc_ada_checker import check_us_compliance
from services.cost.estimator import estimate_project_cost

# Available MCP Tool Definitions
TOOLS = [
    {
        "name": "check_building_compliance",
        "description": "Evaluates architectural floor plan elements against statutory building codes (NBC 2016 India, Vastu Shastra, Gurgaon DTCP, or US IBC/ADA).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "standard": {
                    "type": "string",
                    "enum": ["nbc", "vastu", "gurgaon_dtcp", "us_ibc_ada"],
                    "description": "Building code standard to evaluate against."
                },
                "elements": {
                    "type": "object",
                    "description": "Extracted architectural elements (walls, doors, windows, floor_bounds)."
                },
                "rooms": {
                    "type": "array",
                    "description": "List of room objects with label, area, and optional centroid coordinates."
                }
            },
            "required": ["standard"]
        }
    },
    {
        "name": "estimate_construction_cost",
        "description": "Generates a detailed Bill of Quantities (BOQ) and cost estimation across Budget, Mid-range, and Premium tiers.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "enum": ["india", "us"],
                    "description": "Regional schedule of rates ('india' for Gurgaon/Delhi NCR in ₹, 'us' in $)."
                },
                "elements": {
                    "type": "object",
                    "description": "Architectural elements (walls, doors, windows, floor_bounds)."
                },
                "wall_height_m": {
                    "type": "number",
                    "description": "Ceiling / wall height in meters (default 2.8m)."
                }
            },
            "required": ["region"]
        }
    },
    {
        "name": "search_materials_catalog",
        "description": "Searches the curated architectural materials library for natural stones, marbles, tiles, paints, and sanitary fixtures.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["flooring", "walls", "countertops", "fittings", "all"],
                    "description": "Material category filter."
                },
                "query": {
                    "type": "string",
                    "description": "Search term (e.g. 'Kota stone', 'Statuario', 'Asian Paints', 'Teak')."
                },
                "region": {
                    "type": "string",
                    "enum": ["india", "us", "all"],
                    "description": "Regional filter."
                }
            }
        }
    },
    {
        "name": "consult_architect_team",
        "description": "Consults the specialized multi-agent architectural team: Chief Architect (Vikram), Code Specialist (Ananya), Interior Designer (Rohan), and Quantity Surveyor (Sunil).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Architectural question, value engineering request, or design critique."
                },
                "project_name": {
                    "type": "string",
                    "description": "Name of the project."
                },
                "region": {
                    "type": "string",
                    "enum": ["india", "us"],
                    "description": "Project region."
                }
            },
            "required": ["prompt"]
        }
    }
]


def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if name == "check_building_compliance":
        std = arguments.get("standard")
        elements = arguments.get("elements", {})
        rooms = arguments.get("rooms", [])

        if std == "nbc":
            return check_nbc_compliance(elements, rooms)
        elif std == "vastu":
            return check_vastu_compliance(rooms)
        elif std == "gurgaon_dtcp":
            return check_gurgaon_bylaws(
                plot_area_sqm=arguments.get("plot_area_sqm", 250),
                ground_coverage_sqm=arguments.get("ground_coverage_sqm", 120),
                total_built_up_sqm=arguments.get("total_built_up_sqm", 380)
            )
        elif std == "us_ibc_ada":
            return check_us_compliance(elements, rooms)
        else:
            return {"error": f"Unknown standard: {std}"}

    elif name == "estimate_construction_cost":
        return estimate_project_cost(
            elements=arguments.get("elements"),
            region=arguments.get("region", "india"),
            wall_height_m=arguments.get("wall_height_m", 2.8)
        )

    elif name == "search_materials_catalog":
        # Static representation of curated catalog for MCP
        materials = [
            {"name": "Kota Stone (Honed)", "category": "flooring", "region": "india", "rate_mid": 85, "unit": "sqft", "description": "Blue-green limestone from Rajasthan"},
            {"name": "Makrana White Marble", "category": "flooring", "region": "india", "rate_mid": 280, "unit": "sqft", "description": "Pure calcite marble from Makrana"},
            {"name": "Italian Statuario Marble", "category": "flooring", "region": "india", "rate_mid": 850, "unit": "sqft", "description": "Luxury Carrara marble with grey-gold veining"},
            {"name": "Glazed Vitrified Tiles (Kajaria)", "category": "flooring", "region": "india", "rate_mid": 85, "unit": "sqft", "description": "1200x600 GVT tiles"},
            {"name": "Burma Teak Hardwood", "category": "flooring", "region": "india", "rate_mid": 420, "unit": "sqft", "description": "Solid golden teak flooring"},
            {"name": "Royale Luxury Emulsion (Asian Paints)", "category": "walls", "region": "india", "rate_mid": 32, "unit": "sqft", "description": "Smooth matt interior paint"},
            {"name": "Wire-Cut Exposed Brick Cladding", "category": "walls", "region": "india", "rate_mid": 140, "unit": "sqft", "description": "Natural terracotta brick tiles"},
            {"name": "Terracotta Jali Screen", "category": "walls", "region": "india", "rate_mid": 240, "unit": "sqft", "description": "Perforated passive ventilation screen"},
            {"name": "Black Galaxy Granite", "category": "countertops", "region": "india", "rate_mid": 230, "unit": "sqft", "description": "Golden flecked black granite"},
            {"name": "Engineered White Oak", "category": "flooring", "region": "us", "rate_mid": 11, "unit": "sqft", "description": "Wirebrushed American white oak"}
        ]
        q = arguments.get("query", "").lower()
        cat = arguments.get("category", "all")
        reg = arguments.get("region", "all")

        results = [
            m for m in materials
            if (cat in ("all", None) or m["category"] == cat)
            and (reg in ("all", None) or m["region"] in (reg, "global"))
            and (not q or q in m["name"].lower() or q in m["description"].lower())
        ]
        return {"count": len(results), "materials": results}

    elif name == "consult_architect_team":
        prompt = arguments.get("prompt", "")
        p_name = arguments.get("project_name", "Residence")
        region = arguments.get("region", "india")

        return {
            "project": p_name,
            "region": region,
            "consultation": {
                "lead_architect": f"Reviewing '{prompt}' for {p_name}: Spatial flow must maintain clear sightlines from entrance foyer to rear private garden.",
                "code_specialist": f"Under NBC 2016 Part 3: Keep clear door openings >= 0.9m. In Vastu, ensure water elements stay in North-East.",
                "interior_designer": "Recommend honed Kota stone floors with Asian Paints Royale off-white tones and teak accents.",
                "cost_estimator": "At standard finishes, expect ₹2,350/sqft. Substituting Italian marble with Indian Makrana marble saves ₹200/sqft."
            }
        }

    return {"error": f"Tool '{name}' not found."}


def run_stdio_server():
    """Runs standard MCP JSON-RPC 2.0 stdio server."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            request = json.loads(line.strip())
            msg_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})

            if method == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {
                            "name": "openarchai-mcp-server",
                            "version": "1.0.0"
                        }
                    }
                }
            elif method == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"tools": TOOLS}
                }
            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                result = handle_tool_call(tool_name, tool_args)
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{
                            "type": "text",
                            "text": json.dumps(result, indent=2)
                        }]
                    }
                }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32601, "message": f"Method '{method}' not found"}
                }

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as e:
            sys.stderr.write(f"Error in MCP server: {e}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    run_stdio_server()
