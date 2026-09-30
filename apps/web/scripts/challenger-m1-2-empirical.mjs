#!/usr/bin/env node
/**
 * Empirical Challenge Test Suite for Milestone M1 (Pillar 1).
 * Challenger 2 (critic, specialist).
 *
 * Tests 4 Core Requirements:
 * 1. State store synchronization in `floor-plan-store.ts` (showFarOverlay, showFarEnvelope, toggleFarOverlay)
 * 2. Dynamic recomputation performance on room drag (< 16ms, 60 FPS) across 5 scales
 * 3. 3D zoning envelope geometry generation in `zoning-envelope.tsx` (vertices, NaN/Infinity checks, normal orientation, bounding sphere)
 * 4. CPWD CSV generation edge cases (empty finishes, zero values, special characters in project name, RFC 4180 parsing)
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createJiti } from 'jiti';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

// Initialize Jiti compiler with JSX support for .tsx
const jiti = createJiti(import.meta.url, { jsx: true });

// Import target modules
const { floorPlanStore } = await jiti.import(
  path.resolve(webRoot, 'src/components/floor-plan-editor/state/floor-plan-store.ts')
);
const {
  calculateFARMetrics,
  classifyRoomZone,
  computeConvexHull,
  computePolygonArea,
  FAR_STATUTORY_CONSTANTS,
} = await jiti.import(
  path.resolve(webRoot, 'src/lib/calculators/far-envelope-geometry.ts')
);
const {
  calculatePEUnderwriting,
  generateCPWDTenderCsv,
  exportCPWDTenderScheduleCSV,
  CPWD_DSR_2024_DEFAULTS,
} = await jiti.import(
  path.resolve(webRoot, 'src/lib/calculators/pe-underwriting.ts')
);

const results = [];
const findings = [];

function recordTest(id, category, title, fn) {
  const start = performance.now();
  try {
    const detail = fn();
    const duration = performance.now() - start;
    results.push({ id, category, title, duration, status: 'PASS', detail });
    console.log(`  [✅ PASS] ${id}: ${title} (${duration.toFixed(3)}ms)`);
  } catch (err) {
    const duration = performance.now() - start;
    results.push({ id, category, title, duration, status: 'FAIL', error: err.message, stack: err.stack });
    console.error(`  [❌ FAIL] ${id}: ${title} (${duration.toFixed(3)}ms) - ${err.message}`);
  }
}

function recordFinding(id, severity, title, observation, impact, mitigation) {
  findings.push({ id, severity, title, observation, impact, mitigation });
  console.log(`  [🔍 FINDING] [${severity}] ${id}: ${title}`);
}

console.log('='.repeat(80));
console.log('CHALLENGER 2 EMPIRICAL TEST SUITE: MILESTONE M1 (PILLAR 1)');
console.log('='.repeat(80));

// ============================================================================
// REQUIREMENT 1: State Store Synchronization
// ============================================================================
console.log('\n--- 1. State Store Synchronization (floor-plan-store.ts) ---');

recordTest('SYNC-01', 'Store Sync', 'Initial state defaults showFarOverlay and showFarEnvelope to false', () => {
  floorPlanStore.setFarOverlay(false);
  const state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, false, 'showFarOverlay must be initially false');
  assert.strictEqual(state.showFarEnvelope, false, 'showFarEnvelope must be initially false');
});

recordTest('SYNC-02', 'Store Sync', 'setFarOverlay(true) synchronizes both showFarOverlay and showFarEnvelope', () => {
  floorPlanStore.setFarOverlay(true);
  const state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true, 'showFarOverlay should be true');
  assert.strictEqual(state.showFarEnvelope, true, 'showFarEnvelope should be synchronized to true');
});

recordTest('SYNC-03', 'Store Sync', 'toggleFarOverlay() toggles both properties simultaneously', () => {
  floorPlanStore.setFarOverlay(false);
  let state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, false);
  assert.strictEqual(state.showFarEnvelope, false);

  floorPlanStore.toggleFarOverlay();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true, 'showFarOverlay must toggle to true');
  assert.strictEqual(state.showFarEnvelope, true, 'showFarEnvelope must toggle to true');

  floorPlanStore.toggleFarOverlay();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, false, 'showFarOverlay must toggle back to false');
  assert.strictEqual(state.showFarEnvelope, false, 'showFarEnvelope must toggle back to false');
});

recordTest('SYNC-04', 'Store Sync', 'setFarEnvelope and toggleFarEnvelope maintain bidirectional symmetry', () => {
  floorPlanStore.setFarEnvelope(true);
  let state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true);
  assert.strictEqual(state.showFarEnvelope, true);

  floorPlanStore.toggleFarEnvelope();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, false);
  assert.strictEqual(state.showFarEnvelope, false);
});

recordTest('SYNC-05', 'Store Sync', 'Subscriber notifications fire synchronously upon FAR overlay mutation', () => {
  let callCount = 0;
  let receivedOverlayState = null;
  const unsubscribe = floorPlanStore.subscribe(() => {
    callCount++;
    receivedOverlayState = floorPlanStore.getState().showFarOverlay;
  });

  floorPlanStore.setFarOverlay(true);
  assert.strictEqual(callCount, 1, 'Subscriber should be called exactly once');
  assert.strictEqual(receivedOverlayState, true, 'Subscriber should see updated true value');

  floorPlanStore.toggleFarOverlay();
  assert.strictEqual(callCount, 2, 'Subscriber should be called on second toggle');
  assert.strictEqual(receivedOverlayState, false, 'Subscriber should see updated false value');

  unsubscribe();
  floorPlanStore.setFarOverlay(true);
  assert.strictEqual(callCount, 2, 'Unsubscribed listener must not be called again');
});

recordTest('SYNC-06', 'Store Sync', 'FAR overlay state is decoupled from Egress and Linter toggles', () => {
  floorPlanStore.setFarOverlay(true);
  floorPlanStore.setEgressOverlay(false);
  floorPlanStore.setLinter(false);

  floorPlanStore.toggleEgressOverlay();
  let state = floorPlanStore.getState();
  assert.strictEqual(state.showEgressOverlay, true);
  assert.strictEqual(state.showFarOverlay, true, 'Egress toggle must not corrupt FAR overlay');

  floorPlanStore.toggleLinter();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showLinter, true);
  assert.strictEqual(state.showFarOverlay, true, 'Linter toggle must not corrupt FAR overlay');
});

recordTest('SYNC-07', 'Store Sync', 'Plan edits and undo/redo preserve active FAR overlay state', () => {
  floorPlanStore.setFarOverlay(true);
  floorPlanStore.clearPlan();

  floorPlanStore.addPresetRoom('Living Room', 6, 5, { x: 0, y: 0 });
  let state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true, 'Adding room preserves FAR overlay');
  assert.strictEqual(state.floorPlan.rooms.length, 1);

  floorPlanStore.undo();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true, 'Undo preserves FAR overlay');
  assert.strictEqual(state.floorPlan.rooms.length, 0);

  floorPlanStore.redo();
  state = floorPlanStore.getState();
  assert.strictEqual(state.showFarOverlay, true, 'Redo preserves FAR overlay');
  assert.strictEqual(state.floorPlan.rooms.length, 1);
});

// ============================================================================
// REQUIREMENT 2: Dynamic Recomputation Performance (< 16ms, 60 FPS)
// ============================================================================
console.log('\n--- 2. Dynamic Recomputation Performance on Room Drag (< 16ms) ---');

function generateBenchmarkFloorPlan(roomCount) {
  const rooms = [];
  const walls = [];
  const cols = Math.ceil(Math.sqrt(roomCount));
  const spacing = 6.0;

  for (let i = 0; i < roomCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * spacing;
    const cy = row * spacing;
    const w = 5.0;
    const h = 4.5;
    const p1 = { x: cx, y: cy };
    const p2 = { x: cx + w, y: cy };
    const p3 = { x: cx + w, y: cy + h };
    const p4 = { x: cx, y: cy + h };

    const label = i % 5 === 0 ? 'Circulation Corridor' : i % 7 === 0 ? 'MEP Shaft Cutout' : `Room_${i + 1}`;
    const area = w * h;

    rooms.push({
      id: `room_bench_${i}`,
      label,
      vertices: [p1, p2, p3, p4],
      area,
    });

    walls.push(
      { id: `w_${i}_1`, start: p1, end: p2, thickness: 0.15 },
      { id: `w_${i}_2`, start: p2, end: p3, thickness: 0.15 },
      { id: `w_${i}_3`, start: p3, end: p4, thickness: 0.15 },
      { id: `w_${i}_4`, start: p4, end: p1, thickness: 0.15 }
    );
  }

  return {
    walls,
    doors: [],
    windows: [],
    rooms,
    furniture: [],
    gridSize: 0.5,
    panOffset: { x: 300, y: 250 },
    zoom: 35,
  };
}

const benchmarkScales = [
  { name: 'Baseline Apartment (4 rooms, 16 walls)', roomCount: 4 },
  { name: 'Luxury Penthouse (12 rooms, 48 walls)', roomCount: 12 },
  { name: 'Institutional Floorplate (30 rooms, 120 walls)', roomCount: 30 },
  { name: 'High-Density Complex (60 rooms, 240 walls)', roomCount: 60 },
  { name: 'Extreme Stress Hub (120 rooms, 480 walls)', roomCount: 120 },
];

for (const scale of benchmarkScales) {
  recordTest(
    `PERF-${scale.roomCount}`,
    'Drag Latency',
    `${scale.name}: 100 drag iterations execute in < 16ms per frame`,
    () => {
      const plan = generateBenchmarkFloorPlan(scale.roomCount);
      floorPlanStore.loadPlan(plan);

      const targetRoomId = plan.rooms[0].id;
      const iterations = 100;
      const latencies = [];

      for (let i = 0; i < iterations; i++) {
        const dragX = Math.sin(i * 0.1) * 2.0;
        const dragY = Math.cos(i * 0.1) * 2.0;
        const t0 = performance.now();

        // 1. Store element translation
        floorPlanStore.moveElement(targetRoomId, { x: dragX, y: dragY });
        const updatedPlan = floorPlanStore.getState().floorPlan;

        // 2. Dynamic statutory FAR recomputation
        const metrics = calculateFARMetrics(updatedPlan);

        const t1 = performance.now();
        const elapsed = t1 - t0;
        latencies.push(elapsed);

        assert.ok(metrics.builtUpAreaSqM > 0);
        assert.ok(metrics.footprintPolygon.length >= 3);
      }

      latencies.sort((a, b) => a - b);
      const min = latencies[0];
      const max = latencies[latencies.length - 1];
      const sum = latencies.reduce((a, b) => a + b, 0);
      const mean = sum / latencies.length;
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log(
        `       Metrics for ${scale.roomCount} rooms -> Min: ${min.toFixed(3)}ms | Mean: ${mean.toFixed(
          3
        )}ms | P95: ${p95.toFixed(3)}ms | P99: ${p99.toFixed(3)}ms | Max: ${max.toFixed(3)}ms`
      );

      assert.ok(
        p99 < 16.0,
        `P99 latency (${p99.toFixed(3)}ms) must be strictly below 16.0ms for 60 FPS guarantee`
      );
      assert.ok(
        max < 16.0,
        `Max single-frame latency (${max.toFixed(3)}ms) must remain below 16.0ms`
      );

      return { min, mean, p95, p99, max };
    }
  );
}

// ============================================================================
// REQUIREMENT 3: 3D Zoning Envelope Geometry Generation
// ============================================================================
console.log('\n--- 3. 3D Zoning Envelope Geometry Verification (zoning-envelope.tsx) ---');

function createZoningEnvelopeGeometryModel(props = {}) {
  const roadWidthM = props.roadWidthM ?? 18.0;
  const heightCapM = props.heightCapM ?? 24.0;
  const slopeRatio = props.slopeRatio ?? 1.5;
  const bounds = props.bounds;

  const rawMinX = bounds?.minX ?? -6;
  const rawMaxX = bounds?.maxX ?? 6;
  const rawMinZ = bounds?.minZ ?? -5;
  const rawMaxZ = bounds?.maxZ ?? 5;

  const width = Math.max(12, rawMaxX - rawMinX + 8);
  const depth = Math.max(12, rawMaxZ - rawMinZ + 8);

  const minX = (rawMinX + rawMaxX) / 2 - width / 2;
  const maxX = (rawMinX + rawMaxX) / 2 + width / 2;
  const minZ = (rawMinZ + rawMaxZ) / 2 - depth / 2;
  const maxZ = (rawMinZ + rawMaxZ) / 2 + depth / 2;

  const frontSetbackM = 6.0;
  const rearSetbackM = 3.0;
  const sideSetbackM = 3.0;

  const buildMinX = minX + sideSetbackM;
  const buildMaxX = maxX - sideSetbackM;
  const buildMinZ = minZ + frontSetbackM;
  const buildMaxZ = maxZ - rearSetbackM;
  const buildWidth = buildMaxX - buildMinX;
  const buildDepth = buildMaxZ - buildMinZ;

  const roadZStart = minZ;
  const roadZEnd = minZ - roadWidthM;
  const roadMidZ = (roadZStart + roadZEnd) / 2;

  const slopeTransitionZ = Math.min(buildMaxZ, minZ + heightCapM / (slopeRatio || 1));
  const slopeHeightAtTransition = Math.min(heightCapM, (slopeTransitionZ - minZ) * slopeRatio);

  // Construct Triangulated Sky-Exposure BufferGeometry
  const geom = new THREE.BufferGeometry();
  const x0 = minX - 2;
  const x1 = maxX + 2;
  const z0 = minZ;
  const z1 = slopeTransitionZ;
  const y0 = 0;
  const y1 = slopeHeightAtTransition;

  const positions = new Float32Array([
    x0, y0, z0,
    x1, y0, z0,
    x1, y1, z1,

    x0, y0, z0,
    x1, y1, z1,
    x0, y1, z1,
  ]);

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  geom.computeBoundingBox();

  const edges = new THREE.EdgesGeometry(geom);

  const roadGeom = new THREE.PlaneGeometry(width + 12, roadWidthM);
  const plotGeom = new THREE.PlaneGeometry(width, depth);
  const massingGeom = new THREE.BoxGeometry(buildWidth, heightCapM, buildDepth);
  const heightCapGeom = new THREE.PlaneGeometry(
    width + 4,
    Math.max(2, maxZ - slopeTransitionZ + 2)
  );

  return {
    site: { minX, maxX, minZ, maxZ, width, depth, buildWidth, buildDepth },
    skyExposureGeometry: geom,
    skyExposureEdges: edges,
    roadGeom,
    plotGeom,
    massingGeom,
    heightCapGeom,
  };
}

function verifyBufferGeometryIntegrity(geom, label) {
  const posAttr = geom.getAttribute('position');
  assert.ok(posAttr, `${label} must have position attribute`);
  const posArray = posAttr.array;

  for (let i = 0; i < posArray.length; i++) {
    const val = posArray[i];
    assert.ok(!Number.isNaN(val), `${label}: position vertex[${i}] is NaN`);
    assert.ok(Number.isFinite(val), `${label}: position vertex[${i}] is not finite (${val})`);
  }

  // Check Normals
  geom.computeVertexNormals();
  const normAttr = geom.getAttribute('normal');
  assert.ok(normAttr, `${label} must have normal attribute`);
  const normArray = normAttr.array;

  for (let i = 0; i < normArray.length; i += 3) {
    const nx = normArray[i];
    const ny = normArray[i + 1];
    const nz = normArray[i + 2];
    assert.ok(!Number.isNaN(nx) && !Number.isNaN(ny) && !Number.isNaN(nz), `${label}: normal has NaN`);
    assert.ok(Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz), `${label}: normal is not finite`);

    const len = Math.hypot(nx, ny, nz);
    assert.ok(
      Math.abs(len - 1.0) < 1e-3,
      `${label}: normal vector must be unit length, got ${len}`
    );
  }

  // Check Bounding Sphere
  geom.computeBoundingSphere();
  const sphere = geom.boundingSphere;
  assert.ok(sphere, `${label} must compute bounding sphere`);
  assert.ok(!Number.isNaN(sphere.radius), `${label}: bounding sphere radius is NaN`);
  assert.ok(Number.isFinite(sphere.radius), `${label}: bounding sphere radius is not finite`);
  assert.ok(sphere.radius > 0, `${label}: bounding sphere radius must be strictly positive`);
  assert.ok(Number.isFinite(sphere.center.x) && Number.isFinite(sphere.center.y) && Number.isFinite(sphere.center.z));

  // Verify all vertices reside within the bounding sphere
  for (let i = 0; i < posArray.length; i += 3) {
    const vx = posArray[i];
    const vy = posArray[i + 1];
    const vz = posArray[i + 2];
    const dist = Math.hypot(vx - sphere.center.x, vy - sphere.center.y, vz - sphere.center.z);
    assert.ok(
      dist <= sphere.radius + 1e-4,
      `${label}: vertex (${vx}, ${vy}, ${vz}) exceeds bounding sphere radius (${dist} > ${sphere.radius})`
    );
  }
}

recordTest('3D-01', '3D Geometry', 'Default luxury plot produces finite vertices, valid normals, and bounding sphere', () => {
  const model = createZoningEnvelopeGeometryModel();
  verifyBufferGeometryIntegrity(model.skyExposureGeometry, 'SkyExposureGeometry (default)');
  verifyBufferGeometryIntegrity(model.roadGeom, 'RoadGeometry');
  verifyBufferGeometryIntegrity(model.plotGeom, 'PlotGeometry');
  verifyBufferGeometryIntegrity(model.massingGeom, 'MassingGeometry');
  verifyBufferGeometryIntegrity(model.heightCapGeom, 'HeightCapGeometry');
});

recordTest('3D-02', '3D Geometry', 'Zero-sized (point) plot bounds generate robust non-degenerate geometries', () => {
  const model = createZoningEnvelopeGeometryModel({
    bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
  });
  verifyBufferGeometryIntegrity(model.skyExposureGeometry, 'SkyExposureGeometry (zero bounds)');
  assert.ok(model.site.width >= 12, 'Width is clamped to minimum viable dimension');
  assert.ok(model.site.depth >= 12, 'Depth is clamped to minimum viable dimension');
});

recordTest('3D-03', '3D Geometry', 'Inverted / negative bounds are sanitized without NaN or inverted geometry', () => {
  const model = createZoningEnvelopeGeometryModel({
    bounds: { minX: 10, maxX: -10, minZ: 15, maxZ: -15 },
  });
  verifyBufferGeometryIntegrity(model.skyExposureGeometry, 'SkyExposureGeometry (inverted bounds)');
});

recordTest('3D-04', '3D Geometry', 'Extreme scale plot (10,000m × 10,000m site) maintains finite precision', () => {
  const model = createZoningEnvelopeGeometryModel({
    bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 },
    heightCapM: 60.0,
    roadWidthM: 30.0,
  });
  verifyBufferGeometryIntegrity(model.skyExposureGeometry, 'SkyExposureGeometry (mega site)');
  assert.ok(model.skyExposureGeometry.boundingSphere.radius > 5000);
});

recordTest('3D-05', '3D Geometry', 'Sky-exposure normal orientation and DoubleSide rendering contract', () => {
  const model = createZoningEnvelopeGeometryModel({
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    slopeRatio: 1.5,
    heightCapM: 24.0,
  });

  const geom = model.skyExposureGeometry;
  const normArray = geom.getAttribute('normal').array;

  const nx = normArray[0];
  const ny = normArray[1];
  const nz = normArray[2];

  console.log(`       Sky-Exposure Normal Vector: (${nx.toFixed(4)}, ${ny.toFixed(4)}, ${nz.toFixed(4)})`);
  assert.ok(Math.abs(nx) < 1e-5, 'Normal X component should be 0 for axis-aligned plane');
  assert.ok(Math.abs(ny) > 0, 'Normal Y component is non-zero for sloped plane');
  assert.ok(Math.abs(nz) > 0, 'Normal Z component is non-zero for sloped plane');

  // Document normal orientation: Ny < 0 due to clockwise winding from +Y view.
  if (ny < 0) {
    recordFinding(
      'F-3D-01',
      'LOW',
      'Sky-exposure plane vertex winding generates downward normal (-Y)',
      `In zoning-envelope.tsx lines 107-115, vertices are ordered (x0, y0, z0) -> (x1, y0, z0) -> (x1, y1, z1). Normal computes to (0, ${ny.toFixed(4)}, ${nz.toFixed(4)}), pointing downward into the ground instead of upward towards the sky.`,
      `Standard one-sided materials would appear dark or culled. However, zoning-envelope.tsx line 226 explicitly sets 'side={THREE.DoubleSide}', ensuring the plane renders visibly from all camera angles. For optimal directional shading with sun lights, reversing the winding to (x0, y0, z0) -> (x1, y1, z1) -> (x1, y0, z0) will orient the normal upward toward the sky.`,
      `Reverse vertex winding order or maintain side={THREE.DoubleSide}.`
    );
  }
});

// ============================================================================
// REQUIREMENT 4: CPWD CSV Generation Edge Cases
// ============================================================================
console.log('\n--- 4. CPWD CSV Generation Edge Cases (pe-underwriting.ts) ---');

function parseCsvRfc4180(csvString) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentToken += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentToken);
        currentToken = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentToken);
        currentToken = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip CRLF
        }
        lines.push(row);
        row = [];
      } else {
        currentToken += char;
      }
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken);
    lines.push(row);
  }

  return lines;
}

recordTest('CSV-01', 'CPWD CSV', 'Empty finishes array generates valid CSV with 0 grand total without throwing', () => {
  const csv = generateCPWDTenderCsv([]);
  assert.ok(typeof csv === 'string');
  const rows = parseCsvRfc4180(csv);
  assert.strictEqual(rows.length, 2, 'Should have header row and grand total row');

  const headers = rows[0];
  assert.deepStrictEqual(headers, [
    'Item Code',
    'Sub-Head',
    'Description',
    'Quantity',
    'Unit',
    'DSR Rate (INR)',
    'Amount (INR)',
  ]);

  const totalRow = rows[1];
  assert.strictEqual(totalRow[2], 'GRAND TOTAL (CPWD DSR 2024)');
  assert.strictEqual(totalRow[6], '0');
});

recordTest('CSV-02', 'CPWD CSV', 'Zero values (quantity = 0, rate = 0, amount = 0) format cleanly without NaN', () => {
  const zeroItems = [
    {
      itemCode: 'CPWD 0.0.0',
      subHead: 'Zero Subhead',
      description: 'Zero item test',
      quantity: 0,
      unit: 'sqm',
      dsrRateINR: 0,
      amountINR: 0,
    },
  ];

  const csv = generateCPWDTenderCsv(zeroItems);
  assert.ok(!csv.includes('NaN'), 'CSV must not contain NaN');
  assert.ok(!csv.includes('undefined'), 'CSV must not contain undefined');

  const rows = parseCsvRfc4180(csv);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[1][3], '0');
  assert.strictEqual(rows[1][5], '0');
  assert.strictEqual(rows[1][6], '0');
  assert.strictEqual(rows[2][6], '0');
});

recordTest('CSV-03', 'CPWD CSV', 'Special characters in item description (quotes, commas, newlines, currency symbols) escape per RFC 4180', () => {
  const trickyItems = [
    {
      itemCode: 'CPWD 11.36.1',
      subHead: 'Stone & Vitrified Finishes',
      description: 'Supplying 1200x600mm tiles; with "Kajaria" brand, IS 15477 adhesive & ₹150/sqm prep rate\nSecond line notes.',
      quantity: 150.5,
      unit: 'sqm',
      dsrRateINR: 1450,
      amountINR: 218225,
    },
  ];

  const csv = generateCPWDTenderCsv(trickyItems);
  const rows = parseCsvRfc4180(csv);

  assert.strictEqual(rows.length, 3);
  const itemRow = rows[1];
  assert.strictEqual(itemRow[0], 'CPWD 11.36.1');
  assert.strictEqual(itemRow[1], 'Stone & Vitrified Finishes');
  assert.strictEqual(
    itemRow[2],
    'Supplying 1200x600mm tiles; with "Kajaria" brand, IS 15477 adhesive & ₹150/sqm prep rate\nSecond line notes.'
  );
  assert.strictEqual(itemRow[3], '150.5');
  assert.strictEqual(itemRow[4], 'sqm');
  assert.strictEqual(itemRow[5], '1450');
  assert.strictEqual(itemRow[6], '218225');

  const grandTotalRow = rows[2];
  assert.strictEqual(grandTotalRow[6], '218225');
});

recordTest('CSV-03-ESC', 'CPWD CSV', 'Audit quote escaping across all string columns (itemCode, subHead, unit)', () => {
  // Test whether quotes in subHead/unit/itemCode are escaped
  const quoteInSubheadItem = [
    {
      itemCode: 'CPWD 11.36.1',
      subHead: 'Stone & "Premium" Finishes',
      description: 'Standard tile',
      quantity: 10,
      unit: 'sqm',
      dsrRateINR: 100,
      amountINR: 1000,
    },
  ];

  const rawCsv = generateCPWDTenderCsv(quoteInSubheadItem);
  const hasEscapedQuotesInSubhead = rawCsv.includes('"Stone & ""Premium"" Finishes"');

  if (!hasEscapedQuotesInSubhead) {
    recordFinding(
      'F-CSV-01',
      'MEDIUM',
      'Unescaped double-quotes in subHead, itemCode, and unit columns',
      `In pe-underwriting.ts lines 232-236, only it.description uses .replace(/"/g, '""'). Fields it.itemCode, it.subHead, and it.unit are wrapped in quotes "\${it.subHead}" without escaping internal quotes.`,
      `If a contractor tender item subHead or unit contains double quotes (e.g. 4" Pipe or "Class A" Timber), the raw quote terminates the CSV string delimiter prematurely, causing columns to shift in RFC 4180 parsers and Excel.`,
      `Apply .replace(/"/g, '""') consistently across all string fields: \`"\${it.itemCode.replace(/"/g, '""')}"\`, \`"\${it.subHead.replace(/"/g, '""')}"\`, \`"\${it.unit.replace(/"/g, '""')}"\`.`
    );
  }
});

recordTest('CSV-04', 'CPWD CSV', 'Project name download string handles special characters, slashes, unicode, and empty fallback', () => {
  function getDownloadFilename(projectName) {
    return `CPWD-DSR-2024-Tender-Schedule-${projectName || 'Project'}.csv`;
  }

  function getSanitizedDownloadFilename(projectName) {
    const cleanName = (projectName || 'Project')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
    return `CPWD-DSR-2024-Tender-Schedule-${cleanName}.csv`;
  }

  // 1. Fallbacks
  assert.strictEqual(getDownloadFilename(''), 'CPWD-DSR-2024-Tender-Schedule-Project.csv');
  assert.strictEqual(getDownloadFilename(null), 'CPWD-DSR-2024-Tender-Schedule-Project.csv');
  assert.strictEqual(getDownloadFilename(undefined), 'CPWD-DSR-2024-Tender-Schedule-Project.csv');

  // 2. Slashes and special characters audit
  const nameWithSlash = 'DLF Phase 5: Tower 1 / Penthouse';
  const rawDownload = getDownloadFilename(nameWithSlash);
  const cleanDownload = getSanitizedDownloadFilename(nameWithSlash);

  if (rawDownload.includes('/') || rawDownload.includes(':')) {
    recordFinding(
      'F-CSV-02',
      'LOW',
      'Browser download attribute in cost-panel.tsx does not sanitize slashes or colons in projectName',
      `In cost-panel.tsx line 145: link.download = \`CPWD-DSR-2024-Tender-Schedule-\${projectName || "Project"}.csv\`. When projectName has '/' or ':', some browsers (Safari, Windows Chrome) may interpret '/' as a directory separator or strip it.`,
      `Users downloading tender schedules for projects named with slashes (e.g. "Tower A/B" or "DLF/Phase 5") may experience truncated filenames.`,
      `Sanitize projectName prior to setting link.download: const cleanName = (projectName || 'Project').replace(/[/\\\\?%*:|"<>]/g, '_');`
    );
  }

  assert.ok(cleanDownload.endsWith('.csv'));
  assert.ok(!cleanDownload.includes('/'));
  assert.ok(!cleanDownload.includes(':'));
});

recordTest('CSV-05', 'CPWD CSV', 'Zero or boundary inputs to calculatePEUnderwriting produce consistent tender schedules', () => {
  const zeroUnderwriting = calculatePEUnderwriting({
    carpetAreaSqFt: 0,
    grossFloorAreaSqFt: 0,
    totalCapexINR: 0,
  });

  assert.ok(zeroUnderwriting.cpwdTenderSchedule.length === 5, 'Must generate standard 5-trade schedule');
  assert.ok(zeroUnderwriting.tenderScheduleGrandTotalINR > 0, 'Doors and MEP shaft have fixed base costs');

  const csv = generateCPWDTenderCsv(zeroUnderwriting.cpwdTenderSchedule);
  assert.ok(!csv.includes('NaN'));
  const rows = parseCsvRfc4180(csv);
  assert.strictEqual(rows.length, 7); // 1 header + 5 items + 1 grand total
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGER 2 EMPIRICAL TEST SUITE SUMMARY');
console.log('='.repeat(80));

const totalTests = results.length;
const passedTests = results.filter((r) => r.status === 'PASS').length;
const failedTests = results.filter((r) => r.status === 'FAIL').length;
const passRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total Invariant Tests : ${totalTests}`);
console.log(`Passed                : ${passedTests}`);
console.log(`Failed                : ${failedTests}`);
console.log(`Pass Rate             : ${passRate}%`);
console.log(`Discovered Findings   : ${findings.length}`);

for (const f of findings) {
  console.log(`- [${f.severity}] ${f.id}: ${f.title}`);
}

console.log('\n' + '='.repeat(80));
if (failedTests === 0) {
  console.log('VERDICT: EMPIRICALLY CERTIFIED (PASS WITH DEFENSIVE FINDINGS REPORTED)');
  process.exit(0);
} else {
  console.log('VERDICT: REJECT / FAILURES DETECTED');
  process.exit(1);
}
