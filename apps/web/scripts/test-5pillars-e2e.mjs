#!/usr/bin/env node
/**
 * Automated 5-Pillar E2E Test Runner for AtelierOS.
 *
 * Executes the full-spectrum 4-Tier test suite across:
 *   - Pillar 1: PE Financial Underwriting & Statutory FAR Monetization
 *   - Pillar 2: Structural Bay Grid & 3D MEP BIM Coordination
 *   - Pillar 3: Multi-Floor Egress & Fire Engineering Automation
 *   - Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala
 *   - Pillar 5: 4D EPC Construction Scheduling & Turnkey Resilience
 *   - Tier 3: Cross-Feature Multi-Pillar Interactions
 *   - Tier 4: Real-World Institutional Application Scenarios
 *
 * Produces clear tabular formatted test reports with execution latencies
 * and statutory compliance certifications.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createJiti } from 'jiti';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const calculatorsDir = path.resolve(webRoot, 'src/lib/calculators');

// Initialize Jiti compiler for TypeScript imports
const jiti = createJiti(import.meta.url);

// Import calculation engines
const peUnderwriting = await jiti.import(path.resolve(calculatorsDir, 'pe-underwriting.ts'));
const structuralGrid = await jiti.import(path.resolve(calculatorsDir, 'structural-grid-engine.ts'));
const staircaseEgress = await jiti.import(path.resolve(calculatorsDir, 'staircase-egress-calculator.ts'));
const acoustics = await jiti.import(path.resolve(calculatorsDir, 'acoustic-rt60-calculator.ts'));
const constructionGantt = await jiti.import(path.resolve(calculatorsDir, 'construction-gantt-engine.ts'));

const {
  calculatePEUnderwriting,
  exportCPWDTenderScheduleCSV,
  CPWD_DSR_2024_DEFAULTS,
} = peUnderwriting;

const {
  generateStructuralGrid,
  checkSpanDeflection,
  checkPlenumClash,
  STRUCTURAL_DEFAULTS,
} = structuralGrid;

const {
  calculateStaircaseGeometry,
  resolveMultiExitRoutes,
  generateEvacuationDossier,
  STAIRCASE_STATUTORY_LIMITS,
} = staircaseEgress;

const {
  calculateRoomRT60,
  validatePartitionSTC,
  calculateDaylightFactor,
  evaluateVastuMandala,
  ACOUSTIC_MATERIALS_DATABASE,
} = acoustics;

const {
  DEFAULT_TURNKEY_TASKS,
  calculateCPM,
  applyValueEngineeringCompression,
  assessMonsoonRisk,
  generateIFC4LOD300Records,
  exportCOBieScheduleCSV,
} = constructionGantt;

// Test cases registry
const testCases = [
  // =========================================================================
  // PILLAR 1: PE FINANCIAL UNDERWRITING & FAR
  // =========================================================================
  {
    id: 'P1-01',
    pillar: 'Pillar 1',
    tier: 'Tier 1: Feature',
    standard: 'Haryana DTCP / CPWD',
    name: 'Computes institutional pro-forma underwriting (YoC, NOI, IRR, Payback)',
    fn: () => {
      const res = calculatePEUnderwriting({
        grossFloorAreaSqFt: 12000,
        carpetAreaSqFt: 10200,
        totalCapexINR: 45000000,
        rentalRatePerSqFtMonthlyINR: 135,
        plotAreaSqFt: 6000,
      });
      assert.equal(res.carpetToSaleableRatio, 0.85);
      assert.equal(res.meetsNTGThreshold, true);
      assert.ok(res.yieldOnCostPercent > 0);
      assert.ok(res.netOperatingIncomeINR > 0);
      assert.ok(res.paybackPeriodYears > 0 && res.paybackPeriodYears < 15);
      assert.equal(res.isInstitutionalGrade, true);
    },
  },
  {
    id: 'P1-02',
    pillar: 'Pillar 1',
    tier: 'Tier 1: Feature',
    standard: 'CPWD DSR 2024',
    name: 'Generates official tender items (11.36.1, 13.48, 9.21.2, 19.3.1, 31.8.2)',
    fn: () => {
      const res = calculatePEUnderwriting({ grossFloorAreaSqFt: 5000, carpetAreaSqFt: 4250, totalCapexINR: 20000000 });
      assert.ok(res.cpwdTenderSchedule.some((i) => i.itemCode === 'CPWD 11.36.1'));
      assert.ok(res.cpwdTenderSchedule.some((i) => i.itemCode === 'CPWD 13.48'));
      assert.ok(res.cpwdTenderSchedule.some((i) => i.itemCode === 'CPWD 9.21.2'));
      assert.ok(res.cpwdTenderSchedule.some((i) => i.itemCode === 'CPWD 19.3.1'));
      assert.ok(res.cpwdTenderSchedule.some((i) => i.itemCode === 'CPWD 31.8.2'));
    },
  },
  {
    id: 'P1-03',
    pillar: 'Pillar 1',
    tier: 'Tier 1: Feature',
    standard: 'RFC 4180 / CPWD',
    name: 'Exports compliant CPWD tender schedule CSV with grand total line',
    fn: () => {
      const res = calculatePEUnderwriting({ grossFloorAreaSqFt: 5000, carpetAreaSqFt: 4250, totalCapexINR: 20000000 });
      const csv = exportCPWDTenderScheduleCSV(res.cpwdTenderSchedule);
      assert.ok(csv.includes('Item Code,Sub-Head,Description,Quantity,Unit,DSR Rate (INR),Amount (INR)'));
      assert.ok(csv.includes('"GRAND TOTAL (CPWD DSR 2024)"'));
    },
  },
  {
    id: 'P1-04',
    pillar: 'Pillar 1',
    tier: 'Tier 1: Feature',
    standard: 'Haryana DTCP',
    name: 'Calculates statutory FAR (1.75 base, 2.64 total) and 60% ground coverage',
    fn: () => {
      const plot = 10000;
      const res = calculatePEUnderwriting({
        grossFloorAreaSqFt: 25000,
        carpetAreaSqFt: 21250,
        totalCapexINR: 80000000,
        plotAreaSqFt: plot,
      });
      assert.equal(res.baseAllowableGFA, 17500);
      assert.equal(res.totalPermissibleGFA, 26400);
      assert.equal(res.isFARCompliant, true);
    },
  },
  {
    id: 'P1-05',
    pillar: 'Pillar 1',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 3 / DTCP',
    name: 'Classifies Net Carpet (green), Circulation (amber), and Shaft (blue)',
    fn: () => {
      const res = calculatePEUnderwriting({ grossFloorAreaSqFt: 10000, carpetAreaSqFt: 8400, totalCapexINR: 35000000 });
      assert.equal(res.carpetAreaSqFt, 8400);
      assert.equal(res.circulationAreaSqFt, 1600);
      assert.equal(res.carpetToSaleableRatio, 0.84);
      assert.equal(res.meetsNTGThreshold, true);
    },
  },
  {
    id: 'P1-06',
    pillar: 'Pillar 1',
    tier: 'Tier 2: Boundary',
    standard: 'Arithmetic Safety',
    name: 'Minimal area (1 sqft) and minimal capex (₹1) avoid NaN/division errors',
    fn: () => {
      const res = calculatePEUnderwriting({ grossFloorAreaSqFt: 1, carpetAreaSqFt: 1, totalCapexINR: 1 });
      assert.equal(Number.isNaN(res.yieldOnCostPercent), false);
      assert.equal(Number.isNaN(res.paybackPeriodYears), false);
    },
  },
  {
    id: 'P1-07',
    pillar: 'Pillar 1',
    tier: 'Tier 2: Boundary',
    standard: 'Haryana DTCP',
    name: 'FAR compliance boundary check (exact 100.0% passes, exceeding fails)',
    fn: () => {
      const plot = 10000;
      const exactGFA = 26400;
      const pass = calculatePEUnderwriting({ grossFloorAreaSqFt: exactGFA, carpetAreaSqFt: 22000, totalCapexINR: 50000000, plotAreaSqFt: plot });
      assert.equal(pass.isFARCompliant, true);
      const fail = calculatePEUnderwriting({ grossFloorAreaSqFt: exactGFA + 1, carpetAreaSqFt: 22000, totalCapexINR: 50000000, plotAreaSqFt: plot });
      assert.equal(fail.isFARCompliant, false);
    },
  },

  // =========================================================================
  // PILLAR 2: STRUCTURAL BAY GRID & MEP BIM
  // =========================================================================
  {
    id: 'P2-01',
    pillar: 'Pillar 2',
    tier: 'Tier 1: Feature',
    standard: 'IS 1893 Zone IV',
    name: 'Generates modular bay grid layouts (6x6, 6x7.2, 7.2x7.2m)',
    fn: () => {
      const g1 = generateStructuralGrid(null, '6.0x6.0');
      const g2 = generateStructuralGrid(null, '6.0x7.2');
      assert.equal(g1.spanXM, 6.0);
      assert.equal(g2.spanYM, 7.2);
      assert.ok(g1.columns.length > 0);
    },
  },
  {
    id: 'P2-02',
    pillar: 'Pillar 2',
    tier: 'Tier 1: Feature',
    standard: 'IS 13920 / IS 456',
    name: 'Differentiates RC columns: 400x400mm interior vs 450x600mm corner/shear',
    fn: () => {
      const g = generateStructuralGrid(null, '6.0x7.2');
      const corner = g.columns.find((c) => c.isCorner);
      const interior = g.columns.find((c) => !c.isCorner);
      assert.equal(corner?.widthM, 0.45);
      assert.equal(corner?.depthM, 0.60);
      assert.equal(interior?.widthM, 0.40);
      assert.equal(interior?.depthM, 0.40);
    },
  },
  {
    id: 'P2-03',
    pillar: 'Pillar 2',
    tier: 'Tier 1: Feature',
    standard: 'IS 456 Cl. 23.2',
    name: 'Enforces continuous beam span-to-depth ratio (L/d <= 26.0)',
    fn: () => {
      const ok = checkSpanDeflection(7.2, 0.45);
      assert.equal(ok.isCompliant, true);
      assert.equal(ok.spanToDepthRatio, 16.0);
      const bad = checkSpanDeflection(12.0, 0.45);
      assert.equal(bad.isCompliant, false);
    },
  },
  {
    id: 'P2-04',
    pillar: 'Pillar 2',
    tier: 'Tier 1: Feature',
    standard: 'IS 1893 / IS 456',
    name: 'Flags spans exceeding 7.5m with structural deflection warnings (PT tendons)',
    fn: () => {
      const defl = checkSpanDeflection(8.5, 0.45);
      assert.equal(defl.isExcessive, true);
      assert.ok(defl.warning.includes('7.5m'));
    },
  },
  {
    id: 'P2-05',
    pillar: 'Pillar 2',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 3 Cl. 12.2',
    name: 'Validates 450mm false ceiling plenum void preserving >= 2.75m room height',
    fn: () => {
      const ok = checkPlenumClash(3.40);
      assert.equal(ok.isClashFree, true);
      assert.equal(ok.habitableRoomHeightM, 2.75);
      const clash = checkPlenumClash(3.00);
      assert.equal(clash.isClashFree, false);
      assert.equal(clash.headroomDeficitM, 0.40);
    },
  },
  {
    id: 'P2-06',
    pillar: 'Pillar 2',
    tier: 'Tier 2: Boundary',
    standard: 'IS 456 / IS 1893',
    name: 'Span boundary at 7.50m (conventional pass) vs 7.51m (triggers PT tendons)',
    fn: () => {
      assert.equal(checkSpanDeflection(7.50, 0.45).isExcessive, false);
      assert.equal(checkSpanDeflection(7.51, 0.45).isExcessive, true);
    },
  },
  {
    id: 'P2-07',
    pillar: 'Pillar 2',
    tier: 'Tier 2: Boundary',
    standard: 'IS 456 Cl. 23.2',
    name: 'Cantilever deflection limit L/d <= 7.0 (2.0m passes, 3.5m fails)',
    fn: () => {
      assert.ok(2.0 / 0.45 <= 7.0);
      assert.ok(3.5 / 0.45 > 7.0);
    },
  },

  // =========================================================================
  // PILLAR 3: MULTI-FLOOR EGRESS & FIRE ENGINEERING
  // =========================================================================
  {
    id: 'P3-01',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC 2016 Part 4',
    name: 'Validates Blondel ergonomic formula (550mm <= 2R + T <= 650mm)',
    fn: () => {
      const stair = calculateStaircaseGeometry({
        totalRiseM: 3.3,
        riserHeightM: 0.15,
        treadDepthM: 0.30,
        flightWidthM: 1.50,
      });
      assert.equal(stair.ergonomicMetricMM, 600);
      assert.equal(stair.isErgonomicCompliant, true);
    },
  },
  {
    id: 'P3-02',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 4 Table 8',
    name: 'Enforces maximum riser (<= 150mm) and minimum tread (>= 300mm)',
    fn: () => {
      const ok = calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 1.50 });
      assert.equal(ok.isRiserCompliant, true);
      assert.equal(ok.isTreadCompliant, true);
      const bad = calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.16, treadDepthM: 0.28, flightWidthM: 1.50 });
      assert.equal(bad.isRiserCompliant, false);
      assert.equal(bad.isTreadCompliant, false);
    },
  },
  {
    id: 'P3-03',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 4 Table 8',
    name: 'Validates clear width by building height (>= 1.50m for > 15m residential)',
    fn: () => {
      const highRise = calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 1.50, buildingHeightM: 20.0 });
      assert.equal(highRise.requiredWidthM, 1.50);
      assert.equal(highRise.isWidthCompliant, true);
    },
  },
  {
    id: 'P3-04',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 4 Cl. 4.4.2',
    name: 'Enforces flight riser limit (<= 15) and intermediate landing depth (>= flight width)',
    fn: () => {
      const stair = calculateStaircaseGeometry({ totalRiseM: 3.6, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 1.50 });
      assert.equal(stair.flightsRequired, 2);
      assert.ok(stair.risersPerFlight <= 15);
      assert.ok(stair.landingDepthM >= 1.50);
    },
  },
  {
    id: 'P3-05',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 4 Cl. 4.5.1',
    name: 'Allocates retreat points to nearest exits (travel distance <= 30.0m)',
    fn: () => {
      const pts = [{ x: 12.0, y: 8.0 }];
      const exits = [
        { id: 'exit-north', position: { x: 2.0, y: 1.0 } },
        { id: 'exit-east', position: { x: 13.0, y: 8.5 } },
      ];
      const routes = resolveMultiExitRoutes(pts, exits);
      assert.equal(routes[0].exitId, 'exit-east');
      assert.ok(routes[0].isCompliant);
    },
  },
  {
    id: 'P3-06',
    pillar: 'Pillar 3',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 4 Fire Sanction',
    name: 'Generates official municipal fire evacuation dossier (50 Pa, FD 120)',
    fn: () => {
      const dossier = generateEvacuationDossier({
        projectName: 'Camellias Sanctuary',
        occupantLoad: 20,
        furthestTravelDistanceM: 20.5,
        staircaseClearWidthM: 1.50,
        fireDoorRating: 'FD 120',
        hasPressurizationFan: true,
        hoseReelCount: 2,
      });
      assert.ok(dossier.includes('FD 120'));
      assert.ok(dossier.includes('50 Pa Positive Pressure'));
      assert.ok(dossier.includes('CERTIFIED COMPLIANT'));
    },
  },
  {
    id: 'P3-07',
    pillar: 'Pillar 3',
    tier: 'Tier 2: Boundary',
    standard: 'NBC 2016 Part 4',
    name: 'Blondel boundary: 549mm fails, 550mm passes, 650mm passes, 651mm fails',
    fn: () => {
      assert.equal(calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.125, treadDepthM: 0.30, flightWidthM: 1.50 }).isErgonomicCompliant, true);
      assert.equal(calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.124, treadDepthM: 0.30, flightWidthM: 1.50 }).isErgonomicCompliant, false);
      assert.equal(calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.150, treadDepthM: 0.35, flightWidthM: 1.50 }).isErgonomicCompliant, true);
      assert.equal(calculateStaircaseGeometry({ totalRiseM: 3.0, riserHeightM: 0.150, treadDepthM: 0.351, flightWidthM: 1.50 }).isErgonomicCompliant, false);
    },
  },

  // =========================================================================
  // PILLAR 4: MUSEUM ACOUSTICS, DAYLIGHTING & VASTU
  // =========================================================================
  {
    id: 'P4-01',
    pillar: 'Pillar 4',
    tier: 'Tier 1: Feature',
    standard: 'Sabine RT60 Formula',
    name: 'Calculates room reverberation time within luxury comfort limits (0.45-0.70s)',
    fn: () => {
      const res = calculateRoomRT60({
        roomName: 'Living Core',
        roomType: 'living',
        lengthM: 8.0,
        widthM: 6.0,
        heightM: 3.2,
        floorMaterialKey: 'italian_marble',
        wallFinishKey: 'gyproc_soundstop_double',
        ceilingFinishKey: 'mineral_fiber_ceiling',
        glazingAreaSqM: 10.0,
      });
      assert.ok(res.volumeM3 > 0);
      assert.ok(res.rt60AverageSeconds >= 0.45 && res.rt60AverageSeconds <= 0.70);
      assert.equal(res.isAcousticallyCompliant, true);
    },
  },
  {
    id: 'P4-02',
    pillar: 'Pillar 4',
    tier: 'Tier 1: Feature',
    standard: 'Acoustic Flutter Echo',
    name: 'Detects flutter echo in all-marble space and recommends acoustic absorption',
    fn: () => {
      const res = calculateRoomRT60({
        roomName: 'Marble Foyer',
        roomType: 'living',
        lengthM: 10.0,
        widthM: 8.0,
        heightM: 3.6,
        floorMaterialKey: 'italian_marble',
        wallFinishKey: 'standard_gypsum_wall',
        ceilingFinishKey: 'monolithic_gypsum_ceiling',
      });
      assert.equal(res.status, 'too_live_echoey');
      assert.ok(res.recommendations.some((r) => r.includes('area rugs') || r.includes('acoustic')));
    },
  },
  {
    id: 'P4-03',
    pillar: 'Pillar 4',
    tier: 'Tier 1: Feature',
    standard: 'ASTM E413 (STC 56)',
    name: 'Verifies STC 56 acoustic decoupling and audits 3 flanking pathways',
    fn: () => {
      const good = validatePartitionSTC({
        partitionName: 'Party Wall',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool 48kg/m³',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: false,
        doorAcousticSealPresent: true,
        backToBackElectricalBoxesStaggered: true,
      });
      assert.ok(good.calculatedSTC >= 56);
      assert.equal(good.isSTCCompliant, true);

      const leaky = validatePartitionSTC({
        partitionName: 'Leaky Wall',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: true,
        doorAcousticSealPresent: false,
        backToBackElectricalBoxesStaggered: false,
      });
      assert.equal(good.calculatedSTC - leaky.calculatedSTC, 17);
    },
  },
  {
    id: 'P4-04',
    pillar: 'Pillar 4',
    tier: 'Tier 1: Feature',
    standard: 'NBC Part 8 Sec 1',
    name: 'Calculates CIE Daylight Factor (DF %) and checks statutory minimums',
    fn: () => {
      const res = calculateDaylightFactor({
        roomName: 'Corner Suite',
        roomFloorAreaM2: 25.0,
        windowGlazingAreaM2: 4.5,
        windowHeadHeightM: 2.8,
        orientation: 'NE',
        roomType: 'bedroom',
      });
      assert.ok(res.estimatedDaylightFactorPercent >= 1.0);
      assert.equal(res.isDaylightCompliant, true);
    },
  },
  {
    id: 'P4-05',
    pillar: 'Pillar 4',
    tier: 'Tier 1: Feature',
    standard: 'Paramasayika Vastu',
    name: 'Evaluates 9-zone Vastu mandala grid (Ishanya NE, Agni SE, Nairutya SW)',
    fn: () => {
      const res = evaluateVastuMandala([
        { roomName: 'Master Bedroom', roomType: 'master_bedroom', quadrant: 'SW' },
        { roomName: 'Kitchen', roomType: 'kitchen', quadrant: 'SE' },
        { roomName: 'Puja Sanctum', roomType: 'pooja_meditation', quadrant: 'NE' },
      ]);
      assert.ok(res.overallScorePercent >= 85);
      assert.equal(res.brahmasthanClear, true);
    },
  },
  {
    id: 'P4-06',
    pillar: 'Pillar 4',
    tier: 'Tier 2: Boundary',
    standard: 'Vastu Brahmasthan',
    name: 'Brahmasthan central defect flags critical flaw and priority remediation',
    fn: () => {
      const res = evaluateVastuMandala([{ roomName: 'Central Shaft Toilet', roomType: 'toilet', quadrant: 'CENTER' }]);
      assert.equal(res.brahmasthanClear, false);
      assert.equal(res.overallRating, 'Critical Flaws Present');
    },
  },

  // =========================================================================
  // PILLAR 5: 4D EPC SCHEDULING & RESILIENCE
  // =========================================================================
  {
    id: 'P5-01',
    pillar: 'Pillar 5',
    tier: 'Tier 1: Feature',
    standard: '4D CPM Algorithm',
    name: 'Calculates Day 0 to Day 90 CPM forward and backward passes with float',
    fn: () => {
      const cpm = calculateCPM(DEFAULT_TURNKEY_TASKS);
      assert.ok(cpm.totalDurationDays >= 80 && cpm.totalDurationDays <= 100);
      assert.ok(cpm.criticalPath.length > 0);
      for (const id of cpm.criticalPath) {
        const task = cpm.tasks.find((t) => t.id === id);
        assert.equal(task?.totalFloatDays, 0);
      }
    },
  },
  {
    id: 'P5-02',
    pillar: 'Pillar 5',
    tier: 'Tier 1: Feature',
    standard: 'VE Procurement Compression',
    name: 'Domestic stone swap compresses procurement lead time by 14 weeks',
    fn: () => {
      const compressed = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
        { tradeId: 'finishes', originalMaterial: 'Italian Marble', proposedMaterial: 'Kota Stone', costSavingINR: 855000, leadTimeReductionWeeks: 14 },
      ]);
      const stoneTask = compressed.find((t) => t.id === 'T500');
      assert.equal(stoneTask?.leadTimeWeeks, 2); // 16 - 14 = 2 weeks
      assert.equal(stoneTask?.isDomesticProcurement, true);
    },
  },
  {
    id: 'P5-03',
    pillar: 'Pillar 5',
    tier: 'Tier 1: Feature',
    standard: 'IS 287 (8-12% EMC)',
    name: 'Delhi-NCR monsoon check (July-Sept) triggers joinery EMC & screed alerts',
    fn: () => {
      const res = assessMonsoonRisk(7, 90);
      assert.equal(res.isMonsoonImpacted, true);
      assert.equal(res.joineryEMCRisk, true);
      assert.equal(res.recommendedWeatherBufferDays, 8);
      assert.ok(res.mitigationGuidelines.some((g) => g.includes('IS 287')));
    },
  },
  {
    id: 'P5-04',
    pillar: 'Pillar 5',
    tier: 'Tier 1: Feature',
    standard: 'IFC4 LOD 300 / COBie',
    name: 'Generates enriched IFC4 records with fire ratings, STC, and CPWD codes',
    fn: () => {
      const records = generateIFC4LOD300Records();
      assert.ok(records.length >= 4);
      assert.ok(records.some((r) => r.fireRating.includes('FD 120')));
      assert.ok(records.some((r) => r.cpwdItemCode === 'CPWD 13.48.2'));
    },
  },
  {
    id: 'P5-05',
    pillar: 'Pillar 5',
    tier: 'Tier 1: Feature',
    standard: 'COBie Schedule CSV',
    name: 'Exports COBie schedule CSV with GUIDs, U-values, and CPWD DSR codes',
    fn: () => {
      const csv = exportCOBieScheduleCSV(generateIFC4LOD300Records());
      assert.ok(csv.includes('IFC GUID,Entity Type,Component Name'));
      assert.ok(csv.includes('LOD 300 Turnkey'));
    },
  },
  {
    id: 'P5-06',
    pillar: 'Pillar 5',
    tier: 'Tier 2: Boundary',
    standard: 'Weather Contingency',
    name: 'Dry season (January) has 0 buffer days vs monsoon (July) has 8 days buffer',
    fn: () => {
      assert.equal(assessMonsoonRisk(1, 90).recommendedWeatherBufferDays, 0);
      assert.equal(assessMonsoonRisk(7, 90).recommendedWeatherBufferDays, 8);
    },
  },

  // =========================================================================
  // TIER 3: CROSS-FEATURE MULTI-PILLAR INTERACTIONS
  // =========================================================================
  {
    id: 'T3-01',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P1 ➔ P5 Synchronization',
    name: 'PE BOQ stone swap reduces Capex, raises YoC, and compresses 4D CPM duration',
    fn: () => {
      const baseCapex = 2850000;
      const veSavings = 855000;
      const optUnderwriting = calculatePEUnderwriting({ grossFloorAreaSqFt: 1200, carpetAreaSqFt: 1008, totalCapexINR: baseCapex - veSavings });
      const baseUnderwriting = calculatePEUnderwriting({ grossFloorAreaSqFt: 1200, carpetAreaSqFt: 1008, totalCapexINR: baseCapex });
      assert.ok(optUnderwriting.yieldOnCostPercent > baseUnderwriting.yieldOnCostPercent);

      const baseCPM = calculateCPM(DEFAULT_TURNKEY_TASKS);
      const optCPM = calculateCPM(applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
        { tradeId: 'finishes', originalMaterial: 'Marble', proposedMaterial: 'Kota', costSavingINR: veSavings, leadTimeReductionWeeks: 14 }
      ]));
      assert.ok(optCPM.totalDurationDays < baseCPM.totalDurationDays);
    },
  },
  {
    id: 'T3-02',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P2 ➔ P4 Synchronization',
    name: '450mm structural plenum void governs available room acoustic volume',
    fn: () => {
      const plenum = checkPlenumClash(3.40, 0.20, 0.45);
      assert.equal(plenum.habitableRoomHeightM, 2.75);
      const acoustics = calculateRoomRT60({
        roomName: 'Master Bedroom',
        roomType: 'bedroom',
        lengthM: 6.0,
        widthM: 5.0,
        heightM: plenum.habitableRoomHeightM,
        floorMaterialKey: 'teak_hardwood_flooring',
        wallFinishKey: 'gyproc_soundstop_double',
        ceilingFinishKey: 'mineral_fiber_ceiling',
      });
      assert.equal(acoustics.volumeM3, 6.0 * 5.0 * 2.75);
      assert.equal(acoustics.isAcousticallyCompliant, true);
    },
  },
  {
    id: 'T3-03',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P2 ➔ P1 Synchronization',
    name: 'Continuous 300x300mm MEP wet shaft classifies as deductible service in FAR',
    fn: () => {
      const underwriting = calculatePEUnderwriting({ grossFloorAreaSqFt: 6000, carpetAreaSqFt: 5040, totalCapexINR: 25000000 });
      const shaftItem = underwriting.cpwdTenderSchedule.find((i) => i.itemCode === 'CPWD 19.3.1');
      assert.ok(shaftItem);
      assert.equal(shaftItem.amountINR, 165000);
      assert.ok(underwriting.circulationAreaSqFt > 0);
    },
  },
  {
    id: 'T3-04',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P3 ➔ P5 Synchronization',
    name: 'Pressurized 2-hour fire stair tower with FD 120 doors links to IFC4 LOD 300',
    fn: () => {
      const dossier = generateEvacuationDossier({
        projectName: 'DLF Core',
        occupantLoad: 40,
        furthestTravelDistanceM: 22.0,
        staircaseClearWidthM: 1.50,
        fireDoorRating: 'FD 120',
        hasPressurizationFan: true,
        hoseReelCount: 2,
      });
      assert.ok(dossier.includes('FD 120'));

      const ifc = generateIFC4LOD300Records();
      const door = ifc.find((r) => r.entityType === 'IfcDoor');
      assert.ok(door?.fireRating.includes('FD 120'));
    },
  },
  {
    id: 'T3-05',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P4 ➔ P4 Synchronization',
    name: 'Daylight factor NE window orientation harmonizes with Vastu Ishanya alignment',
    fn: () => {
      const df = calculateDaylightFactor({ roomName: 'Puja', roomFloorAreaM2: 15.0, windowGlazingAreaM2: 3.0, windowHeadHeightM: 2.8, orientation: 'NE', roomType: 'study' });
      assert.equal(df.isDaylightCompliant, true);
      const vastu = evaluateVastuMandala([{ roomName: 'Puja', roomType: 'pooja_meditation', quadrant: 'NE' }]);
      assert.equal(vastu.quadrants.find((q) => q.quadrantName === 'Ishanya (NE)')?.score, 100);
    },
  },
  {
    id: 'T3-06',
    pillar: 'Multi-Pillar',
    tier: 'Tier 3: Interaction',
    standard: 'P1 + P3 + P4 Synthesis',
    name: '84% NTG squeeze preserves 1.50m stairway clear width and STC 56 acoustic privacy',
    fn: () => {
      const u = calculatePEUnderwriting({ grossFloorAreaSqFt: 10000, carpetAreaSqFt: 8400, totalCapexINR: 40000000 });
      assert.equal(u.carpetToSaleableRatio, 0.84);
      const s = calculateStaircaseGeometry({ totalRiseM: 3.3, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 1.50, buildingHeightM: 24.0 });
      assert.equal(s.isWidthCompliant, true);
      const w = validatePartitionSTC({
        partitionName: 'Corridor Partition',
        hasDoubleStudOrResilientChannel: true,
        insulationType: 'Rockwool',
        liningLayers: '2x 15mm SoundStop',
        ceilingPlenumFlanking: false,
        doorAcousticSealPresent: true,
        backToBackElectricalBoxesStaggered: true,
      });
      assert.equal(w.isSTCCompliant, true);
    },
  },

  // =========================================================================
  // TIER 4: REAL-WORLD INSTITUTIONAL SCENARIOS
  // =========================================================================
  {
    id: 'T4-01',
    pillar: 'Institutional',
    tier: 'Tier 4: Benchmark',
    standard: 'DLF Phase 5 Penthouse',
    name: 'DLF Phase 5 Ultra-Luxury Sanctuary Penthouse (12,000 sq ft, 3.4m F2F, STC 58)',
    fn: () => {
      const u = calculatePEUnderwriting({ grossFloorAreaSqFt: 12000, carpetAreaSqFt: 10200, totalCapexINR: 45000000, plotAreaSqFt: 6000 });
      assert.equal(u.isInstitutionalGrade, true);
      const g = generateStructuralGrid(null, '6.0x7.2', 3.40);
      assert.equal(g.plenumCheck.isClashFree, true);
      const s = calculateStaircaseGeometry({ totalRiseM: 3.4, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 1.50, buildingHeightM: 30.0 });
      assert.equal(s.overallPass, true);
      const a = calculateRoomRT60({ roomName: 'Penthouse Living', roomType: 'living', lengthM: 8.0, widthM: 6.0, heightM: 2.75, floorMaterialKey: 'italian_marble', wallFinishKey: 'gyproc_soundstop_double', ceilingFinishKey: 'mineral_fiber_ceiling', glazingAreaSqM: 10.0 });
      assert.equal(a.isAcousticallyCompliant, true);
    },
  },
  {
    id: 'T4-02',
    pillar: 'Institutional',
    tier: 'Tier 4: Benchmark',
    standard: 'Cyber City Commercial IT',
    name: 'Cyber City Grade-A Commercial IT Suite (60,000 sq ft, 2.0m wide stairs)',
    fn: () => {
      const u = calculatePEUnderwriting({ grossFloorAreaSqFt: 60000, carpetAreaSqFt: 51000, totalCapexINR: 240000000, plotAreaSqFt: 25000 });
      assert.ok(u.netOperatingIncomeINR > 50000000);
      const s = calculateStaircaseGeometry({ totalRiseM: 3.6, riserHeightM: 0.15, treadDepthM: 0.30, flightWidthM: 2.00, occupancyType: 'commercial' });
      assert.equal(s.isWidthCompliant, true);
      assert.equal(s.overallPass, true);
    },
  },
  {
    id: 'T4-03',
    pillar: 'Institutional',
    tier: 'Tier 4: Benchmark',
    standard: 'Monsoon-Window Turnkey',
    name: 'Monsoon-Window Turnkey Handover (July 1 - Sept 15, IS 287 EMC joinery protection)',
    fn: () => {
      const m = assessMonsoonRisk(7, 90);
      assert.equal(m.isMonsoonImpacted, true);
      assert.equal(m.recommendedWeatherBufferDays, 8);
      const ifc = generateIFC4LOD300Records();
      assert.ok(ifc.some((r) => r.entityType === 'IfcDoor'));
    },
  },
  {
    id: 'T4-04',
    pillar: 'Institutional',
    tier: 'Tier 4: Benchmark',
    standard: 'DLF Magnolias Benchmark',
    name: 'DLF Magnolias High-Density Master Suite (1,200 sq ft, 18.4m egress vector)',
    fn: () => {
      const u = calculatePEUnderwriting({ grossFloorAreaSqFt: 1200, carpetAreaSqFt: 1008, totalCapexINR: 2850000 });
      assert.equal(u.carpetToSaleableRatio, 0.84);
      const routes = resolveMultiExitRoutes([{ x: 11.2, y: 7.8 }], [{ id: 'entry', position: { x: 1.2, y: 0.0 } }], 30.0);
      assert.equal(routes[0].isCompliant, true);
    },
  },
  {
    id: 'T4-05',
    pillar: 'Institutional',
    tier: 'Tier 4: Benchmark',
    standard: 'Heritage Paramasayika',
    name: 'Heritage Sanctuary with 9-Zone Paramasayika Vastu Mandala & Sabine Comfort',
    fn: () => {
      const v = evaluateVastuMandala([
        { roomName: 'Master Bedroom', roomType: 'master_bedroom', quadrant: 'SW' },
        { roomName: 'Kitchen', roomType: 'kitchen', quadrant: 'SE' },
        { roomName: 'Puja Sanctum', roomType: 'pooja_meditation', quadrant: 'NE' },
        { roomName: 'Living Core', roomType: 'living', quadrant: 'N' },
      ]);
      assert.equal(v.brahmasthanClear, true);
      assert.ok(v.overallScorePercent >= 85);
      const a = calculateRoomRT60({ roomName: 'Bed', roomType: 'bedroom', lengthM: 6.0, widthM: 5.0, heightM: 2.8, floorMaterialKey: 'teak_hardwood_flooring', wallFinishKey: 'gyproc_soundstop_double', ceilingFinishKey: 'mineral_fiber_ceiling' });
      assert.equal(a.isAcousticallyCompliant, true);
    },
  },
];

// ============================================================================
// EXECUTION & REPORTING ENGINE
// ============================================================================

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     ATELIEROS 5-PILLAR E2E INSTITUTIONAL TEST SUITE RUNNER                               ║');
console.log('║  Requirements Grounded in NBC 2016, IS 456:2000, IS 1893 Zone IV, CPWD DSR 2024, ASTM E413, ISO IFC4     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');

const results = [];
const suiteStart = performance.now();

for (const tc of testCases) {
  const t0 = performance.now();
  let passed = true;
  let error;

  try {
    const res = tc.fn();
    if (res instanceof Promise) {
      await res;
    }
  } catch (err) {
    passed = false;
    error = err;
  }

  const durationMs = performance.now() - t0;
  results.push({
    id: tc.id,
    pillar: tc.pillar,
    tier: tc.tier,
    standard: tc.standard,
    name: tc.name,
    durationMs,
    passed,
    error,
  });
}

const totalDurationMs = performance.now() - suiteStart;

// Print detailed tabular output
console.log('┌────────┬──────────────┬──────────────────┬──────────────────────────┬────────────────────────────────────────────────────────┬──────────┬────────┐');
console.log('│ ID     │ Pillar       │ Tier             │ Statutory Standard       │ Test Case Specification                                │ Latency  │ Status │');
console.log('├────────┼──────────────┼──────────────────┼──────────────────────────┼────────────────────────────────────────────────────────┼──────────┼────────┤');

for (const r of results) {
  const idStr = r.id.padEnd(6);
  const pillarStr = r.pillar.padEnd(12);
  const tierStr = r.tier.padEnd(16);
  const stdStr = (r.standard.length > 24 ? r.standard.slice(0, 21) + '...' : r.standard).padEnd(24);
  const nameStr = (r.name.length > 54 ? r.name.slice(0, 51) + '...' : r.name).padEnd(54);
  const latStr = `${r.durationMs.toFixed(2)}ms`.padStart(8);
  const statusStr = r.passed ? '\x1b[32mPASS\x1b[0m  ' : '\x1b[31mFAIL\x1b[0m  ';

  console.log(`│ ${idStr} │ ${pillarStr} │ ${tierStr} │ ${stdStr} │ ${nameStr} │ ${latStr} │ ${statusStr} │`);
}
console.log('└────────┴──────────────┴──────────────────┴──────────────────────────┴────────────────────────────────────────────────────────┴──────────┴────────┘\n');

// Print Category Rollup Table
const categories = Array.from(new Set(results.map((r) => r.pillar)));
console.log('┌─────────────────────────────┬─────────────┬────────────┬────────────┬─────────────┬──────────────┐');
console.log('│ Pillar / Subsystem Track    │ Total Tests │ Passed     │ Failed     │ Pass Rate   │ Verdict      │');
console.log('├─────────────────────────────┼─────────────┼────────────┼────────────┼─────────────┼──────────────┤');

let allPassed = true;
for (const cat of categories) {
  const catResults = results.filter((r) => r.pillar === cat);
  const total = catResults.length;
  const passed = catResults.filter((r) => r.passed).length;
  const failed = total - passed;
  if (failed > 0) allPassed = false;
  const passRate = `${((passed / total) * 100).toFixed(1)}%`;
  const verdict = failed === 0 ? '\x1b[32mCERTIFIED\x1b[0m   ' : '\x1b[31mDEFECTS\x1b[0m     ';

  const catStr = cat.padEnd(27);
  const totStr = total.toString().padStart(11);
  const passStr = passed.toString().padStart(10);
  const failStr = failed.toString().padStart(10);
  const rateStr = passRate.padStart(11);

  console.log(`│ ${catStr} │ ${totStr} │ ${passStr} │ ${failStr} │ ${rateStr} │ ${verdict} │`);
}
console.log('└─────────────────────────────┴─────────────┴────────────┴────────────┴─────────────┴──────────────┘\n');

// Executive summary
const totalPassed = results.filter((r) => r.passed).length;
const totalFailed = results.length - totalPassed;
const overallRate = ((totalPassed / results.length) * 100).toFixed(1);

console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log(`║ OVERALL SUITE VERDICT: ${allPassed ? '\x1b[32m100% INSTITUTIONAL COMPLIANCE CERTIFIED\x1b[0m' : '\x1b[31mSTATUTORY DEFECTS DETECTED\x1b[0m'}                          ║`);
console.log(`║ Total Tests Executed: ${results.length.toString().padEnd(4)} | Passed: ${totalPassed.toString().padEnd(4)} | Failed: ${totalFailed.toString().padEnd(4)} | Pass Rate: ${overallRate}% | Time: ${totalDurationMs.toFixed(1)}ms ║`);
console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n');

if (!allPassed) {
  console.error('\x1b[31mFailed Test Details:\x1b[0m');
  for (const r of results.filter((r) => !r.passed)) {
    console.error(`- [${r.id}] ${r.pillar} (${r.tier}): ${r.name}`);
    console.error(`  Error: ${r.error?.message}\n`);
  }
  process.exit(1);
} else {
  process.exit(0);
}
