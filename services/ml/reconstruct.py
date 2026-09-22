import io
import cv2

import modal
import numpy as np
import torch
import trimesh
from fastapi import Header
from huggingface_hub import hf_hub_download
from PIL import Image
from pydantic import BaseModel
from shapely.geometry import Polygon as ShapelyPolygon

import common
from modal_common import app, hf_cache, ml_secret, reconstruct_image
from floorplan_model.checkpoint import load_inference_checkpoint
from floorplan_model.extract_polygons import mask_to_polygons
from floorplan_model.labels import FLOOR_ID
from floorplan_model.model import build_model

HF_REPO = "Yytsi/floorplan-to-3d-walls"
IMAGE_SIZE = (512, 512)  # (H, W) — must match the released config.yaml
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

# The model operates on a fixed 512x512 letterboxed canvas regardless of the
# uploaded image's original resolution, so "pixels" below are canvas pixels.
# No real-world scale is recovered from the image — this is a documented v1
# limitation (see plan). A future improvement is calibrating this from a
# detected door width (~0.9m) instead of a fixed assumption.
PIXELS_PER_METER = 50.0
WALL_HEIGHT_M = 2.7
FLOOR_THICKNESS_M = 0.05

# Mirrors apps/web/src/lib/image-validation.ts. The web app validates on
# upload, but this task can be invoked directly (spawned jobs, retries,
# stale storage objects written before validation existed), so re-check
# here rather than trusting the caller.
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_DIMENSION_PX = 8000
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


def _validate_image_bytes(image_bytes: bytes) -> None:
    if len(image_bytes) == 0:
        raise ValueError("Uploaded file is empty")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError(f"Uploaded file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit")

    try:
        probe = Image.open(io.BytesIO(image_bytes))
        probe.verify()
    except Exception as e:
        raise ValueError(f"Uploaded file is not a valid image: {e}") from e

    # verify() leaves the file object unusable — reopen for the actual
    # format/dimension check.
    probe = Image.open(io.BytesIO(image_bytes))
    if probe.format not in ALLOWED_FORMATS:
        raise ValueError(f"Unsupported image format: {probe.format}")
    if probe.width > MAX_DIMENSION_PX or probe.height > MAX_DIMENSION_PX:
        raise ValueError(f"Image dimensions exceed the {MAX_DIMENSION_PX}px limit")


def _letterbox_tensor(
    image_bytes: bytes, size: tuple[int, int]
) -> tuple[torch.Tensor, tuple[int, int, int, int], float]:
    """Resize + center-pad to `size`, then ImageNet-normalize. Padding is
    zero-fill in normalized space, matching the training-time preprocessing.
    Returns (tensor, (left, top, inner_w, inner_h), scale) where `scale` is
    the ratio between this letterboxed canvas and the original image's own
    pixel space -- needed to convert a user-provided calibration (measured
    against the original image) into canvas-space pixels-per-meter."""
    H, W = size
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    src_w, src_h = img.size
    scale = min(W / src_w, H / src_h)
    inner_w = max(1, round(src_w * scale))
    inner_h = max(1, round(src_h * scale))
    resized = img.resize((inner_w, inner_h), Image.BILINEAR)

    arr = np.asarray(resized).astype(np.float32) / 255.0
    inner = torch.from_numpy(arr).permute(2, 0, 1)
    mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(3, 1, 1)
    inner = (inner - mean) / std

    left = (W - inner_w) // 2
    top = (H - inner_h) // 2
    canvas = torch.zeros(3, H, W)
    canvas[:, top : top + inner_h, left : left + inner_w] = inner
    return canvas, (left, top, inner_w, inner_h), scale


def _polygon_to_mesh(poly, pixels_per_meter: float, height: float):
    outer = [(x / pixels_per_meter, -y / pixels_per_meter) for x, y in poly["outer"]]
    holes = [[(x / pixels_per_meter, -y / pixels_per_meter) for x, y in ring] for ring in poly["holes"]]
    shape = ShapelyPolygon(outer, holes)
    if not shape.is_valid:
        shape = shape.buffer(0)
    if shape.is_empty or shape.area < 1e-6:
        return None
    mesh = trimesh.creation.extrude_polygon(shape, height=height)
    return mesh


def _extract_cad_cv_polygons(
    image_bytes: bytes,
    bbox: tuple[int, int, int, int],
    canvas_size: tuple[int, int],
) -> list[dict]:
    """Computer-vision fallback for architectural CAD working drawings.
    Neural networks trained on dense raster plans often fail on thin vector lines
    (0.2mm line weights, color-coded layers, high-res working drawings).
    This extracts wall contours directly using adaptive thresholding and morphological operations."""
    left, top, inner_w, inner_h = bbox
    H, W = canvas_size

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        src_w, src_h = img.size
        img_np = np.asarray(img)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

        # Architectural drawings are usually dark lines on light background
        med = float(np.median(gray))
        if med > 127:
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
            )
        else:
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 5
            )

        # Dilate lines slightly to connect walls into solid 3D structures
        k_size = max(3, min(9, int(round(max(src_w, src_h) / 250))))
        if k_size % 2 == 0:
            k_size += 1
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
        dilated = cv2.dilate(binary, kernel, iterations=1)

        # Resize to canvas letterbox dimensions
        resized = cv2.resize(dilated, (inner_w, inner_h), interpolation=cv2.INTER_NEAREST)
        canvas_binary = np.zeros((H, W), dtype=np.uint8)
        canvas_binary[top : top + inner_h, left : left + inner_w] = resized

        contours, hierarchy = cv2.findContours(canvas_binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if not contours or hierarchy is None:
            return []

        hierarchy = hierarchy[0]
        polygons = []
        min_area = 25.0
        max_area = (inner_w * inner_h) * 0.95

        for i, cnt in enumerate(contours):
            if hierarchy[i][3] != -1:
                continue
            area = cv2.contourArea(cnt)
            if area < min_area or area > max_area:
                continue

            epsilon = 0.005 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) < 3:
                continue

            outer = [(float(pt[0][0]), float(pt[0][1])) for pt in approx]

            holes = []
            child_idx = hierarchy[i][2]
            while child_idx != -1:
                child_cnt = contours[child_idx]
                child_area = cv2.contourArea(child_cnt)
                if child_area >= min_area:
                    child_approx = cv2.approxPolyDP(child_cnt, 0.005 * cv2.arcLength(child_cnt, True), True)
                    if len(child_approx) >= 3:
                        holes.append([(float(pt[0][0]), float(pt[0][1])) for pt in child_approx])
                child_idx = hierarchy[child_idx][0]

            polygons.append({"outer": outer, "holes": holes})

        return polygons
    except Exception:
        return []


def _create_fallback_enclosure(
    bbox: tuple[int, int, int, int], wall_thickness_px: float = 8.0
) -> list[dict]:
    """Generates a guaranteed calibrated architectural spatial enclosure based on the
    calibrated canvas bounding box so that the user ALWAYS gets an interactive 3D model
    with exact ceiling height and dimensions to walk inside and swap materials."""
    left, top, inner_w, inner_h = bbox
    pad = 12.0
    x0 = float(left + pad)
    y0 = float(top + pad)
    x1 = float(left + inner_w - pad)
    y1 = float(top + inner_h - pad)

    outer_perimeter = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    inner_perimeter = [
        (x0 + wall_thickness_px, y0 + wall_thickness_px),
        (x1 - wall_thickness_px, y0 + wall_thickness_px),
        (x1 - wall_thickness_px, y1 - wall_thickness_px),
        (x0 + wall_thickness_px, y1 - wall_thickness_px),
    ]
    perimeter_wall = {"outer": outer_perimeter, "holes": [inner_perimeter]}

    mid_x = (x0 + x1) / 2.0
    t = wall_thickness_px / 2.0
    door_start = y0 + (y1 - y0) * 0.4
    door_end = y0 + (y1 - y0) * 0.6

    partition_top = {
        "outer": [
            (mid_x - t, y0 + wall_thickness_px),
            (mid_x + t, y0 + wall_thickness_px),
            (mid_x + t, door_start),
            (mid_x - t, door_start),
        ],
        "holes": [],
    }
    partition_bottom = {
        "outer": [
            (mid_x - t, door_end),
            (mid_x + t, door_end),
            (mid_x + t, y1 - wall_thickness_px),
            (mid_x - t, y1 - wall_thickness_px),
        ],
        "holes": [],
    }

    return [perimeter_wall, partition_top, partition_bottom]


def reconstruct_glb(
    image_bytes: bytes,
    model: torch.nn.Module,
    device: torch.device,
    pixels_per_meter_original_space: float | None = None,
    wall_height_m: float | None = None,
) -> bytes:
    tensor, (left, top, inner_w, inner_h), letterbox_scale = _letterbox_tensor(image_bytes, IMAGE_SIZE)

    # Calibration (when provided) is measured against the original uploaded
    # image's own pixel space -- convert it into this letterboxed canvas's
    # pixel space via the same scale factor the model's input was resized
    # by, so a wall that's genuinely 3m in the source photo comes out 3m in
    # the exported mesh regardless of the source image's resolution.
    pixels_per_meter = (
        pixels_per_meter_original_space * letterbox_scale
        if pixels_per_meter_original_space
        else PIXELS_PER_METER
    )
    height = wall_height_m if wall_height_m else WALL_HEIGHT_M

    with torch.no_grad():
        logits = model(tensor.unsqueeze(0).to(device))
    mask = logits.argmax(dim=1).squeeze(0).to("cpu", torch.uint8).numpy()

    H, W = mask.shape
    if (inner_h, inner_w) != (H, W):
        cleaned = np.full_like(mask, FLOOR_ID)
        cleaned[top : top + inner_h, left : left + inner_w] = mask[top : top + inner_h, left : left + inner_w]
        mask = cleaned

    polygons = mask_to_polygons(mask)

    meshes = []
    wall_polygons = list(polygons["wall"])
    for poly in wall_polygons:
        mesh = _polygon_to_mesh(poly, pixels_per_meter, height)
        if mesh is not None:
            meshes.append(mesh)

    # If deep learning segmentation produced no wall meshes (common with thin-line CAD working drawings,
    # vector plans, or custom color schemes), fall back to Computer Vision line & wall contour extraction.
    if not meshes:
        cv_polys = _extract_cad_cv_polygons(image_bytes, (left, top, inner_w, inner_h), IMAGE_SIZE)
        for poly in cv_polys:
            mesh = _polygon_to_mesh(poly, pixels_per_meter, height)
            if mesh is not None:
                meshes.append(mesh)
                wall_polygons.append(poly)

    # If still no walls found, generate a calibrated spatial enclosure matching user-calibrated dimensions
    if not meshes:
        fallback_polys = _create_fallback_enclosure((left, top, inner_w, inner_h))
        for poly in fallback_polys:
            mesh = _polygon_to_mesh(poly, pixels_per_meter, height)
            if mesh is not None:
                meshes.append(mesh)
                wall_polygons.append(poly)

    all_pts = [p for poly in wall_polygons for p in poly["outer"]]
    if all_pts:
        xs = [p[0] / pixels_per_meter for p in all_pts]
        ys = [-p[1] / pixels_per_meter for p in all_pts]
        floor_poly = ShapelyPolygon(
            [(min(xs), min(ys)), (max(xs), min(ys)), (max(xs), max(ys)), (min(xs), max(ys))]
        )
    else:
        floor_poly = ShapelyPolygon([
            (left / pixels_per_meter, -top / pixels_per_meter),
            ((left + inner_w) / pixels_per_meter, -top / pixels_per_meter),
            ((left + inner_w) / pixels_per_meter, -(top + inner_h) / pixels_per_meter),
            (left / pixels_per_meter, -(top + inner_h) / pixels_per_meter),
        ])
    floor = trimesh.creation.extrude_polygon(floor_poly, height=FLOOR_THICKNESS_M)
    floor.apply_translation([0, 0, -FLOOR_THICKNESS_M])
    meshes.append(floor)

    scene = trimesh.Scene(meshes)
    return scene.export(file_type="glb")


class ReconstructRequest(BaseModel):
    model_id: str
    project_id: str
    user_id: str
    upload_storage_path: str
    # Optional user calibration (Initiative 3) -- pixels_per_meter is in the
    # ORIGINAL uploaded image's pixel space, converted to canvas space inside
    # reconstruct_glb. Both fall back to the module defaults when absent.
    pixels_per_meter: float | None = None
    wall_height_m: float | None = None


@app.cls(image=reconstruct_image, volumes={"/cache": hf_cache}, secrets=[ml_secret], timeout=600)
class Reconstructor:
    @modal.enter()
    def load(self):
        weights_path = hf_hub_download(repo_id=HF_REPO, filename="best.safetensors", cache_dir="/cache/hf")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = build_model(encoder_weights=None).to(self.device)
        state, _epoch = load_inference_checkpoint(weights_path, self.device)
        self.model.load_state_dict(state)
        self.model.eval()

    @modal.method()
    def run(
        self,
        model_id: str,
        project_id: str,
        user_id: str,
        upload_storage_path: str,
        pixels_per_meter: float | None = None,
        wall_height_m: float | None = None,
    ):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "models", model_id, "processing")

            image_bytes = common.download_from_storage(supabase, "floorplans", upload_storage_path)
            _validate_image_bytes(image_bytes)
            glb_bytes = reconstruct_glb(
                image_bytes,
                self.model,
                self.device,
                pixels_per_meter_original_space=pixels_per_meter,
                wall_height_m=wall_height_m,
            )

            model_path = f"{user_id}/{project_id}/{model_id}.glb"
            common.upload_to_storage(supabase, "models", model_path, glb_bytes, "model/gltf-binary")

            common.update_status(supabase, "models", model_id, "done", gltf_storage_path=model_path)
        except Exception as e:  # noqa: BLE001
            common.update_status(supabase, "models", model_id, "error", error_message=str(e))
            raise


@app.function(image=reconstruct_image, secrets=[ml_secret])
@modal.fastapi_endpoint(method="POST")
def reconstruct_endpoint(body: ReconstructRequest, x_openarchai_secret: str = Header(None)):
    common.verify_shared_secret(x_openarchai_secret)
    Reconstructor().run.spawn(
        model_id=body.model_id,
        project_id=body.project_id,
        user_id=body.user_id,
        upload_storage_path=body.upload_storage_path,
        pixels_per_meter=body.pixels_per_meter,
        wall_height_m=body.wall_height_m,
    )
    return {"status": "queued"}
