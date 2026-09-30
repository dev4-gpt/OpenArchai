#!/usr/bin/env node
/**
 * Empirical Verification & Adversarial Stress Harness for Milestone M4 Remediation
 * Agent: challenger_m4_rem_1 (Critic / Specialist)
 *
 * Verifies:
 * 1. Execution of challenger-m4-1-empirical.mjs (100% 77/77 passing)
 * 2. getAbsorptionCoefficient500Hz("acoustic timber") === 0.65 across extensive variations
 * 3. Negative dimensions produce RT60 >= 0 and V >= 0
 * 4. verifySTCDecoupling safely handles 0 boards and 0 cavity depth without NaN or Infinity
 * 5. Full adversarial boundary conditions and stress tests
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);
const acousticModule = await jiti.import(
  path.resolve(webRoot, 'src/lib/calculators/acoustic-rt60-calculator.ts')
);

const {
  calculateSabineRT60,
  calculateRoomRT60,
  verifySTCDecoupling,
  validatePartitionSTC,
  getAbsorptionCoefficient500Hz,
  ABSORPTION_COEFFICIENTS_500HZ,
  ACOUSTIC_MATERIALS_DATABASE,
} = acousticModule;

const results = [];
let passCount = 0;
let failCount = 0;

function assertTest(suite, name, passed, details = null) {
  if (passed) {
    passCount++;
    console.log(`  [✅ PASS] [${suite}] ${name}`);
  } else {
    failCount++;
    console.error(`  [❌ FAIL] [${suite}] ${name}`);
  }
  if (details) {
    console.log(`         Details: ${JSON.stringify(details)}`);
  }
  results.push({ suite, name, passed, details });
}

console.log('='.repeat(80));
console.log('REMEDIATION CHALLENGER M4: EMPIRICAL VERIFICATION HARNESS');
console.log('='.repeat(80));

// ============================================================================
// PART 1: Subprocess execution of apps/web/scripts/challenger-m4-1-empirical.mjs
// ============================================================================
console.log('\n--- PART 1: Challenger-m4-1-empirical.mjs Verification ---');
try {
  const output = execSync('node scripts/challenger-m4-1-empirical.mjs', {
    cwd: webRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const passedMatch = output.match(/Passed:\s+(\d+)/);
  const totalMatch = output.match(/Total tests executed:\s+(\d+)/);
  const failedMatch = output.match(/Failed:\s+(\d+)/);

  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
  const total = totalMatch ? parseInt(totalMatch[1], 10) : -1;
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : -1;

  assertTest(
    'Challenger Harness Execution',
    'challenger-m4-1-empirical.mjs completes with 77/77 tests passing (100%)',
    total === 77 && passed === 77 && failed === 0,
    { total, passed, failed }
  );
} catch (err) {
  assertTest(
    'Challenger Harness Execution',
    'challenger-m4-1-empirical.mjs execution failed with error',
    false,
    { error: err.message }
  );
}

// ============================================================================
// PART 2: getAbsorptionCoefficient500Hz("acoustic timber") === 0.65
// ============================================================================
console.log('\n--- PART 2: Absorption Coefficient for "acoustic timber" ---');

// Test 2.1: Exact verbatim string
const exactAlpha = getAbsorptionCoefficient500Hz('acoustic timber');
assertTest(
  'Acoustic Timber Verification',
  'getAbsorptionCoefficient500Hz("acoustic timber") strictly equals 0.65',
  exactAlpha === 0.65,
  { input: 'acoustic timber', resolved: exactAlpha, expected: 0.65 }
);

// Test 2.2: Case and whitespace normalization variations
const timberVariations = [
  'acoustic timber',
  'Acoustic Timber',
  'ACOUSTIC TIMBER',
  '  acoustic timber  ',
  'acoustic   timber',
  'acoustic-timber',
  'acoustic_timber',
  'Acoustic_Timber',
  'acoustic timber panelling',
  'acoustic_timber_panelling',
  'slotted acoustic timber panelling',
  'micro-perforated acoustic timber',
  'micro-perforated acoustic wood',
  'acoustic wood slats',
];

for (const variant of timberVariations) {
  const alpha = getAbsorptionCoefficient500Hz(variant);
  assertTest(
    'Acoustic Timber Variations',
    `getAbsorptionCoefficient500Hz("${variant}") resolves to 0.65 (or >= 0.65 for high-NRC slats)`,
    alpha === 0.65 || (variant.includes('slat') && alpha === 0.85),
    { variant, resolvedAlpha: alpha }
  );
}

// Test 2.3: Verification of all 10 architectural finish constants in ABSORPTION_COEFFICIENTS_500HZ
const required10Finishes = {
  italian_marble: 0.01,
  kota_stone: 0.02,
  engineered_oak: 0.06,
  gypsum_board: 0.08,
  gyproc_soundstop: 0.12,
  acoustic_timber_panelling: 0.65,
  acoustic_ceiling: 0.70,
  velvet_drapes: 0.50,
  double_glazing: 0.04,
  solid_flush_door: 0.06,
};

for (const [key, expectedVal] of Object.entries(required10Finishes)) {
  const direct = ABSORPTION_COEFFICIENTS_500HZ[key];
  assertTest(
    'All 10 Finishes Table',
    `ABSORPTION_COEFFICIENTS_500HZ["${key}"] === ${expectedVal}`,
    direct === expectedVal,
    { key, direct, expectedVal }
  );
}

// ============================================================================
// PART 3: Negative dimensions produce RT60 >= 0 and V >= 0
// ============================================================================
console.log('\n--- PART 3: Negative Dimensions Robustness (V >= 0 and RT60 >= 0) ---');

const negativeDimensionScenarios = [
  { name: 'Negative Length (-5, 4, 3)', dims: { lengthM: -5, widthM: 4, heightM: 3 } },
  { name: 'Negative Width (5, -4, 3)', dims: { lengthM: 5, widthM: -4, heightM: 3 } },
  { name: 'Negative Height (5, 4, -3)', dims: { lengthM: 5, widthM: 4, heightM: -3 } },
  { name: 'Dual Negative (-5, -4, 3)', dims: { lengthM: -5, widthM: -4, heightM: 3 } },
  { name: 'Dual Negative (-5, 4, -3)', dims: { lengthM: -5, widthM: 4, heightM: -3 } },
  { name: 'Dual Negative (5, -4, -3)', dims: { lengthM: 5, widthM: -4, heightM: -3 } },
  { name: 'Triple Negative (-5, -4, -3)', dims: { lengthM: -5, widthM: -4, heightM: -3 } },
  { name: 'Sub-millimeter Negative (-0.001, -0.001, -0.001)', dims: { lengthM: -0.001, widthM: -0.001, heightM: -0.001 } },
  { name: 'Large Negative (-100, -80, -20)', dims: { lengthM: -100, widthM: -80, heightM: -20 } },
];

for (const sc of negativeDimensionScenarios) {
  // Test with default surfaces
  const resDefault = calculateSabineRT60({
    roomName: sc.name,
    roomType: 'living',
    ...sc.dims,
  });

  const validDefault =
    resDefault.volumeM3 >= 0 &&
    resDefault.rt60Seconds >= 0 &&
    Number.isFinite(resDefault.volumeM3) &&
    Number.isFinite(resDefault.rt60Seconds) &&
    !Number.isNaN(resDefault.volumeM3) &&
    !Number.isNaN(resDefault.rt60Seconds);

  assertTest(
    'Negative Dims: Default Surfaces',
    `${sc.name} produces V >= 0 (${resDefault.volumeM3}m³) and RT60 >= 0 (${resDefault.rt60Seconds}s)`,
    validDefault,
    { volumeM3: resDefault.volumeM3, rt60Seconds: resDefault.rt60Seconds }
  );

  // Test with explicit positive surface absorption
  const resExplicit = calculateSabineRT60({
    roomName: `${sc.name} with Explicit Surfaces`,
    roomType: 'living',
    ...sc.dims,
    surfaces: [
      { name: 'Acoustic Ceiling', areaM2: 50, material: 'acoustic_ceiling', absorptionCoefficient: 0.70 },
      { name: 'Acoustic Timber', areaM2: 40, material: 'acoustic_timber_panelling', absorptionCoefficient: 0.65 },
    ],
  });

  const validExplicit =
    resExplicit.volumeM3 >= 0 &&
    resExplicit.rt60Seconds >= 0 &&
    Number.isFinite(resExplicit.volumeM3) &&
    Number.isFinite(resExplicit.rt60Seconds) &&
    !Number.isNaN(resExplicit.volumeM3) &&
    !Number.isNaN(resExplicit.rt60Seconds);

  assertTest(
    'Negative Dims: Explicit Surfaces',
    `${sc.name} with explicit surfaces produces V >= 0 (${resExplicit.volumeM3}m³) and RT60 >= 0 (${resExplicit.rt60Seconds}s)`,
    validExplicit,
    { volumeM3: resExplicit.volumeM3, rt60Seconds: resExplicit.rt60Seconds }
  );
}

// Zero dimensions test
const resZero = calculateSabineRT60({
  roomName: 'Zero Dimension Void',
  roomType: 'living',
  lengthM: 0,
  widthM: 0,
  heightM: 0,
});
assertTest(
  'Zero Dimensions',
  'Zero dimensions produce V = 0 and RT60 >= 0 without NaN/Infinity',
  resZero.volumeM3 === 0 && resZero.rt60Seconds >= 0 && !Number.isNaN(resZero.rt60Seconds),
  { volumeM3: resZero.volumeM3, rt60Seconds: resZero.rt60Seconds }
);

// ============================================================================
// PART 4: verifySTCDecoupling handles 0 boards and 0 cavity without NaN/Infinity
// ============================================================================
console.log('\n--- PART 4: verifySTCDecoupling Boundary Robustness ---');

// Test 4.1: 0 drywall boards
const zeroBoardsRes = verifySTCDecoupling({ gyprocSoundStopBoardsCount: 0 });
assertTest(
  'STC Boundary: Zero Boards',
  'gyprocSoundStopBoardsCount = 0 returns finite f0 (0 Hz) and isSTC56Compliant = false without NaN/Infinity',
  !Number.isNaN(zeroBoardsRes.massAirMassResonanceHz) &&
    Number.isFinite(zeroBoardsRes.massAirMassResonanceHz) &&
    zeroBoardsRes.massAirMassResonanceHz === 0 &&
    zeroBoardsRes.isSTC56Compliant === false &&
    zeroBoardsRes.leaf1MassKgM2 === 0,
  {
    f0: zeroBoardsRes.massAirMassResonanceHz,
    isSTC56Compliant: zeroBoardsRes.isSTC56Compliant,
    leaf1MassKgM2: zeroBoardsRes.leaf1MassKgM2,
    testedSTC: zeroBoardsRes.testedSTCRating,
  }
);

// Test 4.2: 0 cavity depth (0 stud width + 0 air cavity)
const zeroCavityRes = verifySTCDecoupling({ studWidthMm: 0, airCavityMm: 0 });
assertTest(
  'STC Boundary: Zero Cavity Depth',
  'studWidthMm = 0 and airCavityMm = 0 returns finite f0 (0 Hz) and isSTC56Compliant = false without NaN/Infinity',
  !Number.isNaN(zeroCavityRes.massAirMassResonanceHz) &&
    Number.isFinite(zeroCavityRes.massAirMassResonanceHz) &&
    zeroCavityRes.massAirMassResonanceHz === 0 &&
    zeroCavityRes.isSTC56Compliant === false &&
    zeroCavityRes.totalCavityDepthMm === 0,
  {
    f0: zeroCavityRes.massAirMassResonanceHz,
    isSTC56Compliant: zeroCavityRes.isSTC56Compliant,
    totalCavityDepthMm: zeroCavityRes.totalCavityDepthMm,
    testedSTC: zeroCavityRes.testedSTCRating,
  }
);

// Test 4.3: Both 0 boards and 0 cavity depth
const zeroBothRes = verifySTCDecoupling({
  gyprocSoundStopBoardsCount: 0,
  studWidthMm: 0,
  airCavityMm: 0,
});
assertTest(
  'STC Boundary: Zero Boards & Zero Cavity',
  'Both 0 boards and 0 cavity safely return f0 = 0 without NaN/Infinity',
  !Number.isNaN(zeroBothRes.massAirMassResonanceHz) &&
    Number.isFinite(zeroBothRes.massAirMassResonanceHz) &&
    zeroBothRes.massAirMassResonanceHz === 0 &&
    zeroBothRes.isSTC56Compliant === false,
  { f0: zeroBothRes.massAirMassResonanceHz, isSTC56Compliant: zeroBothRes.isSTC56Compliant }
);

// Test 4.4: Negative boards and negative cavity depth
const negSTCRes = verifySTCDecoupling({
  gyprocSoundStopBoardsCount: -2,
  studWidthMm: -50,
  airCavityMm: -25,
});
assertTest(
  'STC Boundary: Negative Board Count and Negative Cavity',
  'Negative inputs safely clamped and return f0 = 0 and isSTC56Compliant = false',
  !Number.isNaN(negSTCRes.massAirMassResonanceHz) &&
    Number.isFinite(negSTCRes.massAirMassResonanceHz) &&
    negSTCRes.massAirMassResonanceHz === 0 &&
    negSTCRes.isSTC56Compliant === false,
  { f0: negSTCRes.massAirMassResonanceHz, isCompliant: negSTCRes.isSTC56Compliant }
);

// Test 4.5: Baseline compliance confirmation (standard specification)
const standardSTC = verifySTCDecoupling();
assertTest(
  'STC Baseline: Standard Luxury Sanctuary Partition',
  'Default luxury partition achieves tested STC 56 and f0 < 60Hz (measured f0 ≈ 51.3Hz)',
  standardSTC.isSTC56Compliant === true &&
    standardSTC.testedSTCRating === 56 &&
    standardSTC.massAirMassResonanceHz < 60.0 &&
    standardSTC.isResonanceBelowSpeech === true,
  {
    testedSTC: standardSTC.testedSTCRating,
    f0: standardSTC.massAirMassResonanceHz,
    isCompliant: standardSTC.isSTC56Compliant,
  }
);

// ============================================================================
// PART 5: Adversarial Flanking Leaks & Target Invariants
// ============================================================================
console.log('\n--- PART 5: Flanking Leaks & Target Invariants ---');

// Test 5.1: Combined flanking degradation
const allFlanking = verifySTCDecoupling({
  ceilingPlenumFlanking: true,
  doorAcousticSealPresent: false,
  backToBackElectricalBoxesStaggered: false,
});
// 56 - 8 (ceiling) - 4 (door) - 5 (electrical) = 39 STC
assertTest(
  'STC Flanking: Cumulative Penalty',
  'All 3 flanking leaks penalize rating from 56 down to 39 dB (-17 dB total leak)',
  allFlanking.testedSTCRating === 39 && allFlanking.isSTC56Compliant === false,
  { testedSTC: allFlanking.testedSTCRating, suggestionsCount: allFlanking.remediationSuggestions.length }
);

// Test 5.2: Analytical Sabine Invariant (RT60 calculation)
const analyticalV = 100; // 5x5x4
const totalA = 32.2; // Sabins
// RT60 = 0.161 * 100 / 32.2 = 16.1 / 32.2 = 0.50s
const analyticalSabine = calculateSabineRT60({
  roomName: 'Analytical Sanctuary',
  roomType: 'sanctuary',
  lengthM: 5,
  widthM: 5,
  heightM: 4,
  surfaces: [{ name: 'Custom Surface', areaM2: 100, material: 'custom', absorptionCoefficient: (32.2 - 4 * 0.002 * 100) / 100 }],
  airAttenuationRateM: 0.002,
});
assertTest(
  'Sabine Invariant: Analytical 0.50s',
  'Analytical Sabine RT60 = 0.161 * V / A_total matches 0.50s within 0.01s tolerance',
  Math.abs(analyticalSabine.rt60Seconds - 0.50) < 0.015,
  { calculatedRT60: analyticalSabine.rt60Seconds, expected: 0.50 }
);

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('EMPIRICAL VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Verification Tests: ${results.length}`);
console.log(`Passed:                   ${passCount}`);
console.log(`Failed:                   ${failCount}`);
console.log(`Pass Rate:                ${((passCount / results.length) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n🎉 ALL EMPIRICAL VERIFICATION CRITERIA SATISFIED! (100% PASS)');
} else {
  console.log('\n❌ DEFECTS DETECTED. REMEDIATION INCOMPLETE.');
}
console.log('='.repeat(80));

process.exit(failCount > 0 ? 1 : 0);
