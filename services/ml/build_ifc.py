"""Approved construction_models.elements -> a real IFC4 file (Initiative 4,
sub-phase 3). Only ever runs on an approved model -- the human-review gate
from sub-phase 2 is what makes this "construction-accurate" export
meaningful rather than a raw parsing guess.

v1 scope, documented here rather than silently assumed:
- Walls get real 3D extruded geometry via ifcopenshell's own create_2pt_wall
  helper (verified against a round-tripped file before this was wired up).
- Doors/windows get correct position and OverallWidth/OverallHeight, plus a
  linked IfcOpeningElement (via void.add_filling) recording the void
  relationship -- but neither the opening nor the door/window has a 3D
  shape, and the wall's own geometry isn't boolean-cut, so none of this
  renders as an actual hole in the wall yet.
- The floor slab is now a real IfcSlab entity, assigned to the storey and
  placed at the correct elevation (-150mm) -- but it has no shape
  representation: every approach that doesn't require a Blender host
  (ifcopenshell's own `geometry.add_representation` recipe expects a `bpy`
  object/mesh, which has no place in a headless Modal container) needs
  hand-built IfcExtrudedAreaSolid geometry that wasn't verified before this
  shipped, so the slab won't render visually in a viewer despite existing
  in the schema.
- Rooms become bare IfcSpace entities (name + storey assignment only) --
  no boundary/space geometry either.
"""

import logging
import os
import tempfile

import ifcopenshell
import ifcopenshell.api
import ifcopenshell.api.aggregate
import ifcopenshell.api.context
import ifcopenshell.api.geometry
import ifcopenshell.api.root
import ifcopenshell.api.spatial
import ifcopenshell.api.unit
import modal
from fastapi import Header
from pydantic import BaseModel

import common
from modal_common import app, ifc_image, ml_secret

logger = logging.getLogger(__name__)

# Not recoverable from a 2D DXF's wall centerlines/door-block widths alone --
# documented assumptions, same pattern as reconstruct.py's WALL_HEIGHT_M.
WALL_THICKNESS_M = 0.15
WALL_HEIGHT_M = 2.7
DOOR_WINDOW_HEIGHT_M = 2.1


def build_ifc_bytes(elements: dict, project_name: str) -> bytes:
    f = ifcopenshell.file(schema="IFC4")

    project = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcProject", name=project_name)
    ifcopenshell.api.run("unit.assign_unit", f, length={"is_metric": True, "raw": "METERS"})

    model_context = ifcopenshell.api.run("context.add_context", f, context_type="Model")
    body_context = ifcopenshell.api.run(
        "context.add_context",
        f,
        context_type="Model",
        context_identifier="Body",
        target_view="MODEL_VIEW",
        parent=model_context,
    )

    site = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcSite", name="Site")
    building = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcBuilding", name="Building")
    storey = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcBuildingStorey", name="Ground Floor")

    ifcopenshell.api.run("aggregate.assign_object", f, relating_object=project, products=[site])
    ifcopenshell.api.run("aggregate.assign_object", f, relating_object=site, products=[building])
    ifcopenshell.api.run("aggregate.assign_object", f, relating_object=building, products=[storey])

    for i, wall_data in enumerate(elements.get("walls", [])):
        wall = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcWall", name=f"Wall {i + 1}")
        ifcopenshell.api.run("spatial.assign_container", f, relating_structure=storey, products=[wall])
        ifcopenshell.api.run(
            "geometry.create_2pt_wall",
            f,
            element=wall,
            context=body_context,
            p1=tuple(wall_data["start"]),
            p2=tuple(wall_data["end"]),
            elevation=0.0,
            height=WALL_HEIGHT_M,
            thickness=WALL_THICKNESS_M,
        )

    # 1. Add Floor Slab (IfcSlab) from floor_bounds
    bounds = elements.get("floor_bounds", {})
    if bounds and bounds.get("max_x", 0) > bounds.get("min_x", 0):
        min_x, min_y = bounds["min_x"], bounds["min_y"]
        max_x, max_y = bounds["max_x"], bounds["max_y"]
        slab = ifcopenshell.api.run(
            "root.create_entity", f, ifc_class="IfcSlab", name="Floor Slab", predefined_type="FLOOR"
        )
        ifcopenshell.api.run("spatial.assign_container", f, relating_structure=storey, products=[slab])
        # Slab placement at z = -0.15m (150mm slab thickness)
        cx, cy = (min_x + max_x) / 2.0, (min_y + max_y) / 2.0
        ifcopenshell.api.run(
            "geometry.edit_object_placement",
            f,
            product=slab,
            matrix=[[1, 0, 0, cx], [0, 1, 0, cy], [0, 0, 1, -0.15], [0, 0, 0, 1]],
        )

    # 2. Add Doors and Windows with Opening Elements
    for kind, ifc_class in (("doors", "IfcDoor"), ("windows", "IfcWindow")):
        for i, item in enumerate(elements.get(kind, [])):
            entity = ifcopenshell.api.run(
                "root.create_entity", f, ifc_class=ifc_class, name=f"{ifc_class[3:]} {i + 1}"
            )
            ifcopenshell.api.run("spatial.assign_container", f, relating_structure=storey, products=[entity])
            x, y = item["position"]
            ifcopenshell.api.run(
                "geometry.edit_object_placement",
                f,
                product=entity,
                matrix=[[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, 0.0], [0, 0, 0, 1]],
            )
            if item.get("width_m"):
                entity.OverallWidth = item["width_m"]
            entity.OverallHeight = DOOR_WINDOW_HEIGHT_M

            # Create associated IfcOpeningElement
            try:
                opening = ifcopenshell.api.run(
                    "root.create_entity", f, ifc_class="IfcOpeningElement", name=f"Opening_{ifc_class[3:]}_{i + 1}"
                )
                ifcopenshell.api.run(
                    "geometry.edit_object_placement",
                    f,
                    product=opening,
                    matrix=[[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, 0.0], [0, 0, 0, 1]],
                )
                ifcopenshell.api.run("void.add_filling", f, opening=opening, element=entity)
            except Exception:
                # Non-fatal (the door/window entity itself is already valid without
                # the void relationship), but still worth surfacing in Modal's logs --
                # a bare `pass` here would silently hide a real regression.
                logger.warning(
                    "Failed to create IfcOpeningElement void relation for %s %d", ifc_class, i + 1, exc_info=True
                )

    # 3. Add IfcSpace for detected rooms
    for i, room in enumerate(elements.get("rooms", [])):
        label = room.get("label", f"Space {i + 1}")
        space = ifcopenshell.api.run("root.create_entity", f, ifc_class="IfcSpace", name=label)
        space.LongName = label
        ifcopenshell.api.run("spatial.assign_container", f, relating_structure=storey, products=[space])

    # ifcopenshell.file.write() only accepts a filesystem path, not a
    # stream -- write to a real temp file and read the bytes back.
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        f.write(tmp_path)
        with open(tmp_path, "rb") as fh:
            return fh.read()
    finally:
        os.unlink(tmp_path)


class BuildIfcRequest(BaseModel):
    construction_model_id: str
    project_id: str
    user_id: str


@app.cls(image=ifc_image, secrets=[ml_secret], timeout=300)
class IfcExporter:
    @modal.method()
    def build(self, construction_model_id: str, project_id: str, user_id: str):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "construction_models", construction_model_id, "processing")

            row = (
                supabase.table("construction_models")
                .select("elements, review_status")
                .eq("id", construction_model_id)
                .single()
                .execute()
                .data
            )
            if not row or row["review_status"] != "approved":
                raise ValueError("Construction model must be approved before IFC export")

            project_row = supabase.table("projects").select("name").eq("id", project_id).single().execute().data
            project_name = project_row["name"] if project_row else "OpenArchai Export"

            ifc_bytes = build_ifc_bytes(row["elements"], project_name)

            ifc_path = f"{user_id}/{project_id}/{construction_model_id}.ifc"
            common.upload_to_storage(supabase, "ifc-models", ifc_path, ifc_bytes, "application/x-step")

            common.update_status(supabase, "construction_models", construction_model_id, "done", ifc_storage_path=ifc_path)
        except Exception as e:  # noqa: BLE001
            common.update_status(supabase, "construction_models", construction_model_id, "error", error_message=str(e))
            raise


@app.function(image=ifc_image, secrets=[ml_secret])
@modal.fastapi_endpoint(method="POST")
def build_ifc_endpoint(body: BuildIfcRequest, x_openarchai_secret: str = Header(None)):
    common.verify_shared_secret(x_openarchai_secret)
    IfcExporter().build.spawn(
        construction_model_id=body.construction_model_id,
        project_id=body.project_id,
        user_id=body.user_id,
    )
    return {"status": "queued"}
