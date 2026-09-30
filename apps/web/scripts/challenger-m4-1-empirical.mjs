#!/usr/bin/env node
/**
 * Empirical Adversarial Test Harness for Pillar 4: Museum Acoustics & STC 56 Decoupling
 * Challenger 1 (teamwork_challenger_m4_1)
 *
 * Grounded in:
 * - Sabine Reverberation Formula: RT60 = 0.161 * V / (sum(Si * alphai) + 4mV)
 * - ASTM E90 / ASTM C423 Acoustic Absorption and Sound Transmission Standards
 * - NBC 2016 Part 8 Section 1 (Building Physics & Acoustics)
 * - Mass-Air-Mass Decoupling Physics: f0 = 111 * sqrt((m1 + m2) / (m1 * m2 * d)) * modifiers
 *
 * EVALUATES:
 * 1. Absorption coefficient accuracy across all 10 architectural finishes
 * 2. Sabine formula boundary conditions (zero volume, negative dimensions, zero absorption, air attenuation scaling 4mV)
 * 3. Sanctuary target boundaries (0.39s, 0.40s, 0.55s, 0.56s, >0.80s warning)
 * 4. Living room target boundaries (0.49s, 0.50s, 0.75s, 0.76s)
 * 5. STC 56 decoupling physics (varying cavity depths, leaf masses, f0 < 60Hz, flanking transmission)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url);

const acousticEngine = await jiti.import(
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
} = acousticEngine;

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
console.log('EMPIRICAL ADVERSARIAL STRESS TEST SUITE — PILLAR 4 (CHALLENGER 1)');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: Absorption Coefficient Accuracy Across All 10 Architectural Finishes
// ============================================================================
console.log('\n--- SUITE 1: 10 Architectural Finishes Absorption Coefficients ---');

const expectedFinishes = [
  { key: 'italian_marble', name: 'Italian marble', expectedAlpha: 0.01, aliases: ['Italian marble', 'italian_marble', 'white statuario marble'] },
  { key: 'kota_stone', name: 'Kota stone', expectedAlpha: 0.02, aliases: ['Kota stone', 'kota_stone', 'honed kota stone'] },
  { key: 'engineered_oak', name: 'engineered oak', expectedAlpha: 0.06, aliases: ['engineered oak', 'engineered_oak', 'oak flooring', 'CPWD teak hardwood'] },
  { key: 'gypsum_board', name: 'gypsum', expectedAlpha: 0.08, aliases: ['gypsum', 'gypsum board', 'gypsum_board', 'drywall', 'plasterboard'] },
  { key: 'gyproc_soundstop', name: 'SoundStop', expectedAlpha: 0.12, aliases: ['SoundStop', 'Gyproc SoundStop', 'gyproc_soundstop'] },
  { key: 'acoustic_timber_panelling', name: 'acoustic timber', expectedAlpha: 0.65, aliases: ['acoustic timber', 'acoustic timber panelling', 'acoustic_timber_panelling', 'micro-perforated acoustic wood'] },
  { key: 'acoustic_ceiling', name: 'acoustic ceiling', expectedAlpha: 0.70, aliases: ['acoustic ceiling', 'acoustic_ceiling', 'suspended acoustic ceiling', 'mineral fiber ceiling tile'] },
  { key: 'velvet_drapes', name: 'velvet drapes', expectedAlpha: 0.50, aliases: ['velvet drapes', 'velvet_drapes', 'heavy velvet drapes', 'curtains'] },
  { key: 'double_glazing', name: 'glazing', expectedAlpha: 0.04, aliases: ['glazing', 'double glazing', 'double_glazing', 'acoustic double glazing', 'window glass'] },
  { key: 'solid_flush_door', name: 'wood door', expectedAlpha: 0.06, aliases: ['wood door', 'solid flush door', 'solid_flush_door', 'timber flush door'] },
];

for (const finish of expectedFinishes) {
  const directValue = ABSORPTION_COEFFICIENTS_500HZ[finish.key];
  recordTest(
    'Finishes: Direct Table',
    `${finish.name} (${finish.key}) in ABSORPTION_COEFFICIENTS_500HZ equals ${finish.expectedAlpha}`,
    directValue === finish.expectedAlpha,
    { key: finish.key, directValue, expectedAlpha: finish.expectedAlpha }
  );

  for (const alias of finish.aliases) {
    const resolvedAlpha = getAbsorptionCoefficient500Hz(alias);
    const matchesExpected = Math.abs(resolvedAlpha - finish.expectedAlpha) < 0.001;
    recordTest(
      'Finishes: Alias Normalization',
      `getAbsorptionCoefficient500Hz("${alias}") resolves to ${finish.expectedAlpha}`,
      matchesExpected,
      { alias, resolvedAlpha, expectedAlpha: finish.expectedAlpha }
    );
  }
}

// ============================================================================
// SUITE 2: Sabine Formula Boundary Conditions
// ============================================================================
console.log('\n--- SUITE 2: Sabine Formula Boundary Conditions ---');

// Test 2.1: Zero volume with default surfaces
const zeroVolume = calculateSabineRT60({
  roomName: 'Zero Volume Void',
  roomType: 'living',
  lengthM: 0,
  widthM: 0,
  heightM: 0,
});
recordTest(
  'Sabine Boundaries',
  'Zero volume handles gracefully without NaN or throwing',
  !isNaN(zeroVolume.rt60Seconds) && isFinite(zeroVolume.rt60Seconds),
  { volumeM3: zeroVolume.volumeM3, rt60Seconds: zeroVolume.rt60Seconds, status: zeroVolume.status }
);

// Test 2.2: Negative dimensions handling
const negDims = calculateSabineRT60({
  roomName: 'Negative Dimension Chamber',
  roomType: 'living',
  lengthM: -5,
  widthM: 4,
  heightM: 3,
});
recordTest(
  'Sabine Boundaries',
  'Negative dimensions do not crash or produce unhandled exception',
  !isNaN(negDims.rt60Seconds) && isFinite(negDims.rt60Seconds),
  { volumeM3: negDims.volumeM3, rt60Seconds: negDims.rt60Seconds }
);

// Test 2.2b: Negative dimensions with explicit positive surface absorption
const negDimsExplicitSurfaces = calculateSabineRT60({
  roomName: 'Negative Dimension with Positive Surfaces',
  roomType: 'living',
  lengthM: -5,
  widthM: 4,
  heightM: 3,
  surfaces: [{ name: 'Acoustic Ceiling', areaM2: 50, material: 'acoustic_ceiling', absorptionCoefficient: 0.70 }],
});
recordTest(
  'Sabine Boundaries',
  'Negative dimensions check: does RT60 remain non-negative? (Physical law: RT60 >= 0)',
  negDimsExplicitSurfaces.rt60Seconds >= 0,
  { volumeM3: negDimsExplicitSurfaces.volumeM3, rt60Seconds: negDimsExplicitSurfaces.rt60Seconds }
);

// Test 2.3: Zero absorption (perfectly reflective echo chamber)
const zeroAbsorption = calculateSabineRT60({
  roomName: 'Perfect Reflection Chamber',
  roomType: 'living',
  lengthM: 10,
  widthM: 8,
  heightM: 3,
  surfaces: [
    { name: 'Floor', areaM2: 80, material: 'custom_mirror', absorptionCoefficient: 0 },
    { name: 'Ceiling', areaM2: 80, material: 'custom_mirror', absorptionCoefficient: 0 },
    { name: 'Walls', areaM2: 108, material: 'custom_mirror', absorptionCoefficient: 0 },
  ],
  airAttenuationRateM: 0, // no air attenuation
});
recordTest(
  'Sabine Boundaries',
  'Zero absorption (alpha=0, m=0) handles safely without dividing by zero into NaN',
  !isNaN(zeroAbsorption.rt60Seconds) && isFinite(zeroAbsorption.rt60Seconds),
  {
    surfaceAbsorptionSabins: zeroAbsorption.surfaceAbsorptionSabins,
    airAttenuationSabins: zeroAbsorption.airAttenuationSabins,
    totalAbsorptionSabins: zeroAbsorption.totalAbsorptionSabins,
    rt60Seconds: zeroAbsorption.rt60Seconds,
  }
);

// Test 2.4: Air attenuation scaling with volume (4mV linearity)
const testVolumes = [50, 250, 1000];
for (const vol of testVolumes) {
  // Let L = vol / 20, W = 5, H = 4 => V = vol
  const L = vol / 20;
  const res = calculateSabineRT60({
    roomName: `Air Scaling V=${vol}`,
    roomType: 'living',
    lengthM: L,
    widthM: 5,
    heightM: 4,
    airAttenuationRateM: 0.002,
  });
  const expected4mV = 4 * 0.002 * vol;
  const delta = Math.abs(res.airAttenuationSabins - expected4mV);
  recordTest(
    'Sabine Boundaries: 4mV Scaling',
    `Air attenuation 4mV strictly equals 4 * 0.002 * ${vol} = ${expected4mV.toFixed(3)} Sabins`,
    delta < 0.005,
    { volumeM3: res.volumeM3, airAttenuationSabins: res.airAttenuationSabins, expected4mV, delta }
  );
}

// Test 2.5: Mathematical precision against exact analytical Sabine formula
// V = 120 m³, S_floor = 40 (alpha=0.02), S_ceil = 40 (alpha=0.70), S_walls = 84 (alpha=0.12)
// A_surf = 40*0.02 + 40*0.70 + 84*0.12 = 0.8 + 28.0 + 10.08 = 38.88 Sabins
// 4mV = 4 * 0.002 * 120 = 0.96 Sabins
// A_total = 39.84 Sabins
// RT60 = 0.161 * 120 / 39.84 = 19.32 / 39.84 = 0.4849s -> 0.48s
const analyticalResult = calculateSabineRT60({
  roomName: 'Precision Validation',
  roomType: 'sanctuary',
  lengthM: 8,
  widthM: 5,
  heightM: 3,
  surfaces: [
    { name: 'Kota Floor', areaM2: 40, material: 'kota_stone', absorptionCoefficient: 0.02 },
    { name: 'Acoustic Ceiling', areaM2: 40, material: 'acoustic_ceiling', absorptionCoefficient: 0.70 },
    { name: 'SoundStop Walls', areaM2: 84, material: 'gyproc_soundstop', absorptionCoefficient: 0.12 },
  ],
  airAttenuationRateM: 0.002,
});
recordTest(
  'Sabine Precision',
  'Computes analytical RT60 matching exact Sabine formula to 2 decimal places (0.48s)',
  analyticalResult.rt60Seconds === 0.48,
  {
    volumeM3: analyticalResult.volumeM3,
    surfaceAbsorptionSabins: analyticalResult.surfaceAbsorptionSabins,
    airAttenuationSabins: analyticalResult.airAttenuationSabins,
    totalAbsorptionSabins: analyticalResult.totalAbsorptionSabins,
    rt60Seconds: analyticalResult.rt60Seconds,
  }
);

// ============================================================================
// SUITE 3: Sanctuary Target Boundaries (0.39s, 0.40s, 0.55s, 0.56s, >0.80s)
// ============================================================================
console.log('\n--- SUITE 3: Sanctuary Target Boundaries ---');

// Helper to construct exact RT60 target by setting V=100m³, airRate=0, and A = 0.161 * 100 / targetRT60
function makeSanctuaryWithRT60(targetRT60, name) {
  const V = 100; // 5m x 5m x 4m
  // We want rawRT60 = 0.161 * V / A_total = targetRT60
  // A_total = 0.161 * 100 / targetRT60 = 16.1 / targetRT60
  // With 4mV = 4 * 0.002 * 100 = 0.8
  // A_surf = (16.1 / targetRT60) - 0.8
  const neededTotalA = 16.1 / targetRT60;
  const neededSurfA = neededTotalA - 0.8;
  return calculateSabineRT60({
    roomName: name,
    roomType: 'sanctuary',
    lengthM: 5,
    widthM: 5,
    heightM: 4,
    surfaces: [
      { name: 'Tuned Absorber', areaM2: 100, material: 'custom', absorptionCoefficient: neededSurfA / 100 },
    ],
    airAttenuationRateM: 0.002,
  });
}

// Test 3.1: Sanctuary RT60 = 0.39s (fail/over-damped)
const sanctuary_039 = makeSanctuaryWithRT60(0.39, 'Sanctuary 0.39s');
recordTest(
  'Sanctuary Boundaries',
  'Sanctuary RT60 = 0.39s fails compliance as overly damped (isCompliant: false, status: "too_dead_stifled")',
  sanctuary_039.rt60Seconds === 0.39 && sanctuary_039.isCompliant === false && sanctuary_039.status === 'too_dead_stifled',
  { rt60Seconds: sanctuary_039.rt60Seconds, isCompliant: sanctuary_039.isCompliant, status: sanctuary_039.status, targetRange: sanctuary_039.targetRT60Range }
);

// Test 3.2: Sanctuary RT60 = 0.40s (exact lower pass boundary)
const sanctuary_040 = makeSanctuaryWithRT60(0.40, 'Sanctuary 0.40s');
recordTest(
  'Sanctuary Boundaries',
  'Sanctuary RT60 = 0.40s passes compliance at exact lower limit (isCompliant: true, status: "optimal")',
  sanctuary_040.rt60Seconds === 0.40 && sanctuary_040.isCompliant === true && sanctuary_040.status === 'optimal',
  { rt60Seconds: sanctuary_040.rt60Seconds, isCompliant: sanctuary_040.isCompliant, status: sanctuary_040.status, targetRange: sanctuary_040.targetRT60Range }
);

// Test 3.3: Sanctuary RT60 = 0.55s (exact upper pass boundary)
const sanctuary_055 = makeSanctuaryWithRT60(0.55, 'Sanctuary 0.55s');
recordTest(
  'Sanctuary Boundaries',
  'Sanctuary RT60 = 0.55s passes compliance at exact upper limit (isCompliant: true, status: "optimal")',
  sanctuary_055.rt60Seconds === 0.55 && sanctuary_055.isCompliant === true && sanctuary_055.status === 'optimal',
  { rt60Seconds: sanctuary_055.rt60Seconds, isCompliant: sanctuary_055.isCompliant, status: sanctuary_055.status, targetRange: sanctuary_055.targetRT60Range }
);

// Test 3.4: Sanctuary RT60 = 0.56s (fail/reverberant)
const sanctuary_056 = makeSanctuaryWithRT60(0.56, 'Sanctuary 0.56s');
recordTest(
  'Sanctuary Boundaries',
  'Sanctuary RT60 = 0.56s fails compliance as too live/echoey (isCompliant: false, status: "too_live_echoey")',
  sanctuary_056.rt60Seconds === 0.56 && sanctuary_056.isCompliant === false && sanctuary_056.status === 'too_live_echoey',
  { rt60Seconds: sanctuary_056.rt60Seconds, isCompliant: sanctuary_056.isCompliant, status: sanctuary_056.status, targetRange: sanctuary_056.targetRT60Range }
);

// Test 3.5: Sanctuary RT60 > 0.80s (high reverberation warning)
const sanctuary_085 = makeSanctuaryWithRT60(0.85, 'Sanctuary 0.85s High Reverberation');
recordTest(
  'Sanctuary Boundaries',
  'Sanctuary RT60 = 0.85s triggers hasWarning=true and warningMessage citing 0.80s threshold',
  sanctuary_085.rt60Seconds === 0.85 &&
    sanctuary_085.hasWarning === true &&
    typeof sanctuary_085.warningMessage === 'string' &&
    sanctuary_085.warningMessage.includes('0.80s'),
  { rt60Seconds: sanctuary_085.rt60Seconds, hasWarning: sanctuary_085.hasWarning, warningMessage: sanctuary_085.warningMessage }
);

// ============================================================================
// SUITE 4: Living Room Target Boundaries (0.49s, 0.50s, 0.75s, 0.76s)
// ============================================================================
console.log('\n--- SUITE 4: Living Room Target Boundaries (0.50s - 0.75s) ---');

function makeLivingWithRT60(targetRT60, name) {
  const V = 200; // 8m x 5m x 5m
  const neededTotalA = (0.161 * V) / targetRT60;
  const neededSurfA = neededTotalA - 4 * 0.002 * V;
  return calculateSabineRT60({
    roomName: name,
    roomType: 'living',
    lengthM: 8,
    widthM: 5,
    heightM: 5,
    surfaces: [
      { name: 'Tuned Surface', areaM2: 200, material: 'custom', absorptionCoefficient: neededSurfA / 200 },
    ],
    airAttenuationRateM: 0.002,
  });
}

// Test 4.1: Living room RT60 = 0.49s (fail/over-damped)
const living_049 = makeLivingWithRT60(0.49, 'Living 0.49s');
recordTest(
  'Living Boundaries',
  'Living RT60 = 0.49s fails compliance as overly damped below 0.50s (isCompliant: false, status: "too_dead_stifled")',
  living_049.rt60Seconds === 0.49 && living_049.isCompliant === false && living_049.status === 'too_dead_stifled',
  { rt60Seconds: living_049.rt60Seconds, isCompliant: living_049.isCompliant, status: living_049.status, targetRange: living_049.targetRT60Range }
);

// Test 4.2: Living room RT60 = 0.50s (exact lower pass boundary)
const living_050 = makeLivingWithRT60(0.50, 'Living 0.50s');
recordTest(
  'Living Boundaries',
  'Living RT60 = 0.50s passes compliance at exact lower limit (isCompliant: true, status: "optimal")',
  living_050.rt60Seconds === 0.50 && living_050.isCompliant === true && living_050.status === 'optimal',
  { rt60Seconds: living_050.rt60Seconds, isCompliant: living_050.isCompliant, status: living_050.status, targetRange: living_050.targetRT60Range }
);

// Test 4.3: Living room RT60 = 0.75s (exact upper pass boundary)
const living_075 = makeLivingWithRT60(0.75, 'Living 0.75s');
recordTest(
  'Living Boundaries',
  'Living RT60 = 0.75s passes compliance at exact upper limit (isCompliant: true, status: "optimal")',
  living_075.rt60Seconds === 0.75 && living_075.isCompliant === true && living_075.status === 'optimal',
  { rt60Seconds: living_075.rt60Seconds, isCompliant: living_075.isCompliant, status: living_075.status, targetRange: living_075.targetRT60Range }
);

// Test 4.4: Living room RT60 = 0.76s (fail/reverberant)
const living_076 = makeLivingWithRT60(0.76, 'Living 0.76s');
recordTest(
  'Living Boundaries',
  'Living RT60 = 0.76s fails compliance as too live/echoey (isCompliant: false, status: "too_live_echoey")',
  living_076.rt60Seconds === 0.76 && living_076.isCompliant === false && living_076.status === 'too_live_echoey',
  { rt60Seconds: living_076.rt60Seconds, isCompliant: living_076.isCompliant, status: living_076.status, targetRange: living_076.targetRT60Range }
);

// ============================================================================
// SUITE 5: STC 56 Decoupling Physics & Mass-Air-Mass Resonance (f0 < 60Hz)
// ============================================================================
console.log('\n--- SUITE 5: STC 56 Decoupling Physics & Mass-Air-Mass Resonance ---');

// Test 5.1: Standard luxury party wall / sanctuary partition baseline
const standardDecoupling = verifySTCDecoupling({
  partitionName: 'Standard Luxury Sanctuary Partition',
  studWidthMm: 90,
  airCavityMm: 25,
  rockwoolThicknessMm: 50,
  rockwoolDensityKgM3: 60,
  hasResilientChannels: true,
  gyprocSoundStopBoardsCount: 2,
  gyprocSoundStopThicknessMm: 12.5,
  hasGreenGlueDamping: true,
  ceilingPlenumFlanking: false,
  doorAcousticSealPresent: true,
  backToBackElectricalBoxesStaggered: true,
});

recordTest(
  'STC Decoupling: Baseline',
  'Standard assembly yields f0 < 60Hz (measured f0 ≈ 51.3Hz) and testedSTCRating = 56',
  standardDecoupling.isSTC56Compliant === true &&
    standardDecoupling.testedSTCRating === 56 &&
    standardDecoupling.massAirMassResonanceHz < 60.0 &&
    standardDecoupling.isResonanceBelowSpeech === true,
  {
    f0: standardDecoupling.massAirMassResonanceHz,
    testedSTC: standardDecoupling.testedSTCRating,
    isCompliant: standardDecoupling.isSTC56Compliant,
    cavityDepthMm: standardDecoupling.totalCavityDepthMm,
    leafMassKgM2: standardDecoupling.leaf1MassKgM2,
  }
);

// Test 5.2: Cavity depth scaling: deeper cavity lowers f0, shallow cavity raises f0
// Analytical formula: f0 proportional to 1 / sqrt(d)
const shallowCavity = verifySTCDecoupling({
  studWidthMm: 45,
  airCavityMm: 5, // total cavity 50mm vs 115mm standard
});
const deepCavity = verifySTCDecoupling({
  studWidthMm: 150,
  airCavityMm: 50, // total cavity 200mm vs 115mm standard
});

recordTest(
  'STC Decoupling: Cavity Depth Scaling',
  'Shallow cavity (50mm) increases resonance f0 above 60Hz (fails speech decoupling)',
  shallowCavity.massAirMassResonanceHz > 60.0 && shallowCavity.isResonanceBelowSpeech === false,
  { cavityDepthMm: shallowCavity.totalCavityDepthMm, f0: shallowCavity.massAirMassResonanceHz, isBelowSpeech: shallowCavity.isResonanceBelowSpeech }
);

recordTest(
  'STC Decoupling: Cavity Depth Scaling',
  'Deep cavity (200mm) reduces resonance f0 significantly below baseline (f0 < 40Hz)',
  deepCavity.massAirMassResonanceHz < standardDecoupling.massAirMassResonanceHz && deepCavity.massAirMassResonanceHz < 40.0,
  { cavityDepthMm: deepCavity.totalCavityDepthMm, f0: deepCavity.massAirMassResonanceHz }
);

// Test 5.3: Mass surface density scaling: heavier leaves lower f0
const singleBoardLeaf = verifySTCDecoupling({
  gyprocSoundStopBoardsCount: 1, // 11 kg/m²
});
const tripleBoardLeaf = verifySTCDecoupling({
  gyprocSoundStopBoardsCount: 3, // 33 kg/m²
});

recordTest(
  'STC Decoupling: Mass Density Scaling',
  'Single 12.5mm board (11 kg/m²) raises f0 and fails STC 56 compliance',
  singleBoardLeaf.massAirMassResonanceHz > standardDecoupling.massAirMassResonanceHz && singleBoardLeaf.testedSTCRating < 56,
  { leafMass: singleBoardLeaf.leaf1MassKgM2, f0: singleBoardLeaf.massAirMassResonanceHz, testedSTC: singleBoardLeaf.testedSTCRating }
);

recordTest(
  'STC Decoupling: Mass Density Scaling',
  'Triple 12.5mm boards (33 kg/m²) lowers f0 further below baseline',
  tripleBoardLeaf.massAirMassResonanceHz < standardDecoupling.massAirMassResonanceHz,
  { leafMass: tripleBoardLeaf.leaf1MassKgM2, f0: tripleBoardLeaf.massAirMassResonanceHz }
);

// Test 5.4: Mechanical bridging when resilient channels (RC-1) are omitted
const nonDecoupledRigid = verifySTCDecoupling({
  hasResilientChannels: false,
});
recordTest(
  'STC Decoupling: Mechanical Bridging',
  'Omitting resilient channels drops STC rating by 8 dB and fails compliance',
  nonDecoupledRigid.isSTC56Compliant === false && nonDecoupledRigid.testedSTCRating === 48,
  { testedSTCRating: nonDecoupledRigid.testedSTCRating, f0: nonDecoupledRigid.massAirMassResonanceHz, suggestions: nonDecoupledRigid.remediationSuggestions }
);

// Test 5.5: Damping omissions (Green Glue omitted)
const noDamping = verifySTCDecoupling({
  hasGreenGlueDamping: false,
});
recordTest(
  'STC Decoupling: Viscoelastic Damping',
  'Omitting Green Glue drops STC rating by 3 dB and increases f0',
  noDamping.testedSTCRating === 53 && noDamping.isSTC56Compliant === false,
  { testedSTCRating: noDamping.testedSTCRating, f0: noDamping.massAirMassResonanceHz }
);

// Test 5.6: Flanking acoustic transmission leaks (ceiling plenum, door drop seal, electrical boxes)
const flankingAcousticLeaks = verifySTCDecoupling({
  ceilingPlenumFlanking: true,
  doorAcousticSealPresent: false,
  backToBackElectricalBoxesStaggered: false,
});
recordTest(
  'STC Decoupling: Flanking Leaks',
  'Flanking leaks severely degrade partition to STC <= 39 with multi-point remediation suggestions',
  flankingAcousticLeaks.testedSTCRating <= 39 &&
    flankingAcousticLeaks.isSTC56Compliant === false &&
    flankingAcousticLeaks.remediationSuggestions.length >= 3,
  {
    testedSTCRating: flankingAcousticLeaks.testedSTCRating,
    remediations: flankingAcousticLeaks.remediationSuggestions,
  }
);

// Test 5.7: STC Decoupling Boundary Conditions: 0 boards and 0 cavity depth
const zeroBoards = verifySTCDecoupling({ gyprocSoundStopBoardsCount: 0 });
recordTest(
  'STC Decoupling: Boundary Conditions',
  'Zero drywall boards handles safely without NaN or crash',
  !isNaN(zeroBoards.massAirMassResonanceHz) && isFinite(zeroBoards.massAirMassResonanceHz),
  { f0: zeroBoards.massAirMassResonanceHz, isCompliant: zeroBoards.isSTC56Compliant }
);

const zeroCavity = verifySTCDecoupling({ studWidthMm: 0, airCavityMm: 0 });
recordTest(
  'STC Decoupling: Boundary Conditions',
  'Zero cavity depth handles safely without Infinity or crash',
  !isNaN(zeroCavity.massAirMassResonanceHz) && isFinite(zeroCavity.massAirMassResonanceHz),
  { f0: zeroCavity.massAirMassResonanceHz, isCompliant: zeroCavity.isSTC56Compliant }
);

// ============================================================================
// SUITE 6: calculateRoomRT60 Dual-Frequency (500Hz & 1000Hz) Validation
// ============================================================================
console.log('\n--- SUITE 6: calculateRoomRT60 Dual-Frequency Validation ---');

const roomRT60Living = calculateRoomRT60({
  roomName: 'Grand Living Hall',
  roomType: 'living',
  lengthM: 8,
  widthM: 6,
  heightM: 3.2,
  floorMaterialKey: 'italian_marble',
  wallFinishKey: 'gyproc_soundstop_double',
  ceilingFinishKey: 'acoustic_ceiling',
  glazingAreaSqM: 10,
  doorAreaSqM: 4,
});

recordTest(
  'calculateRoomRT60 Dual-Frequency',
  'calculateRoomRT60 computes both 500Hz and 1000Hz Sabins and averages RT60',
  roomRT60Living.rt60Seconds500Hz > 0 &&
    roomRT60Living.rt60Seconds1000Hz > 0 &&
    roomRT60Living.rt60AverageSeconds > 0 &&
    Array.isArray(roomRT60Living.targetRT60Range) &&
    roomRT60Living.targetRT60Range.length === 2,
  {
    volumeM3: roomRT60Living.volumeM3,
    rt60_500: roomRT60Living.rt60Seconds500Hz,
    rt60_1000: roomRT60Living.rt60Seconds1000Hz,
    rt60Avg: roomRT60Living.rt60AverageSeconds,
    status: roomRT60Living.status,
  }
);


// ============================================================================
// SUMMARY & STATISTICS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const totalTests = testResults.length;
const passedTests = testResults.filter((t) => t.passed).length;
const failedTests = testResults.filter((t) => !t.passed).length;

console.log(`Total tests executed: ${totalTests}`);
console.log(`Passed:               ${passedTests}`);
console.log(`Failed:               ${failedTests}`);

if (failedTests > 0) {
  console.log('\n❌ FAILED TESTS BREAKDOWN:');
  for (const t of testResults.filter((t) => !t.passed)) {
    console.log(`  • [${t.suite}] ${t.name}`);
    if (t.details) console.log(`    Details: ${JSON.stringify(t.details)}`);
  }
} else {
  console.log('\n🌟 ALL ADVERSARIAL STRESS TESTS PASSED!');
}

console.log('='.repeat(80));
process.exit(failedTests > 0 ? 1 : 0);
