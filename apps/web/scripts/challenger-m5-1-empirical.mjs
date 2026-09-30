#!/usr/bin/env node
/**
 * Empirical Adversarial Challenger Test Harness for Milestone M5 (Pillar 5).
 * Target:
 *   - apps/web/src/lib/calculators/construction-gantt-engine.ts
 *   - apps/web/src/lib/ifc-export.ts
 *
 * Verifies:
 * 1. Critical Path Method (CPM) graph invariants:
 *    - Forward pass: ES = max(EF_preds), EF = ES + Duration
 *    - Backward pass: LF = min(LS_succs), LS = LF - Duration
 *    - Total Float: TF = LS - ES = LF - EF >= 0
 *    - Critical Path: Tasks with TF = 0
 *    - Disconnected nodes, arbitrary DAGs, topological ordering vulnerabilities, cycle detection.
 * 2. Value Engineering 14-week lead-time compression:
 *    - Baseline 177 calendar days with imported marble on critical path.
 *    - Domestic Kota stone substitution collapses lead time from 112 to 14 days (saving 98 days / 14 weeks).
 *    - Collapsed critical path duration of 88 calendar days (strictly <= 90 days statutory handover limit).
 * 3. Regional Monsoon Risk & IS 287 alerts (Delhi-NCR):
 *    - Tasks scheduled in July 1 to Sept 15 window (>= 95% RH).
 *    - Alert generation for `flooring_installation_screed` with IS 15477 C2TE S1 mitigation.
 *    - Alert generation for `woodwork_joinery_is287` with IS 287 (8-12% EMC) and BWP 710 mitigation.
 *    - Zero false-positive alerts for dry-season projects (starting in October, November, January).
 * 4. Enriched IFC4 LOD 300 export:
 *    - ISO-10303-21 STEP structure with schema IFC4.
 *    - Property set `Pset_WallCommon`: ThermalTransmittance (0.35 W/m²K), AcousticRating (STC 56 Tested), FireRating (FD 120).
 *    - Property set `COBie_Specification`: AssetType, Manufacturer, WarrantyGuarantor.
 *    - Relational linking via `IFCRELDEFINESBYPROPERTIES`.
 *    - COBie CSV export.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);

const ganttMod = await jiti.import(
  path.resolve(webRoot, 'src/lib/calculators/construction-gantt-engine.ts')
);
const ifcMod = await jiti.import(
  path.resolve(webRoot, 'src/lib/ifc-export.ts')
);

const {
  BASELINE_EPC_177_TASKS,
  DEFAULT_TURNKEY_TASKS,
  calculateCPM,
  applyVEFlooringSubstitution,
  applyValueEngineeringCompression,
  assessMonsoonRisk,
  checkMonsoonTaskAlerts,
  generateIFC4LOD300Records,
  exportCOBieScheduleCSV,
} = ganttMod;

const { exportFloorPlanToIfc } = ifcMod;

const results = [];

function recordTest(suite, name, pass, expectedBehavior, actualBehavior, details = null) {
  results.push({
    suite,
    name,
    pass,
    expectedBehavior,
    actualBehavior,
    details,
  });
  const mark = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] [${suite}] ${name}`);
  console.log(`       Expected: ${expectedBehavior}`);
  console.log(`       Actual:   ${actualBehavior}`);
  if (details) {
    console.log(`       Details:  ${JSON.stringify(details)}`);
  }
}

console.log('='.repeat(80));
console.log('STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE FOR PILLAR 5');
console.log('Target: construction-gantt-engine.ts & ifc-export.ts');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: CPM GRAPH MATHEMATICAL INVARIANTS ON WELL-ORDERED DAGS
// ============================================================================
console.log('\n--- SUITE 1: CPM Graph Invariants on Standard Well-Ordered DAGs ---');

// 1.1: Baseline 177 Tasks Mathematical Invariants
const baselineCPM = calculateCPM(BASELINE_EPC_177_TASKS);
let allBaselineInvariantsHold = true;
let baselineFloatViolation = null;

for (const t of baselineCPM.tasks) {
  const efExpected = t.earlyStartDay + t.durationDays;
  const lsExpected = t.lateFinishDay - t.durationDays;
  const tfFromStart = t.lateStartDay - t.earlyStartDay;
  const tfFromFinish = t.lateFinishDay - t.earlyFinishDay;

  if (
    t.earlyFinishDay !== efExpected ||
    t.lateStartDay !== lsExpected ||
    tfFromStart !== tfFromFinish ||
    t.totalFloatDays !== tfFromStart ||
    t.totalFloatDays < 0
  ) {
    allBaselineInvariantsHold = false;
    baselineFloatViolation = { id: t.id, es: t.earlyStartDay, ef: t.earlyFinishDay, ls: t.lateStartDay, lf: t.lateFinishDay, tf: t.totalFloatDays };
    break;
  }
}

recordTest(
  'CPM Invariants',
  '1.1 Baseline 177 schedule satisfies EF=ES+D, LS=LF-D, and TF=LS-ES=LF-EF >= 0',
  allBaselineInvariantsHold,
  'All tasks satisfy CPM forward/backward float invariants with TF >= 0',
  allBaselineInvariantsHold ? 'All 8 tasks hold strict mathematical invariants' : `Violation in task ${baselineFloatViolation?.id}`,
  baselineFloatViolation
);

// 1.2: Baseline Critical Path Identification
const baselineCritical = baselineCPM.tasks.filter((t) => t.isCritical).map((t) => t.id);
const baselineAllCpHaveZeroFloat = baselineCPM.tasks
  .filter((t) => t.isCritical)
  .every((t) => t.totalFloatDays === 0);
const baselineAllNonCpHavePositiveFloat = baselineCPM.tasks
  .filter((t) => !t.isCritical)
  .every((t) => t.totalFloatDays > 0);

recordTest(
  'CPM Invariants',
  '1.2 Baseline 177 critical path tasks have strictly TF = 0 and non-critical tasks have TF > 0',
  baselineAllCpHaveZeroFloat && baselineAllNonCpHavePositiveFloat,
  'Critical tasks have TF === 0, non-critical tasks have TF > 0',
  `CP count: ${baselineCritical.length}, all TF=0: ${baselineAllCpHaveZeroFloat}, non-CP TF>0: ${baselineAllNonCpHavePositiveFloat}`,
  { criticalPath: baselineCritical }
);

// 1.3: Asymmetric Diamond DAG (Fork-Join)
const diamondTasks = [
  { id: 'start', name: 'Start', tradePackage: 'substructure', durationDays: 5, predecessorIds: [], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'branch_fast', name: 'Fast Path', tradePackage: 'mep', durationDays: 10, predecessorIds: ['start'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'branch_slow', name: 'Slow Path', tradePackage: 'finishes', durationDays: 25, predecessorIds: ['start'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'join', name: 'Join End', tradePackage: 'commissioning', durationDays: 6, predecessorIds: ['branch_fast', 'branch_slow'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
];
const diamondCPM = calculateCPM(diamondTasks);
const fastBranch = diamondCPM.tasks.find((t) => t.id === 'branch_fast');
const slowBranch = diamondCPM.tasks.find((t) => t.id === 'branch_slow');
const joinNode = diamondCPM.tasks.find((t) => t.id === 'join');

const diamondPass =
  diamondCPM.totalDurationDays === 36 && // 5 + 25 + 6 = 36
  slowBranch.totalFloatDays === 0 &&
  slowBranch.isCritical === true &&
  fastBranch.totalFloatDays === 15 && // 25 - 10 = 15 float
  fastBranch.isCritical === false &&
  joinNode.earlyStartDay === 30 &&
  joinNode.totalFloatDays === 0;

recordTest(
  'CPM Invariants',
  '1.3 Asymmetric diamond fork-join computes correct duration (36d), critical path and float (15d)',
  diamondPass,
  'totalDuration = 36, fastBranch.float = 15, slowBranch.float = 0',
  `duration = ${diamondCPM.totalDurationDays}, fastFloat = ${fastBranch?.totalFloatDays}, slowFloat = ${slowBranch?.totalFloatDays}`,
  { criticalPath: diamondCPM.criticalPath }
);

// 1.4: Disconnected Nodes in Topological Order
const disconnectedTopological = [
  { id: 'C1_A', name: 'Comp 1 A', tradePackage: 'substructure', durationDays: 10, predecessorIds: [], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'C1_B', name: 'Comp 1 B', tradePackage: 'substructure', durationDays: 15, predecessorIds: ['C1_A'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'C2_X', name: 'Comp 2 X', tradePackage: 'civil_structural', durationDays: 30, predecessorIds: [], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
];
const disconnCPM = calculateCPM(disconnectedTopological);
const c1b = disconnCPM.tasks.find((t) => t.id === 'C1_B');
const c2x = disconnCPM.tasks.find((t) => t.id === 'C2_X');

const disconnPass =
  disconnCPM.totalDurationDays === 30 &&
  c2x.isCritical === true &&
  c2x.totalFloatDays === 0 &&
  c1b.totalFloatDays === 5; // finishes day 25, project ends day 30 -> float 5

recordTest(
  'CPM Invariants',
  '1.4 Disconnected components in topological order compute correct project duration (30d) and float',
  disconnPass,
  'totalDuration = 30, C2_X on critical path, C1_B has float 5',
  `duration = ${disconnCPM.totalDurationDays}, c2xCritical = ${c2x?.isCritical}, c1bFloat = ${c1b?.totalFloatDays}`,
  { criticalPath: disconnCPM.criticalPath }
);

// ============================================================================
// SUITE 2: ADVERSARIAL CHALLENGES: ARBITRARY DAG ORDERING & CYCLE DETECTION
// ============================================================================
console.log('\n--- SUITE 2: Stress-Testing Arbitrary DAGs, Topological Sorting, & Cycle Detection ---');

// 2.1: Reverse Topological Input Array [Task B (succ), Task A (pred)]
const reverseOrderTasks = [
  { id: 'task_succ', name: 'Successor Task', tradePackage: 'finishes', durationDays: 10, predecessorIds: ['task_pred'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'task_pred', name: 'Predecessor Task', tradePackage: 'substructure', durationDays: 5, predecessorIds: [], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
];

const reverseCPM = calculateCPM(reverseOrderTasks);
const predTask = reverseCPM.tasks.find((t) => t.id === 'task_pred');
const succTask = reverseCPM.tasks.find((t) => t.id === 'task_succ');

// Correct mathematical behavior for arbitrary DAG input:
// Predecessor must start at 0, finish at 5. Successor must start at 5, finish at 15. Total duration = 15.
const reverseOrderCalculatesCorrectly =
  succTask?.earlyStartDay === 5 &&
  succTask?.earlyFinishDay === 15 &&
  reverseCPM.totalDurationDays === 15 &&
  predTask?.lateStartDay === 0 &&
  predTask?.lateFinishDay === 5 &&
  predTask?.totalFloatDays === 0;

recordTest(
  'Arbitrary DAG Ordering',
  '2.1 Tasks supplied in reverse order [Successor, Predecessor] must be topologically resolved',
  reverseOrderCalculatesCorrectly,
  'ES(succ) = 5, EF(succ) = 15, totalDuration = 15, Pred LS=0, LF=5, Float=0',
  `ES(succ) = ${succTask?.earlyStartDay}, EF(succ) = ${succTask?.earlyFinishDay}, totalDuration = ${reverseCPM.totalDurationDays}, Pred LS = ${predTask?.lateStartDay}, Float = ${predTask?.totalFloatDays}`,
  {
    finding: 'calculateCPM iterates sequentially via for..of and does not perform topological sorting (e.g. Kahn algorithm). Out-of-order DAGs cause pred.earlyFinishDay to be undefined when succ is processed, leading to ES=0, wrong duration, and LF/LS=Infinity.',
    isVulnerability: !reverseOrderCalculatesCorrectly
  }
);

// 2.2: Cyclic Dependencies Detection (2-node cycle: A -> B -> A)
const cyclicTasks = [
  { id: 'cycle_A', name: 'Cycle Task A', tradePackage: 'substructure', durationDays: 5, predecessorIds: ['cycle_B'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
  { id: 'cycle_B', name: 'Cycle Task B', tradePackage: 'finishes', durationDays: 10, predecessorIds: ['cycle_A'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
];

let cycleDetected = false;
let cycleOutput = null;

try {
  cycleOutput = calculateCPM(cyclicTasks);
  // If it didn't throw, did it return an error flag or detect the cycle?
  if (cycleOutput.hasCycle === true || cycleOutput.isCyclic === true || cycleOutput.error) {
    cycleDetected = true;
  } else {
    // If it produced tasks, check whether it produced invalid Infinity or invalid dates
    const hasInfinity = cycleOutput.tasks.some((t) => t.lateFinishDay === Infinity || t.totalFloatDays === Infinity);
    cycleDetected = false; // Silently returned corrupted data with Infinity
  }
} catch (err) {
  cycleDetected = true; // Properly threw error on cycle
}

recordTest(
  'Cyclic Dependencies',
  '2.2 Cyclic dependency (A -> B -> A) should be detected and handled safely',
  cycleDetected,
  'Throws Error("Cyclic dependency detected") or returns { hasCycle: true }',
  cycleDetected ? 'Cycle safely detected' : `Silently failed with Infinity float: ${JSON.stringify(cycleOutput?.tasks?.map(t => ({ id: t.id, tf: t.totalFloatDays })))}`,
  {
    finding: 'calculateCPM does not implement cycle detection. Cyclic networks silently compute undefined/Infinity dates without throwing an error.',
    isVulnerability: !cycleDetected
  }
);

// 2.3: Boundary Condition: Empty Task List []
const emptyCPM = calculateCPM([]);
const emptyTreatedCleanly = emptyCPM.totalDurationDays === 0 && emptyCPM.tasks.length === 0;

recordTest(
  'Boundary Conditions',
  '2.3 Empty task array calculateCPM([]) returns totalDurationDays = 0 without -Infinity',
  emptyTreatedCleanly,
  'totalDurationDays === 0',
  `totalDurationDays === ${emptyCPM.totalDurationDays}`,
  {
    finding: 'Math.max(...[]) evaluates to -Infinity in JS. calculateCPM([]) returns totalDurationDays: -Infinity instead of 0.',
    isVulnerability: !emptyTreatedCleanly
  }
);

// 2.4: Missing / Non-Existent Predecessor ID Handling
const ghostPredTasks = [
  { id: 'valid_task', name: 'Valid Task', tradePackage: 'substructure', durationDays: 7, predecessorIds: ['GHOST_TASK_ID'], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
];
const ghostCPM = calculateCPM(ghostPredTasks);
const ghostHandledWithoutCrash = ghostCPM.totalDurationDays === 7 && ghostCPM.tasks[0]?.earlyFinishDay === 7;

recordTest(
  'Boundary Conditions',
  '2.4 Non-existent predecessor ID does not crash the forward pass',
  ghostHandledWithoutCrash,
  'Gracefully ignores missing predecessor without throwing TypeError',
  `Task executed with duration = ${ghostCPM.totalDurationDays}`,
  { totalDurationDays: ghostCPM.totalDurationDays }
);

// ============================================================================
// SUITE 3: VALUE ENGINEERING LEAD-TIME COMPRESSION & 90-DAY TURNKEY LIMIT
// ============================================================================
console.log('\n--- SUITE 3: Value Engineering Lead-Time Compression & 90-Day Limit ---');

// 3.1: Baseline 177 Calendar Days Verification
const baselineDuration = baselineCPM.totalDurationDays;
const baselineMarble = baselineCPM.tasks.find((t) => t.id === 'procurement_italian_marble');

recordTest(
  'Value Engineering',
  '3.1 Baseline EPC schedule has duration of exactly 177 calendar days with 112-day imported marble on critical path',
  baselineDuration === 177 && baselineMarble?.isCritical === true && baselineMarble?.durationDays === 112,
  'totalDurationDays = 177, procurement_italian_marble isCritical = true, duration = 112',
  `totalDurationDays = ${baselineDuration}, marble critical = ${baselineMarble?.isCritical}, marble duration = ${baselineMarble?.durationDays}`,
  { criticalPath: baselineCPM.criticalPath }
);

// 3.2: Value Engineering Substitution (ve_flooring_kajaria_kota)
const veResult = applyVEFlooringSubstitution();

recordTest(
  'Value Engineering',
  '3.2 VE substitution collapses lead time from 112 days to 14 days (saving 98 days / 14 weeks)',
  veResult.weeksSaved === 14 && veResult.daysSaved === 98,
  'weeksSaved === 14, daysSaved === 98',
  `weeksSaved = ${veResult.weeksSaved}, daysSaved = ${veResult.daysSaved}`,
  { weeksSaved: veResult.weeksSaved, daysSaved: veResult.daysSaved }
);

// 3.3: Critical Path Duration <= 90 Days Limit
recordTest(
  'Value Engineering',
  '3.3 VE compressed schedule duration is exactly 88 calendar days (strictly <= 90 days limit)',
  veResult.totalDurationDays === 88 && veResult.isTurnkeyHandoverCompliant === true && veResult.totalDurationDays <= 90,
  'totalDurationDays === 88 && isTurnkeyHandoverCompliant === true',
  `totalDurationDays = ${veResult.totalDurationDays}, isTurnkeyHandoverCompliant = ${veResult.isTurnkeyHandoverCompliant}`,
  { totalDuration: veResult.totalDurationDays, criticalPath: veResult.criticalPath }
);

// 3.4: Bottleneck Shift in VE Schedule
const kotaTask = veResult.tasks.find((t) => t.id === 'procurement_domestic_kota');
const drywallTask = veResult.tasks.find((t) => t.id === 'drywall_partitions');

recordTest(
  'Value Engineering',
  '3.4 Procurement leaves critical path (TF = 9d) and drywall partitions becomes the governing critical bottleneck (TF = 0)',
  kotaTask?.isCritical === false && kotaTask?.totalFloatDays === 9 && drywallTask?.isCritical === true && drywallTask?.totalFloatDays === 0,
  'Kota procurement TF === 9 (non-critical), drywall TF === 0 (critical)',
  `Kota TF = ${kotaTask?.totalFloatDays}, Kota isCritical = ${kotaTask?.isCritical}, Drywall TF = ${drywallTask?.totalFloatDays}, Drywall isCritical = ${drywallTask?.isCritical}`,
  { kotaFloat: kotaTask?.totalFloatDays, drywallFloat: drywallTask?.totalFloatDays }
);

// ============================================================================
// SUITE 4: REGIONAL MONSOON WEATHER RISK & IS 287 ALERTS (DELHI-NCR)
// ============================================================================
console.log('\n--- SUITE 4: Regional Monsoon Weather Risk & IS 287 Alerts (Delhi-NCR) ---');

// 4.1: High-Risk Alert Generation for Tasks in July 1 - Sept 15 Window
// Project starting June 1: Flooring is at Day 47 (July 18), Woodwork is at Day 65 (Aug 5)
const monsoonAlertsJune1 = checkMonsoonTaskAlerts(veResult.tasks, { month: 6, day: 1 });
const screedAlert = monsoonAlertsJune1.find((a) => a.taskId === 'flooring_installation_screed');
const joineryAlert = monsoonAlertsJune1.find((a) => a.taskId === 'woodwork_joinery_is287');

const hasScreedMitigation =
  screedAlert &&
  screedAlert.riskLevel === 'high' &&
  screedAlert.statutoryMitigation.includes('IS 15477 C2TE S1') &&
  screedAlert.codeCitation.includes('IS 15477');

const hasJoineryMitigation =
  joineryAlert &&
  joineryAlert.riskLevel === 'high' &&
  joineryAlert.statutoryMitigation.includes('BWP 710') &&
  joineryAlert.statutoryMitigation.includes('2mm expansion reveals') &&
  joineryAlert.statutoryMitigation.includes('8–12% EMC') &&
  joineryAlert.codeCitation.includes('IS 287');

recordTest(
  'Monsoon Risk Alerts',
  '4.1 Flags flooring screed & custom joinery during July 1 - Sept 15 window with IS 15477 and IS 287 mitigations',
  hasScreedMitigation && hasJoineryMitigation,
  'Screed alert has IS 15477 C2TE S1 mitigation; Joinery alert has IS 287 (8-12% EMC) & BWP 710 mitigations',
  `Screed alert found: ${!!screedAlert}, Joinery alert found: ${!!joineryAlert}`,
  {
    screedMitigation: screedAlert?.statutoryMitigation,
    joineryMitigation: joineryAlert?.statutoryMitigation,
  }
);

// 4.2: Zero False-Positive Alerts Outside Monsoon Window (October start)
const octAlerts = checkMonsoonTaskAlerts(veResult.tasks, { month: 10, day: 15 });
recordTest(
  'Monsoon Risk Alerts',
  '4.2 Tasks scheduled in October/November (dry winter season) produce exactly ZERO false-positive alerts',
  octAlerts.length === 0,
  'octAlerts.length === 0',
  `octAlerts.length === ${octAlerts.length}`,
  { count: octAlerts.length }
);

// 4.3: Zero False-Positive Alerts Outside Monsoon Window (January start)
const janAlerts = checkMonsoonTaskAlerts(veResult.tasks, { month: 1, day: 1 });
recordTest(
  'Monsoon Risk Alerts',
  '4.3 Tasks scheduled in January/February (dry spring season) produce exactly ZERO false-positive alerts',
  janAlerts.length === 0,
  'janAlerts.length === 0',
  `janAlerts.length === ${janAlerts.length}`,
  { count: janAlerts.length }
);

// 4.4: High-Level Monsoon Risk Assessment (assessMonsoonRisk)
const julyAssessment = assessMonsoonRisk(7, 90);
const novAssessment = assessMonsoonRisk(11, 90);

const assessmentCorrect =
  julyAssessment.isMonsoonImpacted === true &&
  julyAssessment.recommendedWeatherBufferDays === 8 &&
  julyAssessment.joineryEMCRisk === true &&
  julyAssessment.screedMoistureRisk === true &&
  novAssessment.isMonsoonImpacted === false &&
  novAssessment.recommendedWeatherBufferDays === 0;

recordTest(
  'Monsoon Risk Alerts',
  '4.4 assessMonsoonRisk evaluates 8-day buffer for July start and 0-day buffer for November start',
  assessmentCorrect,
  'July: impacted=true, buffer=8; Nov: impacted=false, buffer=0',
  `July buffer = ${julyAssessment.recommendedWeatherBufferDays}, Nov buffer = ${novAssessment.recommendedWeatherBufferDays}`,
  { july: julyAssessment, nov: novAssessment }
);

// ============================================================================
// SUITE 5: ENRICHED IFC4 LOD 300 & COBIE EXPORT VERIFICATION
// ============================================================================
console.log('\n--- SUITE 5: Enriched IFC4 LOD 300 Export & COBie Verification ---');

const samplePlan = {
  walls: [
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
    { id: 'w2', start: { x: 6, y: 0 }, end: { x: 6, y: 5 }, thickness: 0.15 },
  ],
  doors: [{ id: 'd1', position: { x: 3, y: 0 }, width: 1.0, wallId: 'w1' }],
  windows: [{ id: 'win1', position: { x: 6, y: 2.5 }, width: 1.2, wallId: 'w2' }],
  rooms: [],
  gridSize: 0.5,
  panOffset: { x: 0, y: 0 },
  zoom: 35,
};

const ifcText = exportFloorPlanToIfc(samplePlan, 'DLF Phase 5 AtelierOS Sanctuary');

// 5.1: ISO-10303-21 STEP Envelope
const stepEnvelopeValid =
  ifcText.startsWith('ISO-10303-21;') &&
  ifcText.includes("FILE_SCHEMA(('IFC4'));") &&
  ifcText.trim().endsWith('END-ISO-10303-21;');

recordTest(
  'IFC4 LOD 300 Export',
  '5.1 exportFloorPlanToIfc generates valid ISO-10303-21 STEP physical file envelope with IFC4 schema',
  stepEnvelopeValid,
  'Starts with ISO-10303-21, contains FILE_SCHEMA((\'IFC4\')), ends with END-ISO-10303-21;',
  `stepEnvelopeValid = ${stepEnvelopeValid}, length = ${ifcText.length}`,
  { startsWithIso: ifcText.startsWith('ISO-10303-21;'), hasSchemaIfc4: ifcText.includes("FILE_SCHEMA(('IFC4'));") }
);

// 5.2: Pset_WallCommon Properties
const hasPsetWallCommon = ifcText.includes('Pset_WallCommon');
const hasThermal = ifcText.includes('ThermalTransmittance') && ifcText.includes('0.35');
const hasAcoustic = ifcText.includes('AcousticRating') && ifcText.includes('STC 56 Tested');
const hasFire = ifcText.includes('FireRating') && ifcText.includes('FD 120');

const psetWallCommonPass = hasPsetWallCommon && hasThermal && hasAcoustic && hasFire;

recordTest(
  'IFC4 LOD 300 Export',
  '5.2 Pset_WallCommon embeds ThermalTransmittance (0.35), AcousticRating (STC 56 Tested), and FireRating (FD 120)',
  psetWallCommonPass,
  'Pset_WallCommon includes ThermalTransmittance (0.35), AcousticRating (STC 56 Tested), FireRating (FD 120)',
  `pset=${hasPsetWallCommon}, thermal=${hasThermal}, acoustic=${hasAcoustic}, fire=${hasFire}`,
  { hasPsetWallCommon, hasThermal, hasAcoustic, hasFire }
);

// 5.3: COBie_Specification Properties
const hasCobie = ifcText.includes('COBie_Specification');
const hasAssetType = ifcText.includes('AssetType') && ifcText.includes('Architectural Building Element');
const hasManufacturer = ifcText.includes('Manufacturer') && ifcText.includes('Saint-Gobain / Asian Paints / Kajaria');
const hasWarranty = ifcText.includes('WarrantyGuarantor') && ifcText.includes('Tier-1 EPC Turnkey Handover');

const cobiePass = hasCobie && hasAssetType && hasManufacturer && hasWarranty;

recordTest(
  'IFC4 LOD 300 Export',
  '5.3 COBie_Specification embeds AssetType, Manufacturer, and WarrantyGuarantor',
  cobiePass,
  'COBie_Specification includes AssetType, Manufacturer, WarrantyGuarantor',
  `cobie=${hasCobie}, asset=${hasAssetType}, mfr=${hasManufacturer}, warranty=${hasWarranty}`,
  { hasCobie, hasAssetType, hasManufacturer, hasWarranty }
);

// 5.4: Relational Property Binding
const hasRelDefines = ifcText.includes('IFCRELDEFINESBYPROPERTIES');
recordTest(
  'IFC4 LOD 300 Export',
  '5.4 Property sets are bound to walls via IFCRELDEFINESBYPROPERTIES entities',
  hasRelDefines,
  'Contains IFCRELDEFINESBYPROPERTIES linking wall entities to property sets',
  `hasRelDefines = ${hasRelDefines}`,
  { hasRelDefines }
);

// 5.5: COBie CSV Export Structure
const cobieRecords = generateIFC4LOD300Records();
const csvOutput = exportCOBieScheduleCSV(cobieRecords);

const csvHeaderPass = csvOutput.startsWith(
  'IFC GUID,Entity Type,Component Name,Material Specification,Fire Rating (NBC 2016),Acoustic STC,Thermal U-Value (W/m²K),CPWD DSR 2024 Code,BIM LOD Stage'
);
const csvRowsPass =
  csvOutput.includes('FD 120') &&
  csvOutput.includes(',56,') &&
  csvOutput.includes('0.35') &&
  csvOutput.includes('LOD 300 Turnkey');

recordTest(
  'IFC4 LOD 300 Export',
  '5.5 exportCOBieScheduleCSV serializes valid CSV with exact headers and 4 LOD 300 components',
  csvHeaderPass && csvRowsPass,
  'Valid CSV header and rows containing FD 120, STC 56, 0.35, LOD 300 Turnkey',
  `headerOk = ${csvHeaderPass}, rowsOk = ${csvRowsPass}`,
  { recordsCount: cobieRecords.length }
);

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('STRESS TEST SUMMARY');
console.log('='.repeat(80));

const totalTests = results.length;
const passedTests = results.filter((r) => r.pass).length;
const failedTests = results.filter((r) => !r.pass).length;

console.log(`Total assertions: ${totalTests}`);
console.log(`Passed:           ${passedTests}`);
console.log(`Failed / Flagged: ${failedTests}`);

if (failedTests > 0) {
  console.log('\nFLAWED / VULNERABLE TESTS:');
  results
    .filter((r) => !r.pass)
    .forEach((r, idx) => {
      console.log(`\n[VULNERABILITY ${idx + 1}] [${r.suite}] ${r.name}`);
      console.log(`  Expected: ${r.expectedBehavior}`);
      console.log(`  Actual:   ${r.actualBehavior}`);
      if (r.details?.finding) {
        console.log(`  Finding:  ${r.details.finding}`);
      }
    });
}

console.log('\n' + '='.repeat(80));
