import io

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


def _letterbox_tensor(image_bytes: bytes, size: tuple[int, int]) -> tuple[torch.Tensor, tuple[int, int, int, int]]:
    """Resize + center-pad to `size`, then ImageNet-normalize. Padding is
    zero-fill in normalized space, matching the training-time preprocessing.
    Returns (tensor, (left, top, inner_w, inner_h))."""
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
    return canvas, (left, top, inner_w, inner_h)


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


def reconstruct_glb(image_bytes: bytes, model: torch.nn.Module, device: torch.device) -> bytes:
    tensor, (left, top, inner_w, inner_h) = _letterbox_tensor(image_bytes, IMAGE_SIZE)

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
    for poly in polygons["wall"]:
        mesh = _polygon_to_mesh(poly, PIXELS_PER_METER, WALL_HEIGHT_M)
        if mesh is not None:
            meshes.append(mesh)

    if not meshes:
        raise ValueError("No wall geometry could be reconstructed from this floorplan")

    all_pts = [p for poly in polygons["wall"] for p in poly["outer"]]
    xs = [p[0] / PIXELS_PER_METER for p in all_pts]
    ys = [-p[1] / PIXELS_PER_METER for p in all_pts]
    floor_poly = ShapelyPolygon(
        [(min(xs), min(ys)), (max(xs), min(ys)), (max(xs), max(ys)), (min(xs), max(ys))]
    )
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
    def run(self, model_id: str, project_id: str, user_id: str, upload_storage_path: str):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "models", model_id, "processing")

            image_bytes = common.download_from_storage(supabase, "floorplans", upload_storage_path)
            glb_bytes = reconstruct_glb(image_bytes, self.model, self.device)

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
    )
    return {"status": "queued"}
