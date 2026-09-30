"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { FloorPlan } from "@/components/floor-plan-editor/types";
import {
  generateStructuralGrid,
  STRUCTURAL_DEFAULTS,
  type StructuralGridSpacing,
} from "@/lib/calculators/structural-grid-engine";
import { getWetCoreShaft } from "@/lib/calculators/egress-overlay-geometry";

export interface StructuralElementsProps {
  visible?: boolean;
  plan?: FloorPlan | null;
  spacing?: StructuralGridSpacing | string;
  floorToFloorHeightM?: number;
  slabThicknessM?: number;
  beamDepthM?: number;
  showShaft?: boolean;
  showBeams?: boolean;
  showColumns?: boolean;
}

/**
 * Renders Pillar 2 Structural Bay Grid & 3D MEP BIM Coordination in Three.js / WebGL:
 * 1. Reinforced concrete columns at grid intersections (400×400mm interior, 450×600mm corner/shear)
 * 2. Concrete beam drop profiles (450mm deep) spanning along grid lines under the ceiling slab
 * 3. Continuous vertical 300×300mm MEP wet core shaft extending from y = -0.6m to y = +3.8m
 * 4. Internal plumbing pipe geometry (soil/waste stack, vent pipe, water risers)
 */
export function StructuralElements({
  visible = true,
  plan,
  spacing = "6.0x6.0",
  floorToFloorHeightM = STRUCTURAL_DEFAULTS.DEFAULT_FLOOR_TO_FLOOR_M, // 3.40m
  slabThicknessM = STRUCTURAL_DEFAULTS.DEFAULT_SLAB_THICKNESS_M,       // 0.20m
  beamDepthM = STRUCTURAL_DEFAULTS.BEAM_EFFECTIVE_DEPTH_M,             // 0.45m
  showShaft = true,
  showBeams = true,
  showColumns = true,
}: StructuralElementsProps) {
  // Normalized bay spacing
  const normSpacing: StructuralGridSpacing =
    spacing === "6.0x7.2" || spacing === "6x7.2"
      ? "6.0x7.2"
      : spacing === "7.2x7.2"
      ? "7.2x7.2"
      : "6.0x6.0";

  // Compute structural grid, columns, and beam profiles
  const gridData = useMemo(() => {
    return generateStructuralGrid(plan, normSpacing, floorToFloorHeightM);
  }, [plan, normSpacing, floorToFloorHeightM]);

  // Locate the dedicated vertical MEP wet core shaft
  const wetCore = useMemo(() => {
    return getWetCoreShaft(plan);
  }, [plan]);

  // Elevation calculations
  // Floor level is y = 0
  // Underside of ceiling slab is y = floorToFloorHeightM - slabThicknessM (e.g. 3.40 - 0.20 = 3.20m)
  // Beam center elevation: y = 3.20 - beamDepthM / 2 (e.g. 3.20 - 0.225 = 2.975m)
  const ceilingUndersideY = floorToFloorHeightM - slabThicknessM;
  const beamCenterY = ceilingUndersideY - beamDepthM / 2;
  const columnCenterY = floorToFloorHeightM / 2;

  // Materials
  const concreteMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#888d92"),
      roughness: 0.90,
      metalness: 0.08,
    });
  }, []);

  const cornerConcreteMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#6b7280"),
      roughness: 0.88,
      metalness: 0.12,
    });
  }, []);

  const beamMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#7b8086"),
      roughness: 0.92,
      metalness: 0.06,
    });
  }, []);

  // MEP Shaft materials
  const shaftCasingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0284c7"), // Cyan/blue
      transparent: true,
      opacity: 0.25,
      roughness: 0.3,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const firestopSleeveMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#dc2626"), // Crimson intumescent collar
      roughness: 0.5,
      metalness: 0.4,
    });
  }, []);

  const soilStackMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1e293b"), // Cast iron black/slate
      roughness: 0.7,
      metalness: 0.6,
    });
  }, []);

  const ventPipeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0ea5e9"), // PVC sky blue
      roughness: 0.4,
      metalness: 0.2,
    });
  }, []);

  const hotWaterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ef4444"), // Red CPVC
      roughness: 0.3,
      metalness: 0.4,
    });
  }, []);

  const coldWaterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3b82f6"), // Blue CPVC
      roughness: 0.3,
      metalness: 0.4,
    });
  }, []);

  // Shaft physical dimensions: continuous from y = -0.6m to y = +3.8m
  const shaftBottomY = -0.6;
  const shaftTopY = 3.8;
  const shaftHeight = shaftTopY - shaftBottomY; // 4.4m
  const shaftCenterY = (shaftBottomY + shaftTopY) / 2; // 1.6m

  const shaftWorldX = wetCore.x + wetCore.width / 2;
  const shaftWorldZ = wetCore.y + (wetCore.depth || wetCore.height || 0.3) / 2;

  if (!visible) return null;

  return (
    <group name="structural-elements-bim">
      {/* 1. Reinforced Concrete Columns at Grid Intersections */}
      {showColumns && (
        <group name="rc-columns">
          {gridData.columns.map((col, idx) => {
            // In 3D: world X = col.position.x, world Z = col.position.y
            const isCorner = col.isCorner;
            const w = col.widthM; // 0.40m or 0.45m
            const d = col.depthM; // 0.40m or 0.60m

            return (
              <group key={col.id || `col-${idx}`} position={[col.position.x, columnCenterY, col.position.y]}>
                <mesh
                  castShadow
                  receiveShadow
                  material={isCorner ? cornerConcreteMaterial : concreteMaterial}
                >
                  <boxGeometry args={[w, floorToFloorHeightM, d]} />
                </mesh>

                {/* Base Plinth Kick */}
                <mesh position={[0, -columnCenterY + 0.05, 0]}>
                  <boxGeometry args={[w + 0.04, 0.1, d + 0.04]} />
                  <meshStandardMaterial color="#475569" roughness={0.9} />
                </mesh>

                {/* Statutory Column Tag on first corner and center columns */}
                {idx === 0 && (
                  <Html position={[0, 1.2, d / 2 + 0.1]} center distanceFactor={12}>
                    <div className="rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-md border border-indigo-500 whitespace-nowrap pointer-events-none">
                      🏛️ {col.gridRef} ({Math.round(w * 1000)}×{Math.round(d * 1000)}mm RC Column)
                    </div>
                  </Html>
                )}
              </group>
            );
          })}
        </group>
      )}

      {/* 2. Concrete Beam Drop Profiles (450mm deep) spanning along grid lines */}
      {showBeams && (
        <group name="rc-beam-drops">
          {gridData.beams.map((beam) => {
            const midX = (beam.start.x + beam.end.x) / 2;
            const midZ = (beam.start.y + beam.end.y) / 2;
            const len = beam.lengthM;
            const isAlongX = beam.axis === "X"; // beam spans horizontally in X

            // Dimension args: [sizeX, sizeY, sizeZ]
            const args: [number, number, number] = isAlongX
              ? [len, beamDepthM, beam.widthM]
              : [beam.widthM, beamDepthM, len];

            return (
              <group key={beam.id} position={[midX, beamCenterY, midZ]}>
                <mesh castShadow receiveShadow material={beamMaterial}>
                  <boxGeometry args={args} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 3. Continuous Vertical 300×300mm MEP Wet Core Shaft (y = -0.6m to y = +3.8m) */}
      {showShaft && (
        <group name="mep-wet-core-shaft" position={[shaftWorldX, 0, shaftWorldZ]}>
          {/* Semi-Translucent Protective Shaft Casing */}
          <mesh position={[0, shaftCenterY, 0]} material={shaftCasingMaterial}>
            <boxGeometry args={[0.30, shaftHeight, 0.30]} />
          </mesh>

          {/* Intumescent Firestop Collar Sleeves at Floor Slabs (y = 0.0m and y = 3.2m) */}
          <mesh position={[0, 0.0, 0]} material={firestopSleeveMaterial}>
            <boxGeometry args={[0.34, 0.22, 0.34]} />
          </mesh>
          <mesh position={[0, ceilingUndersideY, 0]} material={firestopSleeveMaterial}>
            <boxGeometry args={[0.34, 0.22, 0.34]} />
          </mesh>

          {/* Internal Plumbing Pipe Geometry: */}
          {/* A. 100mm Cast Iron Soil & Waste Stack */}
          <mesh position={[-0.06, shaftCenterY, -0.06]} material={soilStackMaterial} castShadow>
            <cylinderGeometry args={[0.05, 0.05, shaftHeight, 16]} />
          </mesh>

          {/* B. 75mm PVC Vent & Relief Stack */}
          <mesh position={[0.06, shaftCenterY, -0.06]} material={ventPipeMaterial} castShadow>
            <cylinderGeometry args={[0.038, 0.038, shaftHeight, 16]} />
          </mesh>

          {/* C. 25mm Hot Water Supply Riser */}
          <mesh position={[-0.06, shaftCenterY, 0.06]} material={hotWaterMaterial}>
            <cylinderGeometry args={[0.015, 0.015, shaftHeight, 12]} />
          </mesh>

          {/* D. 25mm Cold Water Supply Riser */}
          <mesh position={[0.06, shaftCenterY, 0.06]} material={coldWaterMaterial}>
            <cylinderGeometry args={[0.015, 0.015, shaftHeight, 12]} />
          </mesh>

          {/* Shaft BIM Annotation Billboard */}
          <Html position={[0, 2.2, 0.2]} center distanceFactor={10}>
            <div className="rounded bg-sky-950/95 px-2 py-1 font-mono text-[9px] font-bold text-sky-200 shadow-xl border border-sky-400 whitespace-nowrap pointer-events-none">
              <span className="text-amber-300">🚿 MEP WET CORE RISER</span>
              <div className="text-[8px] font-normal text-sky-300">
                300×300mm Continuous Shaft (-0.6m to +3.8m) | Soil, Waste & Vent Stack
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

export { StructuralElements as StructuralBimScene };
