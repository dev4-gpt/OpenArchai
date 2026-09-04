"""Shared Modal infrastructure (app, images, secret, volume) with zero
dependency on reconstruct.py/render.py. Both of those import FROM this file;
this file must never import either of them, or a remote container for one
function ends up re-importing the other's heavy dependencies too (each
function's module is freshly imported in its own container, and Python
re-runs every line of whatever it transitively imports)."""

import modal

app = modal.App("openarchai-ml")

# Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHARED_SECRET.
# Created via `modal secret create openarchai-ml ...` (see README.md).
ml_secret = modal.Secret.from_name("openarchai-ml")

# Caches downloaded model weights across container cold starts.
hf_cache = modal.Volume.from_name("openarchai-hf-cache", create_if_missing=True)

reconstruct_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch",
        "segmentation-models-pytorch==0.3.4",
        "safetensors",
        "huggingface_hub",
        "opencv-python-headless",
        "numpy",
        "trimesh",
        "shapely",
        "mapbox_earcut",
        "pillow",
        "supabase",
        "fastapi[standard]",
    )
    .add_local_python_source("floorplan_model", "common", "modal_common")
)

render_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch",
        "diffusers",
        "transformers",
        "accelerate",
        "safetensors",
        "trimesh",
        "pillow",
        "numpy",
        "supabase",
        "fastapi[standard]",
    )
    # Depth-map rendering (render.py's _depth_map_from_glb) is a plain
    # numpy/PIL software rasterizer — deliberately no OpenGL/EGL/OSMesa,
    # after both proved fragile in this container (pyrender + pyglet2
    # unconditionally pulls in X11 windowing on `import pyrender`; the
    # OSMesa PyOpenGL binding then failed to find OSMesaCreateContextAttribs
    # against the container's Mesa build). No apt packages needed either.
    .env({"HF_HOME": "/cache/hf/huggingface"})
    .add_local_python_source("common", "modal_common")
)
