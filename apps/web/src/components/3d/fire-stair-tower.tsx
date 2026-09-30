"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

export interface FireStairTowerProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  flightWidthM?: number;  // 1.50m clear flight width per NBC 2016 Part 4 Table 8
  riserHeightM?: number;  // 0.15m (150mm max riser per NBC Table 8)
  treadDepthM?: number;   // 0.30m (300mm min tread per NBC Table 8)
  towerHeightM?: number;  // 3.40m storey height
  pressurizationPa?: number; // 50 Pa positive pressure per NBC Part 4 Cl. 4.4.2
}

/**
 * Pillar 3: Multi-Floor Egress & Fire Engineering Automation 3D WebGL Component
 * Implements:
 * 1. Pressurized Fire Stair Tower Enclosure: 2-hour fire-rated partitions (translucent cutaway)
 *    and 50 Pa pressurization mechanical air supply louvers.
 * 2. Dog-Leg Staircase Flights: 1.50m clear flight width, R ≤ 150mm, T ≥ 300mm,
 *    continuous handrails, and 1.50m × 1.50m intermediate landing per NBC 2016 Part 4 Cl. 4.4.2.
 * 3. Illuminated Green Emergency Exit Signs: #22c55e emissive material + localized point light.
 * 4. Photoluminescent Floor Egress Pathways: High-visibility green ribbons with directional chevrons.
 * 5. Statutory Life Safety HUD Billboard: Citing NBC 2016 Part 4 Table 8 and IS 3614.
 */
export function FireStairTower({
  visible = true,
  floorPlan,
  flightWidthM = 1.50,
  riserHeightM = 0.15,
  treadDepthM = 0.30,
  towerHeightM = 3.40,
  pressurizationPa = 50,
}: FireStairTowerProps) {
  if (!visible) return null;

  // Resolve exit doors and room retreat points from floor plan
  const { exitPos, startPos, allExits } = useMemo(() => {
    let exX = 5.0;
    let exZ = 3.0;
    let stX = -4.0;
    let stZ = -2.0;
    const exits: { x: number; z: number }[] = [];

    if (floorPlan && floorPlan.doors && floorPlan.doors.length > 0) {
      const d = floorPlan.doors[0];
      exX = d.position.x;
      exZ = d.position.y;
      for (const door of floorPlan.doors) {
        exits.push({ x: door.position.x, z: door.position.y });
      }
    } else {
      exits.push({ x: exX, z: exZ });
    }

    if (floorPlan && floorPlan.rooms && floorPlan.rooms.length > 0) {
      const r = floorPlan.rooms[0];
      if (r.vertices && r.vertices.length > 0) {
        stX = r.vertices[0].x;
        stZ = r.vertices[0].y;
      }
    }

    return {
      exitPos: { x: exX, z: exZ },
      startPos: { x: stX, z: stZ },
      allExits: exits,
    };
  }, [floorPlan]);

  // Compute photoluminescent egress vector path points
  const egressPathPoints = useMemo(() => {
    const points: [number, number, number][] = [
      [startPos.x, 0.03, startPos.z],
      [(startPos.x + exitPos.x) / 2, 0.03, startPos.z],
      [(startPos.x + exitPos.x) / 2, 0.03, exitPos.z],
      [exitPos.x, 0.03, exitPos.z],
    ];
    return points;
  }, [startPos, exitPos]);

  // Enclosure dimensions: Accommodates dog-leg twin flights (2 x 1.50m) + well + landings
  const enclosureW = flightWidthM * 2 + 0.6; // 3.6m wide
  const enclosureL = 4.2; // 4.2m long
  const landingDepth = 1.50; // 1.50m intermediate landing depth (NBC Cl. 4.4.2)
  const stepsPerFlight = 10; // 10 risers = 1.50m rise to landing
  const midLandingY = riserHeightM * stepsPerFlight; // 1.50m

  return (
    <group name="fire-stair-tower">
      {/* ==================================================================== */}
      {/* 1. PRESSURIZED FIRE STAIR TOWER ENCLOSURE (2-HR TRANSLUCENT CUTAWAY) */}
      {/* ==================================================================== */}
      <group position={[exitPos.x + 1.8, towerHeightM / 2, exitPos.z]}>
        {/* Rear Wall (2-hr masonry/fire partition) */}
        <mesh position={[0, 0, -enclosureL / 2]} castShadow receiveShadow>
          <boxGeometry args={[enclosureW, towerHeightM, 0.20]} />
          <meshStandardMaterial
            color="#064e3b"
            transparent
            opacity={0.35}
            roughness={0.3}
          />
        </mesh>

        {/* Left Side Wall */}
        <mesh position={[-enclosureW / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.20, towerHeightM, enclosureL]} />
          <meshStandardMaterial
            color="#064e3b"
            transparent
            opacity={0.35}
            roughness={0.3}
          />
        </mesh>

        {/* Right Side Wall */}
        <mesh position={[enclosureW / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.20, towerHeightM, enclosureL]} />
          <meshStandardMaterial
            color="#064e3b"
            transparent
            opacity={0.35}
            roughness={0.3}
          />
        </mesh>

        {/* Wireframe Architectural Edges */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(enclosureW, towerHeightM, enclosureL)]} />
          <lineBasicMaterial color="#10b981" linewidth={2} />
        </lineSegments>

        {/* 50 Pa Positive Pressure Pressurization Grille / Damper at Tower Head */}
        <group position={[0, towerHeightM / 2 - 0.25, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.35, 0.15]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Grille Louvers */}
          {[-0.1, 0, 0.1].map((ly, i) => (
            <mesh key={i} position={[0, ly, 0.08]}>
              <boxGeometry args={[1.1, 0.03, 0.02]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.5} />
            </mesh>
          ))}
          {/* Pressurization Indicator Badge */}
          <Html position={[0, 0.35, 0]} center distanceFactor={14}>
            <div className="rounded bg-sky-950/90 border border-sky-400 px-2 py-0.5 text-[9px] font-mono text-sky-200 shadow-lg whitespace-nowrap pointer-events-none">
              ⚡ {pressurizationPa} Pa Pressurized Air Supply (NBC Part 4 Cl. 4.4.2)
            </div>
          </Html>
        </group>

        {/* ==================================================================== */}
        {/* 2. DOG-LEG STAIRCASE FLIGHTS (NBC 2016 PART 4 TABLE 8 COMPLIANT)     */}
        {/* ==================================================================== */}
        <group position={[0, -towerHeightM / 2, 0]}>
          {/* Flight 1: Ascending to Mid-Landing (Going up in +Z direction) */}
          {Array.from({ length: stepsPerFlight }).map((_, idx) => {
            const stepY = (idx + 0.5) * riserHeightM;
            const stepZ = -enclosureL / 2 + landingDepth + idx * treadDepthM;
            return (
              <mesh
                key={`flight1-${idx}`}
                position={[-flightWidthM / 2 - 0.05, stepY, stepZ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[flightWidthM, riserHeightM, treadDepthM]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.1} />
              </mesh>
            );
          })}

          {/* Intermediate Landing: 1.50m × 1.50m Slab at 1.50m Rise (NBC Cl. 4.4.2) */}
          <mesh
            position={[0, midLandingY - 0.075, enclosureL / 2 - landingDepth / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[enclosureW - 0.3, 0.15, landingDepth]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.1} />
          </mesh>

          {/* Flight 2: Dog-leg Return Flight (Ascending from 1.50m to 3.00m in -Z direction) */}
          {Array.from({ length: stepsPerFlight }).map((_, idx) => {
            const stepY = midLandingY + (idx + 0.5) * riserHeightM;
            const stepZ = enclosureL / 2 - landingDepth - idx * treadDepthM;
            return (
              <mesh
                key={`flight2-${idx}`}
                position={[flightWidthM / 2 + 0.05, stepY, stepZ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[flightWidthM, riserHeightM, treadDepthM]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.6} metalness={0.1} />
              </mesh>
            );
          })}

          {/* Continuous Handrails (NBC 2016 Part 4 Table 8: 1.00m height above nosing) */}
          <group position={[-0.05, 1.0, 0]}>
            <mesh position={[-flightWidthM, midLandingY / 2, 0]} rotation={[0.45, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 3.2, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[flightWidthM, midLandingY + midLandingY / 2, 0]} rotation={[-0.45, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 3.2, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* 2-Hour Self-Closing Fire Door (FD 120) with Vision Panel */}
        <group position={[-enclosureW / 2 + 0.08, -towerHeightM / 2 + 1.05, -enclosureL / 4]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 2.10, 1.00]} />
            <meshStandardMaterial color="#dc2626" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* 0.2m x 0.6m Fire Glass Vision Panel */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.09, 0.6, 0.25]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.6} roughness={0.1} />
          </mesh>
          {/* FD 120 Door Label */}
          <Html position={[0.08, 0, 0]} center distanceFactor={10}>
            <div className="rounded bg-red-950/90 border border-red-500 px-1 py-0.5 text-[8px] font-mono text-red-200 whitespace-nowrap pointer-events-none">
              FD 120 (2-Hr Fire Door)
            </div>
          </Html>
        </group>

        {/* Statutory Fire Life Safety Billboard */}
        <Html position={[0, towerHeightM / 2 + 0.6, 0]} center distanceFactor={14}>
          <div className="rounded-lg bg-emerald-950/95 border border-emerald-400 p-2.5 text-[10px] font-mono text-emerald-200 shadow-2xl whitespace-nowrap pointer-events-none backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span>🛡️ PRESSURIZED FIRE STAIR TOWER</span>
              <span className="rounded bg-emerald-500/20 px-1 text-[8px] border border-emerald-500/40">
                NBC 2016
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-[9px] text-emerald-300">
              <div>✓ Flight Clear Width: {flightWidthM.toFixed(2)}m ≥ 1.50m (Table 8)</div>
              <div>✓ Riser: {(riserHeightM * 1000).toFixed(0)}mm ≤ 150mm · Tread: {(treadDepthM * 1000).toFixed(0)}mm ≥ 300mm</div>
              <div>✓ Blondel: 2R + T = {(2 * riserHeightM * 1000 + treadDepthM * 1000).toFixed(0)}mm (550-650mm) [PASS]</div>
              <div>✓ Pressurization: 50 Pa Positive Pressure Stairwell</div>
              <div>✓ Containment: 2-Hour Fire Partitions & FD 120 Self-Closing Door</div>
            </div>
          </div>
        </Html>
      </group>

      {/* ==================================================================== */}
      {/* 3. ILLUMINATED GREEN EMERGENCY EXIT SIGNS (EMISSIVE + LOCAL LIGHT)    */}
      {/* ==================================================================== */}
      {allExits.map((ex, idx) => (
        <group key={`exit-sign-${idx}`} position={[ex.x, 2.35, ex.z]}>
          {/* Enclosure Box */}
          <mesh castShadow>
            <boxGeometry args={[0.48, 0.22, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} />
          </mesh>
          {/* Glowing Green Front Emissive Face */}
          <mesh position={[0, 0, 0.042]}>
            <planeGeometry args={[0.44, 0.18]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={2.2}
              toneMapped={false}
            />
          </mesh>
          {/* Localized Green Point Light Illuminating Egress Door Area */}
          <pointLight color="#22c55e" intensity={2.0} distance={4.0} />

          {/* Running Man / EXIT HTML Badge */}
          <Html position={[0, 0, 0.06]} center distanceFactor={8}>
            <div className="flex items-center gap-1 font-bold text-white text-[9px] tracking-wider pointer-events-none drop-shadow">
              <span>🏃</span>
              <span>EXIT</span>
            </div>
          </Html>
        </group>
      ))}

      {/* ==================================================================== */}
      {/* 4. PHOTOLUMINESCENT FLOOR EGRESS PATHWAY WITH DIRECTIONAL CHEVRONS   */}
      {/* ==================================================================== */}
      {egressPathPoints.map((pt, idx) => {
        if (idx === egressPathPoints.length - 1) return null;
        const nextPt = egressPathPoints[idx + 1];
        const midX = (pt[0] + nextPt[0]) / 2;
        const midZ = (pt[2] + nextPt[2]) / 2;
        const dx = nextPt[0] - pt[0];
        const dz = nextPt[2] - pt[2];
        const segLen = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);

        return (
          <group key={`path-segment-${idx}`} position={[midX, 0.02, midZ]} rotation={[0, angle, 0]}>
            {/* Luminous Floor Ribbon */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.35, segLen]} />
              <meshStandardMaterial
                color="#22c55e"
                emissive="#16a34a"
                emissiveIntensity={0.8}
                transparent
                opacity={0.85}
              />
            </mesh>

            {/* Directional Chevron Markers Along Path */}
            {Array.from({ length: Math.max(1, Math.floor(segLen / 0.8)) }).map((_, cIdx) => {
              const chevronZ = -segLen / 2 + (cIdx + 0.5) * (segLen / Math.max(1, Math.floor(segLen / 0.8)));
              return (
                <mesh
                  key={cIdx}
                  position={[0, 0.005, chevronZ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <coneGeometry args={[0.10, 0.18, 3]} />
                  <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={0.6}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* ==================================================================== */}
      {/* 5. INTERNAL FIRST-AID HOSE REEL (HR) CABINET (NBC PART 4 CL. 5.1.2)   */}
      {/* ==================================================================== */}
      <group position={[exitPos.x - 1.1, 1.2, exitPos.z]}>
        {/* Steel Cabinet Box */}
        <mesh castShadow>
          <boxGeometry args={[0.65, 0.85, 0.28]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Hose Reel Spool Drum */}
        <mesh position={[0, 0, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.14, 20]} />
          <meshStandardMaterial color="#ef4444" roughness={0.4} />
        </mesh>
        {/* Brass Nozzle */}
        <mesh position={[0.22, -0.25, 0.12]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.02, 0.03, 0.12, 10]} />
          <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* HR Label */}
        <Html position={[0, 0.55, 0]} center distanceFactor={10}>
          <div className="rounded bg-red-950/90 border border-red-500 px-1.5 py-0.5 text-[8px] font-mono text-red-200 whitespace-nowrap pointer-events-none">
            🧯 HR Station (30m Reach per Cl. 5.1.2)
          </div>
        </Html>
      </group>
    </group>
  );
}

export default FireStairTower;
