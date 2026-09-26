/**
 * Comprehensive Opaque-Box E2E Integration Test Suite for AtelierOS Tier-1 Enterprise Features.
 * 
 * Implements Tiers 1-4:
 *   - Tier 1: Feature Coverage (Live 2D egress vector, 300x300mm wet shaft, BOQ SOR delta chips, NBC 2016 linter pinch points, material badges)
 *   - Tier 2: Boundary & Corner Cases (limits at 0.9m door, 1.2m corridor, 6.0m dead end, 30.0m travel distance, 0 area, extreme values)
 *   - Tier 3: Cross-Feature Interactions (VE substitution linking to material DB specs and BOQ recalculation)
 *   - Tier 4: Real-World Institutional Scenarios (MiroFish benchmark plan: 1,200 sqft, Italian marble to Kajaria/Kota swap saving exactly ₹8,55,000 / 30% and -14 weeks lead time; 18.4m egress vector)
 */

import {
  NBC,
  calcOccupantLoad,
  calcRequiredEgressWidthMm,
  verifyEgressClearWidth,
  verifyTravelDistance,
  verifyDeadEnd,
  generateEgressProof,
} from "./nbc-egress";

import {
  CANONICAL_RETREAT_POINT,
  CANONICAL_EXIT_POINT,
  CANONICAL_EGRESS_WAYPOINTS,
  CANONICAL_WET_CORE_SHAFT,
  calculatePolylineDistance,
  isSingleLoadedSpinePlan,
  findPrimaryExitDoor,
  findFurthestRetreatPoint,
  getWetCoreShaft,
  calculateEgressOverlay,
  calculateEgressVectorPath,
  type EgressOverlayConfig,
  type WetCoreShaftConfig,
} from "./egress-overlay-geometry";

import {
  STATUTORY_THRESHOLDS,
  checkDoorClearances,
  checkCorridorClearances,
  checkDeadEndCorridors,
  lintFloorPlanGeometry,
  lintPlanGeometry,
  type LinterIssue,
} from "./geometry-linter";

import {
  VALUE_ENGINEERING_CATALOG,
  VE_BENCHMARK,
  calculateVEDelta,
  getSubstitutionsForPackage,
  getAllSubstitutions,
  toValueEngineeringItem,
  type ValueEngineeringItem,
  type VEApprovalState,
} from "../value-engineering-registry";

import {
  generateCapexProof,
  generateNTGProof,
} from "./pe-boq";

import {
  MATERIALS_CATALOG,
  type MaterialItem,
  type MaterialBadge,
  type MaterialCertifications,
} from "../materials-db";

import type { FloorPlan, Point } from "@/components/floor-plan-editor/types";

// ===========================================================================
// Test Fixtures
// ===========================================================================

/**
 * MiroFish benchmark canonical single-loaded spine floor plan (1,200 sqft / 111 m² carpet area)
 */
const BENCHMARK_FLOOR_PLAN: FloorPlan = {
  walls: [
    { id: "w_ext_n", start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2 },
    { id: "w_ext_e", start: { x: 12, y: 0 }, end: { x: 12, y: 9 }, thickness: 0.2 },
    { id: "w_ext_s", start: { x: 12, y: 9 }, end: { x: 0, y: 9 }, thickness: 0.2 },
    { id: "w_ext_w", start: { x: 0, y: 9 }, end: { x: 0, y: 0 }, thickness: 0.2 },
    { id: "w_bath_s", start: { x: 9.6, y: 1.8 }, end: { x: 12, y: 1.8 }, thickness: 0.15 },
    { id: "w_bath_w", start: { x: 9.6, y: 0 }, end: { x: 9.6, y: 1.8 }, thickness: 0.15 },
    { id: "w_bed_s", start: { x: 0, y: 4.8 }, end: { x: 7.5, y: 4.8 }, thickness: 0.15 },
    { id: "w_spine", start: { x: 7.5, y: 0 }, end: { x: 7.5, y: 3.6 }, thickness: 0.15 },
  ],
  doors: [
    { id: "d_entry", position: { x: 1.2, y: 0 }, width: 1.0, wallId: "w_ext_n" },
    { id: "d_bath", position: { x: 9.6, y: 0.9 }, width: 0.8, wallId: "w_bath_w" },
    { id: "d_bed", position: { x: 6.5, y: 4.8 }, width: 0.9, wallId: "w_bed_s" },
    { id: "d_balcony", position: { x: 6.0, y: 9.0 }, width: 2.2, wallId: "w_ext_s" },
  ],
  windows: [
    { id: "win_bed", position: { x: 3.5, y: 0 }, width: 2.0, wallId: "w_ext_n" },
    { id: "win_living", position: { x: 12, y: 6.6 }, width: 2.4, wallId: "w_ext_e" },
  ],
  rooms: [
    {
      id: "r_bed",
      label: "Master Bedroom Sanctuary",
      vertices: [{ x: 0, y: 0 }, { x: 7.5, y: 0 }, { x: 7.5, y: 4.8 }, { x: 0, y: 4.8 }],
      area: 36.0,
      direction: "SW",
    },
    {
      id: "r_bath",
      label: "Ensuite Bath",
      vertices: [{ x: 9.6, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 1.8 }, { x: 9.6, y: 1.8 }],
      area: 4.32,
      direction: "NE",
    },
    {
      id: "r_living",
      label: "Living Core & Dining",
      vertices: [{ x: 0, y: 4.8 }, { x: 12, y: 4.8 }, { x: 12, y: 9.0 }, { x: 0, y: 9.0 }],
      area: 50.4,
      direction: "E",
    },
  ],
};



// ===========================================================================
// TIER 1: FEATURE COVERAGE
// ===========================================================================

describe("Tier 1: Feature Coverage — 4 Enterprise Features", () => {
  describe("R1: Live 2D Egress Vector Path Overlay", () => {
    it("renders green vector path from furthest retreat point to primary exit door", () => {
      const overlay = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN, true);
      expect(overlay.showEgressOverlay).toBe(true);
      expect(overlay.furthestPoint.x).toBe(CANONICAL_RETREAT_POINT.x);
      expect(overlay.furthestPoint.y).toBe(CANONICAL_RETREAT_POINT.y);
      expect(overlay.exitDoor.x).toBe(CANONICAL_EXIT_POINT.x);
      expect(overlay.exitDoor.y).toBe(CANONICAL_EXIT_POINT.y);
      expect(overlay.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(overlay.travelDistanceM).toBe(18.4);
      expect(overlay.maxAllowedM).toBe(30.0);
      expect(overlay.isCompliant).toBe(true);
    });

    it("generates statutory metric readout text citing NBC 2016 Part 4 Cl. 4.5.1", () => {
      const overlay = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN);
      expect(overlay.readoutText).toContain("18.4m ≤ 30.0m");
      expect(overlay.readoutText).toContain("NBC 2016 Part 4 Cl. 4.5.1");
    });

    it("correctly evaluates polyline distance along waypoints", () => {
      const waypoints: Point[] = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ];
      // 3m horizontal + 4m vertical = 5m + 2m = 7m total
      const dist = calculatePolylineDistance(waypoints);
      expect(dist).toBe(7.0);
    });

    it("respects the showEgressOverlay visibility toggle parameter", () => {
      const overlayVisible = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN, true);
      const overlayHidden = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN, false);
      expect(overlayVisible.showEgressOverlay).toBe(true);
      expect(overlayHidden.showEgressOverlay).toBe(false);
    });

    it("generates complete egress vector path object via calculateEgressVectorPath", () => {
      const path = calculateEgressVectorPath(BENCHMARK_FLOOR_PLAN);
      expect(path.totalDistanceM).toBe(18.4);
      expect(path.isCompliant).toBe(true);
      expect(path.retreatPoint.x).toBe(11.2);
      expect(path.exitPoint.x).toBe(1.2);
    });
  });

  describe("R1: 300x300mm Wet Service Core Shaft", () => {
    it("positions dedicated 300x300mm vertical MEP shaft at (11.6, 0.1) in NE ensuite", () => {
      const shaft = getWetCoreShaft(BENCHMARK_FLOOR_PLAN);
      expect(shaft.x).toBe(11.6);
      expect(shaft.y).toBe(0.1);
      expect(shaft.width).toBe(0.3);
      expect(shaft.height).toBe(0.3);
      expect(shaft.label).toContain("300×300mm");
      expect(shaft.subtitle).toContain("IS 1893 Zone IV / NBC Part 4");
    });

    it("includes shaft configuration inside the complete egress overlay result", () => {
      const overlay = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN);
      expect(overlay.shaft).toBeDefined();
      expect(overlay.shaft.width).toBe(0.3);
      expect(overlay.shaft.height).toBe(0.3);
      expect(overlay.shaft.x).toBe(11.6);
    });
  });

  describe("R2: Real-Time BOQ Schedule of Rates (SOR) Parametric Delta Chips", () => {
    it("provides Italian Marble → Kajaria PGVT / Kota substitution in catalog", () => {
      const subs = getSubstitutionsForPackage("flooring_stone", "india");
      expect(subs.length).toBeGreaterThanOrEqual(1);

      const flooringSub = subs.find((s) => s.id === "ve_flooring_kajaria_kota");
      expect(flooringSub).toBeDefined();
      expect(flooringSub?.baselineRate).toBe(840);
      expect(flooringSub?.proposedRate).toBe(127.5);
      expect(flooringSub?.leadTimeSavingsWeeks).toBe(14);
      expect(flooringSub?.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
    });

    it("computes exact financial savings of ₹8,55,000 / -30% on 1,200 sqft benchmark", () => {
      const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
      const delta = calculateVEDelta(
        flooringSub,
        VE_BENCHMARK.FLOOR_AREA_SQFT, // 1200
        VE_BENCHMARK.PROJECT_BUDGET_INR, // 2850000
      );

      expect(delta.savingsAmount).toBe(855000);
      expect(delta.savingsFormatted).toBe("-₹8,55,000");
      expect(delta.percentageSavings).toBe(-30);
      expect(delta.leadTimeSavingsWeeks).toBe(14);
      expect(delta.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
      expect(delta.compositeDeltaChipText).toBe("-₹8,55,000 / -30%");
    });

    it("converts catalog substitution to ValueEngineeringItem matching interface contract", () => {
      const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
      const item: ValueEngineeringItem = toValueEngineeringItem(
        flooringSub,
        1200,
        2850000,
      );

      expect(item.id).toBe("ve_flooring_kajaria_kota");
      expect(item.tradePackage).toBe("flooring_stone");
      expect(item.baselineRate).toBe(840);
      expect(item.proposedRate).toBe(127.5);
      expect(item.savingsFormatted).toBe("-₹8,55,000");
      expect(item.percentageSavings).toBe(-30);
      expect(item.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
      expect(item.description).toBeDefined();
    });

    it("includes diverse multi-trade package substitutions in catalog", () => {
      const allSubs = getAllSubstitutions("india");
      const tradePackages = new Set(allSubs.map((s) => s.tradePackageId));
      expect(tradePackages.has("flooring_stone")).toBe(true);
      expect(tradePackages.has("wall_finishes")).toBe(true);
      expect(tradePackages.has("door_suites")).toBe(true);
      expect(tradePackages.has("civil_masonry")).toBe(true);
    });
  });

  describe("R3: Automated NBC 2016 Canvas Geometry Linter", () => {
    it("flags doorway pinch-point when door clear width < 0.9m per NBC Part 4 Table 2", () => {
      const issues = lintPlanGeometry(BENCHMARK_FLOOR_PLAN);
      // d_bath has width 0.8m (< 0.9m)
      const bathPinch = issues.find((i) => i.elementId === "d_bath");
      expect(bathPinch).toBeDefined();
      expect(bathPinch?.type).toBe("door_pinch");
      expect(bathPinch?.actualWidthM).toBe(0.8);
      expect(bathPinch?.requiredWidthM).toBe(0.9);
      expect(bathPinch?.clause).toBe("NBC 2016 Part 4 Table 2");
    });

    it("passes compliant doorways (>= 0.9m) without flagging errors", () => {
      const compliantPlan: FloorPlan = {
        ...BENCHMARK_FLOOR_PLAN,
        doors: [
          { id: "d_entry", position: { x: 1.2, y: 0 }, width: 1.0, wallId: "w_ext_n" },
          { id: "d_bath", position: { x: 9.6, y: 0.9 }, width: 0.9, wallId: "w_bath_w" },
          { id: "d_bed", position: { x: 6.5, y: 4.8 }, width: 0.95, wallId: "w_bed_s" },
        ],
      };
      const issues = lintPlanGeometry(compliantPlan);
      expect(issues.length).toBe(0);
    });

    it("detects dead-end circulation pockets exceeding 6.0m per NBC Part 4 Cl. 4.6", () => {
      const deadEndCheckFail = verifyDeadEnd(7.5);
      const deadEndCheckPass = verifyDeadEnd(4.5);
      expect(deadEndCheckFail.pass).toBe(false);
      expect(deadEndCheckFail.clause).toContain("NBC 2016 Part 4 Cl. 4.6");
      expect(deadEndCheckPass.pass).toBe(true);
    });
  });

  describe("R4: Environmental & Acoustic Material Metadata Badges", () => {
    it("verifies timber finishes contain IS 287 moisture and BWP 710 backer tags", () => {
      const teak = MATERIALS_CATALOG.find((m) => m.id === "fl_wooden_teak");
      expect(teak).toBeDefined();
      expect(teak?.badges).toBeDefined();
      const hasIS287 = teak?.badges?.some((b) => b.includes("IS 287") && b.includes("BWP 710"));
      expect(hasIS287).toBe(true);
      expect(teak?.certifications?.moistureStandard).toContain("IS 287");
    });

    it("verifies acoustic partitions contain STC 56 Tested and Gyproc SoundStop tags", () => {
      const soundstop = MATERIALS_CATALOG.find((m) => m.id === "wl_gyproc_soundstop");
      expect(soundstop).toBeDefined();
      expect(soundstop?.badges).toBeDefined();
      const hasSTC56 = soundstop?.badges?.some((b) => b.includes("STC 56") && b.includes("Gyproc SoundStop"));
      expect(hasSTC56).toBe(true);
      expect(soundstop?.certifications?.acousticRating).toContain("STC 56");
    });

    it("verifies adhesive and tile finishes contain IS 15477 C2TE S1 certification", () => {
      const kajaria = MATERIALS_CATALOG.find((m) => m.id === "fl_vitrified_kajaria");
      expect(kajaria).toBeDefined();
      const hasC2TE = kajaria?.badges?.some((b) => b.includes("IS 15477 C2TE S1"));
      expect(hasC2TE).toBe(true);
      expect(kajaria?.certifications?.adhesiveStandard).toContain("IS 15477 C2TE S1");
    });

    it("verifies paints contain GreenGuard Gold Zero-VOC and Asian Paints Royale Health Shield tags", () => {
      const paint = MATERIALS_CATALOG.find((m) => m.id === "wl_asian_paints_royale");
      expect(paint).toBeDefined();
      const hasZeroVOC = paint?.badges?.some(
        (b) => b.includes("GreenGuard Gold") && b.includes("Asian Paints Royale Health Shield"),
      );
      expect(hasZeroVOC).toBe(true);
      expect(paint?.certifications?.airQuality).toContain("GreenGuard Gold");
    });

    it("verifies natural stones contain Rajasthan Sourced and lead time metadata", () => {
      const makrana = MATERIALS_CATALOG.find((m) => m.id === "fl_makrana_marble");
      expect(makrana).toBeDefined();
      const hasRajasthan = makrana?.badges?.some((b) => b.includes("Rajasthan Sourced") && b.includes("Lead Time"));
      expect(hasRajasthan).toBe(true);
      expect(makrana?.certifications?.leadTime).toContain("Rajasthan Sourced");
    });
  });
});

// ===========================================================================
// TIER 2: BOUNDARY & CORNER CASES
// ===========================================================================

describe("Tier 2: Boundary & Corner Cases", () => {
  describe("Door Clear Width Boundaries (0.90m threshold)", () => {
    it("boundary below: 0.899m fails internal exit width test", () => {
      const res = verifyEgressClearWidth(0.899, false);
      expect(res.pass).toBe(false);
      expect(res.limit).toBe(0.9);
      expect(res.clause).toContain("NBC 2016 Part 4 Table 2");
    });

    it("boundary exact: 0.900m passes internal exit width test", () => {
      const res = verifyEgressClearWidth(0.900, false);
      expect(res.pass).toBe(true);
      expect(res.limit).toBe(0.9);
    });

    it("boundary above: 0.901m passes internal exit width test", () => {
      const res = verifyEgressClearWidth(0.901, false);
      expect(res.pass).toBe(true);
    });
  });

  describe("Common Corridor Clear Width Boundaries (1.20m threshold)", () => {
    it("boundary below: 1.199m fails common corridor test", () => {
      const res = verifyEgressClearWidth(1.199, true);
      expect(res.pass).toBe(false);
      expect(res.limit).toBe(1.2);
    });

    it("boundary exact: 1.200m passes common corridor test", () => {
      const res = verifyEgressClearWidth(1.200, true);
      expect(res.pass).toBe(true);
    });

    it("boundary above: 1.201m passes common corridor test", () => {
      const res = verifyEgressClearWidth(1.201, true);
      expect(res.pass).toBe(true);
    });
  });

  describe("Dead-End Circulation Length Boundaries (6.0m threshold)", () => {
    it("boundary 0.0m (no dead end) passes", () => {
      expect(verifyDeadEnd(0.0).pass).toBe(true);
    });

    it("boundary 5.99m passes dead-end check", () => {
      expect(verifyDeadEnd(5.99).pass).toBe(true);
    });

    it("boundary exact 6.00m passes dead-end check", () => {
      const res = verifyDeadEnd(6.00);
      expect(res.pass).toBe(true);
      expect(res.limit).toBe(6.0);
    });

    it("boundary 6.01m fails dead-end check", () => {
      const res = verifyDeadEnd(6.01);
      expect(res.pass).toBe(false);
      expect(res.clause).toContain("NBC 2016 Part 4 Cl. 4.6");
    });
  });

  describe("Egress Travel Distance Boundaries (30.0m unsprinklered, 45.0m sprinklered)", () => {
    it("unsprinklered 29.99m passes travel distance check", () => {
      expect(verifyTravelDistance(29.99, false).pass).toBe(true);
    });

    it("unsprinklered exact 30.00m passes travel distance check", () => {
      const res = verifyTravelDistance(30.00, false);
      expect(res.pass).toBe(true);
      expect(res.limit).toBe(30);
    });

    it("unsprinklered 30.01m fails travel distance check", () => {
      const res = verifyTravelDistance(30.01, false);
      expect(res.pass).toBe(false);
      expect(res.clause).toContain("NBC 2016 Part 4 Cl. 4.5.1");
    });

    it("sprinklered 44.99m passes travel distance check", () => {
      expect(verifyTravelDistance(44.99, true).pass).toBe(true);
    });

    it("sprinklered exact 45.00m passes travel distance check", () => {
      const res = verifyTravelDistance(45.00, true);
      expect(res.pass).toBe(true);
      expect(res.limit).toBe(45);
    });

    it("sprinklered 45.01m fails travel distance check", () => {
      expect(verifyTravelDistance(45.01, true).pass).toBe(false);
    });
  });

  describe("Floor Area & Occupant Load Boundaries", () => {
    it("throws RangeError on zero area", () => {
      expect(() => calcOccupantLoad(0)).toThrow(RangeError);
    });

    it("throws RangeError on negative area", () => {
      expect(() => calcOccupantLoad(-25)).toThrow(RangeError);
    });

    it("computes minimal 0.1 m² area to 1 occupant", () => {
      expect(calcOccupantLoad(0.1)).toBe(1);
    });

    it("computes exact unit factor 9.3 m² to 1 occupant", () => {
      expect(calcOccupantLoad(9.3)).toBe(1);
    });

    it("rounds up strictly: 9.31 m² evaluates to 2 occupants", () => {
      expect(calcOccupantLoad(9.31)).toBe(2);
    });
  });

  describe("Required Egress Width Floor & Extreme Occupancy Scaling", () => {
    it("enforces 900mm floor for small occupant counts (1 to 236 occupants)", () => {
      expect(calcRequiredEgressWidthMm(1)).toBe(900);
      expect(calcRequiredEgressWidthMm(10)).toBe(900);
      expect(calcRequiredEgressWidthMm(236)).toBe(900); // 236 * 3.81 = 899.16mm <= 900mm
    });

    it("exceeds 900mm floor at 237 occupants (902.97mm)", () => {
      const width = calcRequiredEgressWidthMm(237);
      expect(width).toBeGreaterThan(900);
      expect(width).toBeCloseTo(903, 0);
    });

    it("scales linearly for extreme institutional occupancy (1,000 occupants)", () => {
      // 1000 * 3.81 = 3810 mm
      expect(calcRequiredEgressWidthMm(1000)).toBe(3810);
    });

    it("zero quantity in VE calculation produces zero savings without error", () => {
      const sub = VALUE_ENGINEERING_CATALOG[0];
      const delta = calculateVEDelta(sub, 0, 2850000);
      expect(delta.savingsAmount).toBe(0);
      expect(delta.percentageSavings).toBe(0);
    });
  });
});

// ===========================================================================
// TIER 3: CROSS-FEATURE INTERACTIONS
// ===========================================================================

describe("Tier 3: Cross-Feature Interactions", () => {
  describe("VE Substitution Linking to Material Catalog Specifications", () => {
    it("verifies that VE substitution materialId links to a valid catalog entry", () => {
      const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
      expect(flooringSub.materialId).toBe("fl_vitrified_kajaria");

      const catalogEntry = MATERIALS_CATALOG.find((m) => m.id === flooringSub.materialId);
      expect(catalogEntry).toBeDefined();
      expect(catalogEntry?.category).toBe("flooring");
      expect(catalogEntry?.brand).toBe("Kajaria");
      expect(catalogEntry?.specs["Size"]).toBe("1200mm x 600mm");
    });

    it("verifies that wall finish substitution links to Asian Paints Royale entry", () => {
      const wallSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_wall_royale_zerovoc")!;
      expect(wallSub.materialId).toBe("wl_asian_paints_royale");

      const catalogEntry = MATERIALS_CATALOG.find((m) => m.id === wallSub.materialId);
      expect(catalogEntry).toBeDefined();
      expect(catalogEntry?.category).toBe("walls");
      expect(catalogEntry?.brand).toBe("Asian Paints");
    });
  });

  describe("Commercial State Mutation & Live BOQ Recalculation", () => {
    it("recalculates project capex from baseline ₹28.5L down to ₹19.95L after flooring VE", () => {
      const baselineBudget = 2850000;
      const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
      const delta = calculateVEDelta(flooringSub, 1200, baselineBudget);

      const approvedState: VEApprovalState = {
        approvedIds: [flooringSub.id],
        totalSavingsINR: delta.savingsAmount,
        weeksReduced: delta.leadTimeSavingsWeeks,
      };

      const updatedTotalCapex = baselineBudget - approvedState.totalSavingsINR;
      expect(updatedTotalCapex).toBe(1995000); // 28,50,000 - 8,55,000 = 19,95,000

      const baselineCostPerSqFt = Math.round(baselineBudget / 1200);
      const updatedCostPerSqFt = Math.round(updatedTotalCapex / 1200);

      expect(baselineCostPerSqFt).toBe(2375);
      expect(updatedCostPerSqFt).toBe(1663);
      expect(approvedState.weeksReduced).toBe(14);
    });

    it("accumulates multiple VE approvals (flooring + wall finishes)", () => {
      const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
      const wallSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_wall_royale_zerovoc")!;

      const deltaFloor = calculateVEDelta(flooringSub, 1200, 2850000);
      const deltaWall = calculateVEDelta(wallSub, 1938, 2850000); // 1,938 sqft wall area

      const approvedState: VEApprovalState = {
        approvedIds: [flooringSub.id, wallSub.id],
        totalSavingsINR: deltaFloor.savingsAmount + deltaWall.savingsAmount,
        weeksReduced: Math.max(deltaFloor.leadTimeSavingsWeeks, deltaWall.leadTimeSavingsWeeks),
      };

      expect(approvedState.approvedIds.length).toBe(2);
      expect(approvedState.totalSavingsINR).toBeGreaterThan(855000);
      expect(approvedState.weeksReduced).toBe(14);
    });
  });

  describe("Combined Egress & Net-To-Gross (NTG) Optimization Tradeoff", () => {
    it("harmonizes 84% NTG squeeze with NBC 2016 statutory clearance constraints", () => {
      // Net-To-Gross calculation: Squeezing from 76% to 84% on 1,200 sqft flat
      const ntgProof = generateNTGProof({
        grossAreaSqFt: 1200,
        currentNtgPct: 76,
        targetNtgPct: 84,
      });

      expect(ntgProof.grossAreaSqFt).toBe(1200);
      expect(Math.round(ntgProof.currentUsableSqFt)).toBe(912);
      expect(Math.round(ntgProof.targetUsableSqFt)).toBe(1008);
      expect(Math.round(ntgProof.reclaimNeededSqFt)).toBe(96);
      expect(Math.round(ntgProof.circulationCutSqFt)).toBe(96);

      // Verify that after corridor reduction, egress proof remains fully compliant
      const egressProof = generateEgressProof({
        carpetAreaSqM: 111,
        corridorClearWidthM: 1.05, // Retained single-loaded corridor spine width
        travelDistanceM: 18.4,
        deadEndM: 0,
        sprinklered: false,
      });

      expect(egressProof.allPass).toBe(true);
      expect(egressProof.occupantLoad).toBe(12);
      expect(egressProof.corridorCheck.pass).toBe(true);
      expect(egressProof.travelDistanceCheck.pass).toBe(true);
    });
  });
});

// ===========================================================================
// TIER 4: REAL-WORLD INSTITUTIONAL SCENARIOS
// ===========================================================================

describe("Tier 4: Real-World Institutional Scenarios — MiroFish Benchmark", () => {
  it("executes complete MiroFish benchmark verification with exact mathematical assertions", () => {
    // 1. Spatial & Circulation Parameters
    const carpetAreaSqM = 111;
    const floorAreaSqFt = 1200;
    const baselineBudget = 2850000;

    // 2. Egress Overlay Geometry Check
    const egress = calculateEgressOverlay(BENCHMARK_FLOOR_PLAN);
    expect(egress.furthestPoint.x).toBe(11.2);
    expect(egress.furthestPoint.y).toBe(7.8);
    expect(egress.exitDoor.x).toBe(1.2);
    expect(egress.exitDoor.y).toBe(0.0);
    expect(egress.travelDistanceM).toBe(18.4);
    expect(egress.isCompliant).toBe(true);

    // 3. Wet Service Core Shaft Check
    expect(egress.shaft.x).toBe(11.6);
    expect(egress.shaft.y).toBe(0.1);
    expect(egress.shaft.width).toBe(0.3);
    expect(egress.shaft.height).toBe(0.3);
    expect(egress.shaft.label).toBe("MEP RISER 300×300mm");

    // 4. Commercial Value Engineering Swap Check
    const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;
    const delta = calculateVEDelta(flooringSub, floorAreaSqFt, baselineBudget);

    expect(delta.savingsAmount).toBe(855000);
    expect(delta.percentageSavings).toBe(-30);
    expect(delta.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
    expect(delta.compositeDeltaChipText).toBe("-₹8,55,000 / -30%");

    // 5. Statutory NBC Proof Generation
    const egressProof = generateEgressProof({
      carpetAreaSqM,
      corridorClearWidthM: 1.05,
      travelDistanceM: 18.4,
      deadEndM: 0,
      sprinklered: false,
    });

    expect(egressProof.allPass).toBe(true);
    expect(egressProof.occupantLoad).toBe(12);
    expect(egressProof.requiredEgressWidthMm).toBe(900);
    expect(egressProof.proofText).toContain("111.0 m² ÷ 9.3 m²/person = 12 persons");
    expect(egressProof.proofText).toContain("18.4 m");
    expect(egressProof.proofText).toContain("30 m");

    // 6. Capex Cut Proof Generation
    const capexProof = generateCapexProof({
      baselineCapex: baselineBudget,
      cutPercent: 30,
      currency: "₹",
      grossAreaSqFt: floorAreaSqFt,
    });

    expect(capexProof.baselineCapex).toBe(2850000);
    expect(capexProof.cutAmount).toBe(855000);
    expect(capexProof.targetCapex).toBe(1995000);
    expect(capexProof.costPerSqFtBaseline).toBe(2375);
    expect(capexProof.costPerSqFtTarget).toBe(1663);
    expect(capexProof.proofText).toContain("₹28.5L");
    expect(capexProof.proofText).toContain("₹8.6L");
  });
});
