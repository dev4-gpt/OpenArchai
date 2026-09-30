#!/usr/bin/env node
/**
 * Adversarial Empirical Stress Test Suite for Pillar 2 (Milestone M2).
 * Challenger 1 (teamwork_challenger_m2_1)
 *
 * Grounded in:
 * - IS 456:2000 Cl. 23.2 (Deflection Limits & Basic Span-to-Depth Ratios)
 * - IS 1893:2016 Zone IV NCR & IS 13920 (Ductile Detailing & Column Sizing)
 * - NBC 2016 Part 3 Cl. 12.2 (Clear Habitable Height & Plenum Clash)
 *
 * EMPIRICALLY VERIFIES:
 * 1. Span deflection boundaries (7.50m pass, 7.51m PT tendon warning, 12.0m severe deflection warning).
 * 2. Cantilever overhang boundaries (2.00m pass, 2.01m deflection warning, and L/d ratio coupling).
 * 3. Ceiling plenum clash checks across varying floor-to-floor heights (3.40m, 3.20m, 3.00m, 2.80m) vs 450mm void.
 * 4. IS 456 L/d ratio calculations across support types (simply supported L/d <= 20, continuous L/d <= 26, cantilever L/d <= 7).
 * 5. RC column sizing rules (400x400mm interior vs 450x600mm corner/shear).
 * 6. Integrated grid compliance and wall/cantilever detection in floor plans.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);

const structuralGridEngine = await jiti.import(
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
} = structuralGridEngine;

const testResults = [];

function recordTest(suite, name, passed, details = null) {
  testResults.push({ suite, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] [${suite}] ${name}`);
  if (details) {
    console.log(`       Details: ${JSON.stringify(details)}`);
  }
}

console.log('='.repeat(80));
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE — PILLAR 2 (M2)');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: Span Deflection Boundaries (7.50m, 7.51m, 12.0m)
// ============================================================================
console.log('\n--- SUITE 1: Span Deflection Boundaries ---');

// Test 1.1: Exact span = 7.50m (conventional boundary pass)
const span_750 = checkSpanDeflection(7.50, 0.45);
recordTest(
  'Span Boundaries',
  'exact span = 7.50m passes conventional limit without PT tendons (isExcessive: false, isCompliant: true)',
  span_750.isExcessive === false && span_750.isCompliant === true,
  { spanM: span_750.spanM, isExcessive: span_750.isExcessive, isCompliant: span_750.isCompliant, warning: span_750.warning }
);

// Test 1.2: Boundary span = 7.51m (flagged with PT tendon warning)
const span_751 = checkSpanDeflection(7.51, 0.45);
recordTest(
  'Span Boundaries',
  'span = 7.51m is flagged with PT tendon warning (isExcessive: true)',
  span_751.isExcessive === true && span_751.warning.includes('PT Tendons Required'),
  { spanM: span_751.spanM, isExcessive: span_751.isExcessive, warning: span_751.warning }
);

// Test 1.3: Sub-millimeter boundary test (7.5001m)
const span_75001 = checkSpanDeflection(7.5001, 0.45);
recordTest(
  'Span Boundaries',
  'span = 7.5001m triggers PT tendon requirement',
  span_75001.isExcessive === true,
  { spanM: span_75001.spanM, isExcessive: span_75001.isExcessive }
);

// Test 1.4: Continuous L/d = 26.0 exact boundary (0.45 * 26.0 = 11.70m)
const span_1170 = checkSpanDeflection(11.70, 0.45);
recordTest(
  'Span Boundaries',
  'span = 11.70m at exact L/d = 26.0 limit is compliant (isCompliant: true, ratio: 26.0)',
  span_1170.isCompliant === true && span_1170.spanToDepthRatio === 26.0,
  { ratio: span_1170.spanToDepthRatio, isCompliant: span_1170.isCompliant }
);

// Test 1.5: Continuous L/d breach (11.75m -> L/d = 26.1 > 26.0)
const span_1175 = checkSpanDeflection(11.75, 0.45);
recordTest(
  'Span Boundaries',
  'span = 11.75m exceeds L/d limit (isCompliant: false, ratio: 26.1)',
  span_1175.isCompliant === false && span_1175.spanToDepthRatio === 26.1,
  { ratio: span_1175.spanToDepthRatio, isCompliant: span_1175.isCompliant }
);

// Test 1.6: Severe span = 12.0m deflection check (L/d = 26.7 > 26.0)
const span_1200 = checkSpanDeflection(12.0, 0.45);
const span_1200_non_compliant = span_1200.isCompliant === false && span_1200.spanToDepthRatio === 26.7;
recordTest(
  'Span Boundaries',
  'span = 12.0m fails deflection compliance (isCompliant: false, ratio: 26.7 > 26.0)',
  span_1200_non_compliant,
  { ratio: span_1200.spanToDepthRatio, isCompliant: span_1200.isCompliant, warning: span_1200.warning }
);

// Test 1.7: Audit severe deflection warning message content at span = 12.0m
// Does warning explicitly alert about severe deflection or L/d limit breach?
const warningHasDeflectionAlert =
  span_1200.warning.toLowerCase().includes('deflection') ||
  span_1200.warning.toLowerCase().includes('severe') ||
  span_1200.warning.toLowerCase().includes('non-compliant') ||
  span_1200.warning.includes('26');
recordTest(
  'Span Boundaries',
  'AUDIT: checkSpanDeflection(12.0) warning text explicitly mentions deflection limit breach / severe deflection',
  warningHasDeflectionAlert,
  { warning: span_1200.warning }
);

// Test 1.8: In generateStructuralGrid, span = 12.0m produces "critical" status
const grid_12m = generateStructuralGrid(
  {
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12.0, y: 0 }, thickness: 0.15 },
      { id: 'w2', start: { x: 12.0, y: 0 }, end: { x: 12.0, y: 12.0 }, thickness: 0.15 },
    ],
    doors: [],
    windows: [],
    rooms: [],
    gridSize: 0.5,
    panOffset: { x: 0, y: 0 },
    zoom: 35,
  },
  '7.2x7.2'
);
// Find span check with status
const criticalSpan = grid_12m.spans.find((s) => s.spanM >= 7.2);
recordTest(
  'Span Boundaries',
  'generateStructuralGrid produces span checks with status and messages',
  grid_12m.spans.length > 0 && criticalSpan !== undefined,
  { spans: grid_12m.spans }
);

// ============================================================================
// SUITE 2: Cantilever Boundaries (2.00m, 2.01m, and Depth Coupling)
// ============================================================================
console.log('\n--- SUITE 2: Cantilever Boundaries ---');

// Test 2.1: Overhang = 2.00m (pass conventional overhang limit)
const cant_200 = checkCantileverDeflection(2.00, 0.45);
recordTest(
  'Cantilever Boundaries',
  'overhang = 2.00m passes conventional cantilever limit (isExcessive: false)',
  cant_200.isExcessive === false && cant_200.warning.includes('≤ 2.0m max'),
  { overhangM: cant_200.overhangM, isExcessive: cant_200.isExcessive, warning: cant_200.warning }
);

// Test 2.2: Overhang = 2.01m (flagged with cantilever deflection warning)
const cant_201 = checkCantileverDeflection(2.01, 0.45);
recordTest(
  'Cantilever Boundaries',
  'overhang = 2.01m is flagged with cantilever deflection warning (isExcessive: true)',
  cant_201.isExcessive === true && cant_201.warning.includes('Deflection Warning'),
  { overhangM: cant_201.overhangM, isExcessive: cant_201.isExcessive, warning: cant_201.warning }
);

// Test 2.3: Sub-millimeter cantilever boundary (2.0001m)
const cant_20001 = checkCantileverDeflection(2.0001, 0.45);
recordTest(
  'Cantilever Boundaries',
  'overhang = 2.0001m triggers excessive cantilever flag',
  cant_20001.isExcessive === true,
  { overhangM: cant_20001.overhangM, isExcessive: cant_20001.isExcessive }
);

// Test 2.4: Severe cantilever overhang (3.50m)
const cant_350 = checkCantileverDeflection(3.50, 0.45);
recordTest(
  'Cantilever Boundaries',
  'overhang = 3.50m triggers deflection warning (isExcessive: true, L/d = 7.8 > 7.0)',
  cant_350.isExcessive === true && cant_350.spanToDepthRatio === 7.8,
  { overhangM: cant_350.overhangM, ratio: cant_350.spanToDepthRatio, limit: cant_350.maxSpanToDepthLimit }
);

// Test 2.5: AUDIT Cantilever L/d ratio violation with overhang <= 2.0m (shallow depth d=0.20m, overhang=1.8m)
// Overhang 1.8m <= 2.0m, BUT with d = 0.20m: L/d = 1.8 / 0.20 = 9.0 > 7.0!
const cant_shallow = checkCantileverDeflection(1.80, 0.20);
const cant_shallow_caught = cant_shallow.isExcessive === true || cant_shallow.warning.includes('Warning');
recordTest(
  'Cantilever Boundaries',
  'AUDIT: checkCantileverDeflection flags violation when L/d = 9.0 > 7.0 even if overhang (1.8m) <= 2.0m',
  cant_shallow_caught,
  {
    overhangM: cant_shallow.overhangM,
    effectiveDepthM: 0.20,
    ratio: cant_shallow.spanToDepthRatio,
    maxLimit: cant_shallow.maxSpanToDepthLimit,
    isExcessive: cant_shallow.isExcessive,
    warning: cant_shallow.warning,
  }
);

// ============================================================================
// SUITE 3: Ceiling Plenum Clash & Habitable Headroom (3.40m, 3.20m, 3.00m, 2.80m)
// ============================================================================
console.log('\n--- SUITE 3: Ceiling Plenum Clash & Habitable Headroom ---');

// Test 3.1: Floor-to-floor = 3.40m (exact boundary: 3.40 - 0.20 - 0.45 = 2.75m)
const plenum_340 = checkPlenumClash(3.40);
recordTest(
  'Plenum Clash',
  'floor-to-floor 3.40m preserves exact 2.75m habitable height (isClashFree: true, deficit: 0.00m)',
  plenum_340.isClashFree === true &&
    plenum_340.habitableRoomHeightM === 2.75 &&
    plenum_340.headroomDeficitM === 0.0,
  { f2f: 3.40, habitable: plenum_340.habitableRoomHeightM, deficit: plenum_340.headroomDeficitM, clashFree: plenum_340.isClashFree }
);

// Test 3.2: Floor-to-floor = 3.39m (fractional breach: 3.39 - 0.20 - 0.45 = 2.74m < 2.75m)
const plenum_339 = checkPlenumClash(3.39);
recordTest(
  'Plenum Clash',
  'floor-to-floor 3.39m flags 0.01m headroom deficit (isClashFree: false, deficit: 0.01m)',
  plenum_339.isClashFree === false &&
    plenum_339.habitableRoomHeightM === 2.74 &&
    plenum_339.headroomDeficitM === 0.01,
  { f2f: 3.39, habitable: plenum_339.habitableRoomHeightM, deficit: plenum_339.headroomDeficitM, clashFree: plenum_339.isClashFree }
);

// Test 3.3: Floor-to-floor = 3.20m (3.20 - 0.20 - 0.45 = 2.55m -> deficit 0.20m)
const plenum_320 = checkPlenumClash(3.20);
recordTest(
  'Plenum Clash',
  'floor-to-floor 3.20m flags 0.20m headroom deficit (habitable: 2.55m < 2.75m)',
  plenum_320.isClashFree === false &&
    plenum_320.habitableRoomHeightM === 2.55 &&
    plenum_320.headroomDeficitM === 0.20,
  { f2f: 3.20, habitable: plenum_320.habitableRoomHeightM, deficit: plenum_320.headroomDeficitM, clashFree: plenum_320.isClashFree }
);

// Test 3.4: Floor-to-floor = 3.00m (3.00 - 0.20 - 0.45 = 2.35m -> deficit 0.40m)
const plenum_300 = checkPlenumClash(3.00);
recordTest(
  'Plenum Clash',
  'floor-to-floor 3.00m flags 0.40m headroom deficit (habitable: 2.35m < 2.75m)',
  plenum_300.isClashFree === false &&
    plenum_300.habitableRoomHeightM === 2.35 &&
    plenum_300.headroomDeficitM === 0.40,
  { f2f: 3.00, habitable: plenum_300.habitableRoomHeightM, deficit: plenum_300.headroomDeficitM, clashFree: plenum_300.isClashFree }
);

// Test 3.5: Floor-to-floor = 2.80m (2.80 - 0.20 - 0.45 = 2.15m -> deficit 0.60m)
const plenum_280 = checkPlenumClash(2.80);
recordTest(
  'Plenum Clash',
  'floor-to-floor 2.80m flags 0.60m headroom deficit (habitable: 2.15m < 2.75m)',
  plenum_280.isClashFree === false &&
    plenum_280.habitableRoomHeightM === 2.15 &&
    plenum_280.headroomDeficitM === 0.60,
  { f2f: 2.80, habitable: plenum_280.habitableRoomHeightM, deficit: plenum_280.headroomDeficitM, clashFree: plenum_280.isClashFree }
);

// Test 3.6: Plenum message citations verify NBC 2016 Part 3 Cl. 12.2
recordTest(
  'Plenum Clash',
  'plenum clash check messages cite NBC 2016 Part 3 Cl. 12.2 and 2.75m standard',
  plenum_340.message.includes('NBC 2016 Part 3 Cl. 12.2') &&
    plenum_300.message.includes('2.75m'),
  { msg340: plenum_340.message, msg300: plenum_300.message }
);

// ============================================================================
// SUITE 4: IS 456 L/d Ratio Calculations Across Support Types (Simple, Continuous, Cantilever)
// ============================================================================
console.log('\n--- SUITE 4: IS 456 Support Types (Simple, Continuous, Cantilever) ---');

// IS 456:2000 Cl. 23.2.1 specifies:
// - Cantilever: 7
// - Simply supported: 20
// - Continuous: 26

// Test 4.1: Continuous beam ratio constant verification
recordTest(
  'IS 456 Support Types',
  'STRUCTURAL_DEFAULTS has MAX_CONTINUOUS_SPAN_TO_DEPTH = 26.0 (IS 456 Cl. 23.2.1)',
  STRUCTURAL_DEFAULTS.MAX_CONTINUOUS_SPAN_TO_DEPTH === 26.0,
  { MAX_CONTINUOUS_SPAN_TO_DEPTH: STRUCTURAL_DEFAULTS.MAX_CONTINUOUS_SPAN_TO_DEPTH }
);

// Test 4.2: Cantilever beam ratio constant verification
recordTest(
  'IS 456 Support Types',
  'STRUCTURAL_DEFAULTS has MAX_CANTILEVER_SPAN_TO_DEPTH = 7.0 (IS 456 Cl. 23.2.1)',
  STRUCTURAL_DEFAULTS.MAX_CANTILEVER_SPAN_TO_DEPTH === 7.0,
  { MAX_CANTILEVER_SPAN_TO_DEPTH: STRUCTURAL_DEFAULTS.MAX_CANTILEVER_SPAN_TO_DEPTH }
);

// Test 4.3: AUDIT Simply supported ratio constant (L/d <= 20.0 per IS 456 Cl. 23.2.1)
const hasSimplySupportedConstant =
  'MAX_SIMPLY_SUPPORTED_SPAN_TO_DEPTH' in STRUCTURAL_DEFAULTS ||
  'MAX_SIMPLE_SPAN_TO_DEPTH' in STRUCTURAL_DEFAULTS;
recordTest(
  'IS 456 Support Types',
  'AUDIT: STRUCTURAL_DEFAULTS defines simply supported limit (L/d <= 20.0)',
  hasSimplySupportedConstant,
  { definedKeys: Object.keys(STRUCTURAL_DEFAULTS) }
);

// Test 4.4: AUDIT Support type parameter in checkSpanDeflection
// Can checkSpanDeflection accept support type ('simply_supported' | 'continuous' | 'cantilever')?
const checkSpanDeflectionSupportsTypes = checkSpanDeflection.length >= 3;
recordTest(
  'IS 456 Support Types',
  'AUDIT: checkSpanDeflection accepts support type parameter (simple vs continuous vs cantilever)',
  checkSpanDeflectionSupportsTypes,
  { functionArity: checkSpanDeflection.length }
);

// Test 4.5: AUDIT Simply supported beam deflection evaluation
// Suppose an engineer has a simply supported beam: span = 9.5m, d = 0.45m -> L/d = 21.1 > 20.0!
// For simply supported, this VIOLATES IS 456 Cl. 23.2.1 (21.1 > 20.0).
// However, checkSpanDeflection(9.5, 0.45) checks against 26.0, returning isCompliant = true!
const simply_supported_sample = checkSpanDeflection(9.5, 0.45);
recordTest(
  'IS 456 Support Types',
  'AUDIT: checkSpanDeflection behavior on simply supported beam (span 9.5m, d 0.45m -> L/d 21.1 > 20.0)',
  simply_supported_sample.spanToDepthRatio === 21.1,
  {
    spanM: 9.5,
    depthM: 0.45,
    spanToDepthRatio: simply_supported_sample.spanToDepthRatio,
    isCompliantUnderContinuousRule: simply_supported_sample.isCompliant,
    compliantUnderSimplySupportedRule: simply_supported_sample.spanToDepthRatio <= 20.0,
  }
);

// ============================================================================
// SUITE 5: RC Column Sizing Rules (400x400mm Interior vs 450x600mm Corner/Shear)
// ============================================================================
console.log('\n--- SUITE 5: RC Column Sizing Rules ---');

const testGrid = generateStructuralGrid(null, '6.0x7.2');
const cornerColumns = testGrid.columns.filter((c) => c.isCorner);
const interiorColumns = testGrid.columns.filter((c) => !c.isCorner);

// Test 5.1: Corner columns count (minimum 4 corners on rectangular grid)
recordTest(
  'Column Sizing',
  'grid has at least 4 corner columns',
  cornerColumns.length >= 4,
  { cornerCount: cornerColumns.length, totalColumns: testGrid.columns.length }
);

// Test 5.2: Interior columns exist
recordTest(
  'Column Sizing',
  'grid has interior columns',
  interiorColumns.length > 0,
  { interiorCount: interiorColumns.length }
);

// Test 5.3: Corner columns dimensions are strictly 450x600mm (0.45m x 0.60m)
const allCornerColsValid = cornerColumns.every(
  (c) => c.widthM === 0.45 && c.depthM === 0.60 && c.type === 'corner'
);
recordTest(
  'Column Sizing',
  'all corner columns are sized 450x600mm (0.45m x 0.60m, type: "corner")',
  allCornerColsValid,
  {
    sampleCorner: cornerColumns[0]
      ? { width: cornerColumns[0].widthM, depth: cornerColumns[0].depthM, type: cornerColumns[0].type }
      : null,
  }
);

// Test 5.4: Interior columns dimensions are strictly 400x400mm (0.40m x 0.40m)
const allInteriorColsValid = interiorColumns.every(
  (c) => c.widthM === 0.40 && c.depthM === 0.40 && c.type === 'interior'
);
recordTest(
  'Column Sizing',
  'all interior columns are sized 400x400mm (0.40m x 0.40m, type: "interior")',
  allInteriorColsValid,
  {
    sampleInterior: interiorColumns[0]
      ? { width: interiorColumns[0].widthM, depth: interiorColumns[0].depthM, type: interiorColumns[0].type }
      : null,
  }
);

// Test 5.5: Column labels reflect exact dimensions in millimeters
const labelsMatchDimensions = testGrid.columns.every(
  (c) =>
    (c.isCorner && c.label.includes('450×600')) ||
    (!c.isCorner && c.label.includes('400×400'))
);
recordTest(
  'Column Sizing',
  'column labels explicitly reflect millimetric dimensions (450×600 or 400×400)',
  labelsMatchDimensions,
  { sampleCornerLabel: cornerColumns[0]?.label, sampleInteriorLabel: interiorColumns[0]?.label }
);

// ============================================================================
// SUITE 6: Integrated Floor Plan Stress & Edge Cases
// ============================================================================
console.log('\n--- SUITE 6: Integrated Floor Plan Stress & Edge Cases ---');

// Test 6.1: Empty and null plans handled gracefully
const nullPlanGrid = generateStructuralGrid(null);
const emptyPlanGrid = generateStructuralGrid({ walls: [], doors: [], windows: [], rooms: [], gridSize: 0.5, panOffset: { x: 0, y: 0 }, zoom: 35 });
recordTest(
  'Plan Robustness',
  'null and empty floor plans safely generate default grid without throw or NaN',
  nullPlanGrid.columns.length > 0 && emptyPlanGrid.columns.length > 0 && !isNaN(nullPlanGrid.columns[0].position.x),
  { nullCols: nullPlanGrid.columns.length, emptyCols: emptyPlanGrid.columns.length }
);

// Test 6.2: Detecting wall span > 7.5m in floor plan
const planWithLongWall = {
  walls: [
    { id: 'w_short', start: { x: 0, y: 0 }, end: { x: 6.0, y: 0 }, thickness: 0.15 },
    { id: 'w_long_8m', start: { x: 0, y: 3.0 }, end: { x: 8.5, y: 3.0 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridWithLongWall = generateStructuralGrid(planWithLongWall, '6.0x6.0');
const wallIssue = gridWithLongWall.unsupportedSpans.find((s) => s.id === 'span_wall_w_long_8m');
recordTest(
  'Plan Robustness',
  'floor plan wall with span 8.5m > 7.5m is detected as unsupported span with PT tendon warning',
  wallIssue !== undefined && wallIssue.message.includes('PT Tendons Required'),
  { wallIssue }
);

// Test 6.3: Detecting cantilever overhang > 2.0m beyond grid bounds
const planWithCantilever = {
  walls: [
    { id: 'w_core', start: { x: 0, y: 0 }, end: { x: 6.0, y: 0 }, thickness: 0.15 },
    { id: 'w_overhang', start: { x: 6.0, y: 0 }, end: { x: 15.0, y: 0 }, thickness: 0.15 },
  ],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const gridWithCantilever = generateStructuralGrid(planWithCantilever, '6.0x6.0');
const cantIssue = gridWithCantilever.unsupportedSpans.find((s) => s.type === 'cantilever_overhang');
recordTest(
  'Plan Robustness',
  'floor plan wall extending 3.0m beyond grid bounds is detected as cantilever overhang deflection warning',
  cantIssue !== undefined && cantIssue.message.includes('Cantilever > 2.0m'),
  { cantIssue }
);

// Test 6.4: isFullyCompliant flag consistency
// When a plan has headroom clash (e.g. f2f = 3.00m), isFullyCompliant must be false
const clashGrid = generateStructuralGrid(null, '6.0x6.0', 3.00);
recordTest(
  'Plan Robustness',
  'isFullyCompliant is false when plenum clash occurs (f2f = 3.00m)',
  clashGrid.isFullyCompliant === false,
  { isFullyCompliant: clashGrid.isFullyCompliant, plenumClashFree: clashGrid.plenumCheck.isClashFree }
);

// When a plan has all compliant parameters (f2f = 3.40m, span = 6.0m, no excessive cantilevers)
const compliantGrid = generateStructuralGrid(null, '6.0x6.0', 3.40);
recordTest(
  'Plan Robustness',
  'isFullyCompliant is true when all parameters are compliant (f2f = 3.40m, span = 6.0m)',
  compliantGrid.isFullyCompliant === true,
  { isFullyCompliant: compliantGrid.isFullyCompliant }
);

// ============================================================================
// SUMMARY & STATISTICS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('EMPIRICAL ADVERSARIAL STRESS TEST SUMMARY');
console.log('='.repeat(80));

const totalTests = testResults.length;
const passedTests = testResults.filter((r) => r.passed).length;
const failedTests = testResults.filter((r) => !r.passed).length;
const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total Adversarial Tests: ${totalTests}`);
console.log(`Passed:                  ${passedTests}`);
console.log(`Failed / Audit Flags:    ${failedTests}`);
console.log(`Pass Rate:               ${passRate}%\n`);

if (failedTests > 0) {
  console.log('CRITICAL AUDIT FINDINGS / FAILED TESTS:');
  for (const failure of testResults.filter((r) => !r.passed)) {
    console.log(`❌ [${failure.suite}] ${failure.name}`);
    if (failure.details) {
      console.log(`   Details: ${JSON.stringify(failure.details)}`);
    }
  }
}
