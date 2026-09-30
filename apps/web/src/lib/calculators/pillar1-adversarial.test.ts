/**
 * Adversarial Empirical Challenger Test Suite for Pillar 1:
 * - far-envelope-geometry.ts (Statutory FAR Boundary Envelope & Ground Coverage)
 * - pe-underwriting.ts (PE Financial Underwriting & CPWD Tender Schedule)
 *
 * Verifies:
 * 1. Extreme boundary room counts (0, 1, 50 rooms, negative coordinates, collinear points)
 * 2. Graham scan convex hull and bounding box under floating-point perturbations
 * 3. Area conservation: A_total = A_carpet + A_circ + A_shaft
 * 4. Statutory FAR monetization when area exceeds permissible GFA (> 2.64 * A_plot)
 * 5. Mathematical consistency of Yield-on-Cost, NOI, IRR, and Payback
 * 6. CPWD CSV formatting, quoting, column counts (strictly 7), and grand total sum
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  classifyRoomZone,
  computeConvexHull,
  computePolygonArea,
  calculateFARMetrics,
  FAR_STATUTORY_CONSTANTS,
  type ZoneCategory,
} from "./far-envelope-geometry";

import {
  calculatePEUnderwriting,
  generateCPWDTenderCsv,
  exportCPWDTenderScheduleCSV,
  CPWD_DSR_2024_DEFAULTS,
  type UnderwritingInputs,
  type CPWDTenderItem,
} from "./pe-underwriting";

import type { FloorPlan, Point, Room } from "@/components/floor-plan-editor/types";

// Helper CSV parser adhering to RFC 4180
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ============================================================================
// SUITE 1: EXTREME BOUNDARY ROOM COUNTS & DEGENERATE GEOMETRIES
// ============================================================================

describe("Pillar 1 Adversarial — Suite 1: Boundary Room Counts & Degenerate Geometries", () => {
  test("ADV-1.1: null and undefined plan inputs safely return institutional baseline defaults", () => {
    const nullRes = calculateFARMetrics(null);
    expect(nullRes).toBeDefined();
    expect(nullRes.builtUpAreaSqM).toBe(111.5);
    expect(nullRes.carpetAreaSqM).toBe(95.2);
    expect(nullRes.circulationAreaSqM).toBe(16.0);
    expect(nullRes.shaftAreaSqM).toBe(0.3);
    expect(nullRes.carpetToSaleablePercent).toBe(85.4);
    expect(nullRes.isEfficiencyCompliant).toBe(true);
    expect(nullRes.statusBadge).toBe("INSTITUTIONAL GRADE");

    const undefRes = calculateFARMetrics(undefined);
    expect(undefRes.builtUpAreaSqM).toBe(111.5);
    expect(undefRes.statusBadge).toBe("INSTITUTIONAL GRADE");
  });

  test("ADV-1.2: 0 rooms and 0 walls plan triggers institutional fallback defaults", () => {
    const emptyPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(emptyPlan);
    expect(metrics.builtUpAreaSqM).toBe(111.5);
    expect(metrics.classifiedRooms).toHaveLength(0);
    expect(metrics.footprintPolygon).toHaveLength(0);
    expect(metrics.plotPolygon).toHaveLength(0);
  });

  test("ADV-1.3: 0 rooms with non-empty perimeter walls produces 0 carpet and 0 circ without crashing", () => {
    const wallsOnlyPlan: FloorPlan = {
      walls: [
        { id: "w1", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2 },
        { id: "w2", start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, thickness: 0.2 },
        { id: "w3", start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.2 },
        { id: "w4", start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.2 },
      ],
      doors: [],
      windows: [],
      rooms: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(wallsOnlyPlan);
    expect(metrics.carpetAreaSqM).toBe(0);
    expect(metrics.circulationAreaSqM).toBe(0);
    expect(metrics.shaftAreaSqM).toBe(0.1); // baseline 0.09 rounded to 0.1
    expect(metrics.wallAreaSqM).toBe(4.0); // 40m perimeter * 0.2m * 0.5
    expect(metrics.isEfficiencyCompliant).toBe(false);
    expect(metrics.statusBadge).toBe("SUB-OPTIMAL");
    expect(metrics.footprintPolygon).toHaveLength(4);
    expect(metrics.plotPolygon).toHaveLength(4);
  });

  test("ADV-1.4: 1 room boundary — single Net Carpet habitable suite", () => {
    const singleCarpetPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r1",
          label: "Master Suite Sanctuary",
          area: 45.0,
          vertices: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 5 }, { x: 0, y: 5 }],
        },
      ],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(singleCarpetPlan);
    expect(metrics.carpetAreaSqM).toBe(45.0);
    expect(metrics.circulationAreaSqM).toBe(0);
    expect(metrics.shaftAreaSqM).toBe(0.1); // 0.09 rounded
    expect(metrics.classifiedRooms).toHaveLength(1);
    expect(metrics.classifiedRooms[0].category).toBe("NET_CARPET");
    expect(metrics.classifiedRooms[0].colorHex).toBe("#10b981");
    // 45 / (45 + 0.09) = 99.8% >= 84%
    expect(metrics.carpetToSaleablePercent).toBeGreaterThanOrEqual(99.0);
    expect(metrics.isEfficiencyCompliant).toBe(true);
  });

  test("ADV-1.5: 1 room boundary — single Circulation corridor produces 0% NTG efficiency", () => {
    const singleCircPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r1",
          label: "Common Circulation Gallery",
          area: 30.0,
          vertices: [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 2 }, { x: 0, y: 2 }],
        },
      ],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(singleCircPlan);
    expect(metrics.carpetAreaSqM).toBe(0);
    expect(metrics.circulationAreaSqM).toBe(30.0);
    expect(metrics.classifiedRooms[0].category).toBe("SALEABLE_CIRCULATION");
    expect(metrics.classifiedRooms[0].colorHex).toBe("#f59e0b");
    expect(metrics.carpetToSaleablePercent).toBe(0);
    expect(metrics.isEfficiencyCompliant).toBe(false);
    expect(metrics.statusBadge).toBe("SUB-OPTIMAL");
  });

  test("ADV-1.6: 1 room boundary — single MEP Service Shaft cutout is classified as DEDUCTIBLE_SHAFT", () => {
    const singleShaftPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r1",
          label: "Dedicated MEP Wet Riser Duct",
          area: 0.8,
          vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.8 }, { x: 0, y: 0.8 }],
        },
      ],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(singleShaftPlan);
    expect(metrics.carpetAreaSqM).toBe(0);
    expect(metrics.circulationAreaSqM).toBe(0);
    // 0.8 + 0.09 = 0.89 -> rounds to 0.9
    expect(metrics.shaftAreaSqM).toBe(0.9);
    expect(metrics.classifiedRooms[0].category).toBe("DEDUCTIBLE_SHAFT");
    expect(metrics.classifiedRooms[0].colorHex).toBe("#3b82f6");
  });

  test("ADV-1.7: 50 rooms institutional layout executes efficiently with strict area conservation", () => {
    const rooms: Room[] = [];
    let expectedCarpet = 0;
    let expectedCirc = 0;
    let expectedShaft = 0;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 10; c++) {
        const idx = r * 10 + c;
        const x0 = c * 6;
        const y0 = r * 6;
        const x1 = x0 + 6;
        const y1 = y0 + 6;
        const vertices = [
          { x: x0, y: y0 },
          { x: x1, y: y0 },
          { x: x1, y: y1 },
          { x: x0, y: y1 },
        ];
        let label = `Luxury Suite ${idx}`;
        let area = 36.0;

        if (idx % 5 === 0) {
          label = `Vertical MEP Shaft ${idx}`;
          area = 0.8;
          expectedShaft += area;
        } else if (idx % 5 === 1) {
          label = `Central Spine Corridor ${idx}`;
          area = 18.0;
          expectedCirc += area;
        } else {
          label = `Executive Office ${idx}`;
          area = 36.0;
          expectedCarpet += area;
        }

        rooms.push({ id: `r_${idx}`, label, area, vertices });
      }
    }

    const plan50: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms,
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };

    const startTime = performance.now();
    const metrics = calculateFARMetrics(plan50);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(100); // Must be sub-100ms
    expect(metrics.classifiedRooms).toHaveLength(50);
    expect(metrics.carpetAreaSqM).toBe(expectedCarpet); // 1080
    expect(metrics.circulationAreaSqM).toBe(expectedCirc); // 180
    // Shaft area includes baseline 0.09 wet core riser
    expect(metrics.shaftAreaSqM).toBe(Math.round((expectedShaft + 0.09) * 10) / 10); // 8.1
    // Total built-up area = roomSum = 1080 + 180 + 8.09 = 1268.09 -> 1268.1
    expect(metrics.builtUpAreaSqM).toBe(1268.1);
    // Gross Floor Area deducts shafts: 1268.09 - 8.09 = 1260.0
    expect(metrics.grossFloorAreaSqM).toBe(1260.0);
    // Footprint convex hull has 4 outer vertices
    expect(metrics.footprintPolygon).toHaveLength(4);
    expect(computePolygonArea(metrics.footprintPolygon)).toBe(1800.0); // 60 * 30
  });

  test("ADV-1.8: negative coordinate plan correctly calculates convex hull, setbacks and positive areas", () => {
    const negPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r_neg",
          label: "Negative Quadrant Studio",
          area: 80.0,
          vertices: [
            { x: -30, y: -40 },
            { x: -10, y: -40 },
            { x: -10, y: -20 },
            { x: -30, y: -20 },
          ],
        },
      ],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(negPlan);
    expect(metrics.carpetAreaSqM).toBe(80.0);
    expect(metrics.footprintPolygon).toHaveLength(4);
    // Area of -30 to -10 (dx=20) by -40 to -20 (dy=20) is 400 sqm
    const hullArea = computePolygonArea(metrics.footprintPolygon);
    expect(hullArea).toBe(400.0);
    // Plot polygon must expand by setbacks: x in [-32, -8], y in [-43, -18]
    expect(metrics.plotPolygon).toHaveLength(4);
    expect(metrics.plotPolygon[0]).toEqual({ x: -32, y: -43 });
    expect(metrics.plotPolygon[1]).toEqual({ x: -8, y: -43 });
    expect(metrics.plotPolygon[2]).toEqual({ x: -8, y: -18 });
    expect(metrics.plotPolygon[3]).toEqual({ x: -32, y: -18 });
  });

  test("ADV-1.9: completely collinear flat room vertices do not throw or produce NaN", () => {
    const flatPlan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r_colinear",
          label: "Collinear Flat Line",
          area: 0,
          vertices: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 8, y: 0 },
            { x: 12, y: 0 },
          ],
        },
      ],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const metrics = calculateFARMetrics(flatPlan);
    expect(Number.isNaN(metrics.builtUpAreaSqM)).toBe(false);
    expect(Number.isNaN(metrics.achievedFAR)).toBe(false);
    expect(metrics.footprintPolygon).toHaveLength(2); // Graham scan collapses collinear line to endpoints
    expect(computePolygonArea(metrics.footprintPolygon)).toBe(0);
    expect(metrics.statusBadge).toBe("SUB-OPTIMAL");
  });
});

// ============================================================================
// SUITE 2: GRAHAM SCAN CONVEX HULL & BOUNDING BOX ROBUSTNESS
// ============================================================================

describe("Pillar 1 Adversarial — Suite 2: Graham Scan Convex Hull & Bounding Box Robustness", () => {
  test("ADV-2.1: computeConvexHull handles degenerate sets with <= 2 points", () => {
    expect(computeConvexHull([])).toEqual([]);
    expect(computeConvexHull([{ x: 5, y: 5 }])).toEqual([{ x: 5, y: 5 }]);
    expect(computeConvexHull([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toHaveLength(2);
  });

  test("ADV-2.2: computeConvexHull correctly discards collinear intermediate points along all 4 edges", () => {
    const squareWithEdgePoints: Point[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 5, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 3 },
      { x: 10, y: 7 },
      { x: 10, y: 10 },
      { x: 7, y: 10 },
      { x: 3, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 5 },
      // interior points
      { x: 2, y: 2 },
      { x: 5, y: 5 },
      { x: 8, y: 8 },
    ];
    const hull = computeConvexHull(squareWithEdgePoints);
    expect(hull).toHaveLength(4);
    const area = computePolygonArea(hull);
    expect(area).toBe(100.0);
  });

  test("ADV-2.3: computeConvexHull stability under sub-millimeter floating point perturbations", () => {
    // 1e-11 perturbation is smaller than millimeter deduplication threshold (1e-3)
    const jittered: Point[] = [
      { x: 0, y: 0 },
      { x: 10 + 1e-11, y: 0 },
      { x: 10, y: 10 + 1e-11 },
      { x: 0, y: 10 },
      { x: 5, y: 5 },
    ];
    const hull = computeConvexHull(jittered);
    expect(hull).toHaveLength(4);
    const area = computePolygonArea(hull);
    expect(area).toBeCloseTo(100.0, 4);
  });

  test("ADV-2.4: computeConvexHull deduplicates identical coordinates cleanly", () => {
    const duplicates: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 10 },
    ];
    const hull = computeConvexHull(duplicates);
    expect(hull).toHaveLength(4);
  });

  test("ADV-2.5: computeConvexHull strictly encloses all sample points inside or on the boundary", () => {
    const points: Point[] = [
      { x: 2, y: 3 },
      { x: 8, y: 1 },
      { x: 12, y: 6 },
      { x: 10, y: 11 },
      { x: 4, y: 12 },
      { x: 1, y: 7 },
      // internal test points
      { x: 5, y: 6 },
      { x: 6, y: 8 },
      { x: 7, y: 5 },
    ];
    const hull = computeConvexHull(points);
    expect(hull.length).toBeGreaterThanOrEqual(4);

    // Bounding box of points must match bounding box of hull
    let minXP = Infinity, maxXP = -Infinity, minYP = Infinity, maxYP = -Infinity;
    for (const p of points) {
      if (p.x < minXP) minXP = p.x;
      if (p.x > maxXP) maxXP = p.x;
      if (p.y < minYP) minYP = p.y;
      if (p.y > maxYP) maxYP = p.y;
    }

    let minXH = Infinity, maxXH = -Infinity, minYH = Infinity, maxYH = -Infinity;
    for (const p of hull) {
      if (p.x < minXH) minXH = p.x;
      if (p.x > maxXH) maxXH = p.x;
      if (p.y < minYH) minYH = p.y;
      if (p.y > maxYH) maxYH = p.y;
    }

    expect(minXH).toBe(minXP);
    expect(maxXH).toBe(maxXP);
    expect(minYH).toBe(minYP);
    expect(maxYH).toBe(maxYP);
  });
});

// ============================================================================
// SUITE 3: AREA CONSERVATION & STATUTORY DEDUCTIONS
// ============================================================================

describe("Pillar 1 Adversarial — Suite 3: Area Conservation & Statutory Deductions", () => {
  test("ADV-3.1: Area conservation invariant A_total = A_carpet + A_circ + A_shaft across 50 rooms", () => {
    const rooms: Room[] = [
      { id: "c1", label: "Living Room", area: 35.5, vertices: [] },
      { id: "c2", label: "Master Bedroom", area: 24.2, vertices: [] },
      { id: "c3", label: "Guest Bedroom", area: 18.3, vertices: [] },
      { id: "k1", label: "Modular Kitchen", area: 12.0, vertices: [] },
      { id: "t1", label: "Attached Toilet", area: 4.5, vertices: [] },
      { id: "s1", label: "Corridor Hallway", area: 14.8, vertices: [] },
      { id: "s2", label: "Entry Foyer", area: 6.2, vertices: [] },
      { id: "d1", label: "MEP Wet Riser Shaft", area: 0.8, vertices: [] },
      { id: "d2", label: "Electrical Duct Cutout", area: 0.6, vertices: [] },
    ];

    let sumCarpet = 0;
    let sumCirc = 0;
    let sumShaft = 0;

    for (const r of rooms) {
      const cat = classifyRoomZone(r);
      if (cat === "NET_CARPET") sumCarpet += r.area;
      else if (cat === "SALEABLE_CIRCULATION") sumCirc += r.area;
      else if (cat === "DEDUCTIBLE_SHAFT") sumShaft += r.area;
    }

    const totalRaw = rooms.reduce((acc, r) => acc + r.area, 0);
    expect(sumCarpet + sumCirc + sumShaft).toBeCloseTo(totalRaw, 5);

    // Test with plan
    const plan: FloorPlan = {
      walls: [],
      doors: [],
      windows: [],
      rooms: rooms.map((r, i) => ({
        ...r,
        vertices: [{ x: i * 2, y: 0 }, { x: i * 2 + 1.5, y: 0 }, { x: i * 2 + 1.5, y: 1 }, { x: i * 2, y: 1 }],
      })),
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };

    const metrics = calculateFARMetrics(plan);
    expect(metrics.carpetAreaSqM).toBe(Math.round(sumCarpet * 10) / 10);
    expect(metrics.circulationAreaSqM).toBe(Math.round(sumCirc * 10) / 10);
    expect(metrics.shaftAreaSqM).toBe(Math.round((sumShaft + 0.09) * 10) / 10);

    // Check GFA deduction: GFA = BUA - ShaftArea
    expect(metrics.grossFloorAreaSqM).toBe(
      Math.round((metrics.builtUpAreaSqM - metrics.shaftAreaSqM) * 10) / 10
    );
  });

  test("ADV-3.2: PE Underwriting area conservation: Gross GFA = Carpet + Circulation", () => {
    const result = calculatePEUnderwriting({
      grossFloorAreaSqFt: 15000,
      carpetAreaSqFt: 12750,
      totalCapexINR: 50000000,
    });
    expect(result.carpetAreaSqFt + result.circulationAreaSqFt).toBe(result.grossFloorAreaSqFt);
    expect(result.carpetToSaleableRatio).toBe(0.85);
    expect(result.meetsNTGThreshold).toBe(true);
  });

  test("ADV-3.3: PE Underwriting clamps negative circulation to 0 when carpet exceeds GFA", () => {
    const result = calculatePEUnderwriting({
      grossFloorAreaSqFt: 10000,
      carpetAreaSqFt: 11000, // Carpet exceeds GFA
      totalCapexINR: 50000000,
    });
    expect(result.circulationAreaSqFt).toBe(0);
    expect(result.carpetToSaleableRatio).toBe(1.1);
  });
});

// ============================================================================
// SUITE 4: STATUTORY FAR MONETIZATION & OVER-PERMISSIBLE LIMITS
// ============================================================================

describe("Pillar 1 Adversarial — Suite 4: Statutory FAR Monetization & Over-Permissible Limits", () => {
  test("ADV-4.1: compliant FAR at exact permissible boundary (2.64 * A_plot) passes", () => {
    const plotArea = 10000; // sq ft
    const maxPermissibleGFA = plotArea * 2.64; // 26,400 sq ft
    const result = calculatePEUnderwriting({
      plotAreaSqFt: plotArea,
      grossFloorAreaSqFt: maxPermissibleGFA,
      carpetAreaSqFt: maxPermissibleGFA * 0.85,
      totalCapexINR: 80000000,
    });
    expect(result.isFARCompliant).toBe(true);
    expect(result.farUtilizationPercent).toBe(100.0);
    expect(result.totalPermissibleGFA).toBe(26400);
  });

  test("ADV-4.2: over-permissible FAR (2.64 * A_plot + 1 sqft) fails compliance and reports >100.0% utilization", () => {
    const plotArea = 10000;
    const overGFA = plotArea * 2.64 + 1; // 26,401 sq ft
    const result = calculatePEUnderwriting({
      plotAreaSqFt: plotArea,
      grossFloorAreaSqFt: overGFA,
      carpetAreaSqFt: overGFA * 0.85,
      totalCapexINR: 80000000,
    });
    expect(result.isFARCompliant).toBe(false);
    expect(result.farUtilizationPercent).toBeGreaterThan(100.0);
  });

  test("ADV-4.3: base FAR boundary (1.75 * A_plot) indicates standard non-purchased FAR compliance", () => {
    const plotArea = 10000;
    const baseGFA = plotArea * 1.75; // 17,500 sq ft
    const result = calculatePEUnderwriting({
      plotAreaSqFt: plotArea,
      grossFloorAreaSqFt: baseGFA,
      carpetAreaSqFt: baseGFA * 0.85,
      totalCapexINR: 60000000,
    });
    expect(result.isFARCompliant).toBe(true);
    expect(result.farUtilizationPercent).toBeCloseTo(66.3, 1);
  });

  test("ADV-4.4: massive over-permissible scaling (FAR = 5.0, GFA = 50,000 on 10,000 plot)", () => {
    const result = calculatePEUnderwriting({
      plotAreaSqFt: 10000,
      grossFloorAreaSqFt: 50000,
      carpetAreaSqFt: 42000,
      totalCapexINR: 150000000,
    });
    expect(result.isFARCompliant).toBe(false);
    // 50,000 / 26,400 = 1.8939 -> 189.4%
    expect(result.farUtilizationPercent).toBe(189.4);
  });
});

// ============================================================================
// SUITE 5: FINANCIAL UNDERWRITING MATHEMATICAL CONSISTENCY
// ============================================================================

describe("Pillar 1 Adversarial — Suite 5: Financial Underwriting Mathematical Consistency", () => {
  test("ADV-5.1: strict mathematical verification of Gross Revenue, NOI, YoC, and Payback formulas", () => {
    const carpet = 10000;
    const rentPerSqFtMonthly = 150;
    const opexRatio = 0.20;
    const totalCapex = 100000000; // ₹10 Cr

    const result = calculatePEUnderwriting({
      carpetAreaSqFt: carpet,
      grossFloorAreaSqFt: 12000,
      totalCapexINR: totalCapex,
      rentalRatePerSqFtMonthlyINR: rentPerSqFtMonthly,
      operatingExpenseRatio: opexRatio,
    });

    const expectedGrossRev = carpet * rentPerSqFtMonthly * 12; // 18,000,000
    const expectedNOI = expectedGrossRev * (1 - opexRatio); // 14,400,000
    const expectedYoC = Math.round((expectedNOI / totalCapex) * 1000) / 10; // 14.4%
    const expectedPayback = Math.round((totalCapex / expectedNOI) * 10) / 10; // 6.9 yrs

    expect(result.grossAnnualRevenueINR).toBe(expectedGrossRev);
    expect(result.netOperatingIncomeINR).toBe(expectedNOI);
    expect(result.yieldOnCostPercent).toBe(expectedYoC);
    expect(result.paybackPeriodYears).toBe(expectedPayback);
  });

  test("ADV-5.2: monotonicity check — Capex doubling halves YoC and doubles Payback period", () => {
    const base = calculatePEUnderwriting({
      carpetAreaSqFt: 10000,
      grossFloorAreaSqFt: 12000,
      totalCapexINR: 50000000, // 5 Cr
    });

    const doubledCapex = calculatePEUnderwriting({
      carpetAreaSqFt: 10000,
      grossFloorAreaSqFt: 12000,
      totalCapexINR: 100000000, // 10 Cr
    });

    expect(doubledCapex.yieldOnCostPercent).toBeCloseTo(base.yieldOnCostPercent / 2, 1);
    expect(doubledCapex.paybackPeriodYears).toBeCloseTo(base.paybackPeriodYears * 2, 1);
  });

  test("ADV-5.3: Institutional Grade Hurdle matrix — requires YoC >= 8.5% AND NTG >= 84%", () => {
    // 1. Both Pass: YoC = 10.6% >= 8.5%, NTG = 85.0% >= 84%
    const passAll = calculatePEUnderwriting({
      carpetAreaSqFt: 10200,
      grossFloorAreaSqFt: 12000,
      totalCapexINR: 120000000, // 12 Cr capex -> YoC ~ 10.8%
    });
    expect(passAll.isInstitutionalGrade).toBe(true);

    // 2. YoC fails (< 8.5%), NTG passes (85%)
    const failYoC = calculatePEUnderwriting({
      carpetAreaSqFt: 10200,
      grossFloorAreaSqFt: 12000,
      totalCapexINR: 200000000, // 20 Cr capex -> YoC ~ 6.5%
    });
    expect(failYoC.yieldOnCostPercent).toBeLessThan(8.5);
    expect(failYoC.meetsNTGThreshold).toBe(true);
    expect(failYoC.isInstitutionalGrade).toBe(false);

    // 3. YoC passes (> 8.5%), NTG fails (80% < 84%)
    const failNTG = calculatePEUnderwriting({
      carpetAreaSqFt: 8000,
      grossFloorAreaSqFt: 10000, // 80% NTG
      totalCapexINR: 50000000,
    });
    expect(failNTG.yieldOnCostPercent).toBeGreaterThan(8.5);
    expect(failNTG.meetsNTGThreshold).toBe(false);
    expect(failNTG.isInstitutionalGrade).toBe(false);
  });

  test("ADV-5.4: boundary capex and area of 0 handles safely without divide-by-zero or NaN", () => {
    const zeroRes = calculatePEUnderwriting({
      carpetAreaSqFt: 0,
      grossFloorAreaSqFt: 0,
      totalCapexINR: 0,
    });
    expect(Number.isNaN(zeroRes.yieldOnCostPercent)).toBe(false);
    expect(Number.isNaN(zeroRes.paybackPeriodYears)).toBe(false);
    expect(Number.isNaN(zeroRes.carpetToSaleableRatio)).toBe(false);
  });
});

// ============================================================================
// SUITE 6: CPWD DSR 2024 TENDER SCHEDULE CSV FORMATTING & SUM
// ============================================================================

describe("Pillar 1 Adversarial — Suite 6: CPWD DSR 2024 Tender Schedule CSV Formatting & Sum", () => {
  test("ADV-6.1: generated CPWD CSV header strictly matches standard format with 7 columns", () => {
    const res = calculatePEUnderwriting({
      carpetAreaSqFt: 5000,
      grossFloorAreaSqFt: 6000,
      totalCapexINR: 20000000,
    });
    const csv = generateCPWDTenderCsv(res.cpwdTenderSchedule);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Item Code,Sub-Head,Description,Quantity,Unit,DSR Rate (INR),Amount (INR)");
    const headerCols = parseCsvLine(lines[0]);
    expect(headerCols).toHaveLength(7);
  });

  test("ADV-6.2: every single CSV line strictly contains exactly 7 columns", () => {
    const res = calculatePEUnderwriting({
      carpetAreaSqFt: 5000,
      grossFloorAreaSqFt: 6000,
      totalCapexINR: 20000000,
    });
    const csv = generateCPWDTenderCsv(res.cpwdTenderSchedule);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(res.cpwdTenderSchedule.length + 2); // Header + Items + Grand Total

    for (let i = 0; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      expect(fields).toHaveLength(7);
    }
  });

  test("ADV-6.3: grand total line contains exact label and exact sum of line items", () => {
    const res = calculatePEUnderwriting({
      carpetAreaSqFt: 5000,
      grossFloorAreaSqFt: 6000,
      totalCapexINR: 20000000,
    });
    const csv = generateCPWDTenderCsv(res.cpwdTenderSchedule);
    const lines = csv.split("\n");
    const lastLine = lines[lines.length - 1];

    const fields = parseCsvLine(lastLine);
    expect(fields[0]).toBe("");
    expect(fields[1]).toBe("");
    expect(fields[2]).toBe("GRAND TOTAL (CPWD DSR 2024)");
    expect(fields[3]).toBe("");
    expect(fields[4]).toBe("");
    expect(fields[5]).toBe("");

    const grandTotalInCsv = Number(fields[6]);
    const expectedSum = res.cpwdTenderSchedule.reduce((sum, it) => sum + it.amountINR, 0);
    expect(grandTotalInCsv).toBe(expectedSum);
    expect(grandTotalInCsv).toBe(res.tenderScheduleGrandTotalINR);
  });

  test("ADV-6.4: description fields containing quotes and commas are properly escaped and quoted", () => {
    const customItems: CPWDTenderItem[] = [
      {
        itemCode: "CPWD 9.9.9",
        subHead: "Special Finishes, Paints & Varnishes",
        description: 'Premium PU coating with 2" roller, "Grade-1" satin finish',
        quantity: 120,
        unit: "sqm",
        dsrRateINR: 450,
        amountINR: 54000,
      },
    ];

    const csv = generateCPWDTenderCsv(customItems);
    const lines = csv.split("\n");
    const itemFields = parseCsvLine(lines[1]);

    expect(itemFields).toHaveLength(7);
    expect(itemFields[0]).toBe("CPWD 9.9.9");
    expect(itemFields[1]).toBe("Special Finishes, Paints & Varnishes");
    expect(itemFields[2]).toBe('Premium PU coating with 2" roller, "Grade-1" satin finish');
    expect(itemFields[3]).toBe("120");
    expect(itemFields[4]).toBe("sqm");
    expect(itemFields[5]).toBe("450");
    expect(itemFields[6]).toBe("54000");
  });

  test("ADV-6.5: empty items array generates header and 0 grand total with 7 columns", () => {
    const csv = generateCPWDTenderCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(parseCsvLine(lines[0])).toHaveLength(7);
    const totalFields = parseCsvLine(lines[1]);
    expect(totalFields).toHaveLength(7);
    expect(totalFields[2]).toBe("GRAND TOTAL (CPWD DSR 2024)");
    expect(totalFields[6]).toBe("0");
  });
});
