/**
 * Co-located Unit Test Suite for Museum Acoustics, Daylighting & Vastu Mandala Engine (Pillar 4).
 *
 * Verifies:
 * 1. Sabine RT60 formula: RT60 = 0.161 * V / (sum(Si * alphai) + 4mV)
 * 2. All 10 standard architectural absorption coefficients at 500Hz:
 *    - Italian marble (0.01), Kota stone (0.02), engineered oak (0.06), gypsum board (0.08),
 *    - Gyproc SoundStop (0.12), acoustic timber panelling (0.65), acoustic ceiling (0.70),
 *    - velvet drapes (0.50), double glazing (0.04), solid flush door (0.06).
 * 3. Sanctuary / Master Bedroom acoustic compliance boundaries: 0.40s <= RT60 <= 0.55s.
 * 4. Living / Entertainment Lounge acoustic compliance boundaries: 0.50s <= RT60 <= 0.75s.
 * 5. High-reverberance warning trigger when RT60 > 0.80s.
 * 6. STC 56 acoustic decoupling verification:
 *    - 90mm steel studs, 25mm decoupled air cavity, 50mm Rockwool (60 kg/m³),
 *    - resilient channels (RC-1), dual 12.5mm Gyproc SoundStop, and Green Glue viscoelastic damping.
 *    - mass-air-mass resonance f0 < 60 Hz (below human speech fundamental).
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSabineRT60,
  calculateRoomRT60,
  verifySTCDecoupling,
  validatePartitionSTC,
  getAbsorptionCoefficient500Hz,
  ABSORPTION_COEFFICIENTS_500HZ,
  ACOUSTIC_MATERIALS_DATABASE,
} from './acoustic-rt60-calculator';

describe('Acoustic Engine — Museum Acoustics & RT60 Simulation', () => {
  describe('Absorption Coefficients Database (500Hz)', () => {
    test('defines all 10 realistic absorption coefficients at 500Hz', () => {
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.italian_marble, 0.01);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.kota_stone, 0.02);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.engineered_oak, 0.06);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.gypsum_board, 0.08);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.gyproc_soundstop, 0.12);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.acoustic_timber_panelling, 0.65);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.acoustic_ceiling, 0.70);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.velvet_drapes, 0.50);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.double_glazing, 0.04);
      assert.equal(ABSORPTION_COEFFICIENTS_500HZ.solid_flush_door, 0.06);
    });

    test('getAbsorptionCoefficient500Hz normalizes names and aliases accurately', () => {
      assert.equal(getAbsorptionCoefficient500Hz('Italian marble'), 0.01);
      assert.equal(getAbsorptionCoefficient500Hz('Kota Stone'), 0.02);
      assert.equal(getAbsorptionCoefficient500Hz('engineered oak'), 0.06);
      assert.equal(getAbsorptionCoefficient500Hz('gypsum board'), 0.08);
      assert.equal(getAbsorptionCoefficient500Hz('Gyproc SoundStop'), 0.12);
      assert.equal(getAbsorptionCoefficient500Hz('acoustic timber panelling'), 0.65);
      assert.equal(getAbsorptionCoefficient500Hz('acoustic ceiling'), 0.70);
      assert.equal(getAbsorptionCoefficient500Hz('velvet drapes'), 0.50);
      assert.equal(getAbsorptionCoefficient500Hz('double glazing'), 0.04);
      assert.equal(getAbsorptionCoefficient500Hz('solid flush door'), 0.06);
    });
  });

  describe('Sabine Reverberation Time Simulation Formula', () => {
    test('computes RT60 = (0.161 * V) / (sum(Si * alphai) + 4mV) with mathematical precision', () => {
      // Dimensions: 10m x 8m x 3m
      // Volume V = 240 m³
      // Surfaces: Floor (80m² marble 0.01), Ceiling (80m² acoustic 0.70), Walls (108m² gyproc 0.12)
      // Surface absorption = 80*0.01 + 80*0.70 + 108*0.12 = 0.8 + 56.0 + 12.96 = 69.76 Sabins
      // Air attenuation 4mV = 4 * 0.002 * 240 = 1.92 Sabins
      // Total absorption = 69.76 + 1.92 = 71.68 Sabins
      // RT60 = 0.161 * 240 / 71.68 = 38.64 / 71.68 = 0.539s -> 0.54s
      const result = calculateSabineRT60({
        roomName: 'Acoustic Test Chamber',
        roomType: 'living',
        lengthM: 10,
        widthM: 8,
        heightM: 3,
        floorMaterial: 'italian_marble',
        ceilingMaterial: 'acoustic_ceiling',
        wallMaterial: 'gyproc_soundstop',
      });

      assert.equal(result.volumeM3, 240);
      assert.ok(Math.abs(result.surfaceAbsorptionSabins - 69.76) < 0.01);
      assert.ok(Math.abs(result.airAttenuationSabins - 1.92) < 0.01);
      assert.ok(Math.abs(result.totalAbsorptionSabins - 71.68) < 0.01);
      assert.equal(result.rt60Seconds, 0.54);
      assert.equal(result.isCompliant, true);
    });

    test('supports detailed explicit surface arrays with overrides', () => {
      const result = calculateSabineRT60({
        roomName: 'Custom Surface Studio',
        roomType: 'sanctuary',
        lengthM: 6,
        widthM: 5,
        heightM: 3,
        surfaces: [
          { name: 'Marble Floor', areaM2: 30, material: 'italian_marble' },
          { name: 'Acoustic Ceiling', areaM2: 30, material: 'acoustic_ceiling' },
          { name: 'SoundStop Drywall', areaM2: 50, material: 'gyproc_soundstop' },
          { name: 'Velvet Curtains', areaM2: 16, material: 'velvet_drapes' },
        ],
      });

      // Volume = 90 m³
      // Absorption: 30*0.01 + 30*0.70 + 50*0.12 + 16*0.50 = 0.3 + 21.0 + 6.0 + 8.0 = 35.3 Sabins
      // 4mV = 4 * 0.002 * 90 = 0.72 Sabins
      // Total = 36.02 Sabins
      // RT60 = 0.161 * 90 / 36.02 = 14.49 / 36.02 = 0.402s -> 0.40s
      assert.equal(result.volumeM3, 90);
      assert.ok(Math.abs(result.surfaceAbsorptionSabins - 35.3) < 0.01);
      assert.equal(result.rt60Seconds, 0.40);
      assert.equal(result.isCompliant, true);
      assert.equal(result.targetRT60Range[0], 0.40);
      assert.equal(result.targetRT60Range[1], 0.55);
    });
  });

  describe('Sanctuary & Living Room Acoustic Compliance Targets', () => {
    test('evaluates Sanctuary / Master Bedroom target: 0.40s <= RT60 <= 0.55s', () => {
      // Compliant sanctuary room
      const sanctuaryPass = calculateSabineRT60({
        roomName: 'Primary Sanctuary Suite',
        roomType: 'sanctuary',
        lengthM: 6.5,
        widthM: 5.5,
        heightM: 3.2,
        floorMaterial: 'engineered_oak',
        ceilingMaterial: 'acoustic_ceiling',
        wallMaterial: 'gyproc_soundstop',
        windowAreaSqM: 8.0,
        drapesAreaSqM: 12.0,
      });

      assert.equal(sanctuaryPass.targetRT60Range[0], 0.40);
      assert.equal(sanctuaryPass.targetRT60Range[1], 0.55);
      assert.ok(sanctuaryPass.rt60Seconds >= 0.40 && sanctuaryPass.rt60Seconds <= 0.55);
      assert.equal(sanctuaryPass.isCompliant, true);
      assert.equal(sanctuaryPass.status, 'optimal');
    });

    test('evaluates Living / Entertainment Lounge target: 0.50s <= RT60 <= 0.75s', () => {
      const loungePass = calculateSabineRT60({
        roomName: 'Grand Entertainment Lounge',
        roomType: 'entertainment_lounge',
        lengthM: 9.0,
        widthM: 7.0,
        heightM: 3.4,
        floorMaterial: 'engineered_oak',
        ceilingMaterial: 'acoustic_ceiling',
        wallMaterial: 'gyproc_soundstop',
        windowAreaSqM: 14.0,
        drapesAreaSqM: 10.0,
      });

      assert.equal(loungePass.targetRT60Range[0], 0.50);
      assert.equal(loungePass.targetRT60Range[1], 0.75);
      assert.ok(loungePass.rt60Seconds >= 0.50 && loungePass.rt60Seconds <= 0.75);
      assert.equal(loungePass.isCompliant, true);
      assert.equal(loungePass.status, 'optimal');
    });

    test('triggers warning when RT60 > 0.80s in reverberant spaces', () => {
      const echoRoom = calculateSabineRT60({
        roomName: 'All-Marble High Reverberance Hall',
        roomType: 'living',
        lengthM: 12.0,
        widthM: 9.0,
        heightM: 4.0,
        floorMaterial: 'italian_marble',
        ceilingMaterial: 'monolithic_gypsum_ceiling',
        wallMaterial: 'gypsum_board',
      });

      assert.ok(echoRoom.rt60Seconds > 0.80);
      assert.equal(echoRoom.hasWarning, true);
      assert.ok(echoRoom.warningMessage?.includes('0.80s'));
      assert.equal(echoRoom.status, 'too_live_echoey');
      assert.equal(echoRoom.isCompliant, false);
    });
  });

  describe('STC 56 Acoustic Decoupling Verification', () => {
    test('verifies luxury STC 56 wall sandwich with f0 < 60 Hz', () => {
      const verification = verifySTCDecoupling({
        studWidthMm: 90,
        airCavityMm: 25,
        rockwoolThicknessMm: 50,
        rockwoolDensityKgM3: 60,
        hasResilientChannels: true,
        gyprocSoundStopBoardsCount: 2,
        gyprocSoundStopThicknessMm: 12.5,
        hasGreenGlueDamping: true,
      });

      assert.equal(verification.isSTC56Compliant, true);
      assert.equal(verification.testedSTCRating, 56);
      assert.ok(verification.massAirMassResonanceHz < 60.0);
      assert.equal(verification.isResonanceBelowSpeech, true);
      assert.equal(verification.totalCavityDepthMm, 115);
      assert.equal(verification.leaf1MassKgM2, 22.0);
      assert.equal(verification.leaf2MassKgM2, 22.0);
      assert.ok(verification.certificationSummary.includes('VERIFIED'));
      assert.ok(verification.certificationSummary.includes('STC 56'));
      assert.ok(verification.certificationSummary.includes('< 60 Hz'));
    });

    test('fails STC 56 when resilient channels are omitted (mechanical bridging)', () => {
      const nonDecoupled = verifySTCDecoupling({
        studWidthMm: 90,
        airCavityMm: 25,
        rockwoolThicknessMm: 50,
        rockwoolDensityKgM3: 60,
        hasResilientChannels: false,
        gyprocSoundStopBoardsCount: 2,
        hasGreenGlueDamping: true,
      });

      assert.equal(nonDecoupled.isSTC56Compliant, false);
      assert.ok(nonDecoupled.testedSTCRating < 56);
      assert.ok(nonDecoupled.remediationSuggestions.some((r) => r.includes('RC-1')));
    });

    test('fails STC 56 when single gypsum board is used instead of dual SoundStop', () => {
      const singleBoard = verifySTCDecoupling({
        studWidthMm: 90,
        airCavityMm: 25,
        rockwoolThicknessMm: 50,
        rockwoolDensityKgM3: 60,
        hasResilientChannels: true,
        gyprocSoundStopBoardsCount: 1,
        hasGreenGlueDamping: false,
      });

      assert.equal(singleBoard.isSTC56Compliant, false);
      assert.ok(singleBoard.testedSTCRating < 56);
    });

    test('detects flanking leaks (ceiling plenum gap, unsealed door, electrical boxes)', () => {
      const flankingWall = verifySTCDecoupling({
        hasResilientChannels: true,
        hasGreenGlueDamping: true,
        ceilingPlenumFlanking: true,
        doorAcousticSealPresent: false,
        backToBackElectricalBoxesStaggered: false,
      });

      assert.equal(flankingWall.isSTC56Compliant, false);
      assert.ok(flankingWall.testedSTCRating <= 40);
      assert.ok(flankingWall.remediationSuggestions.length >= 3);
    });
  });
});
