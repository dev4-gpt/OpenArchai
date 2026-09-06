"""DXF -> structured building elements (Initiative 4, sub-phase 1).

Deliberately separate from reconstruct.py: this pipeline parses exact
vector geometry from a real CAD file rather than running AI inference on a
raster image, so there's no model to load, no letterbox/scale conversion,
and (once units are resolved) no accuracy ceiling to work around. What it
produces -- typed wall/door/window objects with real dimensions -- is also
a fundamentally different shape than the single merged mesh reconstruct.py
exports, and is what makes IFC export (a later sub-phase) possible.
"""

import io

import ezdxf
import ezdxf.recover as recover
import modal
from fastapi import Header
from pydantic import BaseModel

import common
from modal_common import app, cad_image, ml_secret

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# DXF $INSUNITS codes we accept, mapped to meters. 0 (unspecified) and any
# code not in this table are treated as a hard error -- silently guessing a
# unit for a file claiming "construction-accurate" is worse than asking.
INSUNITS_TO_METERS = {
    1: 0.0254,  # inches
    2: 0.3048,  # feet
    4: 0.001,  # millimeters
    5: 0.01,  # centimeters
    6: 1.0,  # meters
    14: 0.1,  # decimeters
}


def _validate_dxf_bytes(dxf_bytes: bytes) -> None:
    if len(dxf_bytes) == 0:
        raise ValueError("Uploaded file is empty")
    if len(dxf_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError(f"Uploaded file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit")


def _read_dxf(dxf_bytes: bytes) -> ezdxf.document.Drawing:
    """Uses ezdxf's recovery-mode reader rather than the strict one --
    real-world DXF files from varied CAD tools commonly have minor spec
    violations, and recover.read() auto-detects encoding and repairs what
    it can rather than rejecting the file outright."""
    doc, auditor = recover.read(io.BytesIO(dxf_bytes))
    if auditor.has_errors:
        messages = "; ".join(err.message for err in auditor.errors[:5])
        raise ValueError(f"DXF file has structural errors: {messages}")
    return doc


def _units_to_meters(doc: ezdxf.document.Drawing) -> float:
    insunits = doc.header.get("$INSUNITS", 0)
    if insunits not in INSUNITS_TO_METERS:
        raise ValueError(
            f"DXF file's units (INSUNITS={insunits}) are unspecified or not one this pipeline "
            "recognizes -- confirm the drawing's units in your CAD software and re-export, rather "
            "than risk a silently wrong scale on a construction-accurate model."
        )
    return INSUNITS_TO_METERS[insunits]


def list_layers(dxf_bytes: bytes) -> list[str]:
    """Layer names actually used by an entity in modelspace -- not every
    layer declared in the file's layer table, many of which are typically
    unused in any given drawing."""
    _validate_dxf_bytes(dxf_bytes)
    doc = _read_dxf(dxf_bytes)
    msp = doc.modelspace()
    return sorted({e.dxf.layer for e in msp})


def _block_bounds_width(doc: ezdxf.document.Drawing, block_name: str, xscale: float) -> float | None:
    """Bounding-box width of a block's own geometry, in block-local units,
    scaled by the insert's xscale -- a simple, defensible proxy for "opening
    width" that doesn't assume anything about how a given firm's door/window
    blocks are internally drawn. The human review step (a later sub-phase)
    is exactly where a wrong guess here gets caught and corrected."""
    block = doc.blocks.get(block_name)
    xs = []
    for e in block:
        if e.dxftype() == "LINE":
            xs.extend([e.dxf.start.x, e.dxf.end.x])
        elif e.dxftype() == "LWPOLYLINE":
            xs.extend(p[0] for p in e.get_points("xy"))
    if not xs:
        return None
    return (max(xs) - min(xs)) * xscale


def extract_elements(dxf_bytes: bytes, layer_mapping: dict[str, str]) -> dict:
    """`layer_mapping` assigns each DXF layer to 'wall' | 'door' | 'window' |
    'ignore' (from the layer-mapping UI). Returns real-world-meter
    coordinates/dimensions, ready to store as `construction_models.elements`
    and, once approved, feed into IFC export."""
    doc = _read_dxf(dxf_bytes)
    scale = _units_to_meters(doc)
    msp = doc.modelspace()

    walls: list[dict] = []
    doors: list[dict] = []
    windows: list[dict] = []
    all_points: list[tuple[float, float]] = []

    for entity in msp:
        kind = layer_mapping.get(entity.dxf.layer, "ignore")
        if kind == "ignore":
            continue

        if kind == "wall":
            if entity.dxftype() == "LINE":
                p1 = (entity.dxf.start.x * scale, entity.dxf.start.y * scale)
                p2 = (entity.dxf.end.x * scale, entity.dxf.end.y * scale)
                walls.append({"start": p1, "end": p2})
                all_points.extend([p1, p2])
            elif entity.dxftype() == "LWPOLYLINE":
                pts = [(x * scale, y * scale) for x, y in entity.get_points("xy")]
                segment_pts = pts + [pts[0]] if entity.closed and pts else pts
                for a, b in zip(segment_pts, segment_pts[1:]):
                    walls.append({"start": a, "end": b})
                all_points.extend(pts)

        elif kind in ("door", "window") and entity.dxftype() == "INSERT":
            width_m = _block_bounds_width(doc, entity.dxf.name, entity.dxf.xscale)
            position = (entity.dxf.insert.x * scale, entity.dxf.insert.y * scale)
            (doors if kind == "door" else windows).append(
                {"position": position, "width_m": width_m * scale if width_m else None}
            )
            all_points.append(position)

    if not walls:
        raise ValueError("No wall geometry found on the layers mapped to Wall")

    xs = [p[0] for p in all_points]
    ys = [p[1] for p in all_points]

    return {
        "walls": walls,
        "doors": doors,
        "windows": windows,
        "floor_bounds": {"min_x": min(xs), "min_y": min(ys), "max_x": max(xs), "max_y": max(ys)},
        "units_source": "dxf_insunits",
    }


class DetectLayersRequest(BaseModel):
    construction_model_id: str
    upload_storage_path: str


class ExtractElementsRequest(BaseModel):
    construction_model_id: str
    upload_storage_path: str
    layer_mapping: dict[str, str]


@app.cls(image=cad_image, secrets=[ml_secret], timeout=300)
class CadPipeline:
    @modal.method()
    def detect_layers(self, construction_model_id: str, upload_storage_path: str):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "construction_models", construction_model_id, "processing")
            dxf_bytes = common.download_from_storage(supabase, "floorplans", upload_storage_path)
            layers = list_layers(dxf_bytes)
            common.update_status(
                supabase,
                "construction_models",
                construction_model_id,
                "awaiting_layer_mapping",
                detected_layers=layers,
            )
        except Exception as e:  # noqa: BLE001
            common.update_status(supabase, "construction_models", construction_model_id, "error", error_message=str(e))
            raise

    @modal.method()
    def extract(self, construction_model_id: str, upload_storage_path: str, layer_mapping: dict[str, str]):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "construction_models", construction_model_id, "processing")
            dxf_bytes = common.download_from_storage(supabase, "floorplans", upload_storage_path)
            elements = extract_elements(dxf_bytes, layer_mapping)
            common.update_status(
                supabase,
                "construction_models",
                construction_model_id,
                "extracted",
                layer_mapping=layer_mapping,
                elements=elements,
            )
        except Exception as e:  # noqa: BLE001
            common.update_status(supabase, "construction_models", construction_model_id, "error", error_message=str(e))
            raise


@app.function(image=cad_image, secrets=[ml_secret])
@modal.fastapi_endpoint(method="POST")
def detect_layers_endpoint(body: DetectLayersRequest, x_openarchai_secret: str = Header(None)):
    common.verify_shared_secret(x_openarchai_secret)
    CadPipeline().detect_layers.spawn(
        construction_model_id=body.construction_model_id,
        upload_storage_path=body.upload_storage_path,
    )
    return {"status": "queued"}


@app.function(image=cad_image, secrets=[ml_secret])
@modal.fastapi_endpoint(method="POST")
def extract_elements_endpoint(body: ExtractElementsRequest, x_openarchai_secret: str = Header(None)):
    common.verify_shared_secret(x_openarchai_secret)
    CadPipeline().extract.spawn(
        construction_model_id=body.construction_model_id,
        upload_storage_path=body.upload_storage_path,
        layer_mapping=body.layer_mapping,
    )
    return {"status": "queued"}
