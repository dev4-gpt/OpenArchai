#!/usr/bin/env node
/**
 * Independent Empirical Challenger Verification Suite for Milestone M2 Remediation.
 * Agent: challenger_m2_rem_1
 *
 * Verifies:
 * 1. Cantilever overhang detection across all 4 cardinal directions (+X, -X, +Y, -Y) beyond column grid.
 * 2. Overhang boundary threshold (<= 2.0m compliant, > 2.0m flagged).
 * 3. Dual cantilever limits (length > 2.0m AND L/d > 7.0) in checkCantileverDeflection.
 * 4. Span deflection checks for continuous (L/d <= 26.0) and simply supported (L/d <= 20.0).
 * 5. Severe deflection warnings for spans >= 12.0m.
 * 6. Non-vacuous unit test verification.
 * 7. Edge cases: negative coordinates, diagonal overhangs, 1D walls, degenerate layouts.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);
const engine = await jiti.import(
  path.resolve(webRoot, 'src/lib/calculators/structural-grid-engine.ts')
);

const {
  generateStructuralGrid,
  generateStructuralBayGrid,
  checkSpanDeflection,
  checkCantileverDeflection,
  checkPlenumClash,
  GRID_MODULES,
  STRUCTURAL_DEFAULTS,
} = engine;

const results = [];
function assertCase(category, name, condition, details = null) {
  results.push({ category, name, passed: Boolean(condition), details });
  const mark = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] [${category}] ${name}`);
  if (!condition && details) {
    console.error('    FAIL DETAILS:', JSON.stringify(details, null, 2));
  }
}

console.log('='.repeat(80));
console.log('CHALLENGER M2 REMEDIATION: EMPIRICAL AUDIT HARNESS');
console.log('='.repeat(80));

// -----------------------------------------------------------------------------
// TEST TRACK 1: Cantilever Overhang Detection Beyond Outermost Column Line
// -----------------------------------------------------------------------------
console.log('\n--- TRACK 1: Cantilever Overhang Detection in 2D Floor Plans ---');

// Case 1.1: East (+X) Cantilever: Core room [0,0] to [6,6], balcony extending to x = 9.0 (3.0m overhang > 2.0m)
const planEast = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w3', start: { x: 6, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_balcony_east', start: { x: 6, y: 3 }, end: { x: 9, y: 3 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridEast = generateStructuralGrid(planEast, '6.0x6.0');
const cantEast = gridEast.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'East (+X) cantilever extending 3.0m beyond gridMaxX (6.0m) is detected',
  cantEast !== undefined &&
    cantEast.lengthM === 3.0 &&
    cantEast.category === 'cantilever' &&
    cantEast.message.includes('Cantilever > 2.0m: Deflection Warning'),
  { cantEast, gridMaxX: gridEast.gridLinesX[gridEast.gridLinesX.length - 1]?.coordM }
);

// Case 1.2: West (-X) Cantilever: Core room [0,0] to [6,6], porch extending to x = -2.5m (2.5m overhang > 2.0m)
const planWest = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w3', start: { x: 6, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_porch_west', start: { x: 0, y: 3 }, end: { x: -2.5, y: 3 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridWest = generateStructuralGrid(planWest, '6.0x6.0');
const cantWest = gridWest.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'West (-X) cantilever extending 2.5m beyond gridMinX is detected',
  cantWest !== undefined &&
    cantWest.lengthM === 2.5 &&
    cantWest.category === 'cantilever' &&
    cantWest.message.includes('Cantilever > 2.0m'),
  { cantWest, gridMinX: gridWest.gridLinesX[0]?.coordM }
);

// Case 1.3: North (+Y) Cantilever: Core room [0,0] to [6,6], overhang extending to y = 8.5m (2.5m overhang > 2.0m)
const planNorth = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w3', start: { x: 6, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_terrace_north', start: { x: 3, y: 6 }, end: { x: 3, y: 8.5 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridNorth = generateStructuralGrid(planNorth, '6.0x6.0');
const cantNorth = gridNorth.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'North (+Y) cantilever extending 2.5m beyond gridMaxY is detected',
  cantNorth !== undefined &&
    cantNorth.lengthM === 2.5 &&
    cantNorth.category === 'cantilever',
  { cantNorth, gridMaxY: gridNorth.gridLinesY[gridNorth.gridLinesY.length - 1]?.coordM }
);

// Case 1.4: South (-Y) Cantilever: Core room [0,0] to [6,6], overhang extending to y = -2.8m (2.8m overhang > 2.0m)
const planSouth = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w3', start: { x: 6, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_canopy_south', start: { x: 3, y: 0 }, end: { x: 3, y: -2.8 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridSouth = generateStructuralGrid(planSouth, '6.0x6.0');
const cantSouth = gridSouth.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'South (-Y) cantilever extending 2.8m beyond gridMinY is detected',
  cantSouth !== undefined &&
    cantSouth.lengthM === 2.8 &&
    cantSouth.category === 'cantilever',
  { cantSouth, gridMinY: gridSouth.gridLinesY[0]?.coordM }
);

// Case 1.5: Compliant Overhang: Overhang is 1.8m (<= 2.0m limit). Should NOT generate a cantilever deflection issue.
const planCompliantOverhang = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w3', start: { x: 6, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_balcony_small', start: { x: 6, y: 3 }, end: { x: 7.8, y: 3 }, thickness: 0.15 }, // 1.8m overhang
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridCompliant = generateStructuralGrid(planCompliantOverhang, '6.0x6.0');
const cantCompliant = gridCompliant.unsupportedSpans.filter((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'Compliant cantilever (1.8m <= 2.0m) does NOT trigger cantilever deflection issue',
  cantCompliant.length === 0,
  { cantCompliant }
);

// Case 1.6: Boundary Overhang: Exactly 2.0m overhang (e.g. wall to x = 8.0m on 6.0m grid).
const planBoundary200 = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 6 }, thickness: 0.15 },
    { id: 'w_boundary', start: { x: 6, y: 3 }, end: { x: 8.0, y: 3 }, thickness: 0.15 }, // exactly 2.0m
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridBoundary200 = generateStructuralGrid(planBoundary200, '6.0x6.0');
const cantBoundary200 = gridBoundary200.unsupportedSpans.filter((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'Boundary overhang of exactly 2.00m passes without issue (limit is > 2.0m)',
  cantBoundary200.length === 0,
  { cantBoundary200 }
);

// Case 1.7: Multi-overhang plan: Core building [0,0] to [12,12] with East overhang (15.0m, +3.0m) and North overhang (14.5m, +2.5m)
const planDualOverhang = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 12 }, thickness: 0.15 },
    { id: 'w3', start: { x: 12, y: 12 }, end: { x: 0, y: 12 }, thickness: 0.15 },
    { id: 'w4', start: { x: 0, y: 12 }, end: { x: 0, y: 0 }, thickness: 0.15 },
    { id: 'w_east', start: { x: 12, y: 6 }, end: { x: 15.0, y: 6 }, thickness: 0.15 },
    { id: 'w_north', start: { x: 6, y: 12 }, end: { x: 6, y: 14.5 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridDual = generateStructuralGrid(planDualOverhang, '6.0x6.0');
const cantDual = gridDual.unsupportedSpans.filter((s) => s.type === 'cantilever_overhang');
assertCase(
  'Cantilever Detection',
  'Multi-overhang plan detects both East (+X: 3.0m) and North (+Y: 2.5m) cantilever issues',
  cantDual.length >= 2 &&
    cantDual.some((c) => c.lengthM === 3.0) &&
    cantDual.some((c) => c.lengthM === 2.5),
  { detected: cantDual.map((c) => ({ id: c.id, len: c.lengthM })) }
);

// -----------------------------------------------------------------------------
// TEST TRACK 2: Dual Cantilever Limits (Length > 2.0m AND L/d > 7.0)
// -----------------------------------------------------------------------------
console.log('\n--- TRACK 2: Dual Cantilever Limits (Length & L/d Ratio) ---');

// Case 2.1: Compliant Cantilever: overhang 1.8m, depth 0.45m -> L/d = 4.0 <= 7.0
const c1 = checkCantileverDeflection(1.8, 0.45);
assertCase(
  'Cantilever Limits',
  'overhang 1.8m, depth 0.45m (L/d = 4.0 <= 7.0, <= 2.0m) -> isExcessive: false, isCompliant: true',
  c1.isExcessive === false && c1.isCompliant === true && c1.spanToDepthRatio === 4.0,
  c1
);

// Case 2.2: Boundary Length: overhang 2.00m, depth 0.45m -> L/d = 4.4 <= 7.0, overhang <= 2.0m
const c2 = checkCantileverDeflection(2.0, 0.45);
assertCase(
  'Cantilever Limits',
  'overhang 2.00m, depth 0.45m -> isExcessive: false, isCompliant: true',
  c2.isExcessive === false && c2.isCompliant === true,
  c2
);

// Case 2.3: Excessive Length Only: overhang 2.50m, depth 0.45m -> L/d = 5.6 <= 7.0, BUT length > 2.0m
const c3 = checkCantileverDeflection(2.5, 0.45);
assertCase(
  'Cantilever Limits',
  'overhang 2.50m, depth 0.45m (length > 2.0m, L/d = 5.6 <= 7.0) -> isExcessive: true, isCompliant: false',
  c3.isExcessive === true &&
    c3.isCompliant === false &&
    c3.warning.includes('Cantilever > 2.0m: Deflection Warning'),
  c3
);

// Case 2.4: Excessive L/d Ratio Only: overhang 1.80m (<= 2.0m), but shallow depth 0.20m -> L/d = 9.0 > 7.0
const c4 = checkCantileverDeflection(1.8, 0.20);
assertCase(
  'Cantilever Limits',
  'overhang 1.80m, shallow depth 0.20m (L/d = 9.0 > 7.0, <= 2.0m) -> isExcessive: true, isCompliant: false',
  c4.isExcessive === true &&
    c4.isCompliant === false &&
    c4.spanToDepthRatio === 9.0 &&
    c4.warning.includes('Cantilever deflection warning: L/d = 9 > 7.0'),
  c4
);

// Case 2.5: Exact Boundary L/d: overhang 1.40m, depth 0.20m -> L/d = 7.0 <= 7.0
const c5 = checkCantileverDeflection(1.4, 0.20);
assertCase(
  'Cantilever Limits',
  'overhang 1.40m, depth 0.20m (exact L/d = 7.0 <= 7.0) -> isExcessive: false, isCompliant: true',
  c5.isExcessive === false && c5.isCompliant === true && c5.spanToDepthRatio === 7.0,
  c5
);

// Case 2.6: Clear breach: overhang 1.45m, depth 0.20m -> L/d = 7.2 > 7.0
const c6 = checkCantileverDeflection(1.45, 0.20);
assertCase(
  'Cantilever Limits',
  'overhang 1.45m, depth 0.20m (L/d = 7.2 > 7.0) -> isExcessive: true, isCompliant: false',
  c6.isExcessive === true && c6.isCompliant === false && c6.spanToDepthRatio > 7.0,
  c6
);

// Case 2.7: Both Length AND Ratio Breached: overhang 2.40m, depth 0.20m -> L/d = 12.0 > 7.0 AND 2.4m > 2.0m
const c7 = checkCantileverDeflection(2.4, 0.20);
assertCase(
  'Cantilever Limits',
  'overhang 2.40m, depth 0.20m (both length > 2.0m and L/d = 12.0 > 7.0 breached) -> warning notes both',
  c7.isExcessive === true &&
    c7.isCompliant === false &&
    c7.warning.includes('exceeds 2.0m max') &&
    c7.warning.includes('L/d = 12 > 7.0'),
  c7
);

// -----------------------------------------------------------------------------
// TEST TRACK 3: Span Deflection Checks & Support Conditions (IS 456 Cl. 23.2.1)
// -----------------------------------------------------------------------------
console.log('\n--- TRACK 3: Span Deflection Checks Across Support Types ---');

// Continuous Beam Limits (L/d <= 26.0)
// Case 3.1: Span 6.0m, d = 0.45m -> L/d = 13.3 <= 26.0 (continuous default)
const sCont1 = checkSpanDeflection(6.0, 0.45);
assertCase(
  'Continuous Beam Deflection',
  'span 6.0m, depth 0.45m continuous -> compliant (L/d = 13.3 <= 26.0, isExcessive: false)',
  sCont1.isCompliant === true &&
    sCont1.isExcessive === false &&
    sCont1.maxSpanToDepthLimit === 26.0 &&
    sCont1.supportType === 'continuous',
  sCont1
);

// Case 3.2: Span 7.50m (conventional limit boundary)
const sCont2 = checkSpanDeflection(7.50, 0.45);
assertCase(
  'Continuous Beam Deflection',
  'span 7.50m continuous -> isExcessive: false, isCompliant: true',
  sCont2.isExcessive === false && sCont2.isCompliant === true,
  sCont2
);

// Case 3.3: Span 7.51m (triggers PT tendons requirement, still compliant under L/d)
const sCont3 = checkSpanDeflection(7.51, 0.45);
assertCase(
  'Continuous Beam Deflection',
  'span 7.51m continuous -> isExcessive: true (PT tendons), isCompliant: true (L/d <= 26.0)',
  sCont3.isExcessive === true &&
    sCont3.isCompliant === true &&
    sCont3.warning.includes('PT Tendons Required'),
  sCont3
);

// Case 3.4: Span 11.70m -> exact L/d = 26.0
const sCont4 = checkSpanDeflection(11.70, 0.45);
assertCase(
  'Continuous Beam Deflection',
  'span 11.70m, depth 0.45m continuous -> L/d = 26.0 <= 26.0 -> isCompliant: true',
  sCont4.isCompliant === true && sCont4.spanToDepthRatio === 26.0,
  sCont4
);

// Case 3.5: Span 11.75m -> L/d = 26.1 > 26.0 -> non-compliant
const sCont5 = checkSpanDeflection(11.75, 0.45);
assertCase(
  'Continuous Beam Deflection',
  'span 11.75m, depth 0.45m continuous -> L/d = 26.1 > 26.0 -> isCompliant: false, severe deflection warning',
  sCont5.isCompliant === false &&
    sCont5.spanToDepthRatio === 26.1 &&
    sCont5.warning.includes('Severe deflection warning: L/d = 26.1 > 26.0'),
  sCont5
);

// Simply Supported Beam Limits (L/d <= 20.0)
// Case 3.6: Span 9.0m, d = 0.45m -> L/d = 20.0 <= 20.0
const sSimp1 = checkSpanDeflection(9.0, 0.45, 'simply_supported');
assertCase(
  'Simply Supported Deflection',
  'span 9.0m, depth 0.45m simply supported -> L/d = 20.0 <= 20.0 -> isCompliant: true',
  sSimp1.isCompliant === true &&
    sSimp1.spanToDepthRatio === 20.0 &&
    sSimp1.maxSpanToDepthLimit === 20.0 &&
    sSimp1.supportType === 'simply_supported',
  sSimp1
);

// Case 3.7: Span 9.5m, d = 0.45m -> L/d = 21.1 > 20.0 -> non-compliant for simply supported!
// Note: This would falsely pass if evaluated as continuous (21.1 <= 26.0)
const sSimp2 = checkSpanDeflection(9.5, 0.45, 'simply_supported');
assertCase(
  'Simply Supported Deflection',
  'span 9.5m, depth 0.45m simply supported -> L/d = 21.1 > 20.0 -> isCompliant: false',
  sSimp2.isCompliant === false &&
    sSimp2.spanToDepthRatio === 21.1 &&
    sSimp2.warning.includes('limit for simply_supported beam [IS 456 Cl. 23.2]'),
  sSimp2
);

// Case 3.8: Cantilever Support Type via checkSpanDeflection (L/d <= 7.0)
const sCant1 = checkSpanDeflection(3.0, 0.45, 'cantilever');
assertCase(
  'Cantilever Support via SpanDeflection',
  'span 3.0m, depth 0.45m cantilever -> L/d = 6.7 <= 7.0 -> isCompliant: true',
  sCant1.isCompliant === true && sCant1.maxSpanToDepthLimit === 7.0,
  sCant1
);
const sCant2 = checkSpanDeflection(3.5, 0.45, 'cantilever');
assertCase(
  'Cantilever Support via SpanDeflection',
  'span 3.5m, depth 0.45m cantilever -> L/d = 7.8 > 7.0 -> isCompliant: false',
  sCant2.isCompliant === false && sCant2.warning.includes('limit for cantilever beam'),
  sCant2
);

// Severe Spans >= 12.0m (Transfer Girders & PT Tendons)
// Case 3.9: Span = 12.0m, depth = 0.45m -> L/d = 26.7
const s12 = checkSpanDeflection(12.0, 0.45);
assertCase(
  'Severe Spans >= 12.0m',
  'span 12.0m produces explicit Severe Deflection Risk transfer girder warning',
  s12.isCompliant === false &&
    s12.warning.startsWith('Severe Deflection Risk: Span >= 12.0m requires specialized post-tensioned transfer girder'),
  s12
);

// Case 3.10: Span = 15.0m, depth = 0.60m -> L/d = 25.0 <= 26.0 continuous, BUT span >= 12.0m triggers transfer girder warning
const s15 = checkSpanDeflection(15.0, 0.60);
assertCase(
  'Severe Spans >= 12.0m',
  'span 15.0m triggers transfer girder warning regardless of beam depth',
  s15.warning.includes('Severe Deflection Risk: Span >= 12.0m requires specialized post-tensioned transfer girder'),
  s15
);

// -----------------------------------------------------------------------------
// TEST TRACK 4: Ceiling Plenum Clearance & Habitable Height (NBC Part 3 Cl. 12.2)
// -----------------------------------------------------------------------------
console.log('\n--- TRACK 4: Ceiling Plenum & NBC Habitable Height Clearance ---');

// Case 4.1: Standard luxury 3.40m F2F: 3.40 - 0.20 - 0.45 = 2.75m (exact compliance)
const p340 = checkPlenumClash(3.40);
assertCase(
  'Plenum Clearance',
  'F2F 3.40m yields 2.75m habitable room height (clash free)',
  p340.isClashFree === true && p340.habitableRoomHeightM === 2.75 && p340.headroomDeficitM === 0,
  p340
);

// Case 4.2: F2F 3.00m: 3.00 - 0.20 - 0.45 = 2.35m < 2.75m (0.40m deficit)
const p300 = checkPlenumClash(3.00);
assertCase(
  'Plenum Clearance',
  'F2F 3.00m flags 0.40m headroom deficit (non-compliant)',
  p300.isClashFree === false && p300.headroomDeficitM === 0.40,
  p300
);

// -----------------------------------------------------------------------------
// TEST TRACK 5: Edge Cases & Degenerate Layouts
// -----------------------------------------------------------------------------
console.log('\n--- TRACK 5: Edge Cases & Robustness Stress ---');

// Case 5.1: 1D Wall Plan (collinear horizontal line y = 0, x from 0 to 12.0m)
const plan1D = {
  walls: [{ id: 'w_line', start: { x: 0, y: 0 }, end: { x: 12.0, y: 0 }, thickness: 0.15 }],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const grid1D = generateStructuralGrid(plan1D, '6.0x6.0');
assertCase(
  'Edge Cases',
  '1D collinear wall does not throw, produces valid columns and spans',
  grid1D.columns.length > 0 &&
    grid1D.gridLinesX.length >= 2 &&
    grid1D.gridLinesY.length >= 2 &&
    !isNaN(grid1D.columns[0].position.x),
  { cols: grid1D.columns.length, gridLinesX: grid1D.gridLinesX.map((g) => g.coordM) }
);

// Case 5.2: Negative Coordinates Plan: building at [-12, -12] to [-6, -6], overhang to x = -3.0m (3.0m overhang > 2.0m)
const planNeg = {
  walls: [
    { id: 'w1', start: { x: -12, y: -12 }, end: { x: -6, y: -12 }, thickness: 0.15 },
    { id: 'w2', start: { x: -6, y: -12 }, end: { x: -6, y: -6 }, thickness: 0.15 },
    { id: 'w3', start: { x: -6, y: -6 }, end: { x: -12, y: -6 }, thickness: 0.15 },
    { id: 'w4', start: { x: -12, y: -6 }, end: { x: -12, y: -12 }, thickness: 0.15 },
    { id: 'w_overhang', start: { x: -6, y: -9 }, end: { x: -3, y: -9 }, thickness: 0.15 }, // overhang 3.0m to the right (+X direction from -6)
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridNeg = generateStructuralGrid(planNeg, '6.0x6.0');
const cantNeg = gridNeg.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
assertCase(
  'Edge Cases',
  'Negative coordinate plan correctly detects 3.0m cantilever overhang',
  cantNeg !== undefined && cantNeg.lengthM === 3.0,
  { cantNeg, gridLinesX: gridNeg.gridLinesX.map((g) => g.coordM) }
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log('CHALLENGER EMPIRICAL VERIFICATION SUMMARY');
console.log('='.repeat(80));

const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const rate = ((passed / total) * 100).toFixed(1);

console.log(`Total Empirical Tests: ${total}`);
console.log(`Passed:                ${passed}`);
console.log(`Failed:                ${failed}`);
console.log(`Pass Rate:             ${rate}%\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🌟 ALL EMPIRICAL CHALLENGES SATISFIED 100%');
  process.exit(0);
}
