import {
  classifyRoomZone,
  computeConvexHull,
  computePolygonArea,
  calculateFARMetrics,
  FAR_STATUTORY_CONSTANTS,
} from "./far-envelope-geometry";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

describe("far-envelope-geometry — Statutory FAR & Ground Coverage", () => {
  it("classifies rooms accurately into Carpet, Circulation, and Deductible Shaft", () => {
    expect(classifyRoomZone({ id: "1", label: "Master Bedroom", area: 18.5, vertices: [] })).toBe("NET_CARPET");
    expect(classifyRoomZone({ id: "2", label: "Living Room", area: 32.0, vertices: [] })).toBe("NET_CARPET");
    expect(classifyRoomZone({ id: "3", label: "Central Corridor", area: 12.0, vertices: [] })).toBe("SALEABLE_CIRCULATION");
    expect(classifyRoomZone({ id: "4", label: "Entry Lobby", area: 6.5, vertices: [] })).toBe("SALEABLE_CIRCULATION");
    expect(classifyRoomZone({ id: "5", label: "MEP Wet Riser Shaft", area: 0.8, vertices: [] })).toBe("DEDUCTIBLE_SHAFT");
    expect(classifyRoomZone({ id: "6", label: "Electrical Duct", area: 0.5, vertices: [] })).toBe("DEDUCTIBLE_SHAFT");
  });

  it("computes convex hull correctly for bounding points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 }, // interior point
    ];
    const hull = computeConvexHull(points);
    expect(hull.length).toBe(4);
    const area = computePolygonArea(hull);
    expect(area).toBe(100);
  });

  it("handles empty floor plan gracefully with fallback defaults", () => {
    const metrics = calculateFARMetrics(null);
    expect(metrics.groundCoveragePercent).toBe(60.0);
    expect(metrics.baseFAR).toBe(1.75);
    expect(metrics.maxFAR).toBe(2.64);
    expect(metrics.isEfficiencyCompliant).toBe(true);
    expect(metrics.isGroundCoverageCompliant).toBe(true);
    expect(metrics.statusBadge).toBe("INSTITUTIONAL GRADE");
  });

  it("computes genuine mathematical metrics for realistic multi-room plan", () => {
    const plan: FloorPlan = {
      walls: [
        { id: "w1", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2 },
        { id: "w2", start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, thickness: 0.2 },
        { id: "w3", start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.2 },
        { id: "w4", start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.2 },
      ],
      doors: [],
      windows: [],
      rooms: [
        {
          id: "r1",
          label: "Living & Dining",
          area: 52.0,
          vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }],
        },
        {
          id: "r2",
          label: "Bedroom Suite",
          area: 35.0,
          vertices: [{ x: 0, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 10 }, { x: 0, y: 10 }],
        },
        {
          id: "r3",
          label: "Circulation Hallway",
          area: 10.0,
          vertices: [{ x: 8, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 10 }, { x: 8, y: 10 }],
        },
        {
          id: "r4",
          label: "MEP Shaft Cutout",
          area: 0.5,
          vertices: [{ x: 9, y: 9 }, { x: 9.7, y: 9 }, { x: 9.7, y: 9.7 }, { x: 9, y: 9.7 }],
        },
      ],
      furniture: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };

    const metrics = calculateFARMetrics(plan);
    expect(metrics.carpetAreaSqM).toBe(87.0); // 52 + 35
    expect(metrics.circulationAreaSqM).toBe(10.0);
    expect(metrics.shaftAreaSqM).toBe(0.6); // 0.5 + 0.09 rounded to 0.6
    expect(metrics.carpetToSaleablePercent).toBeGreaterThanOrEqual(84.0);
    expect(metrics.isEfficiencyCompliant).toBe(true);
    expect(metrics.isGroundCoverageCompliant).toBe(true);
    expect(metrics.classifiedRooms.length).toBe(4);
    expect(metrics.classifiedRooms[0].colorHex).toBe("#10b981"); // Net Carpet
    expect(metrics.classifiedRooms[2].colorHex).toBe("#f59e0b"); // Circulation
    expect(metrics.classifiedRooms[3].colorHex).toBe("#3b82f6"); // Shaft
  });
});
