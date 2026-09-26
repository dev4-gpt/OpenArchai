# Project: AtelierOS Tier-1 Architectural Enterprise Features

## Architecture
AtelierOS is a professional architectural CAD and project intelligence web platform built with Next.js (App Router), React, TypeScript, Tailwind CSS, Three.js, and HTML5 Canvas.

### Module Boundaries
1. **2D CAD & Circulation Engine (`apps/web/src/components/floor-plan-editor/`, `apps/web/src/lib/calculators/`)**:
   - Manages CAD state, wall, door, room, and furniture geometries in meter units.
   - Calculates NBC 2016 Part 4 egress paths, exit distances, clear widths, and dead-end circulation.
   - Renders live vector paths, MEP shaft overlays, and compliance linter highlights on the 2D canvas.
2. **Cost & BOQ Commercial Engine (`apps/web/src/app/dashboard/[projectId]/cost-panel.tsx`, `apps/web/src/lib/cost-calculator.ts`)**:
   - Generates trade packages, schedule of rates, quantities, and cost estimates.
   - Manages parametric value engineering alternates, delta chips, and 1-click approval state mutations.
   - Synchronizes commercial takeoffs with 3D finishes and project stores via custom events.
3. **Material Catalog & Specification Engine (`apps/web/src/lib/materials-db.ts`, `apps/web/src/app/materials/`, `apps/web/src/components/model-viewer.tsx`)**:
   - Houses the master material finishes database with environmental, acoustic, moisture, and lead time metadata.
   - Displays specification chips on catalog cards, specification modal drawers, and 3D viewer inspect popovers.
4. **Verification & Testing Engine (`apps/web/src/lib/calculators/nbc-egress.test.ts`, `scripts/mirofish_studio_simulation.py`)**:
   - Comprehensive test runner and multi-persona institutional stress simulation validating statutory compliance and business logic.

---

## Feature Inventory
Every feature from the Survey phase appears here with its assigned milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Live 2D Egress Vector Path Overlay | Render green vector line from furthest retreat point (11.2, 7.8) to primary exit (1.2, 0) with live distance pill `18.4m ≤ 30.0m [NBC 2016 Part 4 Cl. 4.5.1]` | M1 | survey_1, ORIGINAL_REQUEST §R1 |
| F2 | Wet Core Shaft Overlay | 300×300mm vertical MEP shaft at NE ensuite plumbing corner with architectural cross-hatch pattern and label | M1 | survey_1, ORIGINAL_REQUEST §R1 |
| F3 | Toolbar Egress/Shaft Controls & Action Trigger | Toolbar toggle button for egress overlay, and automated activation on `apply_layout` and `audit_compliance` actions | M1 | survey_1, ORIGINAL_REQUEST §R1 |
| F4 | Real-Time BOQ SOR Delta Chips | Prominent visual delta chips (`-₹8,55,000 / -30%` and `-14 WEEKS LEAD TIME`) on flooring trade package for Kajaria PGVT / Kota stone alternate | M2 | survey_2, ORIGINAL_REQUEST §R2 |
| F5 | 1-Click Interactive VE Approval & Live Recalc | "Approve Value Engineering" button updating line items, total capex, and unit rate instantly at 60fps without page reload, syncing with 3D viewer | M2 | survey_2, ORIGINAL_REQUEST §R2 |
| F6 | NBC 2016 Door & Corridor Pinch Linter | Automated detection of doorways/corridors <0.9m (residential) or <1.2m (common) per NBC 2016 Part 4 Table 2 with amber/red warning outline and compliance tooltip | M3 | survey_1, ORIGINAL_REQUEST §R3 |
| F7 | Dead-End Corridor Linter | Automated detection of circulation segments exceeding 6.0m per NBC 2016 Part 4 Cl. 4.6 with visual warning flag | M3 | survey_1, ORIGINAL_REQUEST §R3 |
| F8 | Material Environmental & Acoustic Schema | Enrich `MaterialItem` in `materials-db.ts` with certification fields (IS 287, BWP 710, STC 56, IS 15477, GreenGuard Gold Zero-VOC, lead times) | M4 | survey_3, ORIGINAL_REQUEST §R4 |
| F9 | Material Catalog UI Badges | Surface certification chips on material cards and detailed compliance section in specification modal drawer | M4 | survey_3, ORIGINAL_REQUEST §R4 |
| F10 | 3D Viewer Material Metadata Badges | Surface environmental and acoustic metadata badges in 3D viewer swatches and interactive inspect popovers | M4 | survey_3, ORIGINAL_REQUEST §R4 |
| F11 | E2E Test Suite & Test Runner | Zero-dependency Node test harness executing unit tests in `nbc-egress.test.ts` and integration suites | E2E Track | survey_3, ORIGINAL_REQUEST §Verification |
| F12 | Final Integration, Simulation & Deployment | Run institutional simulation (`scripts/mirofish_studio_simulation.py`), static typecheck (`npx tsc --noEmit`), and verify production deployment | M5 | survey_3, ORIGINAL_REQUEST §Verification |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Test Infrastructure & Suites | Setup test runner script `run-unit-tests.mjs`, create test harness, publish TEST_READY.md | none | PLANNED |
| M1 | Live 2D Egress Vector & Wet Core Shaft Overlay | Implement egress vector, distance readout pill, 300x300mm cross-hatched shaft, toolbar toggle, action triggers | none | PLANNED |
| M2 | Real-Time BOQ SOR Delta Chips & 1-Click Approvals | Implement VE registry, delta badges (`-₹8,55,000 / -30%`, `-14 WKS`), 1-click approval button, live recalculation, event dispatch | none | PLANNED |
| M3 | Automated NBC 2016 Canvas Geometry Linter | Implement pinch-point checker (<0.9m/<1.2m), dead-end checker (>6.0m), canvas warning halos, interactive tooltips, toolbar toggle | M1 | PLANNED |
| M4 | Environmental & Acoustic Material Metadata Badges | Enrich `materials-db.ts`, add badges to catalog cards, specification drawer, and 3D model viewer inspect popovers | none | PLANNED |
| M5 | Final Integration, Simulation & Production Verification | Execute full E2E test suite, run `mirofish_studio_simulation.py`, verify `npx tsc --noEmit`, and verify deployment | E2E, M1, M2, M3, M4 | PLANNED |

---

## Code Layout & File Write Boundaries
Strict write ownership to avoid merge conflicts across concurrent workers:
- **E2E Testing Track**:
  - `apps/web/scripts/run-unit-tests.mjs` (NEW)
  - `apps/web/package.json` (add test script)
  - `TEST_INFRA.md`, `TEST_READY.md`
- **Milestone M1**:
  - `apps/web/src/lib/calculators/egress-overlay-geometry.ts` (NEW)
  - `apps/web/src/components/floor-plan-editor/state/floor-plan-store.ts`
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Egress & Shaft render pass)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (Egress toggle)
  - `apps/web/src/app/dashboard/[projectId]/agent-team-modal.tsx` (Trigger integration)
- **Milestone M2**:
  - `apps/web/src/lib/value-engineering-registry.ts` (NEW)
  - `apps/web/src/app/dashboard/[projectId]/cost-panel.tsx`
- **Milestone M3** (Sequenced after M1):
  - `apps/web/src/lib/calculators/geometry-linter.ts` (NEW)
  - `apps/web/src/components/floor-plan-editor/editor-canvas.tsx` (Linter warnings & tooltips pass)
  - `apps/web/src/components/floor-plan-editor/toolbar.tsx` (Linter toggle)
- **Milestone M4**:
  - `apps/web/src/lib/materials-db.ts`
  - `apps/web/src/app/materials/page.tsx`
  - `apps/web/src/components/model-viewer.tsx`
- **Milestone M5**:
  - Integration verification across all modules, running tests, running simulation, typechecking, and deploying.

---

## Interface Contracts

### 1. Egress Overlay ↔ Canvas & Store (`M1`)
```typescript
export interface EgressOverlayConfig {
  showEgressOverlay: boolean;
  furthestPoint: { x: number; y: number }; // (11.2, 7.8)
  exitDoor: { x: number; y: number };      // (1.2, 0.0)
  waypoints: Array<{ x: number; y: number }>;
  travelDistanceM: number;                 // 18.4
  maxAllowedM: number;                     // 30.0 (NBC 2016 Part 4 Cl. 4.5.1)
  clause: string;                          // "NBC 2016 Part 4 Cl. 4.5.1"
}

export interface WetCoreShaftConfig {
  x: number; // 11.6m
  y: number; // 0.1m
  width: number; // 0.3m (300mm)
  height: number; // 0.3m (300mm)
  label: string; // "MEP SHAFT 300x300mm"
}
```

### 2. Value Engineering Registry ↔ Cost Panel (`M2`)
```typescript
export interface ValueEngineeringItem {
  id: string;
  tradePackage: "flooring_stone" | "wall_finishes" | "door_suites" | "window_suites";
  baselineName: string;
  proposedName: string;
  baselineRate: number;
  proposedRate: number;
  savingsFormatted: string; // e.g. "-₹8,55,000"
  percentageSavings: number; // e.g. -30
  leadTimeImpact: string; // e.g. "-14 WEEKS LEAD TIME"
  description: string;
}

export interface VEApprovalState {
  approvedIds: string[];
  totalSavingsINR: number;
  weeksReduced: number;
}
```

### 3. Geometry Linter ↔ Canvas (`M3`)
```typescript
export interface LinterIssue {
  id: string;
  type: "door_pinch" | "corridor_pinch" | "dead_end";
  severity: "error" | "warning";
  location: { x: number; y: number };
  elementId?: string;
  actualWidthM?: number;
  requiredWidthM?: number;
  deadEndLengthM?: number;
  clause: string; // e.g. "NBC 2016 Part 4 Table 2" or "NBC 2016 Part 4 Cl. 4.6"
  message: string;
}
```

### 4. Material Item Certification Badges (`M4`)
```typescript
export interface MaterialBadge {
  type: "timber" | "acoustic" | "adhesive" | "voc" | "lead_time" | "general";
  code: string; // e.g. "IS 287" | "STC 56" | "IS 15477" | "Zero-VOC"
  label: string; // e.g. "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer"
}
// Extended in MaterialItem:
// badges?: string[];
```
