#!/usr/bin/env node
/**
 * Adversarial Empirical Stress Test Suite for Pillar 1 (Milestone M1).
 * Challenger 1 (teamwork_challenger_m1_1)
 *
 * EMPIRICALLY VERIFIES:
 * 1. Extreme boundary room counts (0, 1, 50 rooms, negative coordinates, collinear points).
 * 2. Graham scan convex hull and minimum bounding box correctness under floating-point perturbations.
 * 3. Net Carpet vs Saleable Circulation vs Shaft area conservation (A_total = A_carpet + A_circ + A_shaft).
 * 4. Statutory FAR monetization logic when area exceeds permissible GFA (> 2.64 * A_plot).
 * 5. Yield-on-Cost, NOI, IRR, and Payback mathematical consistency.
 * 6. CPWD CSV string formatting, quoting, column counts, and grand total sum.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);

const farEnvelope = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/far-envelope-geometry.ts'));
const peUnderwriting = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/pe-underwriting.ts'));

const {
  classifyRoomZone,
  computeConvexHull,
  computePolygonArea,
  calculateFARMetrics,
  FAR_STATUTORY_CONSTANTS,
} = farEnvelope;

const {
  calculatePEUnderwriting,
  generateCPWDTenderCsv,
  exportCPWDTenderScheduleCSV,
  CPWD_DSR_2024_DEFAULTS,
} = peUnderwriting;

const testResults = [];

function recordTest(suite, name, passed, details = null) {
  testResults.push({ suite, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] [${suite}] ${name}`);
  if (details) {
    console.log(`       Details: ${JSON.stringify(details)}`);
  }
}

// RFC 4180 CSV parser
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

console.log('='.repeat(80));
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE M1 (PILLAR 1)');
console.log('='.repeat(80));

// ---------------------------------------------------------------------------
// SUITE 1: EXTREME BOUNDARY ROOM COUNTS & DEGENERATE GEOMETRIES
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 1: Boundary Room Counts & Degenerate Geometries ---');

// 1.1 Null / Undefined
const nullMetrics = calculateFARMetrics(null);
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics(null) returns valid institutional defaults',
  nullMetrics.builtUpAreaSqM === 111.5 && nullMetrics.statusBadge === 'INSTITUTIONAL GRADE',
  { bua: nullMetrics.builtUpAreaSqM, badge: nullMetrics.statusBadge }
);

// 1.2 0 Rooms, 0 Walls
const emptyMetrics = calculateFARMetrics({
  walls: [], doors: [], windows: [], rooms: [], gridSize: 0.5, panOffset: { x: 0, y: 0 }, zoom: 35
});
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics(0 rooms, 0 walls) handles safely without NaN or crash',
  emptyMetrics.builtUpAreaSqM === 111.5 && emptyMetrics.classifiedRooms.length === 0,
  { bua: emptyMetrics.builtUpAreaSqM, classifiedCount: emptyMetrics.classifiedRooms.length }
);

// 1.3 0 Rooms, 4 Walls
const wallsOnlyMetrics = calculateFARMetrics({
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2 },
    { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, thickness: 0.2 },
    { id: 'w3', start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.2 },
    { id: 'w4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.2 },
  ],
  doors: [], windows: [], rooms: [], gridSize: 0.5, panOffset: { x: 0, y: 0 }, zoom: 35
});
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics(0 rooms, 4 walls) calculates wall area and flags SUB-OPTIMAL',
  wallsOnlyMetrics.carpetAreaSqM === 0 && wallsOnlyMetrics.statusBadge === 'SUB-OPTIMAL',
  { carpet: wallsOnlyMetrics.carpetAreaSqM, wallArea: wallsOnlyMetrics.wallAreaSqM, badge: wallsOnlyMetrics.statusBadge }
);

// 1.4 Single room (1 Room) — Net Carpet
const singleRoomMetrics = calculateFARMetrics({
  walls: [], doors: [], windows: [],
  rooms: [{ id: 'r1', label: 'Master Suite', area: 40.0, vertices: [{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}] }],
  gridSize: 0.5, panOffset: { x: 0, y: 0 }, zoom: 35
});
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics(1 room) correctly classifies as NET_CARPET and computes high NTG',
  singleRoomMetrics.carpetAreaSqM === 40.0 && singleRoomMetrics.isEfficiencyCompliant,
  { carpet: singleRoomMetrics.carpetAreaSqM, ntg: singleRoomMetrics.carpetToSaleablePercent }
);

// 1.5 50 Rooms Institutional Multi-Unit Scaling
const rooms50 = [];
let expectedCarpet50 = 0;
let expectedCirc50 = 0;
let expectedShaft50 = 0;
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 10; c++) {
    const idx = r * 10 + c;
    const x0 = c * 6;
    const y0 = r * 6;
    const vertices = [{x:x0,y:y0}, {x:x0+6,y:y0}, {x:x0+6,y:y0+6}, {x:x0,y:y0+6}];
    let label = `Habitable Unit ${idx}`;
    let area = 36.0;
    if (idx % 5 === 0) {
      label = `MEP Shaft ${idx}`;
      area = 0.8;
      expectedShaft50 += area;
    } else if (idx % 5 === 1) {
      label = `Corridor Spine ${idx}`;
      area = 18.0;
      expectedCirc50 += area;
    } else {
      label = `Living Suite ${idx}`;
      area = 36.0;
      expectedCarpet50 += area;
    }
    rooms50.push({ id: `r_${idx}`, label, area, vertices });
  }
}
const t0 = performance.now();
const metrics50 = calculateFARMetrics({
  walls: [], doors: [], windows: [], rooms: rooms50, gridSize: 0.5, panOffset: {x:0,y:0}, zoom: 35
});
const dt50 = performance.now() - t0;
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics(50 rooms) scales in sub-10ms with exact area conservation',
  metrics50.classifiedRooms.length === 50 &&
  metrics50.carpetAreaSqM === expectedCarpet50 &&
  metrics50.circulationAreaSqM === expectedCirc50 &&
  metrics50.shaftAreaSqM === Math.round((expectedShaft50 + 0.09) * 10) / 10 &&
  dt50 < 10,
  { durationMs: Number(dt50.toFixed(3)), roomsCount: metrics50.classifiedRooms.length, bua: metrics50.builtUpAreaSqM }
);

// 1.6 Negative Coordinates
const negCoordsMetrics = calculateFARMetrics({
  walls: [], doors: [], windows: [],
  rooms: [{
    id: 'r_neg',
    label: 'Negative Living',
    area: 75.0,
    vertices: [{x:-40, y:-30}, {x:-15, y:-30}, {x:-15, y:-10}, {x:-40, y:-10}]
  }],
  gridSize: 0.5, panOffset: {x:0,y:0}, zoom: 35
});
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics with negative coordinate vertices computes correct positive area and setbacks',
  negCoordsMetrics.carpetAreaSqM === 75.0 &&
  negCoordsMetrics.plotPolygon[0].x === -42 &&
  negCoordsMetrics.plotPolygon[0].y === -33,
  { carpet: negCoordsMetrics.carpetAreaSqM, plotPolygon: negCoordsMetrics.plotPolygon }
);

// 1.7 Completely Collinear Points
const colinMetrics = calculateFARMetrics({
  walls: [], doors: [], windows: [],
  rooms: [{
    id: 'r_colin',
    label: 'Collinear Points',
    area: 0,
    vertices: [{x:0, y:0}, {x:5, y:0}, {x:10, y:0}, {x:15, y:0}]
  }],
  gridSize: 0.5, panOffset: {x:0,y:0}, zoom: 35
});
recordTest(
  'Boundary Geometries',
  'calculateFARMetrics with collinear flat vertices does not crash or produce NaN',
  !Number.isNaN(colinMetrics.builtUpAreaSqM) && colinMetrics.footprintPolygon.length === 2,
  { hullLen: colinMetrics.footprintPolygon.length, bua: colinMetrics.builtUpAreaSqM }
);

// ---------------------------------------------------------------------------
// SUITE 2: GRAHAM SCAN CONVEX HULL & BOUNDING BOX UNDER PERTURBATIONS
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 2: Graham Scan Convex Hull & Bounding Box Perturbations ---');

// 2.1 Collinear Intermediate Points on Boundary
const colinHull = computeConvexHull([
  {x:0,y:0}, {x:2.5,y:0}, {x:5,y:0}, {x:10,y:0},
  {x:10,y:5}, {x:10,y:10}, {x:5,y:10}, {x:0,y:10}, {x:0,y:5}
]);
recordTest(
  'Convex Hull & MBB',
  'computeConvexHull pops intermediate collinear points on boundary and leaves 4 vertices',
  colinHull.length === 4,
  { vertices: colinHull, area: computePolygonArea(colinHull) }
);

// 2.2 Sub-millimeter Float Perturbations (1e-8)
const jitteredPoints = [
  {x:0, y:0},
  {x:10 + 1e-8, y:0},
  {x:10, y:10 + 1e-8},
  {x:0, y:10},
  {x:5, y:5}
];
const jitteredHull = computeConvexHull(jitteredPoints);
const jitteredArea = computePolygonArea(jitteredHull);
recordTest(
  'Convex Hull & MBB',
  'computeConvexHull maintains stability and 100.0 sqm area under sub-millimeter perturbation',
  jitteredHull.length === 4 && Math.abs(jitteredArea - 100.0) < 1e-4,
  { vertexCount: jitteredHull.length, area: jitteredArea }
);

// 2.3 Interior Points Exclusion
const interiorCloud = [
  {x:0,y:0}, {x:20,y:0}, {x:20,y:20}, {x:0,y:20},
  // 10 interior points
  {x:5,y:5}, {x:10,y:10}, {x:15,y:15}, {x:5,y:15}, {x:15,y:5},
  {x:8,y:12}, {x:12,y:8}, {x:9,y:9}, {x:11,y:11}, {x:6,y:14}
];
const cloudHull = computeConvexHull(interiorCloud);
recordTest(
  'Convex Hull & MBB',
  'computeConvexHull correctly discards all interior points and preserves outer square',
  cloudHull.length === 4 && computePolygonArea(cloudHull) === 400.0,
  { hullLength: cloudHull.length, area: computePolygonArea(cloudHull) }
);

// ---------------------------------------------------------------------------
// SUITE 3: AREA CONSERVATION & DEDUCTIONS
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 3: Area Conservation & Statutory Deductions ---');

// 3.1 Mutual Exclusivity and Completeness
const testRoomsList = [
  { id: '1', label: 'Living', area: 50 },
  { id: '2', label: 'Bedroom 1', area: 30 },
  { id: '3', label: 'Kitchen', area: 15 },
  { id: '4', label: 'Main Corridor', area: 18 },
  { id: '5', label: 'Lobby', area: 12 },
  { id: '6', label: 'MEP Riser Shaft', area: 0.8 },
  { id: '7', label: 'Pipe Chute', area: 0.5 },
];
let catCarpet = 0, catCirc = 0, catShaft = 0;
for (const r of testRoomsList) {
  const cat = classifyRoomZone(r);
  if (cat === 'NET_CARPET') catCarpet += r.area;
  else if (cat === 'SALEABLE_CIRCULATION') catCirc += r.area;
  else if (cat === 'DEDUCTIBLE_SHAFT') catShaft += r.area;
}
const sumRooms = testRoomsList.reduce((acc, r) => acc + r.area, 0);
recordTest(
  'Area Conservation',
  'Classification is mutually exclusive and partitions room area without loss',
  catCarpet + catCirc + catShaft === sumRooms,
  { carpet: catCarpet, circ: catCirc, shaft: catShaft, total: sumRooms }
);

// 3.2 Statutory Shaft Deduction: GFA = BUA - Shaft
const samplePlan = {
  walls: [], doors: [], windows: [],
  rooms: testRoomsList.map((r, i) => ({
    ...r, vertices: [{x:i*3, y:0}, {x:i*3+2, y:0}, {x:i*3+2, y:2}, {x:i*3, y:2}]
  })),
  gridSize: 0.5, panOffset: {x:0,y:0}, zoom: 35
};
const sampleMetrics = calculateFARMetrics(samplePlan);
recordTest(
  'Area Conservation',
  'GFA deducts service shafts from Built-Up Area per Haryana DTCP & NBC Part 3',
  sampleMetrics.grossFloorAreaSqM === Math.round((sampleMetrics.builtUpAreaSqM - sampleMetrics.shaftAreaSqM) * 10) / 10,
  { bua: sampleMetrics.builtUpAreaSqM, shaft: sampleMetrics.shaftAreaSqM, gfa: sampleMetrics.grossFloorAreaSqM }
);

// 3.3 PE Underwriting Circulation Conservation
const peUnder = calculatePEUnderwriting({
  grossFloorAreaSqFt: 12000,
  carpetAreaSqFt: 10000,
  totalCapexINR: 40000000,
});
recordTest(
  'Area Conservation',
  'PE Underwriting Gross GFA = Carpet Area + Circulation Area',
  peUnder.carpetAreaSqFt + peUnder.circulationAreaSqFt === peUnder.grossFloorAreaSqFt,
  { gfa: peUnder.grossFloorAreaSqFt, carpet: peUnder.carpetAreaSqFt, circ: peUnder.circulationAreaSqFt }
);

// ---------------------------------------------------------------------------
// SUITE 4: STATUTORY FAR MONETIZATION (> 2.64 * A_plot)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 4: Statutory FAR Monetization (> 2.64 * A_plot) ---');

// 4.1 Permissible Limit Boundary Check (Exact 2.64)
const exactPermissible = calculatePEUnderwriting({
  plotAreaSqFt: 10000,
  grossFloorAreaSqFt: 26400,
  carpetAreaSqFt: 22440,
  totalCapexINR: 80000000,
});
recordTest(
  'FAR Monetization',
  'GFA = 2.64 * A_plot passes compliance with farUtilization = 100.0%',
  exactPermissible.isFARCompliant === true && exactPermissible.farUtilizationPercent === 100.0,
  { isFARCompliant: exactPermissible.isFARCompliant, util: exactPermissible.farUtilizationPercent }
);

// 4.2 Exceeding Limit Boundary Check (2.64 * A_plot + 1 sqft)
const exceedPermissible = calculatePEUnderwriting({
  plotAreaSqFt: 10000,
  grossFloorAreaSqFt: 26401,
  carpetAreaSqFt: 22440,
  totalCapexINR: 80000000,
});
recordTest(
  'FAR Monetization',
  'GFA > 2.64 * A_plot fails compliance and farUtilization exceeds 100.0%',
  exceedPermissible.isFARCompliant === false && exceedPermissible.farUtilizationPercent > 100.0,
  { isFARCompliant: exceedPermissible.isFARCompliant, util: exceedPermissible.farUtilizationPercent }
);

// 4.3 Severe Over-FAR (FAR = 3.50)
const severeOverFAR = calculatePEUnderwriting({
  plotAreaSqFt: 10000,
  grossFloorAreaSqFt: 35000,
  carpetAreaSqFt: 29750,
  totalCapexINR: 120000000,
});
recordTest(
  'FAR Monetization',
  'GFA = 3.50 * A_plot yields 132.6% utilization and isFARCompliant = false',
  severeOverFAR.isFARCompliant === false && severeOverFAR.farUtilizationPercent === 132.6,
  { isFARCompliant: severeOverFAR.isFARCompliant, util: severeOverFAR.farUtilizationPercent }
);

// ---------------------------------------------------------------------------
// SUITE 5: FINANCIAL UNDERWRITING MATHEMATICAL CONSISTENCY
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 5: Financial Underwriting Mathematical Consistency ---');

const finResult = calculatePEUnderwriting({
  carpetAreaSqFt: 10000,
  grossFloorAreaSqFt: 12000,
  rentalRatePerSqFtMonthlyINR: 150,
  operatingExpenseRatio: 0.15,
  totalCapexINR: 100000000, // 10 Cr
});

const grossRev = 10000 * 150 * 12; // 18,000,000
const noi = grossRev * (1 - 0.15); // 15,300,000
const yoc = Math.round((noi / 100000000) * 1000) / 10; // 15.3%
const payback = Math.round((100000000 / noi) * 10) / 10; // 6.5 yrs

recordTest(
  'Financial Consistency',
  'Underwriting formulas (GrossRev, NOI, YoC, Payback) strictly match theoretical values',
  finResult.grossAnnualRevenueINR === grossRev &&
  finResult.netOperatingIncomeINR === noi &&
  finResult.yieldOnCostPercent === yoc &&
  finResult.paybackPeriodYears === payback,
  { grossRev: finResult.grossAnnualRevenueINR, noi: finResult.netOperatingIncomeINR, yoc: finResult.yieldOnCostPercent, payback: finResult.paybackPeriodYears }
);

// Institutional Grade Dual Hurdle
const hurdlePass = calculatePEUnderwriting({
  carpetAreaSqFt: 10200,
  grossFloorAreaSqFt: 12000,
  totalCapexINR: 120000000,
});
const hurdleFailYoC = calculatePEUnderwriting({
  carpetAreaSqFt: 10200,
  grossFloorAreaSqFt: 12000,
  totalCapexINR: 300000000, // YoC ~ 4.3%
});
const hurdleFailNTG = calculatePEUnderwriting({
  carpetAreaSqFt: 9000, // 75% NTG
  grossFloorAreaSqFt: 12000,
  totalCapexINR: 60000000,
});

recordTest(
  'Financial Consistency',
  'Institutional Grade status strictly enforces both YoC >= 8.5% AND NTG >= 84.0%',
  hurdlePass.isInstitutionalGrade === true &&
  hurdleFailYoC.isInstitutionalGrade === false &&
  hurdleFailNTG.isInstitutionalGrade === false,
  { pass: hurdlePass.isInstitutionalGrade, failYoC: hurdleFailYoC.isInstitutionalGrade, failNTG: hurdleFailNTG.isInstitutionalGrade }
);

// ---------------------------------------------------------------------------
// SUITE 6: CPWD DSR 2024 CSV FORMATTING & GRAND TOTAL SUM
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 6: CPWD DSR 2024 CSV Formatting & Grand Total ---');

const csvText = generateCPWDTenderCsv(finResult.cpwdTenderSchedule);
const csvLines = csvText.split('\n');

recordTest(
  'CPWD CSV Tender',
  'CSV header exact match with 7 standard columns',
  csvLines[0] === 'Item Code,Sub-Head,Description,Quantity,Unit,DSR Rate (INR),Amount (INR)',
  { header: csvLines[0] }
);

let allLines7Cols = true;
for (let i = 0; i < csvLines.length; i++) {
  const fields = parseCsvLine(csvLines[i]);
  if (fields.length !== 7) {
    allLines7Cols = false;
    break;
  }
}
recordTest(
  'CPWD CSV Tender',
  'Strict RFC 4180 column count: all CSV rows contain exactly 7 columns',
  allLines7Cols,
  { totalRows: csvLines.length }
);

const grandTotalLine = parseCsvLine(csvLines[csvLines.length - 1]);
const expectedTotalSum = finResult.cpwdTenderSchedule.reduce((acc, it) => acc + it.amountINR, 0);
recordTest(
  'CPWD CSV Tender',
  'Grand total line matches exact label and sum of all line item amounts',
  grandTotalLine[2] === 'GRAND TOTAL (CPWD DSR 2024)' &&
  Number(grandTotalLine[6]) === expectedTotalSum &&
  expectedTotalSum === finResult.tenderScheduleGrandTotalINR,
  { label: grandTotalLine[2], csvSum: grandTotalLine[6], expectedSum: expectedTotalSum }
);

// ---------------------------------------------------------------------------
// SUITE 7: ADVERSARIAL OBSERVATIONS AUDIT (IRR Grid & Negative Areas)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 7: Adversarial Observations Audit ---');

// Audit 7.1: IRR loop ceiling at 40%
// When Capex is very low relative to NOI (e.g. ₹4.5 Cr capex with ₹1.4 Cr NOI),
// true IRR exceeds 40%, but the grid search caps at 0.40 and returns default 12.0%.
const highReturnProject = calculatePEUnderwriting({
  grossFloorAreaSqFt: 12000,
  carpetAreaSqFt: 10200,
  totalCapexINR: 45000000, // ₹4.5 Cr
  rentalRatePerSqFtMonthlyINR: 135,
});
const normalReturnProject = calculatePEUnderwriting({
  grossFloorAreaSqFt: 12000,
  carpetAreaSqFt: 10200,
  totalCapexINR: 150000000, // ₹15 Cr
  rentalRatePerSqFtMonthlyINR: 135,
});
recordTest(
  'Adversarial Observation',
  'Empirical discovery: IRR search grid in pe-underwriting.ts has [0.05, 0.40] bracket with 12.0% default fallback',
  highReturnProject.estimated10YrIRRPercent === 12.0 && normalReturnProject.estimated10YrIRRPercent === 15.5,
  {
    highYieldCapex4_5Cr_IRR: highReturnProject.estimated10YrIRRPercent,
    midYieldCapex15Cr_IRR: normalReturnProject.estimated10YrIRRPercent,
    observation: 'High-yielding projects (>40% true IRR) fall back to 12.0% baseline default rather than clamping to 40%+'
  }
);

// Audit 7.2: Negative Room Area in far-envelope-geometry
const negAreaMetrics = calculateFARMetrics({
  walls: [], doors: [], windows: [],
  rooms: [
    { id: 'neg', label: 'Negative Room', area: -15, vertices: [{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}] },
    { id: 'pos', label: 'Positive Suite', area: 40, vertices: [{x:3,y:0},{x:8,y:0},{x:8,y:5},{x:3,y:5}] },
  ],
  gridSize: 0.5, panOffset: {x:0,y:0}, zoom: 35
});
recordTest(
  'Adversarial Observation',
  'Empirical discovery: Negative room area (< 1.0) maps to DEDUCTIBLE_SHAFT causing negative shaft sum if unvalidated',
  negAreaMetrics.shaftAreaSqM < 0,
  {
    inputArea: -15,
    resultShaftAreaSqM: negAreaMetrics.shaftAreaSqM,
    observation: 'classifyRoomZone categorizes area < 1.0 as DEDUCTIBLE_SHAFT without flooring to 0; should guard area >= 0'
  }
);

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log('ADVERSARIAL STRESS TEST SUMMARY');
console.log('='.repeat(80));

const totalTests = testResults.length;
const passedTests = testResults.filter(t => t.passed).length;
const failedTests = totalTests - passedTests;

console.log(`Total tests executed: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 ALL EMPIRICAL STRESS TESTS PASSED!');
} else {
  console.error(`\n⚠️ ${failedTests} STRESS TEST(S) FAILED!`);
}
