"""AtelierOS Cinematic Video Walkthrough Generator.

Interfaces with Higgsfield AI and OpenMontage video production suites to generate
hyperrealistic 60fps 4K video walkthroughs from 3D models and camera flight paths.
"""

import json
import math
from typing import Any, Dict, List, Optional


def compute_orbital_keyframes(
    center_xyz: List[float] = [0.0, 1.2, 0.0],
    radius_m: float = 6.0,
    duration_sec: float = 12.0,
    steps: int = 8,
) -> List[Dict[str, Any]]:
    """Generates continuous smooth 360-degree orbital camera waypoints."""
    keyframes = []
    for i in range(steps + 1):
        theta = (i / steps) * math.pi * 2.0
        x = center_xyz[0] + math.cos(theta) * radius_m
        z = center_xyz[2] + math.sin(theta) * radius_m
        y = center_xyz[1] + 1.8 + math.sin(theta * 2.0) * 0.35
        t = round((i / steps) * duration_sec, 2)

        keyframes.append({
            "time_sec": t,
            "position": [round(x, 2), round(y, 2), round(z, 2)],
            "target": center_xyz,
            "fov": 42.0,
            "heading_deg": round((theta * 180.0 / math.pi) % 360, 1),
            "description": f"Orbit angle {int(i * 45) % 360}deg"
        })
    return keyframes


def compute_interior_glide_keyframes(
    center_xyz: List[float] = [0.0, 1.2, 0.0],
    radius_m: float = 6.0,
) -> List[Dict[str, Any]]:
    """Generates smooth interior glide flight path from entrance to living area."""
    return [
        {"time_sec": 0.0, "position": [0.0, 1.6, round(radius_m + 1.5, 2)], "target": center_xyz, "fov": 48.0, "description": "Entrance Foyer Approach"},
        {"time_sec": 3.0, "position": [0.0, 1.5, round(radius_m * 0.6, 2)], "target": center_xyz, "fov": 45.0, "description": "Main Living Lounge Core"},
        {"time_sec": 6.0, "position": [-1.5, 1.5, 0.5], "target": [1.5, 1.2, -0.5], "fov": 42.0, "description": "Feature Wall & Dining Vista"},
        {"time_sec": 9.0, "position": [0.0, 1.6, -1.8], "target": [0.0, 1.4, -4.0], "fov": 46.0, "description": "Balcony & Window Glazing"},
        {"time_sec": 12.0, "position": [2.0, 1.8, 2.0], "target": center_xyz, "fov": 45.0, "description": "Panoramic Final Overview"}
    ]


def build_higgsfield_generation_spec(
    project_name: str,
    mode: str = "orbit_360",
    style_prompt: str = "modern minimalist architecture with Italian marble and warm natural sunlight",
    resolution: str = "1080p",
) -> Dict[str, Any]:
    """Builds an execution payload compatible with Open-Higgsfield-AI and OpenMontage suites."""
    if mode == "interior_glide":
        keyframes = compute_interior_glide_keyframes()
    else:
        keyframes = compute_orbital_keyframes()

    return {
        "engine": "higgsfield_openmontage_v2",
        "project": project_name,
        "mode": mode,
        "resolution": resolution,
        "fps": 60,
        "camera_flight_path": {
            "total_duration_sec": 12.0,
            "interpolation": "cubic_spline",
            "waypoints": keyframes
        },
        "synthesis": {
            "model": "open-higgsfield-cinema-pro",
            "prompt": f"Ultra-smooth architectural cinematic walkthrough of {project_name}. {style_prompt}. Natural light bounce, crisp photorealistic textures, architectural digest photography, 60fps, 4k.",
            "negative_prompt": "camera shake, lens distortion, noise, stutter, artifacts, blurred textures, poor lighting",
            "motion_bucket_id": 127,
            "guidance_scale": 7.5
        },
        "output_format": "mp4"
    }


if __name__ == "__main__":
    spec = build_higgsfield_generation_spec("Sample Studio Apartment")
    print(json.dumps(spec, indent=2))
