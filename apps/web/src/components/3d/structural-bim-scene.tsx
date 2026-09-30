"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { generateStructuralGrid, type StructuralGridSpacing } from "@/lib/calculators/structural-grid-engine";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

export interface StructuralBimSceneProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  spacing?: StructuralGridSpacing;
  floorToFloorHeightM?: number; // default 3.4m
  showPlenumPreview?: boolean;
}

/**
 * Pillar 2: 3D Structural Bay Grid & MEP BIM Coordination
 * Renders:
 * 1. Concrete Columns (RC 400x400 interior, 450x600 corner) with chamfers
 * 2. Beam Drop Profiles (450mm depth) spanning column grid lines
 * 3. Continuous 300x300mm Vertical MEP Wet Core Shaft through slabs
 * 4. False Ceiling Plenum Void preview (450mm zone preserving >=2.75m habitable height)
 * 5. Statutory 3D Billboard Badges citing IS 456 / IS 1893 Zone IV / NBC Part 3
 */
export function StructuralBimScene({
  visible = true,
  floorPlan,
  spacing = "6.0x7.2",
  floorToFloorHeightM = 3.40,
  showPlenumPreview = true,
}: StructuralBimSceneProps) {
  if (!visible) return null;

  const gridData = useMemo(() => {
    return generateStructuralGrid(floorPlan, spacing, floorToFloorHeightM);
  }, [floorPlan, spacing, floorToFloorHeightM]);

  const { columns, gridLinesX, gridLinesY, plenumCheck } = gridData;

  const columnHeight = floorToFloorHeightM;
  const beamDepth = 0.45;
  const beamWidth = 0.30;
  const slabThickness = 0.20;
  const plenumDepth = 0.45;
  const clearHabitableHeight = floorToFloorHeightM - slabThickness - plenumDepth;

  // Wet core riser position (placed near central column)
  const wetCorePos = useMemo(() => {
    if (columns.length > 0) {
      const centerCol = columns[Math.floor(columns.length / 2)];
      return { x: centerCol.position.x + 0.8, z: centerCol.position.y + 0.8 };
    }
    return { x: 0, z: 0 };
  }, [columns]);

  return (
    <group name="structural-bim-scene">
      {/* 1. Structural RC Concrete Columns */}
      {columns.map((col) => {
        const isCorner = col.isCorner;
        const w = col.widthM;
        const d = col.depthM;
        const x = col.position.x;
        const z = col.position.y;
        const y = columnHeight / 2;

        return (
          <group key={col.id} position={[x, y, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[w, columnHeight, d]} />
              <meshStandardMaterial
                color={isCorner ? "#94a3b8" : "#cbd5e1"}
                roughness={0.85}
                metalness={0.1}
              />
            </mesh>

            {/* Column Rebar Starters at Top */}
            <mesh position={[0, columnHeight / 2 + 0.2, 0]}>
              <boxGeometry args={[w * 0.7, 0.4, d * 0.7]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Structural Continuous Beam Drop Profiles */}
      {gridLinesX.map((gx) => {
        if (gridLinesY.length < 2) return null;
        const minY = gridLinesY[0].coordM;
        const maxY = gridLinesY[gridLinesY.length - 1].coordM;
        const length = Math.abs(maxY - minY);
        const midZ = (minY + maxY) / 2;
        const beamY = floorToFloorHeightM - slabThickness - beamDepth / 2;

        return (
          <mesh
            key={`beam_x_${gx.id}`}
            position={[gx.coordM, beamY, midZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[beamWidth, beamDepth, length]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} metalness={0.15} />
          </mesh>
        );
      })}

      {gridLinesY.map((gy) => {
        if (gridLinesX.length < 2) return null;
        const minX = gridLinesX[0].coordM;
        const maxX = gridLinesX[gridLinesX.length - 1].coordM;
        const length = Math.abs(maxX - minX);
        const midX = (minX + maxX) / 2;
        const beamY = floorToFloorHeightM - slabThickness - beamDepth / 2;

        return (
          <mesh
            key={`beam_y_${gy.id}`}
            position={[midX, beamY, gy.coordM]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, beamDepth, beamWidth]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} metalness={0.15} />
          </mesh>
        );
      })}

      {/* 3. Continuous 300×300mm Vertical MEP Wet Core Shaft */}
      <group position={[wetCorePos.x, columnHeight / 2, wetCorePos.z]}>
        {/* Shaft Masonry / Fire Enclosure (Translucent cutaway) */}
        <mesh>
          <boxGeometry args={[0.60, columnHeight + 0.8, 0.60]} />
          <meshStandardMaterial
            color="#0284c7"
            transparent
            opacity={0.25}
            roughness={0.3}
            wireframe={false}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.60, columnHeight + 0.8, 0.60)]} />
          <lineBasicMaterial color="#38bdf8" linewidth={2} />
        </lineSegments>

        {/* 110mm Soil & Waste Riser Pipe (PVC Blue) */}
        <mesh position={[-0.12, 0, -0.12]}>
          <cylinderGeometry args={[0.055, 0.055, columnHeight + 1.2, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* 75mm Rainwater / Vent Pipe (Dark Grey) */}
        <mesh position={[0.12, 0, -0.12]}>
          <cylinderGeometry args={[0.038, 0.038, columnHeight + 1.2, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.1} />
        </mesh>

        {/* 50mm Copper Hot/Cold Water Potable Supply Riser */}
        <mesh position={[0, 0, 0.14]}>
          <cylinderGeometry args={[0.025, 0.025, columnHeight + 1.2, 16]} />
          <meshStandardMaterial color="#b45309" roughness={0.2} metalness={0.9} />
        </mesh>

        {/* 3D Billboard Tag for MEP Shaft */}
        <Html position={[0, columnHeight / 2 + 0.6, 0]} center distanceFactor={14}>
          <div className="rounded-md bg-sky-950/90 border border-sky-400 px-2 py-1 text-[10px] font-mono text-sky-200 shadow-lg whitespace-nowrap pointer-events-none">
            <span className="font-bold text-sky-400">💧 Continuous MEP Core</span>
            <span className="block text-[9px] text-sky-300">300×300mm Riser [IS 12183]</span>
          </div>
        </Html>
      </group>

      {/* 4. False Ceiling Plenum Void Preview (450mm HVAC Zone) */}
      {showPlenumPreview && (
        <group position={[0, floorToFloorHeightM - slabThickness - plenumDepth / 2, 0]}>
          {/* Translucent Plenum Zone Volume */}
          <mesh>
            <boxGeometry args={[14, plenumDepth, 10]} />
            <meshStandardMaterial
              color="#f59e0b"
              transparent
              opacity={0.08}
              roughness={0.5}
            />
          </mesh>

          {/* Ducted VRV HVAC Trunk Duct (Silver Sheet Metal) */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[12, 0.25, 0.40]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Habitable Height / Plenum Clearance Billboard */}
          <Html position={[0, -0.3, 0]} center distanceFactor={15}>
            <div className="rounded-md bg-slate-900/90 border border-amber-400 px-2.5 py-1 text-[10px] font-mono text-amber-200 shadow-xl whitespace-nowrap pointer-events-none">
              <span className="font-bold text-amber-400">📐 False Ceiling Plenum: 450mm Void</span>
              <span className="block text-[9px] text-slate-300">
                Clear Height {clearHabitableHeight.toFixed(2)}m ≥ 2.75m [NBC Part 3 Cl. 12.2]
              </span>
            </div>
          </Html>
        </group>
      )}

      {/* 5. Structural Column Tag on Key Corner Column */}
      {columns.length > 0 && (
        <Html
          position={[columns[0].position.x, columnHeight + 0.4, columns[0].position.y]}
          center
          distanceFactor={14}
        >
          <div className="rounded-md bg-slate-950/90 border border-indigo-400 px-2 py-1 text-[10px] font-mono text-indigo-200 shadow-lg whitespace-nowrap pointer-events-none">
            <span className="font-bold text-indigo-400">🏛️ RC Column C35/45</span>
            <span className="block text-[9px] text-slate-300">IS 456 / IS 1893 Zone IV</span>
          </div>
        </Html>
      )}
    </group>
  );
}
