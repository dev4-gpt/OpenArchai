#!/usr/bin/env node
/**
 * Empirical Adversarial Challenger Test Harness for Milestone M3 (Pillar 3).
 * Target: apps/web/src/lib/calculators/staircase-egress-calculator.ts
 *
 * Verifies:
 * 1. Blondel formula boundaries: 2R + T = 549mm, 550mm, 600mm, 650mm, 651mm
 * 2. Riser limits: R = 150mm (pass), R = 151mm (fail), R <= 0 (invalid / failure mode)
 * 3. Tread limits: T = 300mm (pass), T = 299mm (fail), T <= 0 (invalid / failure mode)
 * 4. Clear flight width: width = 1.50m (pass), width = 1.49m (fail)
 * 5. Stair capacity calculations under NBC Part 4 Table 4 rules (occupants per unit stairway width)
 * 6. Fire evacuation dossier structure: 50 Pa pressurization, FD 120 fire door count, travel distance compliance, 11-point safety checklist
 * 7. Multi-exit routing Euclidean distance calculations with multiple doors and edge cases (colinear, equidistant, 0 rooms, 0 doors)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);
const stairMod = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/staircase-egress-calculator.ts'));

const {
  calculateStaircaseCompliance,
  calculateStaircaseGeometry,
  resolveMultiExitRoutes,
  generateEvacuationDossier,
  generateFireEvacuationDossier,
  STAIRCASE_STATUTORY_LIMITS,
} = stairMod;

const results = [];

function recordTest(suite, testName, expectedBehavior, actualBehavior, pass, details) {
  results.push({
    suite,
    testName,
    expectedBehavior,
    actualBehavior,
    pass,
    details,
  });
  const mark = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] [${suite}] ${testName}`);
  console.log(`       Expected: ${expectedBehavior}`);
  console.log(`       Actual:   ${actualBehavior}`);
  if (details) {
    console.log(`       Details:  ${JSON.stringify(details)}`);
  }
}

console.log('='.repeat(80));
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE FOR PILLAR 3');
console.log('Target: apps/web/src/lib/calculators/staircase-egress-calculator.ts');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: BLONDEL ERGONOMIC FORMULA (2R + T) BOUNDARY CONDITIONS
// ============================================================================
console.log('\n--- SUITE 1: Blondel Formula Boundaries (549mm, 550mm, 600mm, 650mm, 651mm) ---');

// 1.1: 2R + T = 549mm (FAIL expected)
// R = 124.5mm (0.1245m), T = 300mm (0.300m) -> 2*124.5 + 300 = 549mm
const res_549 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.1245,
  treadDepthM: 0.30,
  totalRiseM: 3.00,
});
recordTest(
  'Blondel Formula',
  '2R + T = 549mm boundary check',
  'isErgonomicCompliant === false (FAIL)',
  `metric = ${res_549.ergonomicMetricMM}mm, isErgonomicCompliant = ${res_549.isErgonomicCompliant}, overallPass = ${res_549.overallPass}`,
  res_549.ergonomicMetricMM === 549 && res_549.isErgonomicCompliant === false && res_549.overallPass === false,
  { metric: res_549.ergonomicMetricMM, isErgoOk: res_549.isErgonomicCompliant }
);

// 1.2: 2R + T = 550mm (PASS expected)
// R = 125mm (0.125m), T = 300mm (0.300m) -> 2*125 + 300 = 550mm
const res_550 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.125,
  treadDepthM: 0.30,
  totalRiseM: 3.00,
});
recordTest(
  'Blondel Formula',
  '2R + T = 550mm exact lower statutory boundary',
  'isErgonomicCompliant === true (PASS)',
  `metric = ${res_550.ergonomicMetricMM}mm, isErgonomicCompliant = ${res_550.isErgonomicCompliant}, overallPass = ${res_550.overallPass}`,
  res_550.ergonomicMetricMM === 550 && res_550.isErgonomicCompliant === true && res_550.overallPass === true,
  { metric: res_550.ergonomicMetricMM, isErgoOk: res_550.isErgonomicCompliant }
);

// 1.3: 2R + T = 600mm (PASS expected - ideal standard)
// R = 150mm (0.150m), T = 300mm (0.300m) -> 2*150 + 300 = 600mm
const res_600 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
recordTest(
  'Blondel Formula',
  '2R + T = 600mm standard institutional configuration',
  'isErgonomicCompliant === true (PASS)',
  `metric = ${res_600.ergonomicMetricMM}mm, isErgonomicCompliant = ${res_600.isErgonomicCompliant}, overallPass = ${res_600.overallPass}`,
  res_600.ergonomicMetricMM === 600 && res_600.isErgonomicCompliant === true && res_600.overallPass === true,
  { metric: res_600.ergonomicMetricMM, isErgoOk: res_600.isErgonomicCompliant }
);

// 1.4: 2R + T = 650mm (PASS expected - exact upper boundary)
// R = 150mm (0.150m), T = 350mm (0.350m) -> 2*150 + 350 = 650mm
const res_650 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.350,
  totalRiseM: 3.00,
});
recordTest(
  'Blondel Formula',
  '2R + T = 650mm exact upper statutory boundary',
  'isErgonomicCompliant === true (PASS)',
  `metric = ${res_650.ergonomicMetricMM}mm, isErgonomicCompliant = ${res_650.isErgonomicCompliant}, overallPass = ${res_650.overallPass}`,
  res_650.ergonomicMetricMM === 650 && res_650.isErgonomicCompliant === true && res_650.overallPass === true,
  { metric: res_650.ergonomicMetricMM, isErgoOk: res_650.isErgonomicCompliant }
);

// 1.5: 2R + T = 651mm (FAIL expected)
// R = 150mm (0.150m), T = 351mm (0.351m) -> 2*150 + 351 = 651mm
const res_651 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.351,
  totalRiseM: 3.00,
});
recordTest(
  'Blondel Formula',
  '2R + T = 651mm exceeding upper statutory boundary',
  'isErgonomicCompliant === false (FAIL)',
  `metric = ${res_651.ergonomicMetricMM}mm, isErgonomicCompliant = ${res_651.isErgonomicCompliant}, overallPass = ${res_651.overallPass}`,
  res_651.ergonomicMetricMM === 651 && res_651.isErgonomicCompliant === false && res_651.overallPass === false,
  { metric: res_651.ergonomicMetricMM, isErgoOk: res_651.isErgonomicCompliant }
);

// ============================================================================
// SUITE 2: RISER LIMITS (R = 150mm PASS, R = 151mm FAIL, R <= 0 INVALID)
// ============================================================================
console.log('\n--- SUITE 2: Riser Limits (R = 150mm, R = 151mm, R <= 0) ---');

// 2.1: R = 150mm (0.150m) (PASS expected)
const res_r150 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
recordTest(
  'Riser Limits',
  'R = 150mm maximum statutory ceiling',
  'isRiserCompliant === true (PASS)',
  `isRiserCompliant = ${res_r150.isRiserCompliant}, overallPass = ${res_r150.overallPass}`,
  res_r150.isRiserCompliant === true && res_r150.overallPass === true,
  { riserM: 0.150, isRiserCompliant: res_r150.isRiserCompliant }
);

// 2.2: R = 151mm (0.151m) (FAIL expected per NBC 2016 Part 4 Cl. 4.4.2.4)
// NBC maximum is 150mm. 151mm violates statutory ceiling.
const res_r151 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.151,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
const r151_passed = res_r151.isRiserCompliant === false && res_r151.overallPass === false;
recordTest(
  'Riser Limits',
  'R = 151mm exceeding statutory maximum (0.151m > 0.150m)',
  'isRiserCompliant === false (FAIL) and overallPass === false',
  `isRiserCompliant = ${res_r151.isRiserCompliant}, overallPass = ${res_r151.overallPass}`,
  r151_passed,
  {
    riserM: 0.151,
    isRiserCompliant: res_r151.isRiserCompliant,
    overallPass: res_r151.overallPass,
    flaw: 'Due to +0.001 tolerance in line 102, 151mm erroneously passes!'
  }
);

// 2.3: R = 0mm (Invalid: infinite risers, division by zero)
const res_r0 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
const r0_is_invalid = res_r0.isRiserCompliant === false || !Number.isFinite(res_r0.riserCount);
recordTest(
  'Riser Limits',
  'R = 0mm degenerate division by zero',
  'isRiserCompliant === false (FAIL) or invalid/rejected, finite riser count',
  `isRiserCompliant = ${res_r0.isRiserCompliant}, riserCount = ${res_r0.riserCount}, risersPerFlight = ${res_r0.risersPerFlight}`,
  res_r0.isRiserCompliant === false && Number.isFinite(res_r0.riserCount),
  {
    riserCount: res_r0.riserCount,
    risersPerFlight: res_r0.risersPerFlight,
    isRiserCompliant: res_r0.isRiserCompliant,
    flaw: 'R=0 produces Infinity riserCount and NaN risersPerFlight, but isRiserCompliant reports TRUE'
  }
);

// 2.4: R = -150mm (Invalid: negative riser)
const res_r_neg = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: -0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
recordTest(
  'Riser Limits',
  'R = -150mm negative physical riser dimension',
  'isRiserCompliant === false (FAIL)',
  `isRiserCompliant = ${res_r_neg.isRiserCompliant}, riserCount = ${res_r_neg.riserCount}`,
  res_r_neg.isRiserCompliant === false,
  {
    riserM: -0.150,
    isRiserCompliant: res_r_neg.isRiserCompliant,
    riserCount: res_r_neg.riserCount,
    flaw: 'Negative riser produces negative risers but isRiserCompliant reports TRUE because -0.15 <= 0.151'
  }
);

// ============================================================================
// SUITE 3: TREAD LIMITS (T = 300mm PASS, T = 299mm FAIL, T <= 0 INVALID)
// ============================================================================
console.log('\n--- SUITE 3: Tread Limits (T = 300mm, T = 299mm, T <= 0) ---');

// 3.1: T = 300mm (0.300m) (PASS expected)
const res_t300 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
});
recordTest(
  'Tread Limits',
  'T = 300mm minimum statutory tread floor',
  'isTreadCompliant === true (PASS)',
  `isTreadCompliant = ${res_t300.isTreadCompliant}, overallPass = ${res_t300.overallPass}`,
  res_t300.isTreadCompliant === true && res_t300.overallPass === true,
  { treadM: 0.300, isTreadCompliant: res_t300.isTreadCompliant }
);

// 3.2: T = 299mm (0.299m) (FAIL expected per NBC 2016 Part 4 Cl. 4.4.2.4)
// NBC minimum is 300mm. 299mm violates statutory floor.
const res_t299 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.299,
  totalRiseM: 3.00,
});
const t299_passed = res_t299.isTreadCompliant === false && res_t299.overallPass === false;
recordTest(
  'Tread Limits',
  'T = 299mm sub-statutory tread depth (0.299m < 0.300m)',
  'isTreadCompliant === false (FAIL) and overallPass === false',
  `isTreadCompliant = ${res_t299.isTreadCompliant}, overallPass = ${res_t299.overallPass}`,
  t299_passed,
  {
    treadM: 0.299,
    isTreadCompliant: res_t299.isTreadCompliant,
    overallPass: res_t299.overallPass,
    flaw: 'Due to -0.001 tolerance in line 103, 299mm erroneously passes!'
  }
);

// 3.3: T = 0mm (Invalid)
const res_t0 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0,
  totalRiseM: 3.00,
});
recordTest(
  'Tread Limits',
  'T = 0mm degenerate zero tread depth',
  'isTreadCompliant === false (FAIL)',
  `isTreadCompliant = ${res_t0.isTreadCompliant}, overallPass = ${res_t0.overallPass}`,
  res_t0.isTreadCompliant === false && res_t0.overallPass === false,
  { treadM: 0, isTreadCompliant: res_t0.isTreadCompliant }
);

// 3.4: T = -300mm (Invalid)
const res_t_neg = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: -0.300,
  totalRiseM: 3.00,
});
recordTest(
  'Tread Limits',
  'T = -300mm negative physical tread depth',
  'isTreadCompliant === false (FAIL)',
  `isTreadCompliant = ${res_t_neg.isTreadCompliant}, overallPass = ${res_t_neg.overallPass}`,
  res_t_neg.isTreadCompliant === false && res_t_neg.overallPass === false,
  { treadM: -0.300, isTreadCompliant: res_t_neg.isTreadCompliant }
);

// ============================================================================
// SUITE 4: CLEAR FLIGHT WIDTH (width = 1.50m PASS, width = 1.49m FAIL)
// ============================================================================
console.log('\n--- SUITE 4: Clear Flight Width (1.50m, 1.49m, Low-Rise, Commercial) ---');

// 4.1: width = 1.50m for residential high-rise (>15m) (PASS expected)
const res_w150 = calculateStaircaseCompliance({
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
  buildingHeightM: 24.0,
  occupancyType: 'residential',
});
recordTest(
  'Clear Flight Width',
  'Width = 1.50m residential high-rise (>15m)',
  'isWidthCompliant === true (PASS)',
  `required = ${res_w150.requiredWidthM}m, isWidthCompliant = ${res_w150.isWidthCompliant}`,
  res_w150.isWidthCompliant === true && res_w150.requiredWidthM === 1.50,
  { width: 1.50, required: res_w150.requiredWidthM }
);

// 4.2: width = 1.49m for residential high-rise (>15m) (FAIL expected)
const res_w149 = calculateStaircaseCompliance({
  flightWidthM: 1.49,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
  buildingHeightM: 24.0,
  occupancyType: 'residential',
});
recordTest(
  'Clear Flight Width',
  'Width = 1.49m residential high-rise (>15m)',
  'isWidthCompliant === false (FAIL)',
  `required = ${res_w149.requiredWidthM}m, isWidthCompliant = ${res_w149.isWidthCompliant}`,
  res_w149.isWidthCompliant === false && res_w149.overallPass === false,
  { width: 1.49, required: res_w149.requiredWidthM }
);

// 4.3: Low-rise residential (<= 15m) width requirement is 1.00m
const res_w_lowrise = calculateStaircaseCompliance({
  flightWidthM: 1.00,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
  buildingHeightM: 12.0,
  occupancyType: 'residential',
});
recordTest(
  'Clear Flight Width',
  'Width = 1.00m residential low-rise (<=15m)',
  'requiredWidthM === 1.00m and isWidthCompliant === true (PASS)',
  `required = ${res_w_lowrise.requiredWidthM}m, isWidthCompliant = ${res_w_lowrise.isWidthCompliant}`,
  res_w_lowrise.requiredWidthM === 1.00 && res_w_lowrise.isWidthCompliant === true,
  { width: 1.00, required: res_w_lowrise.requiredWidthM }
);

// 4.4: Commercial / Assembly width requirement is 2.00m
const res_w_comm = calculateStaircaseCompliance({
  flightWidthM: 1.80,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
  occupancyType: 'commercial',
});
recordTest(
  'Clear Flight Width',
  'Width = 1.80m for commercial (requires 2.00m)',
  'requiredWidthM === 2.00m and isWidthCompliant === false (FAIL)',
  `required = ${res_w_comm.requiredWidthM}m, isWidthCompliant = ${res_w_comm.isWidthCompliant}`,
  res_w_comm.requiredWidthM === 2.00 && res_w_comm.isWidthCompliant === false,
  { width: 1.80, required: res_w_comm.requiredWidthM }
);

// ============================================================================
// SUITE 5: NBC PART 4 TABLE 4 STAIR CAPACITY CALCULATIONS
// ============================================================================
console.log('\n--- SUITE 5: Stair Capacity (NBC Part 4 Table 4: 25 persons/unit) ---');

// 5.1: 1.50m width -> 3 units of 500mm -> 75 persons capacity
const dossier75 = generateFireEvacuationDossier({
  flightWidthM: 1.50,
  occupantLoad: 75,
});
recordTest(
  'Stair Capacity',
  '1.50m width with 75 occupants (exact capacity: 3 units * 25)',
  'stairwayUnits === 3, totalStairCapacityPersons === 75, isCapacityAdequate === true',
  `units = ${dossier75.exitCapacities.stairwayUnits}, capacity = ${dossier75.exitCapacities.totalStairCapacityPersons}, adequate = ${dossier75.exitCapacities.isCapacityAdequate}`,
  dossier75.exitCapacities.stairwayUnits === 3 &&
  dossier75.exitCapacities.totalStairCapacityPersons === 75 &&
  dossier75.exitCapacities.isCapacityAdequate === true,
  dossier75.exitCapacities
);

// 5.2: 1.50m width with 76 occupants (capacity exceeded)
const dossier76 = generateFireEvacuationDossier({
  flightWidthM: 1.50,
  occupantLoad: 76,
});
recordTest(
  'Stair Capacity',
  '1.50m width with 76 occupants (capacity deficient)',
  'isCapacityAdequate === false',
  `capacity = ${dossier76.exitCapacities.totalStairCapacityPersons}, load = ${dossier76.occupantLoad}, adequate = ${dossier76.exitCapacities.isCapacityAdequate}`,
  dossier76.exitCapacities.isCapacityAdequate === false,
  dossier76.exitCapacities
);

// 5.3: Fractional stair widths (e.g., 1.49m width -> 2 units of 500mm -> 50 persons capacity)
const dossier149 = generateFireEvacuationDossier({
  flightWidthM: 1.49,
  occupantLoad: 50,
});
recordTest(
  'Stair Capacity',
  '1.49m width unit rounding (floor(1.49 / 0.5) = 2 units)',
  'stairwayUnits === 2, totalStairCapacityPersons === 50, isCapacityAdequate === true',
  `units = ${dossier149.exitCapacities.stairwayUnits}, capacity = ${dossier149.exitCapacities.totalStairCapacityPersons}`,
  dossier149.exitCapacities.stairwayUnits === 2 &&
  dossier149.exitCapacities.totalStairCapacityPersons === 50,
  dossier149.exitCapacities
);

// 5.4: Automatic occupant load calculation from floor plan rooms (9.3 m2/person)
const mockPlan = {
  rooms: [
    { id: 'r1', label: 'Suite A', area: 93.0, vertices: [] },
    { id: 'r2', label: 'Suite B', area: 93.0, vertices: [] },
  ],
  walls: [],
  doors: [],
  windows: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};
const dossierPlan = generateFireEvacuationDossier({}, mockPlan);
// 186.0 / 9.3 = 20 occupants
recordTest(
  'Stair Capacity',
  'Automatic occupant load derivation from floor plan (186 m2 / 9.3 = 20 persons)',
  'occupantLoad === 20, isCapacityAdequate === true',
  `occupantLoad = ${dossierPlan.occupantLoad}, capacity = ${dossierPlan.exitCapacities.totalStairCapacityPersons}`,
  dossierPlan.occupantLoad === 20 && dossierPlan.exitCapacities.isCapacityAdequate === true,
  { occupantLoad: dossierPlan.occupantLoad }
);

// ============================================================================
// SUITE 6: FIRE EVACUATION DOSSIER STRUCTURE & 11-POINT SAFETY CHECKLIST
// ============================================================================
console.log('\n--- SUITE 6: Fire Evacuation Dossier Structure & 11-Point Checklist ---');

const dossierFull = generateFireEvacuationDossier({
  projectName: 'AtelierOS Test Sanctuary',
  flightWidthM: 1.50,
  riserHeightM: 0.150,
  treadDepthM: 0.300,
  totalRiseM: 3.00,
  buildingHeightM: 24.0,
  occupantLoad: 25,
  furthestTravelDistanceM: 22.0,
});

// 6.1: 50 Pa positive pressurization
recordTest(
  'Dossier Structure',
  '50 Pa Positive Pressure stairwell parameter',
  'pressurizationPa === 50 in object, markdown, and json',
  `pressurizationPa = ${dossierFull.pressurizationPa}`,
  dossierFull.pressurizationPa === 50 &&
  dossierFull.dossierMarkdown.includes('50 Pa') &&
  dossierFull.dossierJson.includes('"pressurizationPa": 50'),
  { pressurizationPa: dossierFull.pressurizationPa }
);

// 6.2: FD 120 fire door rating
recordTest(
  'Dossier Structure',
  'FD 120 (2-hour fire door) rating specification',
  'fireDoorRating includes "FD 120" and IS 3614 citation',
  `fireDoorRating = ${dossierFull.fireDoorRating}`,
  dossierFull.fireDoorRating.includes('FD 120') && dossierFull.fireDoorRating.includes('IS 3614'),
  { fireDoorRating: dossierFull.fireDoorRating }
);

// 6.3: Fire door count in dossier structure
// Does the dossier track or report the COUNT of fire doors?
const hasFireDoorCountProperty = 'fireDoorCount' in dossierFull || (typeof dossierFull.fireDoors === 'object' && 'count' in dossierFull.fireDoors);
recordTest(
  'Dossier Structure',
  'FD 120 fire door count tracked in dossier data structure',
  'Explicit fire door count property or breakdown in dossier',
  `hasFireDoorCount = ${hasFireDoorCountProperty}, fireDoorRating = ${dossierFull.fireDoorRating}`,
  hasFireDoorCountProperty,
  {
    hasFireDoorCountProperty,
    observation: 'FireEvacuationDossier contains fireDoorRating (string) but omits explicit fire door count property'
  }
);

// 6.4: Travel distance compliance check
recordTest(
  'Dossier Structure',
  'Egress travel distance compliance evaluation (22m <= 30m max)',
  'Checklist item "Egress Travel Distance to Primary Exit" is PASS',
  `Travel item status = ${dossierFull.lifeSafetyChecklist.find(c => c.item.includes('Travel Distance'))?.status}`,
  dossierFull.lifeSafetyChecklist.find(c => c.item.includes('Travel Distance'))?.status === 'PASS',
  { furthestTravelDistanceM: 22.0 }
);

// 6.5: Travel distance failure when exceeding 30m
const dossierOverTravel = generateFireEvacuationDossier({
  furthestTravelDistanceM: 35.0,
});
recordTest(
  'Dossier Structure',
  'Egress travel distance violation (35m > 30m max)',
  'Checklist item "Egress Travel Distance to Primary Exit" is FAIL',
  `Travel item status = ${dossierOverTravel.lifeSafetyChecklist.find(c => c.item.includes('Travel Distance'))?.status}`,
  dossierOverTravel.lifeSafetyChecklist.find(c => c.item.includes('Travel Distance'))?.status === 'FAIL',
  { furthestTravelDistanceM: 35.0 }
);

// 6.6: Exact 11-point safety checklist verification
const expectedChecklistItems = [
  'Stairway Clear Width',
  'Staircase Maximum Riser Height',
  'Staircase Minimum Tread Depth',
  'Blondel Ergonomic Formula (2R + T)',
  'Maximum Risers per Flight',
  'Intermediate Landing Depth',
  'Positive Staircase Pressurization',
  'Fire Resistance of Staircase Enclosure & Doors',
  'Egress Travel Distance to Primary Exit',
  'First-Aid Fire Hose Reel Coverage',
  'Stairway Discharge & Occupant Capacity',
];

const actualItems = dossierFull.lifeSafetyChecklist.map(c => c.item);
const checklistHas11Items = dossierFull.lifeSafetyChecklist.length === 11;
const all11ItemsMatch = expectedChecklistItems.every(exp => actualItems.includes(exp));

recordTest(
  'Dossier Structure',
  '11-point statutory life safety checklist completeness',
  'Exactly 11 items matching statutory requirements',
  `actual count = ${dossierFull.lifeSafetyChecklist.length}`,
  checklistHas11Items && all11ItemsMatch,
  { actualCount: dossierFull.lifeSafetyChecklist.length, items: actualItems }
);

// 6.7: Triple export format availability (JSON, HTML, Markdown)
recordTest(
  'Dossier Structure',
  'Triple output serialization (JSON, HTML, Markdown)',
  'All 3 formats non-empty and well-formed',
  `markdown: ${dossierFull.dossierMarkdown.length} chars, html: ${dossierFull.dossierHtml.length} chars, json: ${dossierFull.dossierJson.length} chars`,
  dossierFull.dossierMarkdown.length > 100 &&
  dossierFull.dossierHtml.includes('<!DOCTYPE html>') &&
  JSON.parse(dossierFull.dossierJson).pressurizationPa === 50,
  {
    mdLength: dossierFull.dossierMarkdown.length,
    htmlLength: dossierFull.dossierHtml.length,
    jsonLength: dossierFull.dossierJson.length,
  }
);

// ============================================================================
// SUITE 7: MULTI-EXIT ROUTING EUCLIDEAN DISTANCE & EDGE CASES
// ============================================================================
console.log('\n--- SUITE 7: Multi-Exit Routing Euclidean Distance & Edge Cases ---');

// 7.1: Degenerate edge case: 0 rooms (empty retreatPoints)
const routes_0rooms = resolveMultiExitRoutes([], [{ id: 'exit1', position: { x: 10, y: 10 } }]);
recordTest(
  'Multi-Exit Routing',
  '0 rooms (empty retreat points) handles gracefully',
  'returns empty array []',
  `result = ${JSON.stringify(routes_0rooms)}`,
  Array.isArray(routes_0rooms) && routes_0rooms.length === 0,
  { routes_0rooms }
);

// 7.2: Degenerate edge case: 0 doors (empty exits)
const routes_0doors = resolveMultiExitRoutes([{ x: 5, y: 5 }], []);
recordTest(
  'Multi-Exit Routing',
  '0 exits / doors handles gracefully',
  'returns empty array [] without crash or throw',
  `result = ${JSON.stringify(routes_0doors)}`,
  Array.isArray(routes_0doors) && routes_0doors.length === 0,
  { routes_0doors }
);

// 7.3: Degenerate edge case: 0 rooms AND 0 doors
const routes_empty = resolveMultiExitRoutes([], []);
recordTest(
  'Multi-Exit Routing',
  '0 rooms AND 0 doors handles gracefully',
  'returns empty array []',
  `result = ${JSON.stringify(routes_empty)}`,
  Array.isArray(routes_empty) && routes_empty.length === 0,
  { routes_empty }
);

// 7.4: Euclidean distance accuracy with multiple doors
// Exit 1 at (0, 0), Exit 2 at (20, 0), Exit 3 at (0, 20), Exit 4 at (20, 20)
// Point at (3, 4) -> Distance to Exit 1 is sqrt(3^2 + 4^2) = 5.0m
const exits4 = [
  { id: 'exit-sw', position: { x: 0, y: 0 } },
  { id: 'exit-se', position: { x: 20, y: 0 } },
  { id: 'exit-nw', position: { x: 0, y: 20 } },
  { id: 'exit-ne', position: { x: 20, y: 20 } },
];
const pt_3_4 = [{ x: 3, y: 4 }];
const routes_dist = resolveMultiExitRoutes(pt_3_4, exits4);
recordTest(
  'Multi-Exit Routing',
  'Euclidean distance calculation accuracy: hypot(3, 4) = 5.0m',
  'exitId === "exit-sw", travelDistanceM === 5.0',
  `exitId = ${routes_dist[0]?.exitId}, travelDistanceM = ${routes_dist[0]?.travelDistanceM}`,
  routes_dist[0]?.exitId === 'exit-sw' && routes_dist[0]?.travelDistanceM === 5.0,
  routes_dist[0]
);

// 7.5: Nearest door allocation across 4 quadrants
const quadPoints = [
  { x: 2, y: 2 },   // SW quadrant -> exit-sw (dist = sqrt(8) ~ 2.8)
  { x: 18, y: 2 },  // SE quadrant -> exit-se
  { x: 2, y: 18 },  // NW quadrant -> exit-nw
  { x: 18, y: 18 }, // NE quadrant -> exit-ne
];
const routes_quad = resolveMultiExitRoutes(quadPoints, exits4);
const quadAllocCorrect =
  routes_quad[0]?.exitId === 'exit-sw' &&
  routes_quad[1]?.exitId === 'exit-se' &&
  routes_quad[2]?.exitId === 'exit-nw' &&
  routes_quad[3]?.exitId === 'exit-ne';
recordTest(
  'Multi-Exit Routing',
  'Optimal nearest-door allocation across all 4 quadrants',
  'Allocates [exit-sw, exit-se, exit-nw, exit-ne]',
  `Allocated: ${routes_quad.map(r => r.exitId).join(', ')}`,
  quadAllocCorrect,
  routes_quad.map(r => ({ pt: r.retreatPoint, exit: r.exitId, dist: r.travelDistanceM }))
);

// 7.6: Equidistant doors edge case: room equidistant from two exit doors
// Exit 1 at (0, 10), Exit 2 at (20, 10), Room at (10, 10)
// Distance to both exits is exactly 10.0m.
const exitsEquidistant = [
  { id: 'exit-left', position: { x: 0, y: 10 } },
  { id: 'exit-right', position: { x: 20, y: 10 } },
];
const routes_equi = resolveMultiExitRoutes([{ x: 10, y: 10 }], exitsEquidistant);
recordTest(
  'Multi-Exit Routing',
  'Equidistant doors deterministic resolution (d1 = d2 = 10.0m)',
  'Deterministically selects first encounter without crash, distance = 10.0m',
  `exitId = ${routes_equi[0]?.exitId}, travelDistanceM = ${routes_equi[0]?.travelDistanceM}`,
  routes_equi[0]?.exitId === 'exit-left' && routes_equi[0]?.travelDistanceM === 10.0,
  routes_equi[0]
);

// 7.7: Rooms colinear with doors (horizontal axis: y=0)
// Exit 1 at (0, 0), Exit 2 at (20, 0), Room at (5, 0)
const exitsColinear = [
  { id: 'exit-start', position: { x: 0, y: 0 } },
  { id: 'exit-end', position: { x: 20, y: 0 } },
];
const routes_colinear = resolveMultiExitRoutes([{ x: 5, y: 0 }], exitsColinear);
recordTest(
  'Multi-Exit Routing',
  'Room colinear with doors on horizontal axis (y=0)',
  'exitId === "exit-start", travelDistanceM === 5.0, waypoints deduplicated into [start, exit]',
  `exitId = ${routes_colinear[0]?.exitId}, travelDistanceM = ${routes_colinear[0]?.travelDistanceM}, waypoints = ${routes_colinear[0]?.routeWaypoints?.length}`,
  routes_colinear[0]?.exitId === 'exit-start' &&
  routes_colinear[0]?.travelDistanceM === 5.0 &&
  routes_colinear[0]?.routeWaypoints?.length === 2,
  { waypoints: routes_colinear[0]?.routeWaypoints }
);

// 7.8: Waypoint deduplication inspection for colinear horizontal path:
// pt = (5, 0), nearest = (0, 0).
// Check that adjacent waypoints are deduplicated (no redundant duplicate points)
const wp = routes_colinear[0]?.routeWaypoints || [];
const hasDuplicateAdjacentWaypoints = wp.some(
  (p, idx) => idx > 0 && p.x === wp[idx - 1].x && p.y === wp[idx - 1].y
);

recordTest(
  'Multi-Exit Routing',
  'Colinear waypoint deduplication check',
  'Adjacent duplicate waypoints filtered out (hasDuplicateAdjacentWaypoints === false, length === 2)',
  `hasDuplicateAdjacentWaypoints = ${hasDuplicateAdjacentWaypoints}, waypointsCount = ${wp.length}`,
  !hasDuplicateAdjacentWaypoints && wp.length === 2 && wp.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)),
  { waypoints: wp, hasDuplicateAdjacentWaypoints }
);

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('ADVERSARIAL STRESS TEST SUMMARY FOR PILLAR 3');
console.log('='.repeat(80));

const passCount = results.filter(r => r.pass).length;
const failCount = results.filter(r => !r.pass).length;

console.log(`Total Adversarial Tests: ${results.length}`);
console.log(`Passed (Compliant / Robust): ${passCount}`);
console.log(`Failed (Vulnerabilities / Non-Compliances): ${failCount}`);
console.log('='.repeat(80));

for (const r of results) {
  if (!r.pass) {
    console.log(`\n❌ DEFECT REPORTED: [${r.suite}] ${r.testName}`);
    console.log(`   Expected: ${r.expectedBehavior}`);
    console.log(`   Actual:   ${r.actualBehavior}`);
    console.log(`   Details:  ${JSON.stringify(r.details)}`);
  }
}
