"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

export interface SunPathAndAcousticsProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  solarHour?: number; // 6.00 to 18.00 (e.g. 12.0 = solar noon)
  onSolarHourChange?: (hour: number) => void;
  showAcousticCutaway?: boolean;
  showVastuGrid?: boolean;
  showSunTrajectory?: boolean;
}

/**
 * Solar position computation for Delhi-NCR (Latitude: 28.45°N, Longitude: 77.02°E)
 * Uses standard solar astronomy equations:
 * Declination: δ = 23.45° * sin(360/365 * (284 + n))
 * Hour angle: H = (solarHour - 12) * 15°
 * Altitude: sin(α) = sin(φ) * sin(δ) + cos(φ) * cos(δ) * cos(H)
 * Azimuth: cos(ψ) = (sin(δ) - sin(φ) * sin(α)) / (cos(φ) * cos(α))
 */
export function calculateDelhiNCRSunPosition(
  solarHour: number,
  radius: number = 28,
  dayOfYear: number = 120 // May 1st (pre-monsoon high solar exposure)
): {
  position: THREE.Vector3;
  altitudeDeg: number;
  azimuthDeg: number;
  altitudeRad: number;
  azimuthRad: number;
} {
  const phi = (28.45 * Math.PI) / 180; // 28.45°N in radians
  const delta =
    ((23.45 * Math.sin(((360 / 365) * (284 + dayOfYear) * Math.PI) / 180)) *
      Math.PI) /
    180;

  const hourClamped = Math.max(6.0, Math.min(18.0, solarHour));
  const H = ((hourClamped - 12) * 15 * Math.PI) / 180;

  const sinAlpha = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  const alphaRad = Math.asin(Math.max(-1, Math.min(1, sinAlpha)));
  const alphaDeg = (alphaRad * 180) / Math.PI;

  const cosPsiNum = Math.sin(delta) - Math.sin(phi) * Math.sin(alphaRad);
  const cosPsiDen = Math.cos(phi) * Math.cos(alphaRad);
  let psiRad = Math.acos(Math.max(-1, Math.min(1, cosPsiNum / (cosPsiDen || 1e-6))));
  if (H > 0) {
    psiRad = 2 * Math.PI - psiRad;
  }
  const azimuthDeg = (psiRad * 180) / Math.PI;

  // Spherical coordinates mapped to 3D Cartesian coordinates
  // North is -Z, East is +X, South is +Z, West is -X
  const effectiveAlpha = Math.max(0.12, alphaRad);
  const y = Math.max(3.5, radius * Math.sin(effectiveAlpha));
  const groundDist = radius * Math.cos(effectiveAlpha);
  const x = groundDist * Math.sin(psiRad);
  const z = -groundDist * Math.cos(psiRad);

  return {
    position: new THREE.Vector3(x, y, z),
    altitudeDeg: Math.max(0, alphaDeg),
    azimuthDeg,
    altitudeRad: alphaRad,
    azimuthRad: psiRad,
  };
}

/**
 * Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala 3D WebGL Visualization
 * Features:
 * 1. Delhi-NCR (28.45°N) Solar Sun-Path Simulation with 64-point golden celestial trajectory arc spline
 * 2. High-performance STC 56 acoustic partition cutaway model (dual SoundStop, Green Glue, RC-1, Rockwool 60kg/m³, 25mm air cavity)
 * 3. 9-Zone Paramasayika Vastu Mandala Ground Plane Projection
 * 4. Interactive hour scrub slider (06:00 to 18:00) with solar geometry readout
 */
export function SunPathAndAcoustics({
  visible = true,
  floorPlan,
  solarHour = 12.0,
  onSolarHourChange,
  showAcousticCutaway = true,
  showVastuGrid = true,
  showSunTrajectory = true,
}: SunPathAndAcousticsProps) {
  const [internalHour, setInternalHour] = useState<number>(solarHour);
  const activeHour = onSolarHourChange ? solarHour : internalHour;

  const handleHourChange = (newHour: number) => {
    setInternalHour(newHour);
    if (onSolarHourChange) {
      onSolarHourChange(newHour);
    }
  };

  // Sun position calculation
  const sunData = useMemo(() => {
    return calculateDelhiNCRSunPosition(activeHour, 28);
  }, [activeHour]);

  // 64-point celestial trajectory arc spline
  const { trajectoryCurve, trajectoryGeometry } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 64;
    for (let i = 0; i <= count; i++) {
      const h = 6.0 + (i / count) * 12.0;
      const { position } = calculateDelhiNCRSunPosition(h, 28);
      points.push(position);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 64, 0.12, 8, false);
    return { trajectoryCurve: curve, trajectoryGeometry: geometry };
  }, []);

  // Floor plan bounds for Vastu grid positioning
  const vastuBounds = useMemo(() => {
    let minX = -6;
    let maxX = 6;
    let minZ = -5;
    let maxZ = 5;

    if (floorPlan && floorPlan.walls && floorPlan.walls.length > 0) {
      let pMinX = Infinity;
      let pMaxX = -Infinity;
      let pMinZ = Infinity;
      let pMaxZ = -Infinity;
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
    return { minX, maxX, minZ, maxZ, width, depth };
  }, [floorPlan]);

  if (!visible) return null;

  const { minX, depth, width, minZ } = vastuBounds;
  const cellW = width / 3;
  const cellD = depth / 3;

  // Format hour label
  const hourInt = Math.floor(activeHour);
  const minInt = Math.round((activeHour - hourInt) * 60);
  const hourFormatted = `${hourInt.toString().padStart(2, "0")}:${minInt.toString().padStart(2, "0")}`;

  // Sun light color temperature across daylight cycle
  const sunColor =
    activeHour <= 7.0 || activeHour >= 17.5
      ? "#f97316" // Warm sunrise/sunset orange
      : activeHour <= 9.0 || activeHour >= 15.5
      ? "#fde047" // Golden morning/afternoon
      : "#ffffff"; // Bright noon daylight

  const sunIntensity =
    activeHour <= 6.5 || activeHour >= 17.5
      ? 1.4
      : activeHour <= 8.0 || activeHour >= 16.0
      ? 2.0
      : 2.8;

  return (
    <group name="sun-path-and-acoustics-3d">
      {/* 1. Solar Light Source with Dynamic Shadow Mapping */}
      <directionalLight
        position={sunData.position}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* 2. 64-Point Golden Celestial Trajectory Arc Spline */}
      {showSunTrajectory && (
        <group name="solar-trajectory-arc">
          <mesh geometry={trajectoryGeometry}>
            <meshStandardMaterial
              color="#d97706"
              emissive="#b45309"
              emissiveIntensity={1.2}
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>

          {/* Golden Sun Orb Sphere */}
          <mesh position={sunData.position}>
            <sphereGeometry args={[0.9, 32, 32]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={2.8}
              roughness={0.2}
            />
          </mesh>

          {/* Interactive Solar Scrub Slider HUD */}
          <Html position={[0, 14, -20]} center distanceFactor={22}>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-950/92 border border-amber-500/50 p-3 shadow-2xl backdrop-blur-md text-amber-100 font-sans pointer-events-auto min-w-[280px]">
              <div className="flex items-center justify-between w-full text-[11px] font-bold text-amber-300">
                <span>☀️ Delhi-NCR (28.45°N, 77.02°E) Sun Path</span>
                <span className="font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                  {hourFormatted} IST
                </span>
              </div>
              <div className="w-full flex items-center gap-2 pt-1">
                <span className="text-[10px] text-amber-400/80 font-mono">06:00</span>
                <input
                  type="range"
                  min={6.0}
                  max={18.0}
                  step={0.25}
                  value={activeHour}
                  onChange={(e) => handleHourChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                />
                <span className="text-[10px] text-amber-400/80 font-mono">18:00</span>
              </div>
              <div className="flex justify-between w-full text-[9px] text-amber-300/80 font-mono pt-0.5 border-t border-amber-500/20">
                <span>Alt: {sunData.altitudeDeg.toFixed(1)}°</span>
                <span>Az: {sunData.azimuthDeg.toFixed(1)}°</span>
                <span>Daylight: {sunIntensity >= 2.5 ? "Direct Peak" : "Diffuse Morning/Evening"}</span>
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* 3. 9-Zone Paramasayika Vastu Mandala Ground Plane Projection */}
      {showVastuGrid && (
        <group position={[0, 0.005, 0]} name="vastu-mandala-3d-grid">
          {[
            { row: 0, col: 0, name: "Vayu (NW) 💨", element: "Air", color: "#3b82f6" },
            { row: 0, col: 1, name: "Kuber (N) 💰", element: "Wealth", color: "#10b981" },
            { row: 0, col: 2, name: "Ishanya (NE) 💧", element: "Water", color: "#06b6d4" },
            { row: 1, col: 0, name: "Varuna (W) 🌊", element: "Stability", color: "#6366f1" },
            { row: 1, col: 1, name: "Brahmasthan ☀️", element: "Ether / Space", color: "#eab308" },
            { row: 1, col: 2, name: "Surya (E) ☀️", element: "Solar Light", color: "#fbbf24" },
            { row: 2, col: 0, name: "Nairutya (SW) ⛰️", element: "Earth", color: "#d97706" },
            { row: 2, col: 1, name: "Yama (S) ⚖️", element: "Rest", color: "#94a3b8" },
            { row: 2, col: 2, name: "Agni (SE) 🔥", element: "Fire", color: "#f97316" },
          ].map((item, idx) => {
            const cx = minX + item.col * cellW + cellW / 2;
            const cz = minZ + item.row * cellD + cellD / 2;

            return (
              <group key={idx} position={[cx, 0, cz]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[cellW * 0.96, cellD * 0.96]} />
                  <meshStandardMaterial
                    color={item.color}
                    transparent
                    opacity={0.14}
                    roughness={0.8}
                  />
                </mesh>
                <lineSegments>
                  <edgesGeometry
                    args={[new THREE.BoxGeometry(cellW * 0.96, 0.01, cellD * 0.96)]}
                  />
                  <lineBasicMaterial color={item.color} linewidth={1.5} />
                </lineSegments>
                <Html position={[0, 0.1, 0]} center distanceFactor={14}>
                  <div className="rounded bg-slate-900/85 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-200 shadow whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      )}

      {/* 4. Layered Architectural Cutaway: STC 56 Acoustic Partition Wall Sandwich */}
      {showAcousticCutaway && (
        <group position={[minX - 2.8, 1.4, minZ + 2.0]} name="stc56-acoustic-cutaway">
          {/* Layer 1: Outer Face Dual 12.5mm Gyproc SoundStop Gypsum Boards (25mm total) */}
          <mesh position={[-0.10, 0, 0]} castShadow>
            <boxGeometry args={[0.025, 2.4, 1.4]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
          </mesh>

          {/* Layer 2: Green Glue Viscoelastic Damping Layer (staggered height reveal) */}
          <mesh position={[-0.075, -0.1, 0]} castShadow>
            <boxGeometry args={[0.004, 2.2, 1.36]} />
            <meshStandardMaterial
              color="#10b981"
              transparent
              opacity={0.85}
              roughness={0.3}
            />
          </mesh>

          {/* Layer 3: RC-1 Resilient Channels (horizontal steel furring strips spaced vertically) */}
          <group position={[-0.05, 0, 0]}>
            {[-0.8, -0.2, 0.4, 1.0].map((yOffset, i) => (
              <mesh key={i} position={[0, yOffset, 0]} castShadow>
                <boxGeometry args={[0.015, 0.05, 1.38]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
          </group>

          {/* Layer 4: 90mm Steel C-Studs Framework */}
          <group position={[0, 0, 0]}>
            {[-0.6, 0, 0.6].map((zOffset, i) => (
              <mesh key={i} position={[0, 0, zOffset]} castShadow>
                <boxGeometry args={[0.09, 2.38, 0.045]} />
                <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
              </mesh>
            ))}
          </group>

          {/* Layer 5: 50mm Rockwool Acoustic Batt Insulation (60 kg/m³ high density, stepped reveal) */}
          <mesh position={[0, -0.2, 0]} castShadow>
            <boxGeometry args={[0.05, 2.0, 1.3]} />
            <meshStandardMaterial color="#ca8a04" roughness={0.95} />
          </mesh>

          {/* Layer 6: 25mm Decoupled Air Gap (illustrated by open cavity space) */}

          {/* Layer 7: Inner Leaf Dual 12.5mm SoundStop Gypsum Board (stepped half-height reveal) */}
          <mesh position={[0.08, -0.6, 0]} castShadow>
            <boxGeometry args={[0.025, 1.2, 1.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
          </mesh>

          {/* 3D Billboard Tag for STC 56 Decoupled Partition */}
          <Html position={[0, 1.6, 0]} center distanceFactor={12}>
            <div className="rounded-lg bg-slate-950/95 border-2 border-purple-500/80 p-2.5 text-[10px] font-mono text-purple-200 shadow-2xl whitespace-nowrap pointer-events-none">
              <div className="flex items-center gap-1.5 font-bold text-purple-400 text-xs">
                <span>🔊</span>
                <span>STC 56 Tested Acoustic Decoupling (f0 &lt; 60 Hz)</span>
              </div>
              <div className="text-[9px] text-purple-300 mt-1">
                Dual SoundStop (25mm) + Green Glue + RC-1 + Rockwool (60kg/m³) + 25mm Cavity
              </div>
              <div className="text-[8px] text-purple-400/90 mt-0.5">
                Mass-Air-Mass Resonance f0 = 51.3 Hz (Below 85–255 Hz Speech Spectrum) [ASTM E90]
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
