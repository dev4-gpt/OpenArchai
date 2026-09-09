# OpenArchai Platform Build — Task Tracker

## Phase 1: Voice AI + Enhanced Design Studio (Weeks 1-4) — ✅ COMPLETED

### Foundation
- [x] Add Gemini API client library (`apps/web/src/lib/gemini.ts`)
- [x] Add database migration for project region setting (`supabase/migrations/0011_project_region.sql`)
- [x] Add database migration for building codes pgvector (`supabase/migrations/0010_building_codes.sql`)
- [x] Add voice command type definitions (`apps/web/src/components/voice-assistant/types.ts`)

### Workstream 1A: Voice-Driven Design Assistant
- [x] Voice provider context with Web Speech + SpeechSynthesis (`voice-provider.tsx`)
- [x] Floating microphone button with pulsing audio waves (`voice-button.tsx`)
- [x] Gemini intent command parser (`command-parser.ts`)
- [x] Voice command history sidebar (`command-history.tsx`)
- [x] Server-side API route for parsing with rate limiting (`apps/web/src/app/api/voice/parse/route.ts`)
- [x] Wire voice assistant into project dashboard (`page.tsx`)

### Workstream 1B: Enhanced 3D Design Studio
- [x] Upgrade `model-viewer.tsx` with interactive measurement tool (meters/feet)
- [x] Add camera presets (Top, Front, Perspective, Reset)
- [x] Add camera reset button
- [x] Add WebGL screenshot export to PNG
- [x] Add full-screen toggle
- [x] Add loading skeleton animation

### Workstream 1C: 2D Floor Plan Editor
- [x] Editor data model and type definitions (`types.ts`)
- [x] Editor state management and undo/redo history (`state/floor-plan-store.ts`)
- [x] High-DPI HTML5 canvas drawing surface with snapping and live dimensions (`editor-canvas.tsx`)
- [x] Toolbar component with Indian and US room presets (`toolbar.tsx`)
- [x] AutoCAD ASCII DXF export (`export/to-dxf.ts`)
- [x] IFC/BIM elements export (`export/to-elements.ts`)
- [x] Top-level editor component (`floor-plan-editor.tsx`)
- [x] EditorTab with backend project persistence (`editor-tab.tsx`)
- [x] Add `saveEditorFloorPlan` server action (`cad-actions.ts`)
- [x] Wire 2D Floor Plan Studio into project dashboard (`page.tsx`)

### Workstream 1D: Render Upgrade + Indian Styles
- [x] Expand style presets with Indian (Gurgaon luxury, South Delhi farmhouse, Mumbai sea-facing, etc.) & International styles in `style-picker-form.tsx`
- [x] Add mood board / reference image upload in `style-picker-form.tsx`
- [x] Create `render_v2.py` with SDXL 1.0 + ControlNet-SDXL-Depth at 1024x1024
- [x] Negative prompt filtering for architectural renders

---

## Phase 2: Material Library + Cost Estimation (Weeks 5-8) — ✅ COMPLETED

### Workstream 2A: Material Library
- [x] Material database types and catalog with Indian stones (Kota, Makrana), marbles (Italian Statuario), Asian Paints, Jaquar fittings, and US alternates (`apps/web/src/lib/materials-db.ts`)
- [x] Full material library browser page with search, category tabs, Indian/US filters, and specification inspector (`apps/web/src/app/materials/page.tsx`)

### Workstream 2B: Cost Estimation & BOQ Engine
- [x] Indian Schedule of Rates JSON database (Gurgaon / Delhi NCR rates for civil, flooring, walls, ceilings, joinery, and labor) (`services/cost/rates_india.json`)
- [x] US Schedule of Rates JSON database (`services/cost/rates_us.json`)
- [x] Server-side Python BOQ and cost estimation module (`services/cost/estimator.py`)
- [x] Zero-latency client-side calculation engine for Next.js (`apps/web/src/lib/cost-calculator.ts`)
- [x] Interactive Cost & BOQ UI panel with three-tier toggle (Budget / Standard / Premium), area KPIs, itemized trades table, 10% contingency, and CSV export (`apps/web/src/app/dashboard/[projectId]/cost-panel.tsx`)
- [x] Wired `CostPanel` directly into the project dashboard (`page.tsx`)

---

## Phase 3: Building Code Compliance (Weeks 9-12) — ✅ COMPLETED

### Workstream 3A: India Compliance Engine
- [x] NBC India 2016 automated checker (Part 3 & 4: room areas, doors, ceiling heights, ventilation) (`services/compliance/india/nbc_checker.py`)
- [x] Vastu Shastra orientation checker with 8-directional zoning (Ishanya, Agni, Nairutya, Vayavya) (`services/compliance/india/vastu_checker.py`)
- [x] Gurgaon DTCP & HRERA municipal bylaws checker (FAR, ground coverage, heights, stilt parking) (`services/compliance/india/bylaws/gurgaon_dtcp.py`)

### Workstream 3B: US Compliance Engine
- [x] IBC and ADA Title III accessibility compliance checker (32in door clearance, 44in corridors, 60in turning circle) (`services/compliance/us/ibc_ada_checker.py`)

### Workstream 3C: Client Engine & UI Panel
- [x] Interactive in-browser compliance evaluation engine (`apps/web/src/lib/compliance-engine.ts`)
- [x] Interactive Compliance Panel component with India / US toggle, severity filters, and actionable fix suggestions (`apps/web/src/app/dashboard/[projectId]/compliance-panel.tsx`)
- [x] Wired `CompliancePanel` into the project dashboard (`page.tsx`)

---

## Phase 4: BIM + Multi-Agent Orchestration (Weeks 13-16) — ✅ COMPLETED

### Workstream 4A: BIM & IFC4 Export Enhancements
- [x] Enhanced `services/ml/build_ifc.py` with:
  - `IfcSlab` generation for floor slabs from bounding box
  - `IfcOpeningElement` voids for doors and windows with `void.add_filling`
  - `IfcSpace` assignment with room names and long names
  - Structural storey containment

### Workstream 4B: Multi-Agent Architecture Orchestrator
- [x] Multi-agent design orchestrator connecting Lead Architect (Vikram Mehta), Code/Vastu Specialist (Ananya Sharma), Interior Designer (Rohan Varma), and Quantity Surveyor (Sunil Bajaj) (`apps/web/src/lib/agents-orchestrator.ts`)
- [x] Next.js API route `/api/agents/consult` for multi-agent consultations (`apps/web/src/app/api/agents/consult/route.ts`)
- [x] Interactive `AgentTeamModal` collaborative consultation UI drawer with specialist badges, quick prompts, and chat thread (`apps/web/src/app/dashboard/[projectId]/agent-team-modal.tsx`)
- [x] Wired `AgentTeamModal` directly into the project dashboard header (`page.tsx`)

---

## Phase 5: MCP + Presentation Mode + Production (Weeks 17-20) — ✅ COMPLETED
- [x] OpenArchai MCP server for external CAD/BIM AI tool integration (`services/mcp/openarchai_server.py`, `services/mcp/mcp.json`)
- [x] Presentation mode for client walkthroughs (`apps/web/src/app/dashboard/[projectId]/presentation/`)
- [x] High-resolution PDF export with BOQ & Compliance certificate (browser print styling & print media layout)
- [x] End-to-end integration testing (verified all Python compliance/cost/MCP test assertions and JSON-RPC stdio protocol)
- [x] Production ready package structure for PDCO Architects
