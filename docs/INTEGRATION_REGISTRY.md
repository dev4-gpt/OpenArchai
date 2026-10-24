# Atelier OS Integration Registry

One place for every open-source repo, model and commercial API we are considering or already use, so findings from saved Reels, blog posts and audits stop living in scattered notes.

Last reviewed: 2026-10-23.

## How to read this

- **In repo** means code in this repository actually runs it. A UI label or a mention in a doc does not count.
- **License** says where the answer came from. "unverified" means nobody has read the license file or page yet. Check before using anything in client work.
- Verdicts are recommendations, not decisions.

## Pipeline stages

| Code | Stage |
|---|---|
| A | Intake: plan image, PDF or sketch to structured elements |
| B | BIM and IFC: model, geometry, Revit and IFC interchange |
| C | Takeoff, compliance and cost |
| D | Visualization: renders, splats, walkthrough video |
| E | Agents and MCP |
| F | Infrastructure and GPU |

## Registry

| Name | Stage | Type | License | In repo | Verdict and next step |
|---|---|---|---|---|---|
| IfcOpenShell | B | OSS | unverified | Yes (`services/ml/build_ifc.py`) | Core dependency. Slabs, doors and windows now get 3D representations; openings do not yet cut walls and rooms have no geometry. Not yet run against a real file. |
| OpenTakeoff (Kentucky-ai/opentakeoff) | C | OSS | AGPL-3.0 per README (relicensed from Apache-2.0) | No | PDF takeoff with calibrated scale, 53 MCP tools (`npx -y opentakeoff-mcp`), exports report, marked PDF and DXF. Deploy as a separate service rather than embedding it, because of the AGPL. Its One-Click Area tool is gated by the authors. The same README also appears at HexNinja555/opentakeoff, so confirm which repo is canonical. |
| Roboflow Supervision | A | OSS | unverified | No | Provides `mask_to_polygons`, `approximate_polygon`, `filter_polygons_by_area` and `InferenceSlicer`. Commit 17a7e1c rejected it for lacking mask-to-polygon cleanup, which was wrong, but the gain is small until we have a trained door and window symbol detector. |
| That Open Company Fragments (ThatOpen/engine_fragment) | B, D | OSS | unverified | No | Browser BIM format and engine. Best candidate for a client-facing IFC viewer on our existing three.js stack. |
| FragmentsUnreal (Jairo Basto Picott) | D | OSS, open-sourced 2026-10-23 | unverified | No | Community Unreal Engine plugin that streams Fragments. Not an Epic product. Repo not located yet; start at thirdspaceinteractive.ca/links. Defer until IFC geometry is solid. |
| World Labs Marble API | D | Commercial | n/a | No | $1 buys 1,250 credits. A world costs about 1,500 credits plus 80 to 100 for a pano. A draft costs 150. Exports SPZ or PLY splats, a coarse collider mesh and a 360 pano, in arbitrary units rather than meters. Concept visuals only, not BIM. Marble app credits do not work with the API. |
| World Labs Atlas | D | Commercial, early access | n/a | No | Camera-controlled video up to 1 minute at 1440p from 1 to 6 images. Matches "videos from images for clients". Request access; no public pricing yet. |
| Spark (sparkjs.dev) | D | unverified | unverified | No | Browser splat renderer for three.js, recommended by World Labs. Needed only if we show splats. |
| MeltFlex AI | D | Commercial API | n/a | Yes (skill wrappers) | Restyle, furniture placement and a room-photo-to-splat endpoint. The v2 audit says some tools return payloads without calling the API; not re-verified. |
| Higgsfield | D | Commercial API | n/a | Yes (`api/video/higgsfield/route.ts`) | Runs only when `HIGGSFIELD_API_KEY` is set. Otherwise the route falls back to browser capture of the WebGL scene. |
| Wan 2.1, HunyuanVideo, SkyReels, Open-Higgsfield | D | OSS models | unverified | No (UI labels only) | The engine selectors only change a message string (`route.ts` lines 123-157). Either run them on Modal or remove the selectors. Check weight licenses first; video models often carry territory or commercial limits. |
| gsplat | D | OSS | Apache-2.0 per v2 audit, unverified here | No | Self-hosted Gaussian splat rasterizer, an alternative to paying for Marble. |
| Nerfstudio | D | OSS | Apache-2.0 per v2 audit, unverified here | No | Full splat training pipeline. |
| RoomFormer | A | OSS | unconfirmed per v2 audit | No | Possible upgrade over the current UNet segmentation. Read its LICENSE before adopting. |
| FLUX.1 schnell | D | Model | Apache-2.0 per v2 audit, unverified here | No (render_v2 uses SDXL) | Candidate render upgrade. The v2 audit says FLUX.1-dev is non-commercial without a paid license. |
| BlenderMCP | D, E | OSS | unverified | No | Would let an agent drive `blender_walkthrough_bake.py` interactively. |
| freecad-mcp (sandraschi) | B, E | OSS | unverified | One mention only | Possible agent-driven IFC inspection and editing. |
| Autodesk Revit | B | Commercial, Windows-only | n/a | Yes (import bridge) | The bridge runs Revit to Atelier OS only: rooms, materials and cameras, with walls built from room outlines. There is no write-back. Native editable output needs a Windows add-in or Autodesk's cloud Design Automation for Revit, which has not been evaluated. |
| Unreal Engine | D | n/a | n/a | No | Defer until IFC geometry is solid and a client actually needs photoreal real-time. |

## Intake queue (saved Reels and other sources)

Paste anything here, even a half-remembered name. Resolve each row into the registry above.

| Date | Source (Reel or link) | Repo or tool | Notes |
|---|---|---|---|
| | | | |

## Checklist before a row becomes a verdict

1. License file read, and for models, the weight license checked separately from the code license.
2. Last push, stars and maintainer count noted.
3. Pipeline stage and overlap with what we already have identified.
4. Risks named: AGPL, non-commercial, territory limits, vendor changes.
5. "In repo" updated only when code runs it.
