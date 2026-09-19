# End-to-End 3D Architectural Walkthrough Pipeline: CAD, Blender, Railway, & Vision Models

> **Architectural Core Thesis**: An architectural walkthrough is **not** a generic stock video or unconditioned text-to-video hallucination. It is the **live, eye-level spatial experience inside the proposed house**, strictly maintaining the exact millimeter dimensions, wall thicknesses, door clearances (NBC 2016 / IBC), and furniture coordinates defined in the CAD/BIM model.

---

## 1. System Architecture: From 2D CAD to 60fps Walkthrough

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CAD & Vector Geometry (AutoCAD DXF / 2D Canvas)                          │
│    - Centerline coordinates, wall thickness (150mm), ceiling height (2.70m) │
│    - Door openings (0.90m clear), window openings (1.20m daylight)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. BIM & IFC4 Semantic Layer (ISO-10303-21 STEP)                            │
│    - IfcWallStandardCase, IfcDoor, IfcWindow, IfcSlab, IfcFurnishingElement │
│    - Real-world schedule of rates & statutory compliance checks             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Client-Facing Live 3D Walkthrough Suite (AtelierOS Browser Engine)        │
│    - Three.js / WebGL 60fps real-time rendering                             │
│    - Eye-level Steadicam Tour (1.65m human eye height, 55° FOV)             │
│    - Interactive First-Person Mode (WASD / Arrow Keys + Mouse Look)         │
│    - Live Material Swapper (Italian Marble, Kota Stone, Herringbone Oak)    │
│    - Circadian Sun Simulation (Morning 5000K to Evening Recessed 2700K)     │
│    - Real-time Dimension Labels (NBC 2016 clearance callouts)               │
│    - Browser-Native 60fps Video Export via canvas.captureStream()           │
└──────────────────┬──────────────────────────────────────┬───────────────────┘
                   │                                      │
                   ▼                                      ▼
┌──────────────────────────────────────┐┌─────────────────────────────────────┐
│ 4. Headless Blender on Railway / GPU ││ 5. Vision AI Neural Rendering       │
│    - Blender 4.2+ EEVEE Next/Cycles  ││    - Gemini 2.0 Flash Vision        │
│    - PBR Material Shading & Ray-bake ││    - SDXL 1.0 + ControlNet-Depth    │
│    - 360-frame 60fps H.264 camera rig││    - Preserves 3D depth geometry    │
│    - services/ml/blender_walkthrough ││    - Generates 8K photoreal renders │
└──────────────────────────────────────┘└─────────────────────────────────────┘
```

---

## 2. In-Browser Live 3D Walkthrough (`Live3DWalkthroughPlayer`)

Located in [`apps/web/src/components/video/live-3d-walkthrough-player.tsx`](file:///Users/aryamandev/Documents/Claude/Projects/Arch-ai/apps/web/src/components/video/live-3d-walkthrough-player.tsx):

### Exact CAD Dimensions Maintained
- **Floor Slab**: Extruded bounding box ($5.00\text{m} \times 3.00\text{m} = 15.00\text{ m}^2 / 161.5\text{ sq.ft}$).
- **Walls**: Extruded solid masonry ($0.15\text{m}$ thickness, $2.70\text{m}$ clear ceiling height).
- **Entrance Opening**: $0.90\text{m}$ clear width, $2.10\text{m}$ height with 3D wooden door leaf swung $65^\circ$ open and brass lever.
- **Perimeter Window**: $1.20\text{m}$ width, $1.40\text{m}$ height with aluminum frame and double-glazed reflective glass.
- **Architectural Furniture**:
  - *Sectional Sofa*: $2.40\text{m} \times 1.00\text{m}$ at $(1.5, 1.8)$.
  - *Noguchi Coffee Table*: $1.20\text{m} \times 0.60\text{m}$ sculpted wood base with glass top at $(1.5, 0.9)$.
  - *King Platform Bed*: $1.90\text{m} \times 2.10\text{m}$ walnut frame and linen mattress at $(3.8, 1.8)$.
  - *Eames Lounge Chair*: $0.85\text{m} \times 0.85\text{m}$ at $(2.9, 0.8)$.
  - *Oak Dining Table*: $1.20\text{m} \times 0.80\text{m}$ with 4 tapered legs at $(0.6, 0.6)$.

### Camera Modes
1. **Steadicam Tour**: 12-second automated camera flight at $1.65\text{m}$ eye-level with smooth spline interpolation across 5 key architectural waypoints:
   - `[🚪 Entrance Foyer]` &rarr; `[🛋️ Living Room]` &rarr; `[🪟 Daylight Window]` &rarr; `[🛏️ Bedroom Retreat]` &rarr; `[🔄 360° Interior Turnaround]`.
2. **Interactive First-Person (WASD)**: Human-speed walking ($2.0\text{ m/s}$) with interior collision boundaries ($0.35\text{m} \le x \le 4.65\text{m}$, $0.35\text{m} \le z \le 2.65\text{m}$).
3. **Axonometric / Dollhouse Orbit**: Full exterior orbit with cutaway walls for master planning review.

---

## 3. Headless Blender Pipeline on Railway / Cloud GPU

The Python script [`services/ml/blender_walkthrough_bake.py`](file:///Users/aryamandev/Documents/Claude/Projects/Arch-ai/services/ml/blender_walkthrough_bake.py) runs headless in a container:

```bash
blender --background --python services/ml/blender_walkthrough_bake.py -- \
  /path/to/elements.json \
  /path/to/output_walkthrough.mp4
```

### Dockerfile for Railway.app GPU Deployment
```dockerfile
FROM linuxserver/blender:latest

WORKDIR /app
COPY services/ml/ /app/services/ml/
RUN apt-get update && apt-get install -y ffmpeg python3-pip

# Railway entrypoint
CMD ["python3", "-m", "services.ml.app"]
```

---

## 4. Vision Models: 3D Depth Conditioning (ControlNet-Depth)

To achieve photorealistic renders without losing architectural accuracy:
1. Three.js / Blender extracts the **normalized 16-bit Z-depth map** from the 3D scene camera.
2. The depth map is passed to **SDXL 1.0 + ControlNet-SDXL-Depth** (`services/ml/render_v2.py`).
3. Geometry (walls, openings, edge bounds) remains **100% locked** to the CAD blueprint, while neural models synthesize hyper-realistic ray-traced materials, marble veining, and warm bounce lighting.
