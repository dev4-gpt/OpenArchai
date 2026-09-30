import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateStructuralGrid,
  generateStructuralBayGrid,
  checkSpanDeflection,
  checkCantileverDeflection,
  checkPlenumClash,
  GRID_MODULES,
  STRUCTURAL_DEFAULTS,
} from "./structural-grid-engine";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

describe("Structural Bay Grid & 3D MEP BIM Engine — IS 456 / IS 1893 / NBC Part 3", () => {
  test("GRID_MODULES contains standard modular spacings (6.0x6.0, 6.0x7.2, 7.2x7.2)", () => {
    assert.deepEqual(GRID_MODULES, ["6.0x6.0", "6.0x7.2", "7.2x7.2"]);
    assert.equal(STRUCTURAL_DEFAULTS.BEAM_DEPTH_MM, 450);
    assert.equal(STRUCTURAL_DEFAULTS.DEFAULT_FLOOR_TO_FLOOR_M, 3.40);
  });

  test("generates modular bay grids for all standard spacings", () => {
    for (const spacing of GRID_MODULES) {
      const grid = generateStructuralGrid(null, spacing);
      assert.equal(grid.spacing, spacing);
      assert.ok(grid.columns.length > 0);
      assert.ok(grid.gridLinesX.length >= 2);
      assert.ok(grid.gridLinesY.length >= 2);
      assert.ok(grid.beams.length > 0);
    }
  });

  test("differentiates 400×400mm interior vs 450×600mm corner/shear columns", () => {
    const grid = generateStructuralGrid(null, "6.0x7.2");
    const cornerCols = grid.columns.filter((c) => c.isCorner);
    const interiorCols = grid.columns.filter((c) => !c.isCorner);

    assert.ok(cornerCols.length >= 4);
    assert.ok(interiorCols.length > 0);

    for (const c of cornerCols) {
      assert.equal(c.widthM, 0.45);
      assert.equal(c.depthM, 0.60);
      assert.equal(c.type, "corner");
    }

    for (const c of interiorCols) {
      assert.equal(c.widthM, 0.40);
      assert.equal(c.depthM, 0.40);
      assert.equal(c.type, "interior");
    }
  });

  test("evaluates continuous beam span-to-depth ratio (L/d <= 26.0 per IS 456 Cl. 23.2.1)", () => {
    // 6.0m span, 0.45m effective depth: L/d = 13.3 <= 26.0
    const check6 = checkSpanDeflection(6.0, 0.45);
    assert.equal(check6.isCompliant, true);
    assert.equal(check6.spanToDepthRatio, 13.3);

    // 7.2m span, 0.45m effective depth: L/d = 16.0 <= 26.0
    const check72 = checkSpanDeflection(7.2, 0.45);
    assert.equal(check72.isCompliant, true);
    assert.equal(check72.spanToDepthRatio, 16.0);

    // 12.0m span, 0.45m effective depth: L/d = 26.7 > 26.0 -> non-compliant with severe deflection warning
    const check12 = checkSpanDeflection(12.0, 0.45);
    assert.equal(check12.isCompliant, false);
    assert.ok(check12.spanToDepthRatio > 26.0);
    assert.ok(check12.warning.includes("Severe Deflection Risk"));
  });

  test("evaluates simply supported beam span-to-depth ratio (L/d <= 20.0 per IS 456 Cl. 23.2.1)", () => {
    // 9.0m span, 0.45m depth: L/d = 20.0 <= 20.0 -> compliant
    const checkSimpleOk = checkSpanDeflection(9.0, 0.45, "simply_supported");
    assert.equal(checkSimpleOk.isCompliant, true);
    assert.equal(checkSimpleOk.spanToDepthRatio, 20.0);

    // 9.5m span, 0.45m depth: L/d = 21.1 > 20.0 -> non-compliant
    const checkSimpleFail = checkSpanDeflection(9.5, 0.45, "simply_supported");
    assert.equal(checkSimpleFail.isCompliant, false);
    assert.equal(checkSimpleFail.spanToDepthRatio, 21.1);
    assert.ok(checkSimpleFail.warning.includes("Severe deflection warning"));
  });

  test("enforces 7.50m deflection boundary: 7.50m passes, 7.51m triggers PT tendons warning", () => {
    const atBoundary = checkSpanDeflection(7.50, 0.45);
    assert.equal(atBoundary.isExcessive, false);
    assert.equal(atBoundary.isCompliant, true);

    const overBoundary = checkSpanDeflection(7.51, 0.45);
    assert.equal(overBoundary.isExcessive, true);
    assert.ok(overBoundary.warning.includes("PT Tendons Required"));
  });

  test("evaluates cantilever overhangs: <= 2.0m passes, > 2.0m triggers deflection warning (IS 456)", () => {
    const okCant = checkCantileverDeflection(1.8, 0.45);
    assert.equal(okCant.isExcessive, false);
    assert.equal(okCant.isCompliant, true);
    assert.ok(okCant.spanToDepthRatio <= 7.0);

    const boundaryCant = checkCantileverDeflection(2.0, 0.45);
    assert.equal(boundaryCant.isExcessive, false);
    assert.equal(boundaryCant.isCompliant, true);

    const excessiveCant = checkCantileverDeflection(2.5, 0.45);
    assert.equal(excessiveCant.isExcessive, true);
    assert.equal(excessiveCant.isCompliant, false);
    assert.ok(excessiveCant.warning.includes("Cantilever > 2.0m: Deflection Warning"));

    // Shallow beam: overhang 1.8m <= 2.0m, but depth 0.20m -> L/d = 9.0 > 7.0 (IS 456 violation)
    const shallowCant = checkCantileverDeflection(1.8, 0.20);
    assert.equal(shallowCant.isExcessive, true);
    assert.equal(shallowCant.isCompliant, false);
    assert.equal(shallowCant.spanToDepthRatio, 9.0);
    assert.ok(shallowCant.warning.includes("Cantilever deflection warning"));
  });

  test("validates 450mm false ceiling plenum void preserving >= 2.75m clear room height (NBC Part 3 Cl. 12.2)", () => {
    // 3.40m floor-to-floor: 3.40 - 0.20 slab - 0.45 plenum = 2.75m habitable room height
    const compliant = checkPlenumClash(3.40, 0.20, 0.45);
    assert.equal(compliant.isClashFree, true);
    assert.equal(compliant.habitableRoomHeightM, 2.75);
    assert.equal(compliant.headroomDeficitM, 0);

    // 3.00m floor-to-floor: 3.00 - 0.20 slab - 0.45 plenum = 2.35m -> deficit 0.40m
    const nonCompliant = checkPlenumClash(3.00, 0.20, 0.45);
    assert.equal(nonCompliant.isClashFree, false);
    assert.equal(nonCompliant.habitableRoomHeightM, 2.35);
    assert.equal(nonCompliant.headroomDeficitM, 0.40);
    assert.ok(nonCompliant.message.includes("Headroom conflict"));
  });

  test("generates concrete beam drop profiles (450mm deep) along bay grid lines", () => {
    const grid = generateStructuralGrid(null, "6.0x6.0");
    assert.ok(grid.beams.length > 0);
    for (const b of grid.beams) {
      assert.equal(b.depthM, 0.45);
      assert.equal(b.widthM, 0.30);
      assert.ok(b.lengthM > 0);
      assert.ok(b.axis === "X" || b.axis === "Y");
    }
  });

  test("detects unsupported wall spans > 7.5m in floor plan", () => {
    const plan: FloorPlan = {
      walls: [
        { id: "w_short", start: { x: 0, y: 0 }, end: { x: 6.0, y: 0 }, thickness: 0.15 },
        { id: "w_long", start: { x: 0, y: 3.0 }, end: { x: 8.5, y: 3.0 }, thickness: 0.15 },
      ],
      doors: [],
      windows: [],
      rooms: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };

    const grid = generateStructuralGrid(plan, "6.0x6.0");
    const longWallIssue = grid.unsupportedSpans.find((s) => s.id === "span_wall_w_long");
    assert.ok(longWallIssue);
    assert.equal(longWallIssue.type, "unsupported_span");
    assert.ok(longWallIssue.message.includes("Span > 7.5m: PT Tendons Required [IS 456 Cl. 23.2]"));
  });

  test("detects excessive cantilever overhangs > 2.0m beyond outermost column grid lines", () => {
    const plan: FloorPlan = {
      walls: [
        { id: "w_core", start: { x: 0, y: 0 }, end: { x: 6.0, y: 0 }, thickness: 0.15 },
        // Wall extending to x = 9.0m when grid span is 6.0m (overhang = 3.0m > 2.0m)
        { id: "w_cantilever", start: { x: 6.0, y: 0 }, end: { x: 9.0, y: 0 }, thickness: 0.15 },
      ],
      doors: [],
      windows: [],
      rooms: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };

    // Use a fixed spacing that doesn't expand past 6.0m
    const grid = generateStructuralGrid(plan, "6.0x6.0");
    // Should detect cantilever overhangs > 2.0m beyond outermost column grid line
    assert.ok(grid.unsupportedSpans.length > 0, "Should detect unsupported cantilever spans");
    const cantIssue = grid.unsupportedSpans.find(
      (s) => s.type === "cantilever_overhang" || s.type === "cantilever",
    );
    assert.ok(cantIssue, "Should detect cantilever overhang item");
    assert.equal(cantIssue.lengthM, 3.0);
    assert.ok(cantIssue.lengthM > 2.0);
    assert.ok(cantIssue.message.includes("Cantilever > 2.0m"));
  });

  test("handles empty or null plan gracefully with standard defaults", () => {
    const nullGrid = generateStructuralGrid(null);
    assert.ok(nullGrid.columns.length > 0);
    assert.equal(nullGrid.spacing, "6.0x7.2");
    assert.ok(nullGrid.hudText.includes("RC Columns"));

    const emptyGrid = generateStructuralGrid({
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    });
    assert.ok(emptyGrid.columns.length > 0);
  });

  test("generateStructuralBayGrid compatibility wrapper supports both object and array arguments", () => {
    const res1 = generateStructuralBayGrid(null, "6.0x6.0");
    assert.equal(res1.spacing, "6.0x6.0");

    const res2 = generateStructuralBayGrid(
      [{ id: "w1", start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 }],
      [],
      "6x7.2",
    );
    assert.equal(res2.spacing, "6.0x7.2");
  });
});
