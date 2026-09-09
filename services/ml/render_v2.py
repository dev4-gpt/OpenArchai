"""High-resolution architectural styling pipeline using SDXL + ControlNet-SDXL-Depth (Initiative 1D).

Upgrades resolution from 512x512 to 1024x1024, adds curated negative prompt filtering,
and incorporates support for Indian and international architectural styles.
"""

import io
import modal
import numpy as np
import trimesh
import torch
from fastapi import Header
from pydantic import BaseModel
from PIL import Image, ImageDraw

import common
from modal_common import app, hf_cache, ml_secret, render_image

# SDXL Models
CONTROLNET_SDXL_MODEL = "diffusers/controlnet-depth-sdxl-1.0"
BASE_SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
RENDER_SIZE_V2 = 1024

ARCH_NEGATIVE_PROMPT = (
    "low quality, blurry, distorted architecture, crooked walls, broken geometry, "
    "deformed pillars, unnatural lighting, oversaturated, watermark, signature, draft"
)


def _look_at_matrix(eye: np.ndarray, target: np.ndarray, up: np.ndarray) -> np.ndarray:
    forward = target - eye
    forward = forward / np.linalg.norm(forward)
    right = np.cross(forward, up)
    right = right / np.linalg.norm(right)
    true_up = np.cross(right, forward)

    view = np.eye(4)
    view[0, :3] = right
    view[1, :3] = true_up
    view[2, :3] = -forward
    view[:3, 3] = -view[:3, :3] @ eye
    return view


def _perspective_matrix(fov_y: float, aspect: float, near: float, far: float) -> np.ndarray:
    f = 1.0 / np.tan(fov_y / 2)
    return np.array(
        [
            [f / aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (far + near) / (near - far), (2 * far * near) / (near - far)],
            [0, 0, -1, 0],
        ]
    )


def _depth_map_from_glb_1024(glb_bytes: bytes, size: int = RENDER_SIZE_V2) -> Image.Image:
    """Software depth-map rasterizer producing 1024x1024 depth maps for SDXL ControlNet."""
    tm_scene = trimesh.load(io.BytesIO(glb_bytes), file_type="glb")
    if isinstance(tm_scene, trimesh.Trimesh):
        tm_scene = trimesh.Scene(tm_scene)

    bounds = tm_scene.bounds
    center = bounds.mean(axis=0)
    extent = float((bounds[1] - bounds[0]).max())

    eye = center + np.array([extent * 0.9, -extent * 0.9, extent * 1.1])
    view = _look_at_matrix(eye, center, up=np.array([0.0, 0.0, 1.0]))
    near, far = 0.01, extent * 10
    proj = _perspective_matrix(np.pi / 3.0, aspect=1.0, near=near, far=far)

    triangles = []
    for geom in tm_scene.geometry.values():
        verts_h = np.hstack([geom.vertices, np.ones((len(geom.vertices), 1))])
        view_verts = verts_h @ view.T
        clip_verts = view_verts @ proj.T

        for face in geom.faces:
            tri_view = view_verts[face]
            if np.any(-tri_view[:, 2] <= near) or np.any(-tri_view[:, 2] >= far):
                continue

            tri_clip = clip_verts[face]
            w = tri_clip[:, 3]
            ndc = tri_clip[:, :3] / w[:, None]

            px = (ndc[:, 0] * 0.5 + 0.5) * size
            py = (1 - (ndc[:, 1] * 0.5 + 0.5)) * size
            depth = float(-tri_view[:, 2].mean())
            triangles.append((depth, list(zip(px.tolist(), py.tolist()))))

    if not triangles:
        raise ValueError("No geometry visible from the render camera")

    depths = [d for d, _ in triangles]
    d_min, d_max = min(depths), max(depths)
    d_range = max(d_max - d_min, 1e-6)

    triangles.sort(key=lambda t: t[0], reverse=True)

    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    for depth, pts in triangles:
        gray = int(round((1 - (depth - d_min) / d_range) * 255))
        draw.polygon(pts, fill=gray)

    return img.convert("RGB")


class RenderV2Request(BaseModel):
    render_id: str
    project_id: str
    model_id: str
    user_id: str
    gltf_storage_path: str
    prompt_style: str
    num_variants: int = 1


@app.cls(image=render_image, gpu="A10G", volumes={"/cache": hf_cache}, secrets=[ml_secret], timeout=900)
class RendererV2:
    @modal.enter()
    def load(self):
        from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline

        controlnet = ControlNetModel.from_pretrained(
            CONTROLNET_SDXL_MODEL,
            torch_dtype=torch.float16,
            cache_dir="/cache/hf/huggingface",
        )
        self.pipeline = StableDiffusionXLControlNetPipeline.from_pretrained(
            BASE_SDXL_MODEL,
            controlnet=controlnet,
            torch_dtype=torch.float16,
            cache_dir="/cache/hf/huggingface",
        ).to("cuda")

    @modal.method()
    def run(
        self,
        render_id: str,
        project_id: str,
        model_id: str,
        user_id: str,
        gltf_storage_path: str,
        prompt_style: str,
        num_variants: int = 1,
    ):
        supabase = common.get_supabase_client()
        try:
            common.update_status(supabase, "renders", render_id, "processing")

            glb_bytes = common.download_from_storage(supabase, "models", gltf_storage_path)
            depth_image = _depth_map_from_glb_1024(glb_bytes)

            full_prompt = f"Professional architectural photograph, interior design, {prompt_style}, 8k UHD, masterpiece"

            images = self.pipeline(
                prompt=full_prompt,
                negative_prompt=ARCH_NEGATIVE_PROMPT,
                image=depth_image,
                num_inference_steps=35,
                controlnet_conditioning_scale=0.75,
                num_images_per_prompt=num_variants,
            ).images

            primary_image = images[0]
            buf = io.BytesIO()
            primary_image.save(buf, format="PNG")

            image_path = f"{user_id}/{project_id}/{render_id}.png"
            common.upload_to_storage(supabase, "renders", image_path, buf.getvalue(), "image/png")

            common.update_status(supabase, "renders", render_id, "done", image_storage_path=image_path)
        except Exception as e:  # noqa: BLE001
            common.update_status(supabase, "renders", render_id, "error", error_message=str(e))
            raise


@app.function(image=render_image, secrets=[ml_secret])
@modal.fastapi_endpoint(method="POST")
def render_v2_endpoint(body: RenderV2Request, x_openarchai_secret: str = Header(None)):
    common.verify_shared_secret(x_openarchai_secret)
    RendererV2().run.spawn(
        render_id=body.render_id,
        project_id=body.project_id,
        model_id=body.model_id,
        user_id=body.user_id,
        gltf_storage_path=body.gltf_storage_path,
        prompt_style=body.prompt_style,
        num_variants=body.num_variants,
    )
    return {"status": "queued"}
