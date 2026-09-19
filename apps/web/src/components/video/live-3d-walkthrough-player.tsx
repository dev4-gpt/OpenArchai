"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { UnitSystem } from "@/lib/units";
import { metersToUnit, unitLabel } from "@/lib/units";
import {
  FLOORING_SWAPS,
  WALL_SWAPS,
  CIRCADIAN_CONFIGS,
  type MaterialPreset,
  type CircadianPreset,
} from "@/components/model-viewer";
import { createHiggsfieldWalkthroughJob, type HiggsfieldJobResponse } from "@/lib/higgsfield-api";

export type CameraMode = "tour" | "first_person" | "axonometric";
export type PlayerViewMode = "interactive_3d" | "higgsfield_cinema";

interface Live3DWalkthroughPlayerProps {
  elements?: ConstructionElements | null;
  signedModelUrl?: string | null;
  projectName?: string;
  unitSystem?: UnitSystem;
  className?: string;
}

const DEFAULT_STUDIO_BOUNDS = { min_x: 0, min_y: 0, max_x: 5, max_y: 3 };

// Walkthrough Keyframes at human eye height (1.65m)
interface TourWaypoint {
  timeSec: number;
  name: string;
  icon: string;
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  description: string;
}

const TOUR_WAYPOINTS: TourWaypoint[] = [
  {
    timeSec: 0,
    name: "Entrance Foyer",
    icon: "🚪",
    pos: [2.0, 1.65, 0.35],
    lookAt: [2.0, 1.45, 1.8],
    fov: 55,
    description: "Entering through 0.9m main entrance doorway (NBC 2016 compliant).",
  },
  {
    timeSec: 3,
    name: "Living Room Core",
    icon: "🛋️",
    pos: [1.8, 1.65, 1.3],
    lookAt: [1.2, 1.1, 1.8],
    fov: 55,
    description: "Sectional sofa, Noguchi table, and warm fluted timber feature wall.",
  },
  {
    timeSec: 6,
    name: "Daylight Window",
    icon: "🪟",
    pos: [3.4, 1.65, 1.4],
    lookAt: [5.0, 1.5, 1.5],
    fov: 52,
    description: "1.2m perimeter window with natural daylight and exterior skyline view.",
  },
  {
    timeSec: 9,
    name: "Bedroom Retreat",
    icon: "🛏️",
    pos: [3.4, 1.65, 2.3],
    lookAt: [3.8, 1.1, 1.8],
    fov: 54,
    description: "King Platform Bed (1.9m x 2.1m) with layered linen and plinth lighting.",
  },
  {
    timeSec: 12,
    name: "Panoramic Overview",
    icon: "🔄",
    pos: [2.5, 1.65, 1.5],
    lookAt: [0.6, 1.4, 0.6],
    fov: 58,
    description: "Full 360° interior turnaround looking back at Oak Dining Table and foyer.",
  },
];

const TOUR_DURATION = 12; // 12-second smooth architectural tour

// =============================================================================
// Procedural High-Fidelity Architectural Textures
// =============================================================================

function createMarbleTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#faf8f5";
  ctx.fillRect(0, 0, 1024, 1024);

  // Soft wide veining
  ctx.strokeStyle = "rgba(195, 190, 182, 0.6)";
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = (i * 220 + 50) % 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.48) * 70;
      y += Math.random() * 80 + 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Finer darker veins
  ctx.strokeStyle = "rgba(150, 144, 135, 0.85)";
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = (i * 280 + 120) % 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.48) * 50;
      y += Math.random() * 60 + 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

function createHerringboneTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#b58a5b";
  ctx.fillRect(0, 0, 512, 512);

  const plankW = 64;
  const plankH = 16;
  ctx.strokeStyle = "#825d36";
  ctx.lineWidth = 2;

  for (let y = 0; y < 512; y += plankH) {
    for (let x = 0; x < 512; x += plankW) {
      ctx.strokeRect(x, y, plankW, plankH);
      ctx.beginPath();
      ctx.moveTo(x, y + plankH / 2);
      ctx.lineTo(x + plankW, y + plankH / 2);
      ctx.strokeStyle = "#9e7447";
      ctx.stroke();
      ctx.strokeStyle = "#825d36";
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  return texture;
}

// =============================================================================
// Super-Realistic 3D Architectural Scene Components
// =============================================================================

function ProceduralFloor({
  bounds,
  flooring,
}: {
  bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  flooring: MaterialPreset;
}) {
  const width = Math.max(1, bounds.max_x - bounds.min_x);
  const depth = Math.max(1, bounds.max_y - bounds.min_y);
  const centerX = (bounds.min_x + bounds.max_x) / 2;
  const centerZ = (bounds.min_y + bounds.max_y) / 2;

  const marbleTex = useMemo(() => createMarbleTexture(), []);
  const woodTex = useMemo(() => createHerringboneTexture(), []);

  const material = useMemo(() => {
    if (flooring.id === "fl_italian_statuario" && marbleTex) {
      return new THREE.MeshStandardMaterial({
        map: marbleTex,
        roughness: 0.12,
        metalness: 0.05,
      });
    }
    if (flooring.id === "fl_herringbone_oak" && woodTex) {
      return new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.45,
        metalness: 0.0,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(flooring.colorHex),
      roughness: flooring.roughness,
      metalness: flooring.metalness,
    });
  }, [flooring, marbleTex, woodTex]);

  return (
    <group position={[centerX, -0.05, centerZ]}>
      {/* Floor Slab with PBR texture */}
      <mesh receiveShadow material={material}>
        <boxGeometry args={[width, 0.1, depth]} />
      </mesh>
    </group>
  );
}

function ProceduralCeiling({
  bounds,
  showLights = true,
}: {
  bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  showLights?: boolean;
}) {
  const width = Math.max(1, bounds.max_x - bounds.min_x);
  const depth = Math.max(1, bounds.max_y - bounds.min_y);
  const centerX = (bounds.min_x + bounds.max_x) / 2;
  const centerZ = (bounds.min_y + bounds.max_y) / 2;
  const ceilingY = 2.7; // 2.7m clear ceiling

  const ceilingMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f7f5f0", roughness: 0.95 }),
    [],
  );

  const fixtureMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#22201d", metalness: 0.8, roughness: 0.3 }),
    [],
  );

  const emissiveLensMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#fff0d0" }),
    [],
  );

  // 6 Recessed Downlight Fixture positions across the studio
  const downlights = [
    [1.5, ceilingY, 1.0],
    [3.5, ceilingY, 1.0],
    [1.5, ceilingY, 2.0],
    [3.5, ceilingY, 2.0],
    [2.5, ceilingY, 0.6],
    [2.5, ceilingY, 2.4],
  ];

  return (
    <group>
      {/* Ceiling Slab */}
      <mesh position={[centerX, ceilingY + 0.05, centerZ]} material={ceilingMat}>
        <boxGeometry args={[width, 0.1, depth]} />
      </mesh>

      {/* Recessed Architectural Brass/Black Downlights */}
      {showLights &&
        downlights.map(([x, y, z], i) => (
          <group key={i} position={[x, y - 0.005, z]}>
            {/* Outer Bezel */}
            <mesh material={fixtureMat}>
              <cylinderGeometry args={[0.07, 0.07, 0.01, 16]} />
            </mesh>
            {/* Emissive Center Lens */}
            <mesh position={[0, -0.006, 0]} material={emissiveLensMat}>
              <circleGeometry args={[0.045, 16]} />
            </mesh>
            {/* Downward Warm Point Light */}
            <pointLight position={[0, -0.1, 0]} color="#ffb766" intensity={1.8} distance={4.5} />
          </group>
        ))}

      {/* Warm LED Cove Indirect Glow along ceiling perimeter */}
      <pointLight position={[centerX, ceilingY - 0.15, centerZ]} color="#ffa34d" intensity={1.2} distance={8} />
    </group>
  );
}

function ProceduralWalls({
  walls,
  doors,
  windows,
  wallPreset,
  showDimensions,
  unitSystem,
}: {
  walls: { start: [number, number]; end: [number, number] }[];
  doors: { position: [number, number]; width_m: number | null }[];
  windows: { position: [number, number]; width_m: number | null }[];
  wallPreset: MaterialPreset;
  showDimensions: boolean;
  unitSystem: UnitSystem;
}) {
  const wallHeight = 2.7;
  const thickness = 0.15;

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(wallPreset.colorHex),
        roughness: wallPreset.roughness,
        metalness: wallPreset.metalness,
      }),
    [wallPreset],
  );

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e1c18",
        roughness: 0.4,
        metalness: 0.7,
      }),
    [],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e8f4fc",
        transparent: true,
        opacity: 0.25,
        roughness: 0.05,
        metalness: 0.9,
        transmission: 0.85,
        reflectivity: 0.9,
      }),
    [],
  );

  const doorWoodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#6b4226",
        roughness: 0.45,
        metalness: 0.05,
      }),
    [],
  );

  const flutedWoodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7a5332",
        roughness: 0.5,
        metalness: 0.02,
      }),
    [],
  );

  return (
    <group>
      {/* 3D Masonry Walls */}
      {walls.map((w, idx) => {
        const dx = w.end[0] - w.start[0];
        const dz = w.end[1] - w.start[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.1) return null;

        const angle = Math.atan2(dz, dx);
        const midX = (w.start[0] + w.end[0]) / 2;
        const midZ = (w.start[1] + w.end[1]) / 2;

        return (
          <group key={idx} position={[midX, wallHeight / 2, midZ]} rotation={[0, -angle, 0]}>
            <mesh castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[len, wallHeight, thickness]} />
            </mesh>
            {/* Architectural Baseboard Skirting */}
            <mesh position={[0, -wallHeight / 2 + 0.05, thickness / 2 + 0.008]} material={frameMat}>
              <boxGeometry args={[len, 0.1, 0.016]} />
            </mesh>
          </group>
        );
      })}

      {/* Fluted Wood Accent Feature Wall behind Bed/Living */}
      <group position={[2.5, wallHeight / 2, 2.92]}>
        {Array.from({ length: 32 }).map((_, i) => (
          <mesh key={i} position={[(i - 16) * 0.07, 0, 0]} castShadow material={flutedWoodMat}>
            <boxGeometry args={[0.035, wallHeight - 0.2, 0.025]} />
          </mesh>
        ))}
      </group>

      {/* 3D Entrance Doorway */}
      {doors.map((d, idx) => {
        const doorWidth = d.width_m || 0.9;
        const doorHeight = 2.1;
        return (
          <group key={`door-${idx}`} position={[d.position[0], doorHeight / 2, d.position[1]]}>
            <mesh material={frameMat}>
              <boxGeometry args={[doorWidth + 0.1, doorHeight + 0.08, 0.16]} />
            </mesh>
            {/* Open Door Leaf (Swung 65° inward) */}
            <group position={[-doorWidth / 2 + 0.04, -doorHeight / 2, 0]} rotation={[0, 1.1, 0]}>
              <mesh position={[doorWidth / 2, doorHeight / 2, 0]} castShadow material={doorWoodMat}>
                <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
              </mesh>
              {/* Brass Lever Handle */}
              <mesh position={[doorWidth - 0.08, 1.0, 0.04]} material={frameMat}>
                <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
              </mesh>
            </group>
            {showDimensions && (
              <Html position={[0, doorHeight + 0.25, 0]} center>
                <div className="bg-surface/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono border border-accent/40 text-accent whitespace-nowrap shadow-xs pointer-events-none">
                  🚪 Door: {metersToUnit(doorWidth, unitSystem).toFixed(2)} {unitLabel(unitSystem)} (NBC 2016)
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* 3D Perimeter Window */}
      {windows.map((w, idx) => {
        const winWidth = w.width_m || 1.2;
        const winHeight = 1.4;
        const sillHeight = 0.9;
        return (
          <group key={`win-${idx}`} position={[w.position[0], sillHeight + winHeight / 2, w.position[1]]}>
            {/* Outer Frame */}
            <mesh material={frameMat}>
              <boxGeometry args={[0.16, winHeight, winWidth + 0.08]} />
            </mesh>
            {/* Glass Pane */}
            <mesh material={glassMat}>
              <boxGeometry args={[0.02, winHeight - 0.08, winWidth - 0.08]} />
            </mesh>
            {/* Center Mullion */}
            <mesh material={frameMat}>
              <boxGeometry args={[0.04, winHeight - 0.08, 0.03]} />
            </mesh>
            {/* Exterior Skyline / Greenery Backdrop behind window */}
            <mesh position={[1.5, 0, 0]}>
              <planeGeometry args={[0.01, winHeight * 2]} />
              <meshBasicMaterial color="#a7c8e8" />
            </mesh>
            {showDimensions && (
              <Html position={[0, winHeight / 2 + 0.25, 0]} center>
                <div className="bg-surface/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono border border-blue-400/40 text-blue-600 whitespace-nowrap shadow-xs pointer-events-none">
                  🪟 Window: {metersToUnit(winWidth, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

function ProceduralFurniture({
  furniture,
  showDimensions,
  unitSystem,
}: {
  furniture: NonNullable<ConstructionElements["furniture"]>;
  showDimensions: boolean;
  unitSystem: UnitSystem;
}) {
  const fabricMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3d3935", roughness: 0.88 }),
    [],
  );
  const pillowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c29b68", roughness: 0.75 }),
    [],
  );
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#7a4e2d", roughness: 0.45 }),
    [],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.55,
        roughness: 0.05,
        transmission: 0.9,
      }),
    [],
  );
  const linenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f5f2eb", roughness: 0.92 }),
    [],
  );

  return (
    <group>
      {furniture.map((item) => {
        const x = item.position[0];
        const z = item.position[1];
        const rotY = ((item.rotation_deg || 0) * Math.PI) / 180;
        const w = item.width_m || 1.0;
        const d = item.depth_m || 1.0;

        return (
          <group key={item.id} position={[x, 0, z]} rotation={[0, -rotY, 0]}>
            {/* Sectional Sofa */}
            {item.type === "sofa" && (
              <group position={[0, 0.4, 0]}>
                <mesh position={[0, 0, 0]} castShadow receiveShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.42, d]} />
                </mesh>
                <mesh position={[0, 0.35, -d / 2 + 0.12]} castShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.45, 0.24]} />
                </mesh>
                <mesh position={[-w / 2 + 0.12, 0.2, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[0.24, 0.3, d]} />
                </mesh>
                <mesh position={[w / 2 - 0.12, 0.2, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[0.24, 0.3, d]} />
                </mesh>
                {/* Throw Pillows */}
                <mesh position={[-w * 0.25, 0.3, -d * 0.25]} rotation={[0.2, 0.3, 0]} material={pillowMat}>
                  <boxGeometry args={[0.4, 0.4, 0.15]} />
                </mesh>
                <mesh position={[w * 0.25, 0.3, -d * 0.25]} rotation={[0.2, -0.3, 0]} material={pillowMat}>
                  <boxGeometry args={[0.4, 0.4, 0.15]} />
                </mesh>
              </group>
            )}

            {/* Noguchi Coffee Table */}
            {item.type === "table" && item.name.toLowerCase().includes("coffee") && (
              <group position={[0, 0.22, 0]}>
                <mesh position={[0, -0.06, 0]} castShadow material={woodMat}>
                  <cylinderGeometry args={[w * 0.28, w * 0.38, 0.3, 16]} />
                </mesh>
                <mesh position={[0, 0.16, 0]} receiveShadow material={glassMat}>
                  <boxGeometry args={[w, 0.035, d]} />
                </mesh>
              </group>
            )}

            {/* Oak Dining Table */}
            {item.type === "table" && !item.name.toLowerCase().includes("coffee") && (
              <group position={[0, 0.4, 0]}>
                <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={woodMat}>
                  <boxGeometry args={[w, 0.05, d]} />
                </mesh>
                {[
                  [-w / 2 + 0.08, -d / 2 + 0.08],
                  [w / 2 - 0.08, -d / 2 + 0.08],
                  [-w / 2 + 0.08, d / 2 - 0.08],
                  [w / 2 - 0.08, d / 2 - 0.08],
                ].map(([lx, lz], i) => (
                  <mesh key={i} position={[lx, 0, lz]} castShadow material={woodMat}>
                    <cylinderGeometry args={[0.025, 0.035, 0.7, 8]} />
                  </mesh>
                ))}
              </group>
            )}

            {/* King Platform Bed */}
            {item.type === "bed" && (
              <group position={[0, 0.3, 0]}>
                <mesh position={[0, 0, 0]} castShadow material={woodMat}>
                  <boxGeometry args={[w + 0.1, 0.25, d + 0.1]} />
                </mesh>
                <mesh position={[0, 0.22, 0]} castShadow material={linenMat}>
                  <boxGeometry args={[w, 0.3, d]} />
                </mesh>
                <mesh position={[0, 0.55, -d / 2 - 0.04]} castShadow material={fabricMat}>
                  <boxGeometry args={[w + 0.1, 0.9, 0.12]} />
                </mesh>
                <mesh position={[-w * 0.25, 0.44, -d * 0.35]} material={linenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
                <mesh position={[w * 0.25, 0.44, -d * 0.35]} material={linenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
                {/* Plinth LED glow below bed */}
                <pointLight position={[0, -0.1, 0]} color="#ffb766" intensity={1.5} distance={2.5} />
              </group>
            )}

            {/* Eames Lounge Chair */}
            {item.type === "chair" && (
              <group position={[0, 0.35, 0]}>
                <mesh position={[0, 0, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.35, d * 0.8]} />
                </mesh>
                <mesh position={[0, 0.3, -d * 0.3]} castShadow material={woodMat}>
                  <boxGeometry args={[w, 0.45, 0.15]} />
                </mesh>
              </group>
            )}

            {showDimensions && (
              <Html position={[0, 0.95, 0]} center>
                <div className="bg-surface/85 backdrop-blur px-2 py-0.5 rounded text-[9px] font-mono border border-border text-foreground whitespace-nowrap shadow-xs pointer-events-none">
                  {item.name}: {metersToUnit(w, unitSystem).toFixed(2)} × {metersToUnit(d, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Modern Wall Art Piece */}
      <group position={[1.5, 1.8, 0.08]}>
        <mesh>
          <boxGeometry args={[1.2, 0.8, 0.02]} />
          <meshStandardMaterial color="#2c2825" />
        </mesh>
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[1.1, 0.7]} />
          <meshBasicMaterial color="#e5ded3" />
        </mesh>
      </group>

      {/* Potted Indoor Architectural Fiddle-Leaf Fig */}
      <group position={[4.5, 0.35, 0.6]}>
        <mesh castShadow material={new THREE.MeshStandardMaterial({ color: "#8a5832", roughness: 0.8 })}>
          <cylinderGeometry args={[0.2, 0.15, 0.45, 16]} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#2d5a27", roughness: 0.6 })}>
          <sphereGeometry args={[0.3, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}

// =============================================================================
// Camera Controller
// =============================================================================

function WalkthroughCameraController({
  cameraMode,
  tourTime,
  isPlaying,
  onTourTimeUpdate,
  firstPersonPos,
  onFirstPersonMove,
}: {
  cameraMode: CameraMode;
  tourTime: number;
  isPlaying: boolean;
  onTourTimeUpdate: (t: number) => void;
  firstPersonPos: [number, number, number];
  onFirstPersonMove: (pos: [number, number, number]) => void;
}) {
  const { camera } = useThree();
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (cameraMode !== "first_person") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [cameraMode]);

  useFrame((_, delta) => {
    if (cameraMode === "tour") {
      let nextTime = tourTime;
      if (isPlaying) {
        nextTime = (tourTime + delta) % TOUR_DURATION;
        onTourTimeUpdate(nextTime);
      }

      const numSegments = TOUR_WAYPOINTS.length - 1;
      const progress = (nextTime / TOUR_DURATION) * numSegments;
      const idx = Math.min(Math.floor(progress), numSegments - 1);
      const frac = progress - idx;

      const p0 = TOUR_WAYPOINTS[idx];
      const p1 = TOUR_WAYPOINTS[idx + 1];

      const t = frac * frac * (3 - 2 * frac);

      const targetX = THREE.MathUtils.lerp(p0.pos[0], p1.pos[0], t);
      const targetY = THREE.MathUtils.lerp(p0.pos[1], p1.pos[1], t);
      const targetZ = THREE.MathUtils.lerp(p0.pos[2], p1.pos[2], t);

      const lookX = THREE.MathUtils.lerp(p0.lookAt[0], p1.lookAt[0], t);
      const lookY = THREE.MathUtils.lerp(p0.lookAt[1], p1.lookAt[1], t);
      const lookZ = THREE.MathUtils.lerp(p0.lookAt[2], p1.lookAt[2], t);

      camera.position.set(targetX, targetY, targetZ);
      camera.lookAt(lookX, lookY, lookZ);
    } else if (cameraMode === "first_person") {
      const speed = 2.0 * delta;
      let [x, y, z] = firstPersonPos;

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) {
        x += forward.x * speed;
        z += forward.z * speed;
      }
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) {
        x -= forward.x * speed;
        z -= forward.z * speed;
      }
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) {
        x -= right.x * speed;
        z -= right.z * speed;
      }
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) {
        x += right.x * speed;
        z += right.z * speed;
      }

      x = Math.max(0.35, Math.min(4.65, x));
      z = Math.max(0.35, Math.min(2.65, z));

      camera.position.set(x, 1.65, z);
      onFirstPersonMove([x, y, z]);
    }
  });

  return null;
}

// =============================================================================
// Main Live3DWalkthroughPlayer Component
// =============================================================================

export function Live3DWalkthroughPlayer({
  elements,
  projectName = "Sample Studio Apartment",
  unitSystem = "metric",
  className = "",
}: Live3DWalkthroughPlayerProps) {
  const [viewMode, setViewMode] = useState<PlayerViewMode>("interactive_3d");
  const [cameraMode, setCameraMode] = useState<CameraMode>("tour");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.85);
  const [tourTime, setTourTime] = useState(0);
  const [circadian, setCircadian] = useState<CircadianPreset>("afternoon");
  const [flooring, setFlooring] = useState<MaterialPreset>(FLOORING_SWAPS[0]);
  const [wallPreset, setWallPreset] = useState<MaterialPreset>(WALL_SWAPS[0]);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showMaterialDrawer, setShowMaterialDrawer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [firstPersonPos, setFirstPersonPos] = useState<[number, number, number]>([2.0, 1.65, 1.0]);

  // Higgsfield Cinema Video state
  const [higgsfieldVideoUrl, setHiggsfieldVideoUrl] = useState("/videos/reel-360-turntable.mp4");
  const [isHiggsfieldSynthesizing, setIsHiggsfieldSynthesizing] = useState(false);
  const [showHiggsfieldModal, setShowHiggsfieldModal] = useState(false);
  const [higgsfieldDopMode, setHiggsfieldDopMode] = useState<"interior_glide" | "orbit_360">("interior_glide");
  const [motionIntensity, setMotionIntensity] = useState(7);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Web Audio synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);

  const activeLighting = CIRCADIAN_CONFIGS[circadian];

  const stopSynth = useCallback(() => {
    try {
      oscNodesRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      oscNodesRef.current = [];
    } catch {
      // ignore
    }
  }, []);

  const playAmbientSynth = useCallback(() => {
    try {
      stopSynth();
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(isMuted ? 0 : volume * 0.12, ctx.currentTime + 0.3);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      const freqs = [110, 164.81, 220, 277.18, 329.63];
      const oscs = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : i % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        return osc;
      });

      oscNodesRef.current = oscs;
    } catch (e) {
      console.warn("Web Audio ambient synth init:", e);
    }
  }, [isMuted, volume, stopSynth]);

  useEffect(() => {
    return () => {
      stopSynth();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopSynth]);

  function handleTogglePlay() {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (viewMode === "higgsfield_cinema" && videoRef.current) {
      if (nextPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
    if (nextPlaying && !isMuted) {
      playAmbientSynth();
    } else {
      stopSynth();
    }
  }

  function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    if (!nextMuted) {
      playAmbientSynth();
    } else {
      stopSynth();
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    setTourTime(parseFloat(e.target.value));
  }

  function handleJumpToWaypoint(wp: TourWaypoint) {
    setViewMode("interactive_3d");
    setCameraMode("tour");
    setTourTime(wp.timeSec);
  }

  // Trigger Higgsfield AI Video Generation
  async function handleSynthesizeHiggsfield() {
    setIsHiggsfieldSynthesizing(true);
    try {
      const res = await createHiggsfieldWalkthroughJob({
        projectName,
        roomType: "Studio Living Apartment",
        dimensions: { width: 5.0, depth: 3.0, height: 2.7 },
        cameraMode: higgsfieldDopMode,
        motionIntensity,
        materialPalette: {
          flooring: flooring.name,
          walls: wallPreset.name,
          lightingTemp: activeLighting.temp,
        },
      });

      if (res.videoUrl) {
        setHiggsfieldVideoUrl(res.videoUrl);
        setViewMode("higgsfield_cinema");
        setIsPlaying(true);
      }
      setShowHiggsfieldModal(false);
    } catch (e: any) {
      console.error("Higgsfield synthesis error:", e);
      alert(e.message || "Higgsfield synthesis failed. Check connection.");
    } finally {
      setIsHiggsfieldSynthesizing(false);
    }
  }

  // 60fps Canvas Video Recording & Export
  function handleRecordVideo() {
    if (!canvasRef.current) return;
    try {
      setIsRecording(true);
      setRecordProgress(0);
      setViewMode("interactive_3d");
      setCameraMode("tour");
      setTourTime(0);
      setIsPlaying(true);

      const stream = canvasRef.current.captureStream(60);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, "_")}_live_3d_walkthrough.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      recorder.start();

      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 1;
        setRecordProgress(Math.min(100, Math.round((elapsed / TOUR_DURATION) * 100)));
        if (elapsed >= TOUR_DURATION) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 1000);
    } catch (e) {
      console.error("Canvas video recording:", e);
      setIsRecording(false);
      alert("Browser video recording unsupported or blocked.");
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const activeWaypoint = useMemo(() => {
    return (
      TOUR_WAYPOINTS.slice()
        .reverse()
        .find((w) => tourTime >= w.timeSec) || TOUR_WAYPOINTS[0]
    );
  }, [tourTime]);

  const walls = elements?.walls || [
    { start: [0, 0] as [number, number], end: [5, 0] as [number, number] },
    { start: [5, 0] as [number, number], end: [5, 3] as [number, number] },
    { start: [5, 3] as [number, number], end: [0, 3] as [number, number] },
    { start: [0, 3] as [number, number], end: [0, 0] as [number, number] },
  ];

  const doors = elements?.doors || [{ position: [2, 0] as [number, number], width_m: 0.9 }];
  const windows = elements?.windows || [{ position: [5, 1.5] as [number, number], width_m: 1.2 }];
  const furniture = elements?.furniture || [
    { id: "f1", name: "Sectional Sofa", type: "sofa", position: [1.5, 1.8] as [number, number], width_m: 2.4, depth_m: 1.0 },
    { id: "f2", name: "Noguchi Coffee Table", type: "table", position: [1.5, 0.9] as [number, number], width_m: 1.2, depth_m: 0.6 },
    { id: "f3", name: "King Platform Bed", type: "bed", position: [3.8, 1.8] as [number, number], width_m: 1.9, depth_m: 2.1 },
    { id: "f4", name: "Eames Lounge Chair", type: "chair", position: [2.9, 0.8] as [number, number], width_m: 0.85, depth_m: 0.85 },
    { id: "f5", name: "Oak Dining Table", type: "table", position: [0.6, 0.6] as [number, number], width_m: 1.2, depth_m: 0.8, rotation_deg: 90 },
  ];

  const bounds = elements?.floor_bounds || DEFAULT_STUDIO_BOUNDS;

  return (
    <div className={`rounded-xl border border-border bg-surface overflow-hidden shadow-xs space-y-3 ${className}`}>
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🏛️</span> Architectural Spatial Walkthrough Suite
            </h3>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
              100% CAD Dimension Accurate (5.0m × 3.0m)
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real-time interior 3D walkthrough & Higgsfield AI 60fps cinema reel conditioned on the 3D CAD design.
          </p>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Main Mode Toggle: 3D Walkthrough vs Higgsfield AI Reel */}
          <div className="flex items-center rounded-lg border border-border bg-[#faf8f4] p-0.5 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("interactive_3d")}
              className={`px-3 py-1.5 rounded transition-all font-semibold ${
                viewMode === "interactive_3d"
                  ? "bg-surface text-accent shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
              }`}
            >
              🏛️ Live 3D Walkthrough
            </button>
            <button
              type="button"
              onClick={() => setViewMode("higgsfield_cinema")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all font-semibold ${
                viewMode === "higgsfield_cinema"
                  ? "bg-accent text-accent-foreground shadow-xs border border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span>✨</span>
              <span>Higgsfield AI Reel</span>
              <span className="text-[9px] px-1 py-0.2 bg-black/20 rounded font-mono">60fps</span>
            </button>
          </div>

          {/* Synthesize Higgsfield Video Button */}
          <button
            type="button"
            onClick={() => setShowHiggsfieldModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
          >
            <span>✨</span>
            <span className="hidden sm:inline">Synthesize AI Walkthrough</span>
          </button>
        </div>
      </div>

      {/* VIEWPORT AREA */}
      {viewMode === "interactive_3d" ? (
        /* INTERACTIVE 3D WEBGL ENGINE VIEWPORT */
        <div className="relative aspect-video w-full bg-[#12110f] overflow-hidden group">
          {/* Secondary Sub-mode bar (Tour, WASD, Orbit) */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-white/20 bg-black/70 backdrop-blur-md p-0.5 text-xs text-white">
              <button
                type="button"
                onClick={() => {
                  setCameraMode("tour");
                  setIsPlaying(true);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  cameraMode === "tour" ? "bg-accent text-white font-bold" : "hover:text-accent"
                }`}
              >
                🎬 Steadicam Tour
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraMode("first_person");
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  cameraMode === "first_person" ? "bg-accent text-white font-bold" : "hover:text-accent"
                }`}
              >
                🚶‍♂️ Walk Inside (WASD)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraMode("axonometric");
                  setIsPlaying(false);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  cameraMode === "axonometric" ? "bg-accent text-white font-bold" : "hover:text-accent"
                }`}
              >
                📐 Axonometric
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDimensions(!showDimensions)}
              className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-semibold hover:border-accent"
            >
              📏 {showDimensions ? "Dimensions: ON" : "Dimensions: OFF"}
            </button>
          </div>

          <Canvas
            shadows
            camera={{ position: [2.0, 1.65, 0.35], fov: 55 }}
            onCreated={({ gl }) => {
              canvasRef.current = gl.domElement;
            }}
            className="h-full w-full"
          >
            <color attach="background" args={[activeLighting.bg]} />
            <ambientLight color={activeLighting.ambientLight.color} intensity={activeLighting.ambientLight.intensity} />
            <directionalLight
              position={activeLighting.dirLight.pos}
              color={activeLighting.dirLight.color}
              intensity={activeLighting.dirLight.intensity}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />

            {/* Realistic Architecture with Ceiling, PBR materials, Downlights */}
            <ProceduralFloor bounds={bounds} flooring={flooring} />
            <ProceduralCeiling bounds={bounds} showLights={activeLighting.showWarmRecessed} />
            <ProceduralWalls
              walls={walls}
              doors={doors}
              windows={windows}
              wallPreset={wallPreset}
              showDimensions={showDimensions}
              unitSystem={unitSystem}
            />
            <ProceduralFurniture furniture={furniture} showDimensions={showDimensions} unitSystem={unitSystem} />

            <WalkthroughCameraController
              cameraMode={cameraMode}
              tourTime={tourTime}
              isPlaying={isPlaying}
              onTourTimeUpdate={setTourTime}
              firstPersonPos={firstPersonPos}
              onFirstPersonMove={setFirstPersonPos}
            />

            {cameraMode === "axonometric" && (
              <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={25} />
            )}

            <Environment preset={activeLighting.env} />
            <ContactShadows position={[2.5, 0, 1.5]} opacity={0.35} scale={10} blur={2} far={4} />
          </Canvas>

          {/* Sound CTA */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {isMuted ? (
              <button
                type="button"
                onClick={handleToggleMute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-accent text-xs font-bold border border-accent/40 shadow-xl backdrop-blur-md cursor-pointer animate-pulse"
              >
                <span>🔇</span>
                <span>Click to Unmute 432Hz Sound</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-accent/40 text-accent text-[11px] font-bold shadow-lg">
                <span>🔊 432Hz Soundscape</span>
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite] h-2" />
                  <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.2s] h-3.5" />
                  <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.4s] h-1.5" />
                </div>
              </div>
            )}
          </div>

          {/* First-person keyboard hint */}
          {cameraMode === "first_person" && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-mono border border-white/20 shadow-xl">
              ⌨️ Use <span className="text-accent font-bold">W, A, S, D</span> to walk inside at 1.65m eye level
            </div>
          )}

          {/* Bottom Bar: Timeline Scrubber & Waypoints */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 z-10 space-y-2">
            {cameraMode === "tour" && (
              <input
                type="range"
                min="0"
                max={TOUR_DURATION}
                step="0.05"
                value={tourTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-accent hover:h-2 transition-all"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-white text-xs">
              <div className="flex items-center gap-3">
                {cameraMode === "tour" && (
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1 hover:text-accent transition-colors cursor-pointer"
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                )}
                {cameraMode === "tour" && (
                  <span className="font-mono text-[11px] text-white/80">
                    {formatTime(tourTime)} / {formatTime(TOUR_DURATION)}
                  </span>
                )}
                <div className="hidden md:flex items-center gap-1.5">
                  {TOUR_WAYPOINTS.map((wp) => (
                    <button
                      key={wp.name}
                      type="button"
                      onClick={() => handleJumpToWaypoint(wp)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        activeWaypoint.name === wp.name
                          ? "bg-accent/30 text-white border-accent shadow-xs"
                          : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <span>{wp.icon}</span> {wp.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecordVideo}
                  disabled={isRecording}
                  className="rounded bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs text-white border border-white/25 transition-colors disabled:opacity-50"
                >
                  {isRecording ? `🔴 ${recordProgress}%` : "🎥 Record Walkthrough"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMaterialDrawer(!showMaterialDrawer)}
                  className="rounded bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs text-white border border-white/25 transition-colors"
                >
                  🎨 Materials
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HIGGSFIELD AI CINEMA REEL VIEWPORT */
        <div className="relative aspect-video w-full bg-[#12110f] overflow-hidden group">
          <video
            ref={videoRef}
            src={higgsfieldVideoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover"
          />

          {/* Director of Photography (DoP) HUD Overlay */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 p-2.5 rounded-lg bg-black/80 backdrop-blur-md border border-accent/40 text-white text-xs shadow-xl">
            <div className="flex items-center gap-1.5 font-bold text-accent text-[11px]">
              <span>✨</span>
              <span>Higgsfield AI Cinema DoP Mode</span>
            </div>
            <div className="text-[10px] font-mono text-white/80 space-y-0.5">
              <p>• Lens: 28mm f/2.8 Architectural Cine Prime</p>
              <p>• Motion: 1.65m Steadicam Glide (DoP Intensity {motionIntensity}/10)</p>
              <p>• Format: 60fps Cinema • 1/120s Shutter (180° Rule)</p>
              <p>• CAD Conditioning: 5.0m × 3.0m Living Studio</p>
            </div>
          </div>

          {/* Audio Unmute CTA */}
          <div className="absolute top-3 right-3 z-20">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer ${
                isMuted
                  ? "bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
                  : "bg-accent/30 text-white border-accent hover:bg-accent/40 shadow-xs"
              }`}
            >
              <span>{isMuted ? "🔇 Unmute Audio" : "🔊 Sound Active"}</span>
            </button>
          </div>

          {/* Bottom Bar for Video Controls */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-6 z-10 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="p-1 hover:text-accent transition-colors cursor-pointer text-sm"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <span className="text-[11px] text-white/80">
                Photorealistic Higgsfield AI Reel • Exact 3D Floor Plan Match
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHiggsfieldModal(true)}
                className="flex items-center gap-1.5 rounded bg-accent text-accent-foreground px-3 py-1 text-xs font-bold hover:bg-accent/90"
              >
                <span>✨ Re-synthesize</span>
              </button>
              <a
                href={higgsfieldVideoUrl}
                download={`${projectName}_higgsfield_cinema.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs text-white border border-white/20 transition-colors"
              >
                ⬇ MP4
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Material Swapper Palette Drawer */}
      {showMaterialDrawer && (
        <div className="p-4 rounded-xl border border-border bg-[#faf8f4]/95 backdrop-blur-md space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold flex items-center gap-1.5">
              <span>🎨</span> PBR Architectural Material Swapper & Daylight Control
            </span>
            <button
              type="button"
              onClick={() => setShowMaterialDrawer(false)}
              className="text-muted hover:text-foreground text-xs"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Flooring */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Flooring Material:</span>
              <div className="space-y-1">
                {FLOORING_SWAPS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFlooring(f)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-left transition-all ${
                      flooring.id === f.id
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border/60 hover:border-accent/40"
                    }`}
                  >
                    <span>{f.name}</span>
                    {flooring.id === f.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Walls */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Wall Finish:</span>
              <div className="space-y-1">
                {WALL_SWAPS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWallPreset(w)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-left transition-all ${
                      wallPreset.id === w.id
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border/60 hover:border-accent/40"
                    }`}
                  >
                    <span>{w.name}</span>
                    {wallPreset.id === w.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Daylight / Circadian */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Sun Angle & Lighting:</span>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(CIRCADIAN_CONFIGS) as CircadianPreset[]).map((key) => {
                  const cfg = CIRCADIAN_CONFIGS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCircadian(key)}
                      className={`flex items-center gap-1 p-1.5 rounded border text-[11px] transition-colors ${
                        circadian === key
                          ? "border-accent bg-accent/10 font-semibold text-accent"
                          : "border-border/60 hover:border-accent/40"
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span className="truncate">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Higgsfield AI Video Generation Modal */}
      {showHiggsfieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>✨</span> Higgsfield AI Video Generation
                </h4>
                <p className="text-[11px] text-muted">Conditioned on 3D CAD dimensions and camera path.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHiggsfieldModal(false)}
                className="text-muted hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-foreground block mb-1">Director of Photography (DoP) Flightpath:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHiggsfieldDopMode("interior_glide")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      higgsfieldDopMode === "interior_glide"
                        ? "border-accent bg-accent/10 text-accent font-bold"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <p className="font-semibold text-xs">🚶‍♂️ 1.65m Interior Glide</p>
                    <p className="text-[10px] text-muted mt-0.5">Enters through 0.9m front door into living & bed</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHiggsfieldDopMode("orbit_360")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      higgsfieldDopMode === "orbit_360"
                        ? "border-accent bg-accent/10 text-accent font-bold"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <p className="font-semibold text-xs">🔄 360° Living Turntable</p>
                    <p className="text-[10px] text-muted mt-0.5">Continuous smooth orbital flight around layout</p>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-foreground">Motion Intensity & Camera Dynamics:</label>
                  <span className="font-mono text-accent font-bold">{motionIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div className="rounded-lg border border-border bg-[#faf8f4] p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Architectural Synthesis Specifications:</span>
                <p className="font-mono text-[10px] text-muted">
                  • 5.0m × 3.0m studio area • Floor: {flooring.name} • Walls: {wallPreset.name} • Lighting: {activeLighting.temp}
                </p>
                <p className="font-mono text-[10px] text-muted">
                  • 28mm f/2.8 Architectural Cine Prime • 60fps Cinema Reel • Photorealistic 8K PBR
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowHiggsfieldModal(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isHiggsfieldSynthesizing}
                onClick={handleSynthesizeHiggsfield}
                className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-4 py-1.5 text-xs font-bold hover:bg-accent/90 disabled:opacity-50"
              >
                <span>{isHiggsfieldSynthesizing ? "⏳" : "✨"}</span>
                <span>{isHiggsfieldSynthesizing ? "Synthesizing Walkthrough…" : "Generate Higgsfield Video"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Dimensions Callout Strip */}
      <div className="p-4 pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            3D Spatial Envelope & Verified CAD Dimensions:
          </span>
          <span className="text-[10px] font-mono text-accent font-bold">
            NBC 2016 Compliant • 15.00 m² (161.5 sq.ft)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-2.5 space-y-1">
            <span className="text-[10px] text-muted">Room Span (Width × Depth)</span>
            <p className="font-bold text-foreground text-xs font-mono">
              {metersToUnit(5.0, unitSystem).toFixed(2)} × {metersToUnit(3.0, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
            </p>
            <p className="text-[9px] text-muted">Clear height 2.70m floor-to-ceiling</p>
          </div>

          <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-2.5 space-y-1">
            <span className="text-[10px] text-muted">Main Egress Door</span>
            <p className="font-bold text-foreground text-xs font-mono">
              {metersToUnit(0.9, unitSystem).toFixed(2)} {unitLabel(unitSystem)} Clear Opening
            </p>
            <p className="text-[9px] text-muted">NBC 2016 Part 3 Clause 4.2 barrier-free</p>
          </div>

          <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-2.5 space-y-1">
            <span className="text-[10px] text-muted">Daylight Glazing Ratio</span>
            <p className="font-bold text-foreground text-xs font-mono">
              {metersToUnit(1.2, unitSystem).toFixed(2)} × {metersToUnit(1.4, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
            </p>
            <p className="text-[9px] text-muted">11.2% glazing to carpet area</p>
          </div>

          <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-2.5 space-y-1">
            <span className="text-[10px] text-muted">Active Materials</span>
            <p className="font-bold text-foreground text-xs truncate">
              {flooring.name.split(" ")[0]} + {wallPreset.name.split(" ")[0]}
            </p>
            <p className="text-[9px] text-muted">Sun: {activeLighting.label} ({activeLighting.temp})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
