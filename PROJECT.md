# Project: AtelierOS 5-Pillar Enterprise Architectural Overhaul

## Architecture
AtelierOS is an institutional architectural CAD and project intelligence web platform built with Next.js (App Router), React, TypeScript, Tailwind CSS, Three.js, and HTML5 Canvas.

### 5-Pillar Enterprise Subsystems
1. **Pillar 1: PE Financial Underwriting & Statutory FAR Monetization**:
   - 2D CAD Canvas: Live FAR Boundary Envelope & Ground Coverage Footprint overlay with toolbar toggle `[📈 FAR & Envelope]`. Color-coded zone fills: Net Carpet Area (green), Saleable Circulation (amber), Deductible Service Shafts (blue). Live carpet-to-saleable efficiency and FAR utilization recalculation.
   - 3D Viewport: Translucent volumetric zoning envelope with statutory maximum massing envelope and sky-exposure plane relative to road width (NBC Part 3 Cl. 4.3 / Haryana DTCP Gurugram).
   - Commercial Engine (`pe-underwriting.ts`, `cost-panel.tsx`): Pro-forma financial underwriting (Yield-on-Cost, NOI, 10-Yr IRR, Payback) parametrically linked to active finishes and area takeoffs; CPWD DSR 2024 contractor tender schedule export (CPWD items: 11.36.1, 13.48, etc.) with 1-click CSV download.

2. **Pillar 2: Structural Bay Grid & 3D MEP BIM Coordination**:
   - 2D CAD Canvas: Modular Structural Bay Grid overlay (6.0m×6.0m, 6.0m×7.2m, 7.2m×7.2m) with toolbar toggle `[📐 Structural Grid]`. Automatic reinforced concrete column placement (400×400mm interior, 450×600mm corner). Deflection warnings for unsupported spans >7.5m or excessive cantilevers.
   - 3D Viewport: Structural concrete columns, beam drop profiles, continuous vertical 300×300mm MEP wet core shaft extending through floor slabs.
   - Engineering Engine (`structural-grid-engine.ts`): Structural span-to-depth checks ($L/d \le 26$ per IS 456 / IS 1893 Zone IV) and ceiling plenum clash detection ensuring 450mm false ceiling void and $\ge 2.75$m clear habitable room height (NBC Part 3 Cl. 12.2).

3. **Pillar 3: Multi-Floor Egress & Fire Engineering Automation**:
   - 2D CAD Canvas: Multi-exit nearest-door routing vectors, interactive staircase flight placement tool with riser/tread dimension preview, statutory graphic symbols (`FD 120` fire doors, fire damper risers `FD-R`, hose reels `HR`).
   - 3D Viewport: Pressurized fire stair tower enclosure with 2-hour fire-rated partitions, illuminated green emergency exit signs, photoluminescent floor egress pathways.
   - Statutory Engine (`staircase-egress-calculator.ts`): Automated staircase capacity and riser-tread calculation ($550\text{mm} \le 2R + T \le 650\text{mm}$, riser $\le 150\text{mm}$, tread $\ge 300\text{mm}$, clear width $\ge 1.50$m per NBC 2016 Part 4 Table 8), 1-click municipal fire department evacuation dossier export.

4. **Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala**:
   - 2D CAD Canvas: Real-time Natural Daylighting Factor (DF %) contour heatmap across rooms based on window dimensions and solar orientation, 9-zone Vastu Shastra Peetha/Paramasayika mandala grid overlay evaluating quadrant alignment scores for Agni (SE), Nairutya (SW), Ishanya (NE), and Vayu (NW).
   - 3D Viewport: Latitude-specific solar sun-path simulation (Delhi-NCR 28.45°N) with dynamic shadow casting, layered acoustic partition cutaway with exposed resilient channels and Rockwool insulation cores.
   - Acoustic Engine (`acoustic-rt60-calculator.ts`): Sabine formula reverberation time simulation calculating room RT60 and verifying STC 56 tested acoustic decoupling for luxury residential sanctuaries.

5. **Pillar 5: 4D EPC Construction Scheduling & Turnkey Resilience**:
   - 2D CAD Canvas: Construction staging overlays (Structure ➔ MEP Risers ➔ Turnkey Finishes) and material unloading drop-zones.
   - 3D Viewport: Interactive 4D Construction Phasing Slider scrubbing from Day 0 (bare concrete slab) to Day 90 (completed luxury handover) directly in the WebGL scene.
   - Commercial Engine (`construction-gantt-engine.ts`, `ifc-export.ts`): Dynamic 4D Critical Path Gantt engine linked to BOQ Value Engineering substitutions (-14 weeks lead time compression on domestic stone swaps), regional monsoon weather risk alerts (IS 287 8-12% EMC), enriched IFC4 LOD 300 export with COBie properties, U-values, and acoustic STC ratings.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | 2D FAR & Coverage Overlay & Efficiency Recalc | Color-coded zone fills (Carpet: green, Circulation: amber, Shaft: blue), dynamic FAR & efficiency calculation, toolbar toggle `[📈 FAR & Envelope]` | M1 | survey_2d, ORIGINAL_REQUEST §R1 |
| F2 | 3D Volumetric Zoning Envelope | Translucent zoning massing envelope with sky-exposure plane (56.3° / 1:1.5) and height cap per NBC Part 3 Cl. 4.3 & Haryana DTCP | M1 | survey_3d, ORIGINAL_REQUEST §R1 |
| F3 | PE Underwriting & CPWD Tender Export | Pro-forma model (YoC, NOI, IRR, Payback) in cost-panel.tsx, 1-click CPWD DSR 2024 CSV export | M1 | survey_engine, ORIGINAL_REQUEST §R1 |
| F4 | 2D Modular Structural Grid & Columns | 6x6, 6x7.2, 7.2x7.2m grid overlay, column placement (400x400 / 450x600), deflection warnings (>7.5m / cantilever), toggle `[📐 Structural Grid]` | M2 | survey_2d, ORIGINAL_REQUEST §R2 |
| F5 | 3D Structural Columns, Beams & Continuous MEP Shaft | RC columns, beam drops, 300x300mm vertical shaft extending continuously through slabs | M2 | survey_3d, ORIGINAL_REQUEST §R2 |
| F6 | Structural Span-to-Depth & Ceiling Plenum Checks | IS 456 L/d <= 26 checks, 450mm ceiling plenum void check with >= 2.75m clear room height | M2 | survey_engine, ORIGINAL_REQUEST §R2 |
| F7 | 2D Multi-Exit Egress, Stair Tool & Fire Symbols | Multi-exit routing vectors to nearest doors, staircase flight placement tool (550 <= 2R+T <= 650, width >= 1.5m), FD 120 / FD-R / HR graphic symbols | M3 | survey_2d, ORIGINAL_REQUEST §R3 |
| F8 | 3D Fire Stair Tower & Egress Pathways | Pressurized fire stair tower, 2-hour partitions, green exit signs, photoluminescent egress ribbons | M3 | survey_3d, ORIGINAL_REQUEST §R3 |
| F9 | Staircase Capacity & Evacuation Dossier Export | NBC Part 4 Table 8 validation, 1-click municipal fire evacuation dossier PDF/JSON/printable export | M3 | survey_engine, ORIGINAL_REQUEST §R3 |
| F10 | 2D Daylight Factor Heatmap & Vastu Mandala Grid | DF % contour heatmap from windows/solar orientation, 9-zone Vastu Peetha grid & quadrant alignment scores (Agni, Nairutya, Ishanya, Vayu) | M4 | survey_2d, ORIGINAL_REQUEST §R4 |
| F11 | 3D Delhi-NCR Sun-Path & STC 56 Acoustic Cutaway | 28.45°N astronomical solar sun-path with dynamic shadows, STC 56 partition cutaway (resilient channels, Rockwool, SoundStop) | M4 | survey_3d, ORIGINAL_REQUEST §R4 |
| F12 | Acoustic RT60 Simulation & STC 56 Decoupling | Sabine formula RT60 simulation ($0.40 \le RT_{60} \le 0.55$s sanctuary range), STC 56 partition decoupling verification | M4 | survey_engine, ORIGINAL_REQUEST §R4 |
| F13 | 2D Construction Staging & Material Drop-Zones | Structure -> MEP -> Finishes staging overlays, material unloading drop-zones with hazard striping and tonnage limits | M5 | survey_2d, ORIGINAL_REQUEST §R5 |
| F14 | 3D 4D Construction Phasing Slider | Interactive slider scrubbing Day 0 (bare slab) to Day 90 (completed luxury turnkey handover) in WebGL scene | M5 | survey_3d, ORIGINAL_REQUEST §R5 |
| F15 | 4D Critical Path Gantt & Enriched IFC4 LOD 300 | Dynamic CPM Gantt linked to VE substitutions (-14 weeks on domestic stone), monsoon risk alerts, IFC4 LOD 300 export with COBie, U-values, STC | M5 | survey_engine, ORIGINAL_REQUEST §R5 |
| F16 | E2E Test Suite & Test Runner for 5 Pillars | Multi-tier test suite covering all 5 pillars with zero regressions on existing 107 tests | E2E Track | survey_engine, ORIGINAL_REQUEST §Verification |
| F17 | Final Integration, Adversarial Hardening & Cloud Verification | Tier 5 Adversarial tests, MiroFish simulation >= 85%, tsc 0 errors, Vercel cloud verification | M6 | survey_engine, ORIGINAL_REQUEST §Verification |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track Infrastructure | Setup multi-tier test suite for 5 pillars, publish TEST_READY.md | none | DONE |
| M1 | Pillar 1: PE Financial Underwriting & Statutory FAR | 2D FAR/Coverage overlay, 3D zoning envelope, pe-underwriting.ts, cost-panel.tsx | none | DONE |
| M2 | Pillar 2: Structural Bay Grid & 3D MEP BIM | 2D structural grid overlay & columns, 3D columns/beams/shaft, structural-grid-engine.ts | none | DONE |
| M3 | Pillar 3: Multi-Floor Egress & Fire Engineering | 2D multi-exit vectors, stair tool, fire symbols, 3D stair tower, staircase-egress-calculator.ts | M1 | DONE |
| M4 | Pillar 4: Museum Acoustics, Daylighting & Vastu | 2D daylight heatmap & Vastu grid, 3D Delhi sun-path & acoustic cutaway, acoustic-rt60-calculator.ts | none | DONE |
| M5 | Pillar 5: 4D EPC Schedule & Turnkey Resilience | 2D staging overlay, 3D 4D slider Day 0->90, construction-gantt-engine.ts, ifc-export.ts | M2, M4 | IN_PROGRESS |
| M6 | Final Integration, Adversarial Hardening & Cloud Verification | 100% E2E tests pass, Tier 5 Challenger, MiroFish simulation >= 85%, cloud deployment verification | E2E, M1-M5 | PLANNED |

---

## Code Layout & File Write Boundaries
- **E2E Testing Track**:
  - `apps/web/scripts/test-5pillars-e2e.mjs` (NEW)
  - `apps/web/src/lib/calculators/five-pillars.test.ts` (NEW)
  - `TEST_INFRA.md`, `TEST_READY.md`
- **Milestone M1 (Pillar 1)**:
  - `apps/web/src/lib/calculators/far-envelope-geometry.ts` (NEW)
  - `apps/web/src/components/floor-plan-editor/state/floor-plan-store.ts` (Pillar 1 state additions)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (FAR & Envelope pass)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (FAR toggle)
  - `apps/web/src/components/3d/zoning-envelope.tsx` (NEW)
  - `apps/web/src/components/model-viewer.tsx` (Zoning envelope integration)
  - `apps/web/src/lib/calculators/pe-underwriting.ts`
  - `apps/web/src/app/dashboard/[projectId]/cost-panel.tsx`
- **Milestone M2 (Pillar 2)**:
  - `apps/web/src/lib/calculators/structural-grid-engine.ts`
  - `apps/web/src/components/3d/structural-elements.tsx` (NEW)
  - `apps/web/src/components/model-viewer.tsx` (Structural elements integration)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Structural grid pass)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (Structural grid toggle & bay dropdown)
- **Milestone M3 (Pillar 3)**:
  - `apps/web/src/lib/calculators/staircase-egress-calculator.ts`
  - `apps/web/src/components/3d/fire-stair-tower.tsx` (NEW)
  - `apps/web/src/components/model-viewer.tsx` (Fire stair tower integration)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Multi-exit, stair tool, fire symbols)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (Staircase placement tool)
- **Milestone M4 (Pillar 4)**:
  - `apps/web/src/lib/calculators/acoustic-rt60-calculator.ts` (NEW)
  - `apps/web/src/components/3d/sun-path-and-acoustics.tsx` (NEW)
  - `apps/web/src/components/model-viewer.tsx` (Sun path & acoustic cutaway integration)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Daylight heatmap & Vastu mandala)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (Daylight & Vastu toggles)
- **Milestone M5 (Pillar 5)**:
  - `apps/web/src/lib/calculators/construction-gantt-engine.ts`
  - `apps/web/src/lib/calculators/ifc-export.ts`
  - `apps/web/src/components/3d/construction-phasing.tsx` (NEW)
  - `apps/web/src/components/model-viewer.tsx` (4D phasing slider integration)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Staging overlays & drop-zones)
- **Milestone M6 (Final Integration & Verification)**:
  - Run full test suite, MiroFish simulation, tsc verification, Vercel deployment verification.
