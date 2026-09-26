#!/usr/bin/env node
/**
 * Extended Empirical Adversarial Stress Test Suite for AtelierOS NBC 2016 Calculators and Geometry Linter.
 * Challenger 1 (teamwork_preview_challenger)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);

const nbcEgress = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/nbc-egress.ts'));
const egressOverlay = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/egress-overlay-geometry.ts'));
const geometryLinter = await jiti.import(path.resolve(webRoot, 'src/lib/calculators/geometry-linter.ts'));

const {
  NBC,
  calcOccupantLoad,
  calcRequiredEgressWidthMm,
  verifyEgressClearWidth,
  verifyTravelDistance,
  verifyDeadEnd,
  generateEgressProof,
} = nbcEgress;

const {
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
} = egressOverlay;

const {
  STATUTORY_THRESHOLDS,
  checkDoorClearances,
  checkCorridorClearances,
  checkDeadEndCorridors,
  lintFloorPlanGeometry,
  getLinterSummary,
} = geometryLinter;

const results = [];

function recordTest(suite, name, passed, details) {
  results.push({ suite, name, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] [${suite}] ${name}`);
  if (details) {
    console.log(`       Details: ${JSON.stringify(details)}`);
  }
}

console.log('='.repeat(80));
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE');
console.log('='.repeat(80));

// ---------------------------------------------------------------------------
// SUITE 1: Extreme Boundary Conditions — Door Clear Widths (0.899, 0.900, 0.901m)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 1: Door Clear Width Boundaries ---');

const door_899 = verifyEgressClearWidth(0.899, false);
recordTest('Door Clear Width', 'nbc-egress verifyEgressClearWidth(0.899) fails', !door_899.pass, {
  pass: door_899.pass,
  value: door_899.value,
  limit: door_899.limit,
});

const door_900 = verifyEgressClearWidth(0.900, false);
recordTest('Door Clear Width', 'nbc-egress verifyEgressClearWidth(0.900) passes', door_900.pass, {
  pass: door_900.pass,
  value: door_900.value,
  limit: door_900.limit,
});

const door_901 = verifyEgressClearWidth(0.901, false);
recordTest('Door Clear Width', 'nbc-egress verifyEgressClearWidth(0.901) passes', door_901.pass, {
  pass: door_901.pass,
  value: door_901.value,
  limit: door_901.limit,
});

const doorIssues_899 = checkDoorClearances([{ id: 'd_test', position: { x: 0, y: 0 }, width: 0.899 }]);
const d899_flagged = doorIssues_899.length === 1 && doorIssues_899[0].type === 'door_pinch';
recordTest('Door Clear Width', 'geometry-linter checkDoorClearances(0.899) flags pinch', d899_flagged, {
  issuesCount: doorIssues_899.length,
  message: doorIssues_899[0]?.message,
  actualWidthM: doorIssues_899[0]?.actualWidthM,
});

const d899_message = doorIssues_899[0]?.message || '';
const hasMisleadingDoorRounding = d899_message.includes('0.90m < 0.90m');
recordTest('Door Clear Width', 'geometry-linter message rounding anomaly (0.90m < 0.90m)', !hasMisleadingDoorRounding, {
  misleadingTextFound: hasMisleadingDoorRounding,
  verbatimMessage: d899_message,
});

const doorIssues_900 = checkDoorClearances([{ id: 'd_test', position: { x: 0, y: 0 }, width: 0.900 }]);
recordTest('Door Clear Width', 'geometry-linter checkDoorClearances(0.900) passes without issues', doorIssues_900.length === 0, {
  issuesCount: doorIssues_900.length,
});

const doorIssues_901 = checkDoorClearances([{ id: 'd_test', position: { x: 0, y: 0 }, width: 0.901 }]);
recordTest('Door Clear Width', 'geometry-linter checkDoorClearances(0.901) passes without issues', doorIssues_901.length === 0, {
  issuesCount: doorIssues_901.length,
});

// ---------------------------------------------------------------------------
// SUITE 2: Extreme Boundary Conditions — Common Corridors (1.199, 1.200, 1.201m)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 2: Common Corridor Width Boundaries ---');

const corr_1199 = verifyEgressClearWidth(1.199, true);
recordTest('Common Corridor', 'nbc-egress verifyEgressClearWidth(1.199, true) fails', !corr_1199.pass, {
  pass: corr_1199.pass,
  value: corr_1199.value,
  limit: corr_1199.limit,
});

const corr_1200 = verifyEgressClearWidth(1.200, true);
recordTest('Common Corridor', 'nbc-egress verifyEgressClearWidth(1.200, true) passes', corr_1200.pass, {
  pass: corr_1200.pass,
  value: corr_1200.value,
  limit: corr_1200.limit,
});

const corr_1201 = verifyEgressClearWidth(1.201, true);
recordTest('Common Corridor', 'nbc-egress verifyEgressClearWidth(1.201, true) passes', corr_1201.pass, {
  pass: corr_1201.pass,
  value: corr_1201.value,
  limit: corr_1201.limit,
});

const walls_1199 = [
  { id: 'w1', start: { x: 0, y: 0 }, end: { x: 0, y: 4 }, thickness: 0.2 },
  { id: 'w2', start: { x: 1.399, y: 0 }, end: { x: 1.399, y: 4 }, thickness: 0.2 },
];
const corrIssues_1199 = checkCorridorClearances(walls_1199, { isCommonCorridor: true });
recordTest('Common Corridor', 'geometry-linter checkCorridorClearances flags 1.199m common corridor', corrIssues_1199.length === 1, {
  issuesCount: corrIssues_1199.length,
  issue: corrIssues_1199[0],
});

const c1199_message = corrIssues_1199[0]?.message || '';
const hasMisleadingCorrRounding = c1199_message.includes('1.20m < 1.20m');
recordTest('Common Corridor', 'geometry-linter message rounding anomaly (1.20m < 1.20m)', !hasMisleadingCorrRounding, {
  misleadingTextFound: hasMisleadingCorrRounding,
  verbatimMessage: c1199_message,
  actualWidthM: corrIssues_1199[0]?.actualWidthM,
});

const walls_1200 = [
  { id: 'w1', start: { x: 0, y: 0 }, end: { x: 0, y: 4 }, thickness: 0.2 },
  { id: 'w2', start: { x: 1.400, y: 0 }, end: { x: 1.400, y: 4 }, thickness: 0.2 },
];
const corrIssues_1200 = checkCorridorClearances(walls_1200, { isCommonCorridor: true });
recordTest('Common Corridor', 'geometry-linter checkCorridorClearances(1.200) passes without issues', corrIssues_1200.length === 0, {
  issuesCount: corrIssues_1200.length,
});

const walls_1201 = [
  { id: 'w1', start: { x: 0, y: 0 }, end: { x: 0, y: 4 }, thickness: 0.2 },
  { id: 'w2', start: { x: 1.401, y: 0 }, end: { x: 1.401, y: 4 }, thickness: 0.2 },
];
const corrIssues_1201 = checkCorridorClearances(walls_1201, { isCommonCorridor: true });
recordTest('Common Corridor', 'geometry-linter checkCorridorClearances(1.201) passes without issues', corrIssues_1201.length === 0, {
  issuesCount: corrIssues_1201.length,
});

// ---------------------------------------------------------------------------
// SUITE 3: Extreme Boundary Conditions — Dead Ends (5.99m, 6.00m, 6.01m)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 3: Dead End Circulation Boundaries ---');

const de_599 = verifyDeadEnd(5.99);
recordTest('Dead End', 'nbc-egress verifyDeadEnd(5.99) passes', de_599.pass, de_599);

const de_600 = verifyDeadEnd(6.00);
recordTest('Dead End', 'nbc-egress verifyDeadEnd(6.00) passes', de_600.pass, de_600);

const de_601 = verifyDeadEnd(6.01);
recordTest('Dead End', 'nbc-egress verifyDeadEnd(6.01) fails', !de_601.pass, de_601);

const plan_deadend_604 = {
  rooms: [
    {
      id: 'r_deadend_corridor',
      label: 'Main Corridor',
      vertices: [
        { x: 0, y: 0 },
        { x: 1.2, y: 0 },
        { x: 1.2, y: 6.04 },
        { x: 0, y: 6.04 },
      ],
      area: 7.248,
    },
  ],
  doors: [
    { id: 'd_entry', position: { x: 0.6, y: 0 }, width: 1.0 },
  ],
  walls: [],
};
const deadEndIssues_604 = checkDeadEndCorridors(plan_deadend_604);
const de604_message = deadEndIssues_604[0]?.message || '';
const hasMisleadingDeadEndRounding = de604_message.includes('6.0m > 6.0m');
recordTest('Dead End', 'geometry-linter dead-end message rounding anomaly (6.0m > 6.0m)', !hasMisleadingDeadEndRounding, {
  issuesCount: deadEndIssues_604.length,
  misleadingTextFound: hasMisleadingDeadEndRounding,
  verbatimMessage: de604_message,
  actualLen: deadEndIssues_604[0]?.deadEndLengthM,
});

// ---------------------------------------------------------------------------
// SUITE 4: Extreme Boundary Conditions — Travel Distance (29.99m, 30.00m, 30.01m)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 4: Travel Distance Boundaries ---');

const td_2999 = verifyTravelDistance(29.99, false);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(29.99, false) passes', td_2999.pass, td_2999);

const td_3000 = verifyTravelDistance(30.00, false);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(30.00, false) passes', td_3000.pass, td_3000);

const td_3001 = verifyTravelDistance(30.01, false);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(30.01, false) fails', !td_3001.pass, td_3001);

const td_sprink_4499 = verifyTravelDistance(44.99, true);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(44.99, true) passes', td_sprink_4499.pass, td_sprink_4499);

const td_sprink_4500 = verifyTravelDistance(45.00, true);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(45.00, true) passes', td_sprink_4500.pass, td_sprink_4500);

const td_sprink_4501 = verifyTravelDistance(45.01, true);
recordTest('Travel Distance', 'nbc-egress verifyTravelDistance(45.01, true) fails', !td_sprink_4501.pass, td_sprink_4501);

// ---------------------------------------------------------------------------
// SUITE 5: Zero Walls / Empty / Degenerate Floor Plans
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 5: Zero Walls and Empty / Degenerate Floor Plans ---');

const emptyPlan = {
  walls: [],
  doors: [],
  windows: [],
  rooms: [],
};

try {
  const overlayEmpty = calculateEgressOverlay(emptyPlan);
  recordTest('Degenerate Geometry', 'calculateEgressOverlay handles empty plan gracefully without crashing', true, {
    waypointsCount: overlayEmpty.waypoints.length,
    travelDistanceM: overlayEmpty.travelDistanceM,
  });
} catch (err) {
  recordTest('Degenerate Geometry', 'calculateEgressOverlay handles empty plan gracefully without crashing', false, {
    error: err.message,
  });
}

try {
  const linterEmpty = lintFloorPlanGeometry(emptyPlan);
  recordTest('Degenerate Geometry', 'lintFloorPlanGeometry handles empty plan gracefully without crashing', Array.isArray(linterEmpty) && linterEmpty.length === 0, {
    issuesCount: linterEmpty?.length,
  });
} catch (err) {
  recordTest('Degenerate Geometry', 'lintFloorPlanGeometry handles empty plan gracefully without crashing', false, {
    error: err.message,
  });
}

try {
  calculateEgressOverlay(undefined);
  recordTest('Degenerate Geometry', 'calculateEgressOverlay handles undefined plan without throwing TypeError', true, {});
} catch (err) {
  recordTest('Degenerate Geometry', 'calculateEgressOverlay handles undefined plan without throwing TypeError', false, {
    error: err.message,
  });
}

// ---------------------------------------------------------------------------
// SUITE 6: Non-Standard Shapes & Diagonal Corridors
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 6: Non-Standard Shapes & Diagonal Corridors ---');

const diagonalWalls = [
  { id: 'w_diag1', start: { x: 0, y: 0 }, end: { x: 5, y: 5 }, thickness: 0.2 },
  { id: 'w_diag2', start: { x: -0.6364, y: 0.6364 }, end: { x: 4.3636, y: 5.6364 }, thickness: 0.2 },
];
const diagIssues = checkCorridorClearances(diagonalWalls, { isCommonCorridor: false });
recordTest('Non-Standard Shapes', 'geometry-linter detects 0.70m diagonal corridor pinch point', diagIssues.length > 0, {
  detectedIssues: diagIssues.length,
  note: 'Diagonal walls have dx > 0.05 and dy > 0.05, completely skipped by axis-aligned check!',
});

const walls_severe_pinch_200mm = [
  { id: 'w1', start: { x: 0, y: 0 }, end: { x: 0, y: 4 }, thickness: 0.2 },
  { id: 'w2', start: { x: 0.40, y: 0 }, end: { x: 0.40, y: 4 }, thickness: 0.2 },
];
const severePinchIssues = checkCorridorClearances(walls_severe_pinch_200mm);
recordTest('Non-Standard Shapes', 'geometry-linter detects extreme corridor pinch < 0.25m (0.20m clear width)', severePinchIssues.length > 0, {
  detectedIssues: severePinchIssues.length,
  note: 'Code has clearWidth > 0.25 check, so extreme 200mm pinch is completely ignored!',
});

// Non-convex L-shaped room: does findFurthestRetreatPoint land outside room?
const lShapedPlan = {
  walls: [],
  doors: [{ id: 'd_main', position: { x: 0, y: 0 }, width: 1.0 }],
  rooms: [
    {
      id: 'r_l_shaped',
      label: 'L Lounge',
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 10 },
        { x: 0, y: 10 },
      ],
      area: 51,
    },
  ],
};
const lRetreat = findFurthestRetreatPoint(lShapedPlan, { x: 0, y: 0 });
recordTest('Non-Standard Shapes', 'findFurthestRetreatPoint resolves valid retreat in L-shaped room', typeof lRetreat.x === 'number' && typeof lRetreat.y === 'number', {
  retreatPoint: lRetreat,
});

// ---------------------------------------------------------------------------
// SUITE 7: Multiple Exits Handling
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 7: Multiple Exits Handling ---');

const multiExitPlan = {
  walls: [
    { id: 'w_n', start: { x: 0, y: 0 }, end: { x: 40, y: 0 }, thickness: 0.2 },
  ],
  doors: [
    { id: 'd_entry_west', position: { x: 0, y: 0 }, width: 1.0 },
    { id: 'd_exit_east', position: { x: 40, y: 0 }, width: 1.0 },
  ],
  rooms: [
    {
      id: 'r_west',
      label: 'West Room',
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }],
      area: 50,
    },
    {
      id: 'r_east',
      label: 'East Room',
      vertices: [{ x: 30, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 5 }, { x: 30, y: 5 }],
      area: 50,
    },
  ],
};

const overlayMultiExit = calculateEgressOverlay(multiExitPlan);
const pickedExit = overlayMultiExit.exitDoor;
const travelDist = overlayMultiExit.travelDistanceM;

recordTest('Multiple Exits', 'calculateEgressOverlay picks nearest exit vs single-exit bias', overlayMultiExit.isCompliant, {
  pickedExit,
  furthestPoint: overlayMultiExit.furthestPoint,
  travelDistanceM: travelDist,
  isCompliant: overlayMultiExit.isCompliant,
  readoutText: overlayMultiExit.readoutText,
  note: 'If plan has 2 compliant exits, does calculateEgressOverlay falsely report non-compliance?',
});

// ---------------------------------------------------------------------------
// SUITE 8: Disconnected Circulation & Blind Traps
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 8: Disconnected Circulation & Blind Traps ---');

const plan_trapped_corridor = {
  rooms: [
    {
      id: 'r_trapped_corridor',
      label: 'Enclosed Spine Corridor',
      vertices: [{ x: 0, y: 0 }, { x: 1.2, y: 0 }, { x: 1.2, y: 10 }, { x: 0, y: 10 }],
      area: 12,
    },
  ],
  doors: [],
  walls: [],
};
const trappedCorridorIssues = checkDeadEndCorridors(plan_trapped_corridor);
recordTest('Disconnected Circulation', 'geometry-linter flags corridor with 0 doors as circulation trap', trappedCorridorIssues.length > 0, {
  issuesCount: trappedCorridorIssues.length,
  note: 'Corridors with 0 doors are bypassed because roomDoors.length === 1 is false!',
});

const plan_corridor_2_doors_at_same_end = {
  rooms: [
    {
      id: 'r_long_corridor',
      label: 'Long Corridor',
      vertices: [{ x: 0, y: 0 }, { x: 1.2, y: 0 }, { x: 1.2, y: 12 }, { x: 0, y: 12 }],
      area: 14.4,
    },
  ],
  doors: [
    { id: 'd_entry', position: { x: 0.6, y: 0 }, width: 1.0 },
    { id: 'd_storage', position: { x: 0.6, y: 0.5 }, width: 0.9 },
  ],
  walls: [],
};
const issues2DoorsSameEnd = checkDeadEndCorridors(plan_corridor_2_doors_at_same_end);
recordTest('Disconnected Circulation', 'geometry-linter flags 12m dead end having 2 doors clustered at one end', issues2DoorsSameEnd.length > 0, {
  issuesCount: issues2DoorsSameEnd.length,
  note: 'Bypassed because roomDoors.length === 2!',
});

// ---------------------------------------------------------------------------
// SUITE 9: Statutory Blind Spot in generateEgressProof
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 9: Statutory Blind Spot in generateEgressProof ---');

const proofWithCommonCorridor = generateEgressProof({
  carpetAreaSqM: 111,
  corridorClearWidthM: 1.05,
  travelDistanceM: 18.4,
  deadEndM: 0,
});
recordTest('Proof Statutory Fidelity', 'generateEgressProof lacks isCommonCorridor parameter (defaults to 0.9m)', proofWithCommonCorridor.corridorCheck.limit === 0.9, {
  corridorLimitTested: proofWithCommonCorridor.corridorCheck.limit,
  corridorPassed: proofWithCommonCorridor.corridorCheck.pass,
  overallPassed: proofWithCommonCorridor.allPass,
  note: 'An illegal 1.05m common corridor receives a statutory "COMPLIANT" certification from generateEgressProof!',
});

// ---------------------------------------------------------------------------
// SUITE 10: Canonical Layout Hardcoding Bypass
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 10: Canonical Layout Hardcoding Bypass ---');

const manipulatedSpinePlan = {
  walls: [
    { id: 'w_spine', start: { x: 7.5, y: 0 }, end: { x: 7.5, y: 3.6 }, thickness: 0.15 },
  ],
  doors: [
    { id: 'd_entry', position: { x: 1.2, y: 0 }, width: 1.0 },
  ],
  rooms: [
    {
      id: 'r_bath',
      label: 'Ensuite Bath',
      vertices: [{ x: 9.6, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 1.8 }, { x: 9.6, y: 1.8 }],
      area: 4.32,
    },
    {
      id: 'r_huge_hall',
      label: 'Far Away Ballroom',
      vertices: [{ x: 80, y: 80 }, { x: 100, y: 80 }, { x: 100, y: 100 }, { x: 80, y: 100 }],
      area: 400,
    },
  ],
};

const overlayManipulated = calculateEgressOverlay(manipulatedSpinePlan);
const hardcodedBypassActive = overlayManipulated.travelDistanceM === 18.4 && overlayManipulated.furthestPoint.x === 11.2;

recordTest('Canonical Bypass', 'calculateEgressOverlay returns hardcoded 18.4m ignoring 100m room when spine pattern matches', !hardcodedBypassActive, {
  hardcodedBypassActive,
  travelDistanceM: overlayManipulated.travelDistanceM,
  furthestPoint: overlayManipulated.furthestPoint,
  note: 'A floor plan extending to x=100, y=100 reports 18.4m compliant because isSingleLoadedSpinePlan matches!',
});

// ---------------------------------------------------------------------------
// SUITE 11: Arithmetic Edge Cases (NaN, Infinity, Negative)
// ---------------------------------------------------------------------------
console.log('\n--- SUITE 11: Arithmetic & Robustness Edge Cases ---');

// calcOccupantLoad with NaN
let nanOccupantThrown = false;
try {
  const occ = calcOccupantLoad(NaN);
  nanOccupantThrown = Number.isNaN(occ); // Did not throw!
} catch (e) {
  nanOccupantThrown = true;
}
recordTest('Arithmetic Edge Cases', 'calcOccupantLoad(NaN) throws RangeError or handles safely', nanOccupantThrown, {
  returnedNaNWithoutThrow: Number.isNaN(calcOccupantLoad(NaN)),
});

// Negative travel distance
const negDist = verifyTravelDistance(-5);
recordTest('Arithmetic Edge Cases', 'verifyTravelDistance(-5) handles negative input safely', negDist.pass, {
  note: 'Negative travel distance passes because -5 <= 30',
  message: negDist.message,
});

// Negative dead end
const negDeadEnd = verifyDeadEnd(-2);
recordTest('Arithmetic Edge Cases', 'verifyDeadEnd(-2) handles negative input safely', negDeadEnd.pass, {
  note: 'Negative dead end passes because -2 <= 6.0',
  message: negDeadEnd.message,
});

// Polyline distance with identical/collinear points
const collinear = calculatePolylineDistance([
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 0 },
]);
recordTest('Arithmetic Edge Cases', 'calculatePolylineDistance with duplicate waypoints', collinear === 5.0, {
  result: collinear,
});

// ---------------------------------------------------------------------------
// Summary of Results
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log('ADVERSARIAL STRESS TEST SUMMARY');
console.log('='.repeat(80));

const passCount = results.filter((r) => r.passed).length;
const failCount = results.filter((r) => !r.passed).length;

console.log(`Total Adversarial Tests: ${results.length}`);
console.log(`Passed (Expected/Robust): ${passCount}`);
console.log(`Failed (Vulnerabilities / Anomalies Found): ${failCount}`);
console.log('='.repeat(80));
