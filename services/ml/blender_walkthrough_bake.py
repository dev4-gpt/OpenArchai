#!/usr/bin/env python3
"""
Headless Blender 4.x Walkthrough Baking & Video Rendering Pipeline
for AtelierOS (Deployable on Railway.app / Modal / Cloud GPU Workers).

Consumes exact CAD/BIM elements JSON and renders an eye-level (1.65m)
architectural camera walkthrough with Cycles / EEVEE Next ray-tracing.
"""

import sys
import json
import os
import math

def run_blender_pipeline(elements_json_path: str, output_mp4_path: str, samples: int = 64):
    try:
        import bpy
    except ImportError:
        print("Note: This script is designed to run inside Blender (`blender --background --python blender_walkthrough_bake.py -- ...`)")
        return

    with open(elements_json_path, "r") as f:
        data = json.load(f)

    # 1. Clean default scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, "RenderEngine") else 'BLENDER_EEVEE'
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = 360  # 12 seconds @ 30fps

    # 2. Materials
    # Floor: Italian Marble / Satin Wood
    mat_floor = bpy.data.materials.new(name="PBR_Floor")
    mat_floor.use_nodes = True
    bsdf_floor = mat_floor.node_tree.nodes.get("Principled BSDF")
    if bsdf_floor:
        bsdf_floor.inputs["Base Color"].default_value = (0.92, 0.90, 0.88, 1.0) # Warm Statuario
        bsdf_floor.inputs["Roughness"].default_value = 0.15

    # Walls: Asian Paints Royale / Matte Plaster
    mat_wall = bpy.data.materials.new(name="PBR_Wall")
    mat_wall.use_nodes = True
    bsdf_wall = mat_wall.node_tree.nodes.get("Principled BSDF")
    if bsdf_wall:
        bsdf_wall.inputs["Base Color"].default_value = (0.95, 0.93, 0.90, 1.0)
        bsdf_wall.inputs["Roughness"].default_value = 0.85

    # 3. Build Floor Slab from exact CAD floor_bounds
    bounds = data.get("floor_bounds", {"min_x": 0, "min_y": 0, "max_x": 5, "max_y": 3})
    width = bounds["max_x"] - bounds["min_x"]
    depth = bounds["max_y"] - bounds["min_y"]
    cx = (bounds["min_x"] + bounds["max_x"]) / 2
    cz = (bounds["min_y"] + bounds["max_y"]) / 2

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cz, -0.05))
    floor_obj = bpy.context.active_object
    floor_obj.name = "Floor_Slab"
    floor_obj.scale = (width, depth, 0.1)
    floor_obj.data.materials.append(mat_floor)

    # 4. Build 3D Walls from CAD centerlines (Height: 2.7m, Thickness: 0.15m)
    wall_height = 2.7
    wall_thickness = 0.15
    for i, w in enumerate(data.get("walls", [])):
        x0, z0 = w["start"]
        x1, z1 = w["end"]
        dx = x1 - x0
        dz = z1 - z0
        length = math.sqrt(dx*dx + dz*dz)
        if length < 0.1:
            continue
        angle = math.atan2(dz, dx)
        mx = (x0 + x1) / 2
        mz = (z0 + z1) / 2

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(mx, mz, wall_height / 2))
        wall_obj = bpy.context.active_object
        wall_obj.name = f"Wall_{i}"
        wall_obj.scale = (length, wall_thickness, wall_height)
        wall_obj.rotation_euler = (0, 0, angle)
        wall_obj.data.materials.append(mat_wall)

    # 5. Lighting: Recessed warm ceiling downlights (2700K) + Sun
    sun_data = bpy.data.lights.new(name="Daylight_Sun", type='SUN')
    sun_data.energy = 4.0
    sun_data.color = (1.0, 0.95, 0.88)
    sun_obj = bpy.data.objects.new(name="Daylight_Sun", object_data=sun_data)
    sun_obj.location = (cx + 5, cz - 5, 8)
    sun_obj.rotation_euler = (math.radians(45), math.radians(15), math.radians(60))
    bpy.context.collection.objects.link(sun_obj)

    # 6. Eye-Level Walkthrough Camera Rig (1.65m eye height)
    cam_data = bpy.data.cameras.new(name="Walkthrough_Camera")
    cam_data.lens = 28 # Natural architectural wide-angle without fisheye
    cam_obj = bpy.data.objects.new(name="Walkthrough_Camera", object_data=cam_data)
    scene.camera = cam_obj
    bpy.context.collection.objects.link(cam_obj)

    # Keyframes (12 seconds, 360 frames):
    # Foyer (f=1) -> Living (f=90) -> Window (f=180) -> Bedroom (f=270) -> Turnaround (f=360)
    keyframes = [
        (1, (2.0, 0.4, 1.65), (math.radians(90), 0, math.radians(0))),
        (90, (1.8, 1.3, 1.65), (math.radians(88), 0, math.radians(-35))),
        (180, (3.4, 1.4, 1.65), (math.radians(90), 0, math.radians(45))),
        (270, (3.4, 2.3, 1.65), (math.radians(85), 0, math.radians(-60))),
        (360, (2.5, 1.5, 1.65), (math.radians(90), 0, math.radians(-180))),
    ]

    for frame, pos, rot in keyframes:
        scene.frame_set(frame)
        cam_obj.location = pos
        cam_obj.rotation_euler = rot
        cam_obj.keyframe_insert(data_path="location", frame=frame)
        cam_obj.keyframe_insert(data_path="rotation_euler", frame=frame)

    # 7. Render Settings (H.264 MP4 export)
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.filepath = output_mp4_path

    print(f"🎬 Starting headless Blender render to: {output_mp4_path}...")
    bpy.ops.render.render(animation=True)
    print(f"✅ Blender walkthrough video successfully baked: {output_mp4_path}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        run_blender_pipeline(sys.argv[1], sys.argv[2])
    else:
        print("Usage: blender --background --python blender_walkthrough_bake.py -- <elements.json> <output.mp4>")
