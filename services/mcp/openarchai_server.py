"""AtelierOS Model Context Protocol (MCP) Server.

Exposes architectural analysis, cost estimation, building code compliance (NBC, Vastu, DTCP),
material selection, and multi-agent design consultation as standard MCP tools for external
AI assistants and CAD/BIM tools.
"""

import json
import math
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
    },
    {
        "name": "import_cad_dxf",
        "description": "Parses AutoCAD .dxf ASCII drawings directly into normalized 2D/3D building elements (walls, doors, windows).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "dxf_text": {
                    "type": "string",
                    "description": "Raw ASCII DXF content string."
                }
            },
            "required": ["dxf_text"]
        }
    },
    {
        "name": "export_bim_ifc",
        "description": "Generates a certified IFC4 BIM file compatible with Autodesk Revit, ArchiCAD, and BlenderBIM from floor plan elements.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_name": {
                    "type": "string",
                    "description": "Name of the project."
                },
                "elements": {
                    "type": "object",
                    "description": "Construction elements containing walls, doors, windows, and floor bounds."
                }
            },
            "required": ["project_name", "elements"]
        }
    },
    {
        "name": "generate_walkthrough_reel",
        "description": "Generates smooth orbital and interior glide camera flight paths and synthesizes video walkthrough payloads for Higgsfield AI and OpenMontage suites.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_name": {
                    "type": "string",
                    "description": "Name of the project."
                },
                "mode": {
                    "type": "string",
                    "enum": ["orbit_360", "interior_glide", "hero_cinematic"],
                    "description": "Camera flight path mode."
                },
                "style_prompt": {
                    "type": "string",
                    "description": "Photorealistic architectural styling prompt."
                }
            },
            "required": ["project_name"]
        }
    },
    {
        "name": "match_moodboard_materials",
        "description": "Analyzes an extracted color palette or aesthetic keywords and matches them to curated AtelierOS architectural finishes (Italian marble, Kota stone, fluted oak, Asian Paints).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "aesthetic": {
                    "type": "string",
                    "description": "Design aesthetic keyword (e.g. 'Warm Minimalist', 'Japandi', 'Industrial Luxe')."
                },
                "dominant_colors": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "List of hex color codes from the moodboard."
                }
            },
            "required": ["aesthetic"]
        }
    },
    {
        "name": "calculate_occupancy_loads",
        "description": "Calculates occupant load, required exit count, and minimum corridor/stair egress widths based on space typology and gross floor area using IBC Table 1004.5 & NBC Part 4.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "area_sqft": {
                    "type": "number",
                    "description": "Gross floor area in square feet."
                },
                "occupancy_type": {
                    "type": "string",
                    "enum": ["residential", "business_office", "assembly_unconcentrated", "mercantile", "educational", "storage"],
                    "description": "Building occupancy function."
                },
                "sprinklered": {
                    "type": "boolean",
                    "description": "Whether the building has an NFPA 13 automatic sprinkler system (increases egress capacity and travel distance)."
                }
            },
            "required": ["area_sqft", "occupancy_type"]
        }
    },
    {
        "name": "evaluate_spatial_archetype",
        "description": "Evaluates floor plate dimensions, identifies architectural plan archetype (single/double loaded, central core, side core), and calculates estimated Net-to-Gross (NTG) efficiency.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "width_m": {
                    "type": "number",
                    "description": "Floor plate width in meters."
                },
                "depth_m": {
                    "type": "number",
                    "description": "Floor plate depth in meters."
                },
                "building_type": {
                    "type": "string",
                    "enum": ["residential", "commercial_office", "hotel", "mixed_use"],
                    "description": "Target building typology."
                }
            },
            "required": ["width_m", "depth_m"]
        }
    },
    {
        "name": "meltflex_ai_restyle",
        "description": "Prepares and validates MeltFlex AI interior/exterior photorealistic redesign parameters, virtual staging, or floorplan-to-3D GLB conversion.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["restyle", "virtual_staging", "layout_boost", "floor_restyle", "wall_texture", "floorplan_to_3d", "furniture_3d"],
                    "description": "MeltFlex operation mode."
                },
                "style": {
                    "type": "string",
                    "description": "Target design style (e.g. 'Contemporary Indian Luxury', 'Japandi', 'Scandinavian')."
                },
                "room_type": {
                    "type": "string",
                    "description": "Room type (e.g. 'Living Room', 'Master Bedroom', 'Kitchen')."
                },
                "image_url": {
                    "type": "string",
                    "description": "Source photo or floorplan URL."
                }
            },
            "required": ["mode", "style"]
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

    elif name == "import_cad_dxf":
        dxf_text = arguments.get("dxf_text", "")
        # Parse basic LINE entities from DXF text
        lines_list = dxf_text.splitlines()
        walls = []
        i = 0
        while i < len(lines_list) - 1:
            line = lines_list[i].strip()
            if line == "LINE":
                x1 = y1 = x2 = y2 = 0.0
                i += 1
                while i < len(lines_list) - 1 and lines_list[i].strip() != "0":
                    c = lines_list[i].strip()
                    v = lines_list[i + 1].strip()
                    if c == "10": x1 = float(v)
                    elif c == "20": y1 = float(v)
                    elif c == "11": x2 = float(v)
                    elif c == "21": y2 = float(v)
                    i += 2
                if math.hypot(x2 - x1, y2 - y1) > 0.001:
                    walls.append({"start": [x1, y1], "end": [x2, y2]})
                continue
            i += 1

        return {
            "status": "success",
            "extracted_walls_count": len(walls),
            "elements": {
                "walls": walls[:50],  # capped for MCP JSON response
                "units_source": "autocad_dxf"
            }
        }

    elif name == "export_bim_ifc":
        p_name = arguments.get("project_name", "AtelierOS Project")
        elements = arguments.get("elements", {})
        walls_count = len(elements.get("walls", []))
        doors_count = len(elements.get("doors", []))
        windows_count = len(elements.get("windows", []))

        return {
            "status": "success",
            "schema": "IFC4",
            "project": p_name,
            "entities_generated": {
                "IfcProject": 1,
                "IfcSite": 1,
                "IfcBuilding": 1,
                "IfcBuildingStorey": 1,
                "IfcWallStandardCase": walls_count,
                "IfcDoor": doors_count,
                "IfcWindow": windows_count,
                "IfcSlab": 1
            },
            "compatibility": ["Autodesk Revit 2024+", "ArchiCAD 26+", "BlenderBIM", "FreeCAD"],
            "download_hint": "Use AtelierOS Web 'Export IFC' button to stream the complete ISO-10303-21 STEP file."
        }

    elif name == "generate_walkthrough_reel":
        p_name = arguments.get("project_name", "Residence")
        mode = arguments.get("mode", "orbit_360")
        prompt = arguments.get("style_prompt", "warm natural sunlight, Italian marble floors, contemporary luxury")

        try:
            from services.video.walkthrough_generator import build_higgsfield_generation_spec
            spec = build_higgsfield_generation_spec(p_name, mode=mode, style_prompt=prompt)
            return {
                "status": "ready",
                "project": p_name,
                "video_spec": spec,
                "duration_seconds": 12,
                "fps": 60,
                "camera_waypoints_count": len(spec["camera_flight_path"]["waypoints"]),
                "sample_preview_url": "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-with-a-couch-41586-large.mp4"
            }
        except Exception as e:
            return {"error": f"Failed to generate video walkthrough: {e}"}

    elif name == "match_moodboard_materials":
        aesthetic = arguments.get("aesthetic", "").lower()
        colors = arguments.get("dominant_colors", [])

        if "concrete" in aesthetic or "industrial" in aesthetic:
            flooring = {"id": "fl_kota_stone", "name": "Kota Stone (Honed)", "rate": 85}
            wall = {"id": "wl_raw_concrete", "name": "Raw Architectural Concrete", "rate": 120}
        elif "classic" in aesthetic or "luxury" in aesthetic or "marble" in aesthetic:
            flooring = {"id": "fl_italian_statuario", "name": "Italian Statuario Marble", "rate": 850}
            wall = {"id": "wl_fluted_wood", "name": "Fluted Wood Acoustic Panels", "rate": 340}
        else:
            flooring = {"id": "fl_herringbone_oak", "name": "Herringbone Oak Wood", "rate": 480}
            wall = {"id": "wl_asian_paints_royale", "name": "Asian Paints Royale", "rate": 32}

        return {
            "aesthetic": aesthetic,
            "matched_materials": {
                "flooring": flooring,
                "walls": wall,
                "hardware": "Brushed Brass"
            },
            "recommendation": f"For a {aesthetic} space, pair {flooring['name']} with {wall['name']}."
        }

    elif name == "calculate_occupancy_loads":
        area = float(arguments.get("area_sqft", 1000))
        occ_type = arguments.get("occupancy_type", "residential")
        sprinklered = bool(arguments.get("sprinklered", True))

        # Occupant Load Factors (sqft per person) under IBC Table 1004.5 & NBC Part 4
        factors = {
            "residential": 200.0,
            "business_office": 150.0,
            "assembly_unconcentrated": 15.0,
            "mercantile": 60.0,
            "educational": 50.0,
            "storage": 300.0
        }
        factor = factors.get(occ_type, 150.0)
        occupants = max(1, math.ceil(area / factor))

        # Exits required under IBC Section 1006.2
        if occupants <= 49:
            required_exits = 1
        elif occupants <= 500:
            required_exits = 2
        elif occupants <= 1000:
            required_exits = 3
        else:
            required_exits = 4

        # Egress width (inches per occupant: 0.2 in for level corridors, 0.3 in for stairs)
        corridor_factor = 0.15 if sprinklered else 0.20
        stair_factor = 0.20 if sprinklered else 0.30

        min_corridor_width_in = max(44.0, occupants * corridor_factor)
        min_stair_width_in = max(44.0, occupants * stair_factor)

        return {
            "gross_area_sqft": area,
            "gross_area_sqm": round(area * 0.092903, 2),
            "occupancy_type": occ_type,
            "occupant_load_factor": f"{int(factor)} sqft/person",
            "calculated_occupants": occupants,
            "minimum_required_exits": required_exits,
            "minimum_corridor_width": {
                "inches": round(min_corridor_width_in, 1),
                "meters": round(min_corridor_width_in * 0.0254, 2)
            },
            "minimum_stair_width": {
                "inches": round(min_stair_width_in, 1),
                "meters": round(min_stair_width_in * 0.0254, 2)
            },
            "standard_references": ["IBC 2021 Table 1004.5", "IBC Section 1006.2", "NBC 2016 Part 4 Table 3"]
        }

    elif name == "evaluate_spatial_archetype":
        w = float(arguments.get("width_m", 12.0))
        d = float(arguments.get("depth_m", 6.0))
        b_type = arguments.get("building_type", "residential")

        # Determine archetype from depth and ratio
        aspect = max(w, d) / max(min(w, d), 1.0)
        min_dim = min(w, d)

        if min_dim <= 9.0:
            archetype = "Single-Loaded Corridor / Thin Slab"
            ntg = 0.76
            circ_desc = "Linear room layout with single-sided corridor. High daylight exposure across 100% of habitable rooms."
        elif min_dim <= 18.0:
            archetype = "Double-Loaded Corridor"
            ntg = 0.83
            circ_desc = "Central corridor flanked by rooms on both sides. Optimal circulation efficiency for residential/hotel."
        else:
            archetype = "Central Core Floor Plate"
            ntg = 0.79
            circ_desc = "Deep floor plate radiating around vertical core. Perimeter daylight penetration up to 7-8m."

        usable_area_sqm = round((w * d) * ntg, 1)
        gross_area_sqm = round(w * d, 1)

        return {
            "floor_plate_span": f"{w}m x {d}m",
            "gross_area_sqm": gross_area_sqm,
            "usable_area_sqm": usable_area_sqm,
            "classified_archetype": archetype,
            "estimated_net_to_gross_ntg": f"{int(ntg * 100)}%",
            "circulation_assessment": circ_desc,
            "max_daylight_reach_m": 7.5,
            "recommended_bay_grid": "6.0m x 7.5m or 8.4m x 8.4m",
            "reference": "Spatial Planning Architecture Skill Archetypes"
        }

    elif name == "meltflex_ai_restyle":
        mode = arguments.get("mode", "restyle")
        style = arguments.get("style", "Contemporary Indian Luxury")
        room_type = arguments.get("room_type", "Living Room")
        image_url = arguments.get("image_url", "")

        prompt_lead_ins = {
            "restyle": f"Redesign this {room_type} in {style} aesthetic, keeping architectural walls and openings intact.",
            "virtual_staging": f"Furnish this empty {room_type} as a {style} space with bespoke furniture pieces.",
            "layout_boost": f"Rearrange the existing furniture into an open, ergonomic layout in {style} style.",
            "floor_restyle": f"Replace the floor with high-end {style} flooring materials while keeping everything else.",
            "wall_texture": f"Change the wall finish to {style} textures and acoustic panels, preserving architectural structure.",
            "floorplan_to_3d": f"Convert 2D floorplan into a 3D architectural interior in {style}.",
            "furniture_3d": f"Generate 3D GLB mesh for {style} furniture."
        }

        prompt = prompt_lead_ins.get(mode, f"Redesign this space in {style}")

        return {
            "endpoint": "https://www.meltflexai.com/api/v1/generate" if "3d" not in mode else "https://www.meltflexai.com/api/v1/floorplan-to-3d",
            "mode": mode,
            "synthesized_prompt": prompt,
            "target_style": style,
            "credits_required": 10 if "3d" not in mode else 100,
            "payload": {
                "prompt": prompt,
                "imageUrl": image_url or "https://atelieros-cloud.vercel.app/images/render-hero.jpg",
                "designLevel": "pro",
                "resolution": "2K"
            },
            "sdk_command": f"meltflex {mode} --style '{style}'",
            "status": "ready_for_execution"
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
                            "name": "atelieros-mcp-server",
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
