"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

export interface ConstructionPhasingSliderProps {
  currentDay: number;
  onDayChange: (day: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onClose?: () => void;
}

/**
 * 4D Construction Phasing Slider HUD
 * Bottom-anchored control bar with timeline scrubber (Day 0 to 90),
 * Play/Pause auto-scrubber, 4-phase synchronization badge,
 * and Value Engineering compression indicator chip.
 */
export function ConstructionPhasingSlider({
  currentDay,
  onDayChange,
  isPlaying = false,
  onTogglePlay,
  onClose,
}: ConstructionPhasingSliderProps) {
  // 4-Phase Synchronization Metadata
  const phaseMetadata = useMemo(() => {
    if (currentDay <= 25) {
      return {
        phase: 1,
        name: "Phase 1: Substructure & Frame",
        window: "Days 0–25",
        color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
        description: "Foundation slab, RC columns, beam drops & tower crane",
        progress: Math.round((currentDay / 25) * 100),
      };
    } else if (currentDay <= 50) {
      return {
        phase: 2,
        name: "Phase 2: MEP Wet Core & Framing",
        window: "Days 26–50",
        color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
        description: "Continuous MEP wet core shaft, steel studs & duct rough-ins",
        progress: Math.round(((currentDay - 25) / 25) * 100),
      };
    } else if (currentDay <= 75) {
      return {
        phase: 3,
        name: "Phase 3: Architectural Enclosure",
        window: "Days 51–75",
        color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
        description: "STC 56 drywall, ceiling grid, Kota stone flooring & acoustic panelling",
        progress: Math.round(((currentDay - 50) / 25) * 100),
      };
    } else {
      return {
        phase: 4,
        name: "Phase 4: Turnkey Commissioning",
        window: "Days 76–90",
        color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
        description: "Turnkey handover, FF&E, circadian lighting & emergency exit signs",
        progress: Math.round(((currentDay - 75) / 15) * 100),
      };
    }
  }, [currentDay]);

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl rounded-2xl bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl border border-purple-500/40 text-foreground transition-all"
      style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7), 0 0 20px rgba(168, 85, 247, 0.15)" }}
    >
      {/* Top Header: Phase Badge, Title & VE Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 text-sm font-bold">
            4D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground tracking-wide">
                4D EPC Construction Phasing
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${phaseMetadata.color}`}>
                {phaseMetadata.name} ({phaseMetadata.window})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{phaseMetadata.description}</p>
          </div>
        </div>

        {/* VE Compressed Indicator Chip */}
        <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-500/40 rounded-full px-2.5 py-1 text-[10px] font-mono text-amber-200">
          <span className="text-amber-400">⚡</span>
          <span className="font-semibold">VE Compressed:</span>
          <span>-14 Wks Lead Time | Kota Stone On-Site</span>
        </div>
      </div>

      {/* Middle: Controls & Scrubbing Slider */}
      <div className="mt-3 flex items-center gap-3">
        {/* Play/Pause Button */}
        {onTogglePlay && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-md transition-all shrink-0"
            title={isPlaying ? "Pause timeline" : "Play 4D construction sequence"}
          >
            {isPlaying ? (
              <span className="text-sm">⏸</span>
            ) : (
              <span className="text-sm ml-0.5">▶</span>
            )}
          </button>
        )}

        {/* Interactive Slider */}
        <div className="flex-1 relative flex flex-col justify-center">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>Day 0 (Site Handover)</span>
            <span className="text-purple-300 font-bold bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded">
              Day {currentDay} / 90 ({phaseMetadata.progress}% of {phaseMetadata.name.split(":")[0]})
            </span>
            <span>Day 90 (Handover)</span>
          </div>

          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={currentDay}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-purple-500 cursor-pointer transition-all"
          />

          {/* Phase Markers along the track */}
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-1">
            <span
              onClick={() => onDayChange(12)}
              className="cursor-pointer hover:text-amber-400 transition-colors"
              title="Jump to Phase 1"
            >
              • Phase 1 (0–25d)
            </span>
            <span
              onClick={() => onDayChange(38)}
              className="cursor-pointer hover:text-cyan-400 transition-colors"
              title="Jump to Phase 2"
            >
              • Phase 2 (26–50d)
            </span>
            <span
              onClick={() => onDayChange(63)}
              className="cursor-pointer hover:text-emerald-400 transition-colors"
              title="Jump to Phase 3"
            >
              • Phase 3 (51–75d)
            </span>
            <span
              onClick={() => onDayChange(85)}
              className="cursor-pointer hover:text-purple-400 transition-colors"
              title="Jump to Phase 4"
            >
              • Phase 4 (76–90d)
            </span>
          </div>
        </div>

        {/* Close Button if provided */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors shrink-0"
            title="Hide Phasing Bar"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export interface ConstructionPhasing3DProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  currentDay?: number;
}

/**
 * 3D WebGL Construction Phasing Scene
 * Synchronized with 4 phases:
 * - Days 0–25: Foundation slab, RC columns, beam drops, rebar cages, tower crane
 * - Days 26–50: Continuous MEP wet core shaft, steel studs, duct rough-ins
 * - Days 51–75: STC 56 drywall, ceiling grid, stone flooring, acoustic panelling
 * - Days 76–90: Turnkey handover, FF&E, circadian lighting, emergency exit signs
 */
export function ConstructionPhasing3D({
  visible = true,
  floorPlan,
  currentDay = 90,
}: ConstructionPhasing3DProps) {
  if (!visible) return null;

  // Compute building bounds from floor plan walls
  const bounds = useMemo(() => {
    let minX = -6, maxX = 6, minZ = -5, maxZ = 5;
    if (floorPlan?.walls && floorPlan.walls.length > 0) {
      let pMinX = Infinity, pMaxX = -Infinity, pMinZ = Infinity, pMaxZ = -Infinity;
      for (const w of floorPlan.walls) {
        pMinX = Math.min(pMinX, w.start.x, w.end.x);
        pMaxX = Math.max(pMaxX, w.start.x, w.end.x);
        pMinZ = Math.min(pMinZ, w.start.y, w.end.y);
        pMaxZ = Math.max(pMaxZ, w.start.y, w.end.y);
      }
      if (pMinX < pMaxX && pMinZ < pMaxZ) {
        minX = pMinX;
        maxX = pMaxX;
        minZ = pMinZ;
        maxZ = pMaxZ;
      }
    }
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    return { minX, maxX, minZ, maxZ, width, depth, centerX, centerZ };
  }, [floorPlan]);

  const { minX, maxX, minZ, maxZ, width, depth, centerX, centerZ } = bounds;

  // Phase boolean triggers
  const showPhase1 = true; // Foundation is permanent once poured
  const showTowerCrane = currentDay < 50;
  const showPhase2MEP = currentDay >= 26;
  const showPhase3Finishes = currentDay >= 51;
  const showPhase4Turnkey = currentDay >= 76;

  // Column grid locations
  const columnPositions = useMemo(() => {
    const cols: [number, number, boolean][] = [
      [minX, minZ, true],
      [maxX, minZ, true],
      [minX, maxZ, true],
      [maxX, maxZ, true],
    ];
    if (width > 5) {
      cols.push([centerX, minZ, false]);
      cols.push([centerX, maxZ, false]);
    }
    if (depth > 5) {
      cols.push([minX, centerZ, false]);
      cols.push([maxX, centerZ, false]);
      if (width > 5) {
        cols.push([centerX, centerZ, false]);
      }
    }
    return cols;
  }, [minX, maxX, minZ, maxZ, width, depth, centerX, centerZ]);

  return (
    <group name="construction-phasing-3d">
      {/* ========================================================================= */}
      {/* PHASE 1 (Days 0–25): Substructure, Columns & Beam Drops                    */}
      {/* ========================================================================= */}
      {showPhase1 && (
        <group name="phase-1-substructure">
          {/* Foundation Slab */}
          <mesh position={[centerX, -0.10, centerZ]} receiveShadow>
            <boxGeometry args={[width + 1.6, 0.20, depth + 1.6]} />
            <meshStandardMaterial
              color={currentDay < 15 ? "#64748b" : "#94a3b8"}
              roughness={0.85}
              metalness={0.1}
            />
          </mesh>

          {/* Reinforced Concrete Columns */}
          {columnPositions.map(([colX, colZ, isCorner], idx) => {
            const colW = isCorner ? 0.45 : 0.40;
            const colD = isCorner ? 0.60 : 0.40;
            const colH = currentDay < 15 ? 1.5 : 3.0;
            return (
              <group key={`col-${idx}`} position={[colX, colH / 2, colZ]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[colW, colH, colD]} />
                  <meshStandardMaterial
                    color={isCorner ? "#334155" : "#475569"}
                    roughness={0.8}
                  />
                </mesh>
                {/* Rebar Starter Dowels for Day < 20 */}
                {currentDay < 20 && (
                  <mesh position={[0, colH / 2 + 0.3, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
                    <meshStandardMaterial color="#b45309" roughness={0.5} metalness={0.8} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* Concrete Beam Drops (Days 16+) */}
          {currentDay >= 16 && (
            <group name="beam-drops" position={[centerX, 2.8, centerZ]}>
              <mesh castShadow>
                <boxGeometry args={[width, 0.45, 0.35]} />
                <meshStandardMaterial color="#475569" roughness={0.75} />
              </mesh>
              <mesh castShadow>
                <boxGeometry args={[0.35, 0.45, depth]} />
                <meshStandardMaterial color="#475569" roughness={0.75} />
              </mesh>
            </group>
          )}

          {/* Tower Crane & Staging Site Yard (Days 0–50) */}
          {showTowerCrane && (
            <group position={[maxX + 3.0, 0, minZ - 2.0]}>
              {/* Crane Mast */}
              <mesh position={[0, 4.5, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 9, 8]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Crane Jib */}
              <mesh position={[-2.5, 9, 0]} castShadow>
                <boxGeometry args={[7, 0.35, 0.35]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Crane Counterweight */}
              <mesh position={[1.5, 9, 0]} castShadow>
                <boxGeometry args={[1.5, 0.6, 0.5]} />
                <meshStandardMaterial color="#1e293b" roughness={0.9} />
              </mesh>
              {/* Rebar bundles on ground */}
              <mesh position={[-1.2, 0.2, 1.2]} castShadow>
                <boxGeometry args={[1.8, 0.4, 0.8]} />
                <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2 (Days 26–50): Continuous MEP Wet Core & Steel Stud Framing         */}
      {/* ========================================================================= */}
      {showPhase2MEP && (
        <group name="phase-2-mep-studs">
          {/* Vertical Continuous 300x300 MEP Shaft */}
          <group position={[minX + 2.0, 1.5, minZ + 2.0]}>
            <mesh castShadow>
              <boxGeometry args={[0.30, 3.2, 0.30]} />
              <meshStandardMaterial
                color="#0284c7"
                roughness={0.3}
                metalness={0.6}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Horizontal Duct Rough-Ins */}
            <mesh position={[0.8, 1.2, 0]}>
              <boxGeometry args={[1.4, 0.25, 0.25]} />
              <meshStandardMaterial color="#06b6d4" roughness={0.4} metalness={0.5} />
            </mesh>
            <Html position={[0, 2.0, 0]} center distanceFactor={12}>
              <div className="rounded bg-sky-950/90 border border-sky-400/60 px-2 py-0.5 text-[9px] font-mono text-sky-200 shadow whitespace-nowrap pointer-events-none">
                300×300 MEP Wet Core (IS 456 / NBC)
              </div>
            </Html>
          </group>

          {/* Steel Stud Wall Framing (Silver vertical framing tracks) */}
          <group name="metal-stud-framing" position={[centerX, 1.5, centerZ]}>
            {[-1.5, 0, 1.5].map((off, i) => (
              <mesh key={`stud-${i}`} position={[off, 0, 0]} castShadow>
                <boxGeometry args={[0.05, 2.9, 0.05]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
          </group>

          {/* Staging Pallets of Domestic Kota Stone (VE Substitution) */}
          <group position={[minX - 2.5, 0.25, maxZ + 1.2]}>
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[1.3, 0.15, 1.3]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[1.1, 0.45, 1.1]} />
              <meshStandardMaterial color="#6b7280" roughness={0.7} />
            </mesh>
            <Html position={[0, 0.7, 0]} center distanceFactor={10}>
              <div className="rounded bg-amber-950/90 border border-amber-500/60 px-2 py-0.5 text-[9px] font-mono text-amber-200 shadow whitespace-nowrap pointer-events-none">
                ⚡ Kota Stone (-14 Wks VE Compressed)
              </div>
            </Html>
          </group>
        </group>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3 (Days 51–75): STC 56 Drywall, Ceiling Grid & Stone Flooring        */}
      {/* ========================================================================= */}
      {showPhase3Finishes && (
        <group name="phase-3-finishes">
          {/* Kota Stone Polished Flooring Layer */}
          <mesh position={[centerX, 0.02, centerZ]} receiveShadow>
            <boxGeometry args={[width, 0.04, depth]} />
            <meshStandardMaterial
              color="#525e54"
              roughness={0.25}
              metalness={0.2}
            />
          </mesh>

          {/* STC 56 Acoustic Drywall Partition */}
          <mesh position={[centerX, 1.45, centerZ - 0.8]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.7, 2.8, 0.15]} />
            <meshStandardMaterial
              color="#e2e8f0"
              roughness={0.8}
            />
          </mesh>

          {/* Suspended False Ceiling Plenum Grid (450mm void, clear height >= 2.75m) */}
          <group position={[centerX, 2.75, centerZ]}>
            <mesh>
              <boxGeometry args={[width * 0.95, 0.05, depth * 0.95]} />
              <meshStandardMaterial
                color="#f8fafc"
                roughness={0.9}
                transparent
                opacity={0.35}
              />
            </mesh>
          </group>

          {/* Acoustic Timber Panelling (IS 287 EMC 8-12%) */}
          <mesh position={[minX + 0.1, 1.4, centerZ]} castShadow>
            <boxGeometry args={[0.08, 2.6, depth * 0.5]} />
            <meshStandardMaterial
              color="#92400e"
              roughness={0.65}
            />
          </mesh>
        </group>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4 (Days 76–90): Turnkey Handover, FF&E, Lighting & Exit Signs       */}
      {/* ========================================================================= */}
      {showPhase4Turnkey && (
        <group name="phase-4-turnkey">
          {/* Executive Conference Table & Chairs */}
          <group position={[centerX, 0.45, centerZ]}>
            {/* Tabletop */}
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[2.4, 0.08, 1.2]} />
              <meshStandardMaterial color="#451a03" roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Table Base */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[1.6, 0.65, 0.6]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.7} />
            </mesh>
          </group>

          {/* Circadian Architectural Linear Lighting */}
          <mesh position={[centerX, 2.70, centerZ]}>
            <boxGeometry args={[2.0, 0.05, 0.15]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#fef08a"
              emissiveIntensity={1.2}
            />
          </mesh>
          <pointLight
            position={[centerX, 2.60, centerZ]}
            intensity={1.5}
            color="#fffbeb"
            distance={6}
          />

          {/* Statutory Green Emergency Exit Sign (NBC Part 4) */}
          <group position={[minX + 0.2, 2.2, minZ + 0.2]}>
            <mesh>
              <boxGeometry args={[0.35, 0.15, 0.04]} />
              <meshStandardMaterial
                color="#059669"
                emissive="#10b981"
                emissiveIntensity={1.8}
              />
            </mesh>
            <Html position={[0, 0.2, 0]} center distanceFactor={8}>
              <div className="rounded bg-emerald-950/90 border border-emerald-400 px-1.5 py-0.5 text-[8px] font-mono text-emerald-200 shadow whitespace-nowrap pointer-events-none">
                EXIT (NBC Part 4)
              </div>
            </Html>
          </group>
        </group>
      )}
    </group>
  );
}

// Backwards-compatible export
export const ConstructionPhasing = ConstructionPhasing3D;
export const ConstructionPhasing4D = ConstructionPhasing3D;
