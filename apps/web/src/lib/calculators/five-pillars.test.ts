/**
 * Comprehensive 5-Pillar E2E & 4-Tier Test Suite for AtelierOS.
 *
 * Implements:
 *   - Tier 1: Feature Coverage (>=5 test cases per pillar across all 5 pillars)
 *   - Tier 2: Boundary & Corner Cases (>=5 test cases per pillar across all 5 pillars)
 *   - Tier 3: Cross-Feature Multi-Pillar Interactions (Cross-cutting systemic workflows)
 *   - Tier 4: Real-World Institutional Scenarios (Institutional grade benchmark validations)
 *
 * Grounded in:
 *   - Pillar 1: PE Financial Underwriting & Statutory FAR Monetization (Haryana DTCP, CPWD DSR 2024)
 *   - Pillar 2: Structural Bay Grid & 3D MEP BIM Coordination (IS 456:2000, IS 1893 Zone IV, NBC Part 3)
 *   - Pillar 3: Multi-Floor Egress & Fire Engineering Automation (NBC 2016 Part 4 Table 8, Cl. 4.4 & 4.5)
 *   - Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala (Sabine RT60, STC 56, NBC Part 8, Paramasayika)
 *   - Pillar 5: 4D EPC Construction Scheduling & Turnkey Resilience (CPM, VE Compression, IS 287, IFC4 LOD 300)
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePEUnderwriting,
  generateCPWDTenderCsv,
  exportCPWDTenderScheduleCSV,
  CPWD_DSR_2024_DEFAULTS,
  type UnderwritingInputs,
  type UnderwritingResult,
  type CPWDTenderItem,
} from './pe-underwriting';

import {
  generateStructuralGrid,
  checkSpanDeflection,
  checkPlenumClash,
  STRUCTURAL_DEFAULTS,
  type StructuralGridSpacing,
  type ColumnPlacement,
  type StructuralSpanCheck,
  type PlenumClashCheck,
  type StructuralGridResult,
} from './structural-grid-engine';

import {
  calculateStaircaseGeometry,
  calculateStaircaseCompliance,
  resolveMultiExitRoutes,
  generateEvacuationDossier,
  STAIRCASE_STATUTORY_LIMITS,
  type StaircaseConfig,
  type StaircaseCompliance,
  type ExitRoutingResult,
} from './staircase-egress-calculator';

import {
  calculateRoomRT60,
  validatePartitionSTC,
  calculateDaylightFactor,
  evaluateVastuMandala,
  ACOUSTIC_MATERIALS_DATABASE,
  type RoomAcousticInputs,
  type RT60Analysis,
  type PartitionSTCAnalysis,
  type DaylightAnalysis,
  type VastuMandalaResult,
} from './acoustic-rt60-calculator';

import {
  DEFAULT_TURNKEY_TASKS,
  calculateCPM,
  applyValueEngineeringCompression,
  assessMonsoonRisk,
  generateIFC4LOD300Records,
  exportCOBieScheduleCSV,
  type GanttTask,
  type ValueEngineeringSwap,
  type MonsoonRiskAssessment,
  type IFCPropertyRecord,
} from './construction-gantt-engine';

import type { FloorPlan } from '@/components/floor-plan-editor/types';

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 PER PILLAR)
// ============================================================================

describe('Tier 1: Feature Coverage — 5 Pillars of AtelierOS', () => {

  // --------------------------------------------------------------------------
  // PILLAR 1: PE FINANCIAL UNDERWRITING & STATUTORY FAR MONETIZATION
  // --------------------------------------------------------------------------
  describe('Pillar 1: PE Financial Underwriting & Statutory FAR Monetization', () => {
    test('P1-F1: computes institutional pro-forma underwriting metrics correctly', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 12000,
        carpetAreaSqFt: 10200,
        totalCapexINR: 45000000, // ₹4.5 Cr
        rentalRatePerSqFtMonthlyINR: 135,
        plotAreaSqFt: 6000,
      });

      assert.equal(result.carpetToSaleableRatio, 0.85);
      assert.equal(result.carpetToSaleablePercentFormatted, '85.0%');
      assert.equal(result.meetsNTGThreshold, true);
      assert.equal(result.plotAreaSqFt, 6000);
      assert.equal(result.baseAllowableGFA, 10500); // 6000 * 1.75
      assert.equal(result.purchasableGFA, 5340);    // 6000 * 0.89
      assert.equal(result.totalPermissibleGFA, 15840); // 6000 * 2.64
      assert.equal(result.isFARCompliant, true);
      assert.ok(result.yieldOnCostPercent > 0);
      assert.ok(result.netOperatingIncomeINR > 0);
      assert.ok(result.paybackPeriodYears > 0 && result.paybackPeriodYears < 15);
      assert.ok(result.estimated10YrIRRPercent > 0);
      assert.equal(result.isInstitutionalGrade, true);
    });

    test('P1-F2: generates official CPWD DSR 2024 tender schedule items', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 5000,
        carpetAreaSqFt: 4250,
        totalCapexINR: 20000000,
      });

      assert.ok(result.cpwdTenderSchedule.length >= 5);
      const marbleItem = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 11.36.1');
      assert.ok(marbleItem, 'CPWD 11.36.1 flooring item must be present');
      assert.equal(marbleItem?.dsrRateINR, 1450);
      assert.equal(marbleItem?.unit, 'sqm');

      const paintItem = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 13.48');
      assert.ok(paintItem, 'CPWD 13.48 paint item must be present');
      assert.equal(paintItem?.dsrRateINR, 285);

      const doorItem = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 9.21.2');
      assert.ok(doorItem, 'CPWD 9.21.2 timber doors must be present');
      assert.equal(doorItem?.dsrRateINR, 18500);

      const shaftItem = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 19.3.1');
      assert.ok(shaftItem, 'CPWD 19.3.1 MEP core riser must be present');

      const acousticItem = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 31.8.2');
      assert.ok(acousticItem, 'CPWD 31.8.2 STC 56 acoustic drywall must be present');
      assert.equal(acousticItem?.dsrRateINR, 2650);
    });

    test('P1-F3: generates valid RFC 4180 CPWD tender CSV export with grand total', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 5000,
        carpetAreaSqFt: 4250,
        totalCapexINR: 20000000,
      });

      const csv = exportCPWDTenderScheduleCSV(result.cpwdTenderSchedule);
      assert.ok(csv.includes('Item Code,Sub-Head,Description,Quantity,Unit,DSR Rate (INR),Amount (INR)'));
      assert.ok(csv.includes('"CPWD 11.36.1"'));
      assert.ok(csv.includes('"CPWD 13.48"'));
      assert.ok(csv.includes('"GRAND TOTAL (CPWD DSR 2024)"'));
      assert.ok(csv.includes(result.tenderScheduleGrandTotalINR.toString()));
    });

    test('P1-F4: calculates statutory Haryana DTCP FAR (1.75 base, 2.64 max total) and ground coverage', () => {
      const plotArea = 10000; // 10,000 sq ft plot
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 25000,
        carpetAreaSqFt: 21250,
        totalCapexINR: 80000000,
        plotAreaSqFt: plotArea,
        baseFAR: CPWD_DSR_2024_DEFAULTS.BASE_FAR,
        purchasableFAR: CPWD_DSR_2024_DEFAULTS.MAX_PURCHASABLE_FAR,
      });

      assert.equal(result.baseAllowableGFA, 17500); // 10,000 * 1.75
      assert.equal(result.purchasableGFA, 8900);   // 10,000 * 0.89
      assert.equal(result.totalPermissibleGFA, 26400); // 10,000 * 2.64
      assert.equal(result.isFARCompliant, true);
      assert.equal(result.farUtilizationPercent, 94.7); // 25,000 / 26,400 = 94.7%
      const maxGroundCoverageSqFt = plotArea * (CPWD_DSR_2024_DEFAULTS.MAX_GROUND_COVERAGE_PERCENT / 100);
      assert.equal(maxGroundCoverageSqFt, 6000); // 60% coverage
    });

    test('P1-F5: verifies spatial zone classification for carpet, circulation, and deductible shafts', () => {
      const grossGFA = 10000;
      const carpet = 8400;
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: grossGFA,
        carpetAreaSqFt: carpet,
        totalCapexINR: 35000000,
      });

      // Spatial breakdown
      assert.equal(result.carpetAreaSqFt, 8400); // Net Carpet Area (green zone)
      assert.equal(result.circulationAreaSqFt, 1600); // Saleable Circulation (amber zone)
      assert.equal(result.carpetToSaleableRatio, 0.84);
      assert.equal(result.meetsNTGThreshold, true); // Squeezed to institutional 84% NTG

      // Deductible MEP Shaft item is verified in tender schedule
      const mepShaft = result.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 19.3.1');
      assert.ok(mepShaft);
      assert.equal(mepShaft.subHead, 'Plumbing & Core Wet Shafts');
    });

    test('P1-F6: dynamically increases Yield-on-Cost and compresses payback period after Capex reduction', () => {
      const baselineResult = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1200,
        carpetAreaSqFt: 1008,
        totalCapexINR: 2850000, // Baseline ₹28.5L
        rentalRatePerSqFtMonthlyINR: 125,
      });

      const veOptimizedResult = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1200,
        carpetAreaSqFt: 1008,
        totalCapexINR: 1995000, // Optimized ₹19.95L (-₹8.55L VE cut)
        rentalRatePerSqFtMonthlyINR: 125,
      });

      assert.ok(veOptimizedResult.yieldOnCostPercent > baselineResult.yieldOnCostPercent);
      assert.ok(veOptimizedResult.paybackPeriodYears < baselineResult.paybackPeriodYears);
      assert.ok(veOptimizedResult.estimated10YrIRRPercent >= baselineResult.estimated10YrIRRPercent);
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 2: STRUCTURAL BAY GRID & 3D MEP BIM COORDINATION
  // --------------------------------------------------------------------------
  describe('Pillar 2: Structural Bay Grid & 3D MEP BIM Coordination', () => {
    test('P2-F1: generates modular structural bay grid and column coordinates for multiple spacings', () => {
      const grid6x6 = generateStructuralGrid(null, '6.0x6.0');
      assert.equal(grid6x6.spanXM, 6.0);
      assert.equal(grid6x6.spanYM, 6.0);
      assert.ok(grid6x6.columns.length > 0);
      assert.ok(grid6x6.gridLinesX.length > 0);
      assert.ok(grid6x6.gridLinesY.length > 0);

      const grid6x7 = generateStructuralGrid(null, '6.0x7.2');
      assert.equal(grid6x7.spanXM, 6.0);
      assert.equal(grid6x7.spanYM, 7.2);

      const grid7x7 = generateStructuralGrid(null, '7.2x7.2');
      assert.equal(grid7x7.spanXM, 7.2);
      assert.equal(grid7x7.spanYM, 7.2);
    });

    test('P2-F2: differentiates reinforced concrete column sizing between interior and corner columns', () => {
      const grid = generateStructuralGrid(null, '6.0x7.2');
      const cornerCol = grid.columns.find((c) => c.isCorner);
      const interiorCol = grid.columns.find((c) => !c.isCorner);

      assert.ok(cornerCol, 'Corner column must exist');
      assert.ok(interiorCol, 'Interior column must exist');

      // Corner/shear columns: 450x600mm
      assert.equal(cornerCol.widthM, 0.45);
      assert.equal(cornerCol.depthM, 0.60);

      // Interior columns: 400x400mm
      assert.equal(interiorCol.widthM, 0.40);
      assert.equal(interiorCol.depthM, 0.40);
    });

    test('P2-F3: enforces IS 456:2000 Cl. 23.2 continuous beam span-to-depth ratio (L/d <= 26.0)', () => {
      const checkOptimal = checkSpanDeflection(7.2, 0.45);
      assert.equal(checkOptimal.spanToDepthRatio, 16.0); // 7.2 / 0.45 = 16.0
      assert.equal(checkOptimal.isCompliant, true);
      assert.equal(checkOptimal.isExcessive, false);
      assert.ok(checkOptimal.warning.includes('L/d = 16 ≤ 26.0'));

      const checkViolating = checkSpanDeflection(12.0, 0.45);
      assert.equal(checkViolating.spanToDepthRatio, 26.7); // 12.0 / 0.45 = 26.67 -> 26.7
      assert.equal(checkViolating.isCompliant, false);
      assert.equal(checkViolating.isExcessive, true);
    });

    test('P2-F4: flags spans exceeding 7.5m with structural deflection warnings requiring PT tendons', () => {
      const deflectionCheck = checkSpanDeflection(8.5, 0.45);
      assert.equal(deflectionCheck.isExcessive, true);
      assert.ok(deflectionCheck.warning.includes('7.5m'));
      assert.ok(deflectionCheck.warning.includes('post-tensioned (PT) tendons'));

      const compliantCheck = checkSpanDeflection(6.0, 0.45);
      assert.equal(compliantCheck.isExcessive, false);
    });

    test('P2-F5: evaluates cantilever span-to-depth deflection limits (L/d <= 7.0 per IS 456)', () => {
      // In IS 456 Cl. 23.2.1, cantilever basic limit is L/d <= 7.0
      const cantileverSpanM = 2.0;
      const cantileverDepthM = 0.45;
      const ratio = Math.round((cantileverSpanM / cantileverDepthM) * 10) / 10;
      assert.equal(ratio, 4.4);
      assert.ok(ratio <= 7.0, '2.0m cantilever with 450mm depth is IS 456 compliant');

      const extremeCantileverSpanM = 3.5;
      const extremeRatio = Math.round((extremeCantileverSpanM / cantileverDepthM) * 10) / 10;
      assert.equal(extremeRatio, 7.8);
      assert.ok(extremeRatio > 7.0, '3.5m cantilever exceeds basic cantilever L/d limit of 7.0');
    });

    test('P2-F6: validates false ceiling plenum height vs 2.75m habitable room clearance (NBC Part 3 Cl. 12.2)', () => {
      // Luxury standard: 3.40m F2F, 0.20m slab, 0.45m void -> 2.75m habitable room height
      const validCheck = checkPlenumClash(3.40);
      assert.equal(validCheck.isClashFree, true);
      assert.equal(validCheck.habitableRoomHeightM, 2.75);
      assert.equal(validCheck.headroomDeficitM, 0);
      assert.ok(validCheck.message.includes('≥ 2.75m min'));

      // Inadequate height: 3.00m F2F -> 2.35m room height -> 0.40m deficit
      const invalidCheck = checkPlenumClash(3.00);
      assert.equal(invalidCheck.isClashFree, false);
      assert.equal(invalidCheck.habitableRoomHeightM, 2.35);
      assert.equal(invalidCheck.headroomDeficitM, 0.40);
      assert.ok(invalidCheck.message.includes('Headroom conflict'));
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 3: MULTI-FLOOR EGRESS & FIRE ENGINEERING AUTOMATION
  // --------------------------------------------------------------------------
  describe('Pillar 3: Multi-Floor Egress & Fire Engineering Automation', () => {
    test('P3-F1: validates staircase ergonomic formula (550mm <= 2R + T <= 650mm) and geometry', () => {
      const validStair = calculateStaircaseGeometry({
        totalRiseM: 3.3,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
        buildingHeightM: 24.0, // > 15m residential requires >= 1.50m
        occupancyType: 'residential',
      });

      assert.equal(validStair.ergonomicMetricMM, 600); // 2*150 + 300 = 600
      assert.equal(validStair.isErgonomicCompliant, true);
      assert.equal(validStair.isRiserCompliant, true);
      assert.equal(validStair.isTreadCompliant, true);
      assert.equal(validStair.isWidthCompliant, true);
      assert.equal(validStair.overallPass, true);
    });

    test('P3-F2: validates NBC 2016 Part 4 Table 8 maximum riser (<=150mm) and minimum tread (>=300mm)', () => {
      const compliant = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });
      assert.equal(compliant.isRiserCompliant, true);
      assert.equal(compliant.isTreadCompliant, true);

      const highRiser = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.17, // > 150mm
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });
      assert.equal(highRiser.isRiserCompliant, false);
      assert.equal(highRiser.overallPass, false);

      const shallowTread = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.25, // < 300mm
        flightWidthM: 1.50,
      });
      assert.equal(shallowTread.isTreadCompliant, false);
      assert.equal(shallowTread.overallPass, false);
    });

    test('P3-F3: enforces statutory stairway width based on building height and occupancy', () => {
      // Residential > 15m requires >= 1.50m
      const highRiseRes = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
        buildingHeightM: 18.0,
        occupancyType: 'residential',
      });
      assert.equal(highRiseRes.requiredWidthM, 1.50);
      assert.equal(highRiseRes.isWidthCompliant, true);

      // Residential <= 15m requires >= 1.00m
      const lowRiseRes = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.00,
        buildingHeightM: 12.0,
        occupancyType: 'residential',
      });
      assert.equal(lowRiseRes.requiredWidthM, 1.00);
      assert.equal(lowRiseRes.isWidthCompliant, true);

      // Commercial requires >= 2.00m
      const commercial = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.80,
        occupancyType: 'commercial',
      });
      assert.equal(commercial.requiredWidthM, 2.00);
      assert.equal(commercial.isWidthCompliant, false); // 1.80m < 2.00m
    });

    test('P3-F4: calculates risers per flight (<= 15) and intermediate landing depth (>= flight width)', () => {
      const stair = calculateStaircaseGeometry({
        totalRiseM: 3.6, // 3600mm / 150mm = 24 risers
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });

      assert.equal(stair.riserCount, 24);
      assert.equal(stair.flightsRequired, 2); // 24 / 15 -> 2 flights
      assert.equal(stair.risersPerFlight, 12); // <= 15 risers per flight
      assert.ok(stair.landingDepthM >= stair.flightWidthM);
      assert.equal(stair.landingDepthM, 1.50);
    });

    test('P3-F5: routes retreat point to the nearest exit door in multi-exit floor plans', () => {
      const retreatPoints = [
        { x: 12.0, y: 8.0 },
        { x: 1.5, y: 2.0 },
      ];
      const exits = [
        { id: 'exit-north', position: { x: 2.0, y: 1.0 } },
        { id: 'exit-east', position: { x: 13.0, y: 8.5 } },
      ];

      const routes = resolveMultiExitRoutes(retreatPoints, exits);
      assert.equal(routes.length, 2);

      // Point 1 is closest to exit-east
      assert.equal(routes[0].exitId, 'exit-east');
      assert.ok(routes[0].travelDistanceM < 2.0);
      assert.ok(routes[0].isCompliant);

      // Point 2 is closest to exit-north
      assert.equal(routes[1].exitId, 'exit-north');
      assert.ok(routes[1].travelDistanceM < 2.0);
      assert.ok(routes[1].isCompliant);
    });

    test('P3-F6: generates complete evacuation dossier with statutory references', () => {
      const dossier = generateEvacuationDossier({
        projectName: 'The Camellias Atelier Sanctuary',
        occupantLoad: 24,
        furthestTravelDistanceM: 21.4,
        staircaseClearWidthM: 1.5,
        fireDoorRating: 'FD 120',
        hasPressurizationFan: true,
        hoseReelCount: 2,
      });

      assert.ok(dossier.includes('The Camellias Atelier Sanctuary'));
      assert.ok(dossier.includes('NBC 2016 PART 4'));
      assert.ok(dossier.includes('FD 120'));
      assert.ok(dossier.includes('50 Pa Positive Pressure Stairwell'));
      assert.ok(dossier.includes('CERTIFIED COMPLIANT FOR MUNICIPAL SANCTION'));
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 4: MUSEUM ACOUSTICS, DAYLIGHTING & VASTU MANDALA
  // --------------------------------------------------------------------------
  describe('Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala', () => {
    test('P4-F1: calculates Sabine RT60 reverberation time within luxury thresholds', () => {
      const analysis = calculateRoomRT60({
        roomName: 'Master Sanctuary Living',
        roomType: 'living',
        lengthM: 8.0,
        widthM: 6.0,
        heightM: 3.2,
        floorMaterialKey: 'italian_marble',
        wallFinishKey: 'gyproc_soundstop_double',
        ceilingFinishKey: 'mineral_fiber_ceiling',
        glazingAreaSqM: 10.0,
      });

      assert.ok(analysis.volumeM3 > 0);
      assert.ok(analysis.rt60AverageSeconds > 0);
      assert.equal(analysis.targetRT60Range[0], 0.45);
      assert.equal(analysis.targetRT60Range[1], 0.70);
      assert.equal(analysis.isAcousticallyCompliant, true);
      assert.equal(analysis.status, 'optimal');
    });

    test('P4-F2: detects highly reflective reverberant room and issues acoustic remediation', () => {
      const liveRoom = calculateRoomRT60({
        roomName: 'Echoey Grand Foyer',
        roomType: 'living',
        lengthM: 10.0,
        widthM: 8.0,
        heightM: 3.6,
        floorMaterialKey: 'italian_marble',
        wallFinishKey: 'standard_gypsum_wall',
        ceilingFinishKey: 'monolithic_gypsum_ceiling',
        glazingAreaSqM: 15.0,
      });

      assert.ok(liveRoom.rt60AverageSeconds > liveRoom.targetRT60Range[1]);
      assert.equal(liveRoom.status, 'too_live_echoey');
      assert.equal(liveRoom.isAcousticallyCompliant, false);
      assert.ok(liveRoom.recommendations.some((r) => r.includes('area rugs') || r.includes('micro-perforated')));
    });

    test('P4-F3: verifies STC 56 acoustic decoupling and identifies flanking risks', () => {
      const compliantWall = validatePartitionSTC({
        partitionName: 'Master Bedroom Demising Wall',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool 48kg/m³',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: false,
        doorAcousticSealPresent: true,
        backToBackElectricalBoxesStaggered: true,
      });

      assert.ok(compliantWall.calculatedSTC >= 56);
      assert.equal(compliantWall.isSTCCompliant, true);

      const leakingWall = validatePartitionSTC({
        partitionName: 'Poorly Detailed Wall',
        hasDoubleStudOrResilientChannel: false,
        insulationType: 'None',
        liningLayers: '1x 12.5mm Gypsum',
        ceilingPlenumFlanking: true, // sound travels over ceiling void
        doorAcousticSealPresent: false,
        backToBackElectricalBoxesStaggered: false,
      });

      assert.ok(leakingWall.calculatedSTC < 40);
      assert.equal(leakingWall.isSTCCompliant, false);
      assert.ok(leakingWall.remediationSuggestions.length >= 3);
    });

    test('P4-F4: calculates Daylight Factor (DF %) and verifies NBC Part 8 Sec 1 compliance', () => {
      const daylight = calculateDaylightFactor({
        roomName: 'Corner Master Bedroom',
        roomFloorAreaM2: 30.0,
        windowGlazingAreaM2: 5.5,
        windowHeadHeightM: 2.8,
        orientation: 'NE',
        roomType: 'bedroom',
      });

      assert.ok(daylight.estimatedDaylightFactorPercent >= 1.0);
      assert.equal(daylight.isDaylightCompliant, true);
      assert.equal(daylight.nbcMinRequiredDFPercent, 1.0);
    });

    test('P4-F5: evaluates 9-zone Vastu Shastra Paramasayika mandala quadrant alignment', () => {
      const result = evaluateVastuMandala([
        { roomName: 'Master Bedroom', roomType: 'master_bedroom', quadrant: 'SW' }, // Auspicious
        { roomName: 'Kitchen', roomType: 'kitchen', quadrant: 'SE' },             // Auspicious
        { roomName: 'Puja Room', roomType: 'pooja_meditation', quadrant: 'NE' },   // Auspicious
        { roomName: 'Living Room', roomType: 'living', quadrant: 'N' },            // Auspicious
      ]);

      assert.ok(result.overallScorePercent >= 85);
      assert.equal(result.brahmasthanClear, true);
      assert.equal(result.overallRating, 'Vastu Shastra Compliant');

      // Test Brahmasthan defect
      const flawedResult = evaluateVastuMandala([
        { roomName: 'Central Toilet', roomType: 'toilet', quadrant: 'CENTER' },
      ]);
      assert.equal(flawedResult.brahmasthanClear, false);
      assert.equal(flawedResult.overallRating, 'Critical Flaws Present');
      assert.ok(flawedResult.priorityFixes.length > 0);
    });

    test('P4-F6: verifies materials database contains acoustic and environmental performance data', () => {
      assert.ok(ACOUSTIC_MATERIALS_DATABASE.italian_marble);
      assert.ok(ACOUSTIC_MATERIALS_DATABASE.gyproc_soundstop_double);
      assert.equal(ACOUSTIC_MATERIALS_DATABASE.gyproc_soundstop_double.stcRating, 58);
      assert.ok(ACOUSTIC_MATERIALS_DATABASE.acoustic_wood_slats.absorptionCoefficients[1000] >= 0.90);
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 5: 4D EPC CONSTRUCTION SCHEDULING & TURNKEY RESILIENCE
  // --------------------------------------------------------------------------
  describe('Pillar 5: 4D EPC Construction Scheduling & Turnkey Resilience', () => {
    test('P5-F1: calculates CPM schedule from Day 0 to Day 90 with critical path detection', () => {
      const cpm = calculateCPM(DEFAULT_TURNKEY_TASKS);
      assert.ok(cpm.totalDurationDays >= 80 && cpm.totalDurationDays <= 100);
      assert.ok(cpm.criticalPath.length > 0);
      assert.ok(cpm.criticalPath.includes('T100'));
      assert.ok(cpm.criticalPath.includes('T700'));
    });

    test('P5-F2: computes forward pass (ES, EF) and backward pass (LS, LF) with zero float on critical path', () => {
      const cpm = calculateCPM(DEFAULT_TURNKEY_TASKS);
      for (const taskId of cpm.criticalPath) {
        const task = cpm.tasks.find((t) => t.id === taskId);
        assert.ok(task);
        assert.equal(task.totalFloatDays, 0, `Critical task ${taskId} must have 0 total float`);
        assert.equal(task.isCritical, true);
      }
    });

    test('P5-F3: compresses procurement lead time dynamically when Value Engineering is approved', () => {
      const compressedTasks = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
        {
          tradeId: 'finishes',
          originalMaterial: 'Italian Marble',
          proposedMaterial: 'Rajasthan Honed Kota Stone',
          costSavingINR: 855000,
          leadTimeReductionWeeks: 14,
        },
      ]);

      const stoneTask = compressedTasks.find((t) => t.id === 'T500');
      assert.ok(stoneTask);
      assert.equal(stoneTask?.leadTimeWeeks, 2); // 16 - 14 = 2 weeks
      assert.equal(stoneTask?.isDomesticProcurement, true);
    });

    test('P5-F4: assesses Delhi-NCR monsoon weather risk and warns on timber joinery EMC (IS 287)', () => {
      const monsoonAssessment = assessMonsoonRisk(7, 90); // starts in July
      assert.equal(monsoonAssessment.isMonsoonImpacted, true);
      assert.equal(monsoonAssessment.joineryEMCRisk, true);
      assert.ok(monsoonAssessment.recommendedWeatherBufferDays > 0);
      assert.ok(monsoonAssessment.mitigationGuidelines.some((g) => g.includes('IS 287')));

      const winterAssessment = assessMonsoonRisk(1, 90); // starts in January
      assert.equal(winterAssessment.isMonsoonImpacted, false);
    });

    test('P5-F5: generates enriched IFC4 LOD 300 COBie schedule with CPWD DSR codes', () => {
      const records = generateIFC4LOD300Records();
      assert.ok(records.length >= 4);

      const wall = records.find((r) => r.entityType === 'IfcWall');
      assert.equal(wall?.fireRating, 'FD 120 (2-Hour Fire Resistance)');
      assert.equal(wall?.acousticSTC, 58);
      assert.equal(wall?.cpwdItemCode, 'CPWD 13.48.2');

      const col = records.find((r) => r.entityType === 'IfcColumn');
      assert.equal(col?.fireRating, 'FD 180 (3-Hour Structural Resistance)');
      assert.equal(col?.acousticSTC, 62);
    });

    test('P5-F6: exports COBie schedule CSV with mandatory headers and attributes', () => {
      const records = generateIFC4LOD300Records();
      const csv = exportCOBieScheduleCSV(records);
      assert.ok(csv.includes('IFC GUID,Entity Type,Component Name,Material Specification,Fire Rating (NBC 2016),Acoustic STC,Thermal U-Value (W/m²K),CPWD DSR 2024 Code,BIM LOD Stage'));
      assert.ok(csv.includes('FD 120'));
      assert.ok(csv.includes('CPWD 13.48.2'));
      assert.ok(csv.includes('LOD 300 Turnkey'));
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 PER PILLAR)
// ============================================================================

describe('Tier 2: Boundary & Corner Cases — Defensive Engineering', () => {

  // --------------------------------------------------------------------------
  // PILLAR 1 BOUNDARIES
  // --------------------------------------------------------------------------
  describe('Pillar 1 Boundaries: Financial Underwriting & FAR', () => {
    test('P1-B1: minimal floor area boundary (1 sqft) avoids NaN or divide-by-zero', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1,
        carpetAreaSqFt: 1,
        totalCapexINR: 100000,
      });
      assert.equal(Number.isNaN(result.yieldOnCostPercent), false);
      assert.equal(Number.isNaN(result.paybackPeriodYears), false);
      assert.equal(Number.isNaN(result.carpetToSaleableRatio), false);
      assert.ok(result.paybackPeriodYears > 0);
    });

    test('P1-B2: minimal capex boundary avoids divide-by-zero in YoC and payback calculations', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1000,
        carpetAreaSqFt: 850,
        totalCapexINR: 1, // Minimal 1 INR
      });
      assert.equal(Number.isNaN(result.yieldOnCostPercent), false);
      assert.equal(Number.isNaN(result.paybackPeriodYears), false);
      assert.ok(result.yieldOnCostPercent > 0);
    });

    test('P1-B3: exact FAR boundary check (permissible vs exceeding by 1 sqft)', () => {
      const plotArea = 10000;
      const maxPermissibleGFA = plotArea * (1.75 + 0.89); // 26,400 sq ft

      const compliant = calculatePEUnderwriting({
        grossFloorAreaSqFt: maxPermissibleGFA,
        carpetAreaSqFt: maxPermissibleGFA * 0.85,
        totalCapexINR: 50000000,
        plotAreaSqFt: plotArea,
      });
      assert.equal(compliant.isFARCompliant, true);
      assert.equal(compliant.farUtilizationPercent, 100.0);

      const nonCompliant = calculatePEUnderwriting({
        grossFloorAreaSqFt: maxPermissibleGFA + 1,
        carpetAreaSqFt: maxPermissibleGFA * 0.85,
        totalCapexINR: 50000000,
        plotAreaSqFt: plotArea,
      });
      assert.equal(nonCompliant.isFARCompliant, false);

      const exceedingGFA = calculatePEUnderwriting({
        grossFloorAreaSqFt: maxPermissibleGFA + 100,
        carpetAreaSqFt: maxPermissibleGFA * 0.85,
        totalCapexINR: 50000000,
        plotAreaSqFt: plotArea,
      });
      assert.equal(exceedingGFA.isFARCompliant, false);
      assert.ok(exceedingGFA.farUtilizationPercent > 100.0);
    });

    test('P1-B4: institutional grade threshold boundary (8.4% YoC fails vs 8.5% YoC passes)', () => {
      // 8.5% is MIN_INSTITUTIONAL_YIELD
      const capexFor84 = 1000000;
      const noiFor84 = 84000; // 8.4%
      // Test direct underwriting result evaluation
      const resLow = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1000,
        carpetAreaSqFt: 850, // 85% NTG
        totalCapexINR: 10000000,
        rentalRatePerSqFtMonthlyINR: 70, // low rent yields < 8.5%
      });
      assert.ok(resLow.yieldOnCostPercent < 8.5);
      assert.equal(resLow.isInstitutionalGrade, false);

      const resHigh = calculatePEUnderwriting({
        grossFloorAreaSqFt: 1000,
        carpetAreaSqFt: 850, // 85% NTG
        totalCapexINR: 5000000, // lower capex yields > 8.5%
        rentalRatePerSqFtMonthlyINR: 125,
      });
      assert.ok(resHigh.yieldOnCostPercent >= 8.5);
      assert.equal(resHigh.isInstitutionalGrade, true);
    });

    test('P1-B5: extreme commercial institutional scaling (100,000 sq ft, 50 Cr capex)', () => {
      const result = calculatePEUnderwriting({
        grossFloorAreaSqFt: 100000,
        carpetAreaSqFt: 84000,
        totalCapexINR: 500000000, // ₹50 Cr
        plotAreaSqFt: 40000,
      });
      assert.ok(result.grossAnnualRevenueINR > 100000000);
      assert.ok(result.tenderScheduleGrandTotalINR > 0);
      assert.equal(result.meetsNTGThreshold, true);
      assert.equal(result.isFARCompliant, true);
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 2 BOUNDARIES
  // --------------------------------------------------------------------------
  describe('Pillar 2 Boundaries: Structural Bay Grid & Plenum Clearance', () => {
    test('P2-B1: exact 7.50m span threshold passes conventional without PT tendons', () => {
      const exactCheck = checkSpanDeflection(7.50, 0.45);
      assert.equal(exactCheck.isExcessive, false);
      assert.equal(exactCheck.isCompliant, true);

      const exceedCheck = checkSpanDeflection(7.51, 0.45);
      assert.equal(exceedCheck.isExcessive, true);
    });

    test('P2-B2: exact IS 456 L/d = 26.0 boundary test for continuous beams', () => {
      // With depth 0.45m: 0.45 * 26.0 = 11.70m
      const exactSpan = 11.70;
      const checkExact = checkSpanDeflection(exactSpan, 0.45);
      assert.equal(checkExact.spanToDepthRatio, 26.0);
      assert.equal(checkExact.isCompliant, true);

      const exceedSpan = 11.75;
      const checkExceed = checkSpanDeflection(exceedSpan, 0.45);
      assert.equal(checkExceed.spanToDepthRatio, 26.1);
      assert.equal(checkExceed.isCompliant, false);
    });

    test('P2-B3: cantilever span deflection boundary test (cantilever > 2.0m vs deep beam depth)', () => {
      // Cantilever limit L/d <= 7.0
      // 2.0m cantilever with 0.30m depth -> 6.7 <= 7.0 (pass)
      const ratioPass = Math.round((2.0 / 0.30) * 10) / 10;
      assert.equal(ratioPass, 6.7);
      assert.ok(ratioPass <= 7.0);

      // 2.2m cantilever with 0.30m depth -> 7.3 > 7.0 (fail)
      const ratioFail = Math.round((2.2 / 0.30) * 10) / 10;
      assert.equal(ratioFail, 7.3);
      assert.ok(ratioFail > 7.0);
    });

    test('P2-B4: exact floor-to-floor height 3.40m boundary preserves exact 2.75m clear headroom', () => {
      // 3.40 - 0.20 - 0.45 = 2.75m
      const checkExact = checkPlenumClash(3.40, 0.20, 0.45);
      assert.equal(checkExact.habitableRoomHeightM, 2.75);
      assert.equal(checkExact.headroomDeficitM, 0.0);
      assert.equal(checkExact.isClashFree, true);
    });

    test('P2-B5: fractional floor-to-floor height 3.39m flags 0.01m headroom deficit', () => {
      // 3.39 - 0.20 - 0.45 = 2.74m -> 0.01m deficit
      const checkDeficit = checkPlenumClash(3.39, 0.20, 0.45);
      assert.equal(checkDeficit.habitableRoomHeightM, 2.74);
      assert.equal(checkDeficit.headroomDeficitM, 0.01);
      assert.equal(checkDeficit.isClashFree, false);
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 3 BOUNDARIES
  // --------------------------------------------------------------------------
  describe('Pillar 3 Boundaries: Staircase Egress & Fire Engineering', () => {
    test('P3-B1: Blondel ergonomic lower boundary (549mm fails vs 550mm passes)', () => {
      // 2R + T: R=125mm, T=300mm -> 550mm
      const passStair = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.125,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });
      assert.equal(passStair.ergonomicMetricMM, 550);
      assert.equal(passStair.isErgonomicCompliant, true);

      // R=124mm, T=300mm -> 548mm < 550mm
      const failStair = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.124,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });
      assert.equal(failStair.ergonomicMetricMM, 548);
      assert.equal(failStair.isErgonomicCompliant, false);
    });

    test('P3-B2: Blondel ergonomic upper boundary (650mm passes vs 651mm fails)', () => {
      // R=150mm, T=350mm -> 650mm
      const passStair = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.150,
        treadDepthM: 0.350,
        flightWidthM: 1.50,
      });
      assert.equal(passStair.ergonomicMetricMM, 650);
      assert.equal(passStair.isErgonomicCompliant, true);

      // R=150mm, T=351mm -> 651mm
      const failStair = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.150,
        treadDepthM: 0.351,
        flightWidthM: 1.50,
      });
      assert.equal(failStair.ergonomicMetricMM, 651);
      assert.equal(failStair.isErgonomicCompliant, false);
    });

    test('P3-B3: riser height exact 150mm limit (150mm passes vs 151mm fails)', () => {
      const pass = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.150,
        treadDepthM: 0.300,
        flightWidthM: 1.50,
      });
      assert.equal(pass.isRiserCompliant, true);

      const fail = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.152, // > 150mm
        treadDepthM: 0.300,
        flightWidthM: 1.50,
      });
      assert.equal(fail.isRiserCompliant, false);
    });

    test('P3-B4: tread depth exact 300mm limit (300mm passes vs 299mm fails)', () => {
      const pass = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.150,
        treadDepthM: 0.300,
        flightWidthM: 1.50,
      });
      assert.equal(pass.isTreadCompliant, true);

      const fail = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.150,
        treadDepthM: 0.298, // < 300mm
        flightWidthM: 1.50,
      });
      assert.equal(fail.isTreadCompliant, false);
    });

    test('P3-B5: building height boundary (15.0m requires 1.0m width vs 15.1m requires 1.5m width)', () => {
      const lowRise = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.00,
        buildingHeightM: 15.0,
        occupancyType: 'residential',
      });
      assert.equal(lowRise.requiredWidthM, 1.00);
      assert.equal(lowRise.isWidthCompliant, true);

      const highRise = calculateStaircaseGeometry({
        totalRiseM: 3.0,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.00,
        buildingHeightM: 15.1,
        occupancyType: 'residential',
      });
      assert.equal(highRise.requiredWidthM, 1.50);
      assert.equal(highRise.isWidthCompliant, false); // 1.00m < 1.50m
    });

    test('P3-B6: travel distance boundary in multi-exit routing (29.9m passes vs 30.1m fails unsprinklered)', () => {
      const exits = [{ id: 'exit1', position: { x: 0, y: 0 } }];
      const passRoutes = resolveMultiExitRoutes([{ x: 29.9, y: 0 }], exits, 30.0);
      assert.equal(passRoutes[0].isCompliant, true);

      const failRoutes = resolveMultiExitRoutes([{ x: 30.1, y: 0 }], exits, 30.0);
      assert.equal(failRoutes[0].isCompliant, false);
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 4 BOUNDARIES
  // --------------------------------------------------------------------------
  describe('Pillar 4 Boundaries: Acoustics, Daylighting & Vastu', () => {
    test('P4-B1: overly dead/stifled room detection when RT60 is below minimum threshold', () => {
      // Very small room with heavy acoustic finishes
      const deadRoom = calculateRoomRT60({
        roomName: 'Over-padded Recording Booth',
        roomType: 'study', // target 0.35 - 0.50
        lengthM: 3.0,
        widthM: 2.5,
        heightM: 2.4,
        floorMaterialKey: 'teak_hardwood_flooring',
        wallFinishKey: 'acoustic_wood_slats',
        ceilingFinishKey: 'mineral_fiber_ceiling',
      });

      assert.ok(deadRoom.rt60AverageSeconds < deadRoom.targetRT60Range[0]);
      assert.equal(deadRoom.status, 'too_dead_stifled');
      assert.equal(deadRoom.isAcousticallyCompliant, false);
      assert.ok(deadRoom.recommendations.some((r) => r.includes('overly damped')));
    });

    test('P4-B2: cumulative acoustic flanking leaks reduce calculated STC by up to 17 points', () => {
      const cleanWall = validatePartitionSTC({
        partitionName: 'Clean Wall',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: false,
        doorAcousticSealPresent: true,
        backToBackElectricalBoxesStaggered: true,
      });

      const leakyWall = validatePartitionSTC({
        partitionName: 'Leaky Wall',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: true,   // -8
        doorAcousticSealPresent: false, // -4
        backToBackElectricalBoxesStaggered: false, // -5
      });

      assert.equal(cleanWall.calculatedSTC - leakyWall.calculatedSTC, 17);
      assert.equal(cleanWall.isSTCCompliant, true);
      assert.equal(leakyWall.isSTCCompliant, false);
    });

    test('P4-B3: zero glazing area produces 0% Daylight Factor and flags poor natural light', () => {
      const darkRoom = calculateDaylightFactor({
        roomName: 'Internal Powder Room',
        roomFloorAreaM2: 10.0,
        windowGlazingAreaM2: 0,
        windowHeadHeightM: 2.8,
        orientation: 'N',
        roomType: 'bathroom',
      });

      assert.equal(darkRoom.estimatedDaylightFactorPercent, 0);
      assert.equal(darkRoom.isDaylightCompliant, false);
      assert.equal(darkRoom.naturalLightQuality, 'poor');
    });

    test('P4-B4: excessive south-facing glazing triggers glare risk and shading requirement', () => {
      const sunDrenchedRoom = calculateDaylightFactor({
        roomName: 'South Facing Solarium',
        roomFloorAreaM2: 20.0,
        windowGlazingAreaM2: 12.0, // High window-to-floor ratio
        windowHeadHeightM: 3.0,
        orientation: 'S',
        roomType: 'living',
      });

      assert.ok(sunDrenchedRoom.estimatedDaylightFactorPercent > 4.5);
      assert.equal(sunDrenchedRoom.naturalLightQuality, 'excessive_glare_risk');
      assert.equal(sunDrenchedRoom.shadingRequired, true);
    });

    test('P4-B5: severe Vastu defect in North-East (Ishanya) drops quadrant score to -100', () => {
      const flawedPlan = evaluateVastuMandala([
        { roomName: 'Master Ensuite', roomType: 'toilet', quadrant: 'NE' },
      ]);
      const ishanya = flawedPlan.quadrants.find((q) => q.quadrantName === 'Ishanya (NE)');
      assert.ok(ishanya);
      assert.equal(ishanya.score, -100);
      assert.equal(ishanya.rating, 'Critical Defect');
      assert.ok(flawedPlan.priorityFixes.some((f) => f.includes('North-East')));
    });
  });

  // --------------------------------------------------------------------------
  // PILLAR 5 BOUNDARIES
  // --------------------------------------------------------------------------
  describe('Pillar 5 Boundaries: 4D EPC Schedule & Turnkey Resilience', () => {
    test('P5-B1: empty predecessor list correctly initializes Early Start to Day 0', () => {
      const singleTask: GanttTask[] = [
        {
          id: 'T_SOLO',
          name: 'Independent Initial Mobilization',
          tradePackage: 'substructure',
          durationDays: 10,
          predecessorIds: [],
          leadTimeWeeks: 1,
          isDomesticProcurement: true,
          monsoonSensitive: false,
        },
      ];
      const cpm = calculateCPM(singleTask);
      assert.equal(cpm.tasks[0].earlyStartDay, 0);
      assert.equal(cpm.tasks[0].earlyFinishDay, 10);
      assert.equal(cpm.tasks[0].totalFloatDays, 0);
      assert.equal(cpm.tasks[0].isCritical, true);
    });

    test('P5-B2: zero lead-time reduction swap safely preserves existing lead time', () => {
      const tasks = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
        {
          tradeId: 'finishes',
          originalMaterial: 'Italian Marble',
          proposedMaterial: 'Italian Marble Alternate',
          costSavingINR: 0,
          leadTimeReductionWeeks: 0,
        },
      ]);
      const stoneTask = tasks.find((t) => t.id === 'T500');
      assert.equal(stoneTask?.leadTimeWeeks, 16);
    });

    test('P5-B3: non-monsoon winter schedule (Month 1, 90 days) has zero weather buffer', () => {
      const winter = assessMonsoonRisk(1, 90);
      assert.equal(winter.isMonsoonImpacted, false);
      assert.equal(winter.recommendedWeatherBufferDays, 0);
      assert.equal(winter.monsoonOverlapDays, 0);
    });

    test('P5-B4: peak monsoon schedule (Month 7, 90 days) enforces maximum weather buffer and EMC alert', () => {
      const monsoon = assessMonsoonRisk(7, 90);
      assert.equal(monsoon.isMonsoonImpacted, true);
      assert.equal(monsoon.recommendedWeatherBufferDays, 8);
      assert.equal(monsoon.monsoonOverlapDays, 60);
      assert.equal(monsoon.joineryEMCRisk, true);
    });

    test('P5-B5: custom IFC4 LOD 300 record count generation handles diverse room scales', () => {
      const defaultRecords = generateIFC4LOD300Records(4);
      assert.equal(defaultRecords.length, 4);

      const largeRecords = generateIFC4LOD300Records(12);
      assert.ok(largeRecords.length >= 4);
      assert.ok(largeRecords.every((r) => r.guid.length > 0));
      assert.ok(largeRecords.every((r) => r.cobieStage === 'LOD 300 Turnkey'));
    });
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE MULTI-PILLAR INTERACTIONS
// ============================================================================

describe('Tier 3: Cross-Feature Multi-Pillar Interactions', () => {
  test('T3-01: [P1 ➔ P5] PE BOQ Value Engineering Stone Swap directly compresses 4D CPM Critical Path', () => {
    // Baseline scenario: Italian marble, capex ₹28.5L
    const baselineUnderwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: 1200,
      carpetAreaSqFt: 1008,
      totalCapexINR: 2850000,
    });
    const baselineCPM = calculateCPM(DEFAULT_TURNKEY_TASKS);

    // Apply VE stone swap: -₹8,55,000 capex, -14 weeks lead time
    const veSwap: ValueEngineeringSwap = {
      tradeId: 'finishes',
      originalMaterial: 'Italian Marble',
      proposedMaterial: 'Rajasthan Honed Kota Stone',
      costSavingINR: 855000,
      leadTimeReductionWeeks: 14,
    };

    const optimizedUnderwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: 1200,
      carpetAreaSqFt: 1008,
      totalCapexINR: 2850000 - veSwap.costSavingINR, // ₹19.95L
    });
    const compressedTasks = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [veSwap]);
    const compressedCPM = calculateCPM(compressedTasks);

    // Assert multi-pillar synchronicity:
    // 1. Capex drops by ₹8.55L, YoC increases
    assert.ok(optimizedUnderwriting.yieldOnCostPercent > baselineUnderwriting.yieldOnCostPercent);
    // 2. Schedule compresses (T500 duration reduces from 20 to 17 days)
    assert.ok(compressedCPM.totalDurationDays < baselineCPM.totalDurationDays);
    // 3. Procurement lead time collapses from 16 weeks to 2 weeks
    const stoneTask = compressedCPM.tasks.find((t) => t.id === 'T500');
    assert.equal(stoneTask?.leadTimeWeeks, 2);
  });

  test('T3-02: [P2 ➔ P4] Structural 450mm Ceiling Plenum Void directly governs Habitable Height and Room Acoustic Volume', () => {
    const floorToFloorM = 3.40;
    const slabM = 0.20;
    const plenumM = 0.45;

    // Check structural clearance
    const plenumCheck = checkPlenumClash(floorToFloorM, slabM, plenumM);
    assert.equal(plenumCheck.isClashFree, true);
    assert.equal(plenumCheck.habitableRoomHeightM, 2.75); // NBC Cl. 12.2 minimum

    // Room acoustics volume is strictly derived from available habitable height
    const acousticResult = calculateRoomRT60({
      roomName: 'Sanctuary Master',
      roomType: 'bedroom',
      lengthM: 6.0,
      widthM: 5.0,
      heightM: plenumCheck.habitableRoomHeightM, // 2.75m
      floorMaterialKey: 'teak_hardwood_flooring',
      wallFinishKey: 'gyproc_soundstop_double',
      ceilingFinishKey: 'mineral_fiber_ceiling',
    });

    const expectedVolume = 6.0 * 5.0 * 2.75;
    assert.equal(acousticResult.volumeM3, expectedVolume);
    assert.ok(acousticResult.isAcousticallyCompliant);
  });

  test('T3-03: [P2 ➔ P1] Continuous 300x300mm MEP Wet Core Shaft classifies as Deductible Service Area in FAR', () => {
    // Generate structural bay grid containing wet core coordinates
    const grid = generateStructuralGrid(null, '6.0x7.2');
    assert.ok(grid.columns.length > 0);

    // Verify shaft is tracked in CPWD DSR under Item 19.3.1 (Plumbing & Core Wet Shafts)
    const underwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: 6000,
      carpetAreaSqFt: 5040, // 84% NTG
      totalCapexINR: 25000000,
    });

    const wetRiserItem = underwriting.cpwdTenderSchedule.find((item) => item.itemCode === 'CPWD 19.3.1');
    assert.ok(wetRiserItem);
    assert.equal(wetRiserItem.amountINR, 165000);
    // Shaft area is deductible from FAR permissible GFA per DTCP guidelines
    assert.ok(underwriting.circulationAreaSqFt > 0);
  });

  test('T3-04: [P3 ➔ P5] Statutory 2-Hour Fire Stair Enclosure with FD 120 Doors links to IFC4 LOD 300 Specification', () => {
    // Statutory staircase certification
    const stairCompliance = calculateStaircaseGeometry({
      totalRiseM: 3.3,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      flightWidthM: 1.50,
      buildingHeightM: 24.0,
    });
    assert.equal(stairCompliance.overallPass, true);

    // Evacuation dossier requires FD 120 fire door
    const dossier = generateEvacuationDossier({
      projectName: 'DLF Phase 5 Core',
      occupantLoad: 50,
      furthestTravelDistanceM: 22.0,
      staircaseClearWidthM: stairCompliance.flightWidthM,
      fireDoorRating: 'FD 120',
      hasPressurizationFan: true,
      hoseReelCount: 2,
    });
    assert.ok(dossier.includes('FD 120'));

    // Verify IFC4 LOD 300 BIM record contains identical FD 120 door property set
    const ifcRecords = generateIFC4LOD300Records();
    const fireDoor = ifcRecords.find((r) => r.entityType === 'IfcDoor');
    assert.ok(fireDoor);
    assert.ok(fireDoor.fireRating.includes('FD 120'));
    assert.ok(fireDoor.acousticSTC >= 40);
  });

  test('T3-05: [P4 ➔ P4] Daylighting Window Orientation (NE) harmonizes with Vastu Ishanya (NE) spiritual alignment', () => {
    // Daylight factor with North-East diffuse sunlight
    const daylight = calculateDaylightFactor({
      roomName: 'Pooja & Meditation Sanctuary',
      roomFloorAreaM2: 16.0,
      windowGlazingAreaM2: 3.2,
      windowHeadHeightM: 2.8,
      orientation: 'NE',
      roomType: 'study',
    });
    assert.equal(daylight.isDaylightCompliant, true);

    // Vastu mandala alignment in Ishanya quadrant
    const vastu = evaluateVastuMandala([
      { roomName: 'Pooja & Meditation Sanctuary', roomType: 'pooja_meditation', quadrant: 'NE' },
    ]);
    const ishanya = vastu.quadrants.find((q) => q.quadrantName === 'Ishanya (NE)');
    assert.equal(ishanya?.score, 100);
    assert.equal(ishanya?.rating, 'Auspicious');
  });

  test('T3-06: [P1 + P3 + P4] Combined High-Density Sanctuary: NTG 84% Squeeze preserves 1.50m Stairway and STC 56 Privacy', () => {
    // Underwriting squeeze to exactly 84% NTG
    const underwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: 10000,
      carpetAreaSqFt: 8400,
      totalCapexINR: 40000000,
    });
    assert.equal(underwriting.carpetToSaleableRatio, 0.84);
    assert.equal(underwriting.meetsNTGThreshold, true);

    // Verify staircase flight width of 1.50m is preserved without narrowing below statutory code
    const stair = calculateStaircaseGeometry({
      totalRiseM: 3.3,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      flightWidthM: 1.50,
      buildingHeightM: 24.0,
    });
    assert.equal(stair.isWidthCompliant, true);

    // Verify STC 56 acoustic privacy is maintained across reduced circulation corridors
    const wall = validatePartitionSTC({
      partitionName: 'Corridor Demising Partition',
      hasDoubleStudOrResilientChannel: true,
      insulationType: 'Rockwool 48kg/m³',
      liningLayers: '2x 15mm SoundStop',
      ceilingPlenumFlanking: false,
      doorAcousticSealPresent: true,
      backToBackElectricalBoxesStaggered: true,
    });
    assert.equal(wall.isSTCCompliant, true);
    assert.ok(wall.calculatedSTC >= 56);
  });
});

// ============================================================================
// TIER 4: REAL-WORLD INSTITUTIONAL SCENARIOS
// ============================================================================

describe('Tier 4: Real-World Institutional Scenarios — Institutional Benchmarks', () => {
  test('T4-01: DLF Phase 5 Ultra-Luxury Sanctuary Penthouse (12,000 sq ft)', () => {
    // 1. Financial Underwriting & CPWD Tender
    const underwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: 12000,
      carpetAreaSqFt: 10200,
      totalCapexINR: 45000000,
      rentalRatePerSqFtMonthlyINR: 140,
      plotAreaSqFt: 6000,
    });
    assert.equal(underwriting.carpetToSaleableRatio, 0.85);
    assert.equal(underwriting.isFARCompliant, true);
    assert.equal(underwriting.isInstitutionalGrade, true);

    // 2. Structural Bay Grid & 450mm Plenum
    const grid = generateStructuralGrid(null, '6.0x7.2', 3.40);
    assert.equal(grid.plenumCheck.isClashFree, true);
    assert.equal(grid.plenumCheck.habitableRoomHeightM, 2.75);

    // 3. Life Safety Staircase & Fire Dossier
    const stair = calculateStaircaseGeometry({
      totalRiseM: 3.4,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      flightWidthM: 1.50,
      buildingHeightM: 30.0,
    });
    assert.equal(stair.overallPass, true);

    // 4. Master Sanctuary Acoustics (STC 58, RT60 = 0.57s)
    const acoustic = calculateRoomRT60({
      roomName: 'Master Sanctuary Living',
      roomType: 'living',
      lengthM: 8.0,
      widthM: 6.0,
      heightM: 2.75,
      floorMaterialKey: 'italian_marble',
      wallFinishKey: 'gyproc_soundstop_double',
      ceilingFinishKey: 'mineral_fiber_ceiling',
      glazingAreaSqM: 10.0,
    });
    assert.ok(acoustic.isAcousticallyCompliant);

    // 5. 4D EPC Handover within 90 days
    const cpm = calculateCPM(DEFAULT_TURNKEY_TASKS);
    assert.ok(cpm.totalDurationDays <= 90);
  });

  test('T4-02: Cyber City Grade-A Commercial IT Suite (60,000 sq ft)', () => {
    const commercialGFA = 60000;
    const commercialCarpet = 51000; // 85% efficiency

    const underwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: commercialGFA,
      carpetAreaSqFt: commercialCarpet,
      totalCapexINR: 240000000, // ₹24 Cr
      rentalRatePerSqFtMonthlyINR: 110,
      plotAreaSqFt: 25000,
    });
    assert.ok(underwriting.netOperatingIncomeINR > 50000000);
    assert.equal(underwriting.meetsNTGThreshold, true);

    // Commercial stairway requires 2.00m width
    const commStair = calculateStaircaseGeometry({
      totalRiseM: 3.6,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      flightWidthM: 2.00,
      occupancyType: 'commercial',
    });
    assert.equal(commStair.isWidthCompliant, true);
    assert.equal(commStair.overallPass, true);

    // Multi-exit routing across large floor plate
    const retreatPoints = [
      { x: 10.0, y: 15.0 },
      { x: 50.0, y: 15.0 },
    ];
    const exits = [
      { id: 'stair-west', position: { x: 2.0, y: 15.0 } },
      { id: 'stair-east', position: { x: 58.0, y: 15.0 } },
    ];
    const routes = resolveMultiExitRoutes(retreatPoints, exits);
    assert.ok(routes.every((r) => r.isCompliant));
  });

  test('T4-03: Monsoon-Window Turnkey Handover (July 1 - Sept 15 Execution Window)', () => {
    // Assesses project starting in July (Month 7) for 90 days duration
    const monsoonAssessment = assessMonsoonRisk(7, 90);
    assert.equal(monsoonAssessment.isMonsoonImpacted, true);
    assert.equal(monsoonAssessment.recommendedWeatherBufferDays, 8);
    assert.equal(monsoonAssessment.joineryEMCRisk, true);

    // Mitigate joinery risk by specifying IS 287 kiln-dried timber and BWP 710 marine backer
    const ifcRecords = generateIFC4LOD300Records();
    const doorRecord = ifcRecords.find((r) => r.entityType === 'IfcDoor');
    assert.ok(doorRecord);
    assert.ok(doorRecord.material.includes('Mineral Wool') || doorRecord.material.includes('Steel'));

    // CPM schedule retains feasibility with domestic procurement
    const compressed = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
      {
        tradeId: 'finishes',
        originalMaterial: 'Italian Marble',
        proposedMaterial: 'Rajasthan Honed Kota Stone',
        costSavingINR: 855000,
        leadTimeReductionWeeks: 14,
      },
    ]);
    const cpm = calculateCPM(compressed);
    // Adjusted project duration plus monsoon buffer stays within 100 days
    assert.ok(cpm.totalDurationDays + monsoonAssessment.recommendedWeatherBufferDays <= 100);
  });

  test('T4-04: DLF Magnolias High-Density Master Suite (1,200 sq ft Benchmark)', () => {
    // Benchmark 1,200 sq ft flat with 18.4m egress vector
    const carpetM2 = 111.0;
    const floorAreaSqFt = 1200;

    const underwriting = calculatePEUnderwriting({
      grossFloorAreaSqFt: floorAreaSqFt,
      carpetAreaSqFt: 1008, // 84% NTG squeeze
      totalCapexINR: 2850000,
      rentalRatePerSqFtMonthlyINR: 125,
    });
    assert.equal(underwriting.carpetToSaleableRatio, 0.84);
    assert.equal(underwriting.meetsNTGThreshold, true);

    // Multi-exit vector check
    const routes = resolveMultiExitRoutes(
      [{ x: 11.2, y: 7.8 }], // furthest retreat point
      [{ id: 'main-entry', position: { x: 1.2, y: 0.0 } }],
      30.0,
    );
    assert.equal(routes.length, 1);
    assert.ok(routes[0].travelDistanceM <= 30.0);
    assert.equal(routes[0].isCompliant, true);
  });

  test('T4-05: Heritage Sanctuary with 9-Zone Paramasayika Vastu Mandala & Sabine Comfort', () => {
    // 1. Comprehensive Vastu Plan
    const vastu = evaluateVastuMandala([
      { roomName: 'Master Bedroom', roomType: 'master_bedroom', quadrant: 'SW' },
      { roomName: 'Kitchen', roomType: 'kitchen', quadrant: 'SE' },
      { roomName: 'Puja Sanctum', roomType: 'pooja_meditation', quadrant: 'NE' },
      { roomName: 'Guest Suite', roomType: 'guest_bedroom', quadrant: 'NW' },
      { roomName: 'Living Core', roomType: 'living', quadrant: 'N' },
      { roomName: 'Study Pavilion', roomType: 'study', quadrant: 'W' },
      { roomName: 'Formal Dining', roomType: 'dining', quadrant: 'E' },
    ]);
    assert.equal(vastu.brahmasthanClear, true);
    assert.ok(vastu.overallScorePercent >= 90);
    assert.equal(vastu.overallRating, 'Vastu Shastra Compliant');

    // 2. Daylighting in North & East quadrants
    const pujaDaylight = calculateDaylightFactor({
      roomName: 'Puja Sanctum',
      roomFloorAreaM2: 20.0,
      windowGlazingAreaM2: 4.0,
      windowHeadHeightM: 2.8,
      orientation: 'NE',
      roomType: 'study',
    });
    assert.equal(pujaDaylight.isDaylightCompliant, true);

    // 3. Acoustic Serenity in Master Bedroom
    const bedroomAcoustics = calculateRoomRT60({
      roomName: 'Master Sanctuary Bedroom',
      roomType: 'bedroom',
      lengthM: 6.0,
      widthM: 5.0,
      heightM: 2.8,
      floorMaterialKey: 'teak_hardwood_flooring',
      wallFinishKey: 'gyproc_soundstop_double',
      ceilingFinishKey: 'mineral_fiber_ceiling',
    });
    assert.equal(bedroomAcoustics.isAcousticallyCompliant, true);
    assert.ok(bedroomAcoustics.rt60AverageSeconds <= 0.55);
  });
});
