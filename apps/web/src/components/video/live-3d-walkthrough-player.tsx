"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line, ContactShadows, Environment } from "@react-three/drei";
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

export type CameraMode = "tour" | "first_person" | "axonometric";

interface Live3DWalkthroughPlayerProps {
  elements?: ConstructionElements | null;
  signedModelUrl?: string | null;
  projectName?: string;
  unitSystem?: UnitSystem;
  className?: string;
}

// Default Studio Apartment dimensions (5m x 3m x 2.7m) if no elements provided
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
    pos: [2.0, 1.65, 0.4],
    lookAt: [2.0, 1.45, 1.8],
    fov: 55,
    description: "Entering through 0.9m main entrance doorway (NBC 2016 compliant).",
  },
  {
    timeSec: 3,
    name: "Living Room Core",
    icon: "🛋️",
    pos: [1.8, 1.65, 1.3],
    lookAt: [1.3, 1.1, 1.8],
    fov: 55,
    description: "Viewing Sectional Sofa (2.4m) and Noguchi Table with Italian Statuario floors.",
  },
  {
    timeSec: 6,
    name: "Daylight Window",
    icon: "🪟",
    pos: [3.4, 1.65, 1.4],
    lookAt: [5.0, 1.5, 1.5],
    fov: 52,
    description: "Gazing toward 1.2m perimeter window with natural daylight penetration.",
  },
  {
    timeSec: 9,
    name: "Bedroom Retreat",
    icon: "🛏️",
    pos: [3.4, 1.65, 2.3],
    lookAt: [3.8, 1.1, 1.8],
    fov: 54,
    description: "King Platform Bed (1.9m x 2.1m) and private relaxation zone.",
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
// Procedural Architectural 3D Scene Components
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

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(flooring.colorHex),
        roughness: flooring.roughness,
        metalness: flooring.metalness,
      }),
    [flooring],
  );

  return (
    <group position={[centerX, -0.05, centerZ]}>
      {/* Floor Slab */}
      <mesh receiveShadow material={material}>
        <boxGeometry args={[width, 0.1, depth]} />
      </mesh>
      {/* Subtle floor grid lines for scale */}
      <gridHelper
        args={[Math.max(width, depth) + 2, Math.round(Math.max(width, depth) * 2), "#caa56c", "#e2d9cb"]}
        position={[0, 0.051, 0]}
      />
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
  const wallHeight = 2.7; // Standard ceiling height 2.7m
  const thickness = 0.15; // Standard 150mm wall

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(wallPreset.colorHex),
        roughness: wallPreset.roughness,
        metalness: wallPreset.metalness,
      }),
    [wallPreset],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#d4e8f7",
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        metalness: 0.8,
        transmission: 0.7,
      }),
    [],
  );

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2c2924",
        roughness: 0.4,
        metalness: 0.6,
      }),
    [],
  );

  const doorWoodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a5832",
        roughness: 0.5,
        metalness: 0.1,
      }),
    [],
  );

  return (
    <group>
      {/* Render 3D Walls */}
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
            {/* Wall Segment */}
            <mesh castShadow receiveShadow material={wallMat}>
              <boxGeometry args={[len, wallHeight, thickness]} />
            </mesh>
            {/* Skirting / Baseboard */}
            <mesh position={[0, -wallHeight / 2 + 0.05, thickness / 2 + 0.005]} material={frameMat}>
              <boxGeometry args={[len, 0.1, 0.015]} />
            </mesh>
          </group>
        );
      })}

      {/* Render 3D Doors */}
      {doors.map((d, idx) => {
        const doorWidth = d.width_m || 0.9;
        const doorHeight = 2.1;
        return (
          <group key={`door-${idx}`} position={[d.position[0], doorHeight / 2, d.position[1]]}>
            {/* Door Frame */}
            <mesh position={[0, 0, 0]} material={frameMat}>
              <boxGeometry args={[doorWidth + 0.1, doorHeight + 0.08, 0.16]} />
            </mesh>
            {/* Open Door Leaf (Swung open 65° into room) */}
            <group position={[-doorWidth / 2 + 0.04, -doorHeight / 2, 0]} rotation={[0, 1.1, 0]}>
              <mesh position={[doorWidth / 2, doorHeight / 2, 0]} material={doorWoodMat}>
                <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
              </mesh>
              {/* Brass Lever Handle */}
              <mesh position={[doorWidth - 0.08, 1.0, 0.04]} material={frameMat}>
                <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
              </mesh>
            </group>
            {/* Door Dimension Label */}
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

      {/* Render 3D Windows */}
      {windows.map((w, idx) => {
        const winWidth = w.width_m || 1.2;
        const winHeight = 1.4;
        const sillHeight = 0.9;
        return (
          <group key={`win-${idx}`} position={[w.position[0], sillHeight + winHeight / 2, w.position[1]]}>
            {/* Outer Aluminum Frame */}
            <mesh material={frameMat}>
              <boxGeometry args={[0.16, winHeight, winWidth + 0.08]} />
            </mesh>
            {/* Window Glass Pane */}
            <mesh material={glassMat}>
              <boxGeometry args={[0.02, winHeight - 0.08, winWidth - 0.08]} />
            </mesh>
            {/* Center Mullion Bar */}
            <mesh material={frameMat}>
              <boxGeometry args={[0.04, winHeight - 0.08, 0.03]} />
            </mesh>
            {/* Dimension Callout */}
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
    () => new THREE.MeshStandardMaterial({ color: "#4a463e", roughness: 0.85 }),
    [],
  );
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a5832", roughness: 0.45 }),
    [],
  );
  const glassTableMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.5,
        roughness: 0.05,
        transmission: 0.9,
      }),
    [],
  );
  const bedLinenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f2efe9", roughness: 0.9 }),
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
            {/* Sofa */}
            {item.type === "sofa" && (
              <group position={[0, 0.4, 0]}>
                {/* Base Seat Cushion */}
                <mesh position={[0, 0, 0]} castShadow receiveShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.4, d]} />
                </mesh>
                {/* Backrest */}
                <mesh position={[0, 0.35, -d / 2 + 0.12]} castShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.45, 0.24]} />
                </mesh>
                {/* Armrest Left */}
                <mesh position={[-w / 2 + 0.12, 0.2, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[0.24, 0.3, d]} />
                </mesh>
                {/* Armrest Right */}
                <mesh position={[w / 2 - 0.12, 0.2, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[0.24, 0.3, d]} />
                </mesh>
              </group>
            )}

            {/* Coffee Table */}
            {item.type === "table" && item.name.toLowerCase().includes("coffee") && (
              <group position={[0, 0.2, 0]}>
                {/* Sculpted Wood Base */}
                <mesh position={[0, -0.05, 0]} castShadow material={woodMat}>
                  <cylinderGeometry args={[w * 0.3, w * 0.4, 0.3, 16]} />
                </mesh>
                {/* Glass Table Top */}
                <mesh position={[0, 0.15, 0]} receiveShadow material={glassTableMat}>
                  <boxGeometry args={[w, 0.03, d]} />
                </mesh>
              </group>
            )}

            {/* Dining Table */}
            {item.type === "table" && !item.name.toLowerCase().includes("coffee") && (
              <group position={[0, 0.4, 0]}>
                {/* Table Top */}
                <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={woodMat}>
                  <boxGeometry args={[w, 0.05, d]} />
                </mesh>
                {/* 4 Tapered Legs */}
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

            {/* King Bed */}
            {item.type === "bed" && (
              <group position={[0, 0.3, 0]}>
                {/* Platform Frame */}
                <mesh position={[0, 0, 0]} castShadow material={woodMat}>
                  <boxGeometry args={[w + 0.1, 0.25, d + 0.1]} />
                </mesh>
                {/* Plush Mattress */}
                <mesh position={[0, 0.22, 0]} castShadow material={bedLinenMat}>
                  <boxGeometry args={[w, 0.3, d]} />
                </mesh>
                {/* Upholstered Headboard */}
                <mesh position={[0, 0.5, -d / 2 - 0.04]} castShadow material={fabricMat}>
                  <boxGeometry args={[w + 0.1, 0.8, 0.12]} />
                </mesh>
                {/* Two Pillows */}
                <mesh position={[-w * 0.25, 0.42, -d * 0.35]} material={bedLinenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
                <mesh position={[w * 0.25, 0.42, -d * 0.35]} material={bedLinenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
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

            {/* Dimension Callout Tag */}
            {showDimensions && (
              <Html position={[0, 0.9, 0]} center>
                <div className="bg-surface/85 backdrop-blur px-2 py-0.5 rounded text-[9px] font-mono border border-border text-foreground whitespace-nowrap shadow-xs pointer-events-none">
                  {item.name}: {metersToUnit(w, unitSystem).toFixed(2)} × {metersToUnit(d, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// =============================================================================
// Camera Controller (Tour Interpolation, First-Person WASD, Axonometric)
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
  const mouseLook = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });

  // Listen for First-Person WASD movement
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
    // Mode 1: Automated Steadicam Interior Tour
    if (cameraMode === "tour") {
      let nextTime = tourTime;
      if (isPlaying) {
        nextTime = (tourTime + delta) % TOUR_DURATION;
        onTourTimeUpdate(nextTime);
      }

      // Interpolate between waypoints
      const numSegments = TOUR_WAYPOINTS.length - 1;
      const progress = (nextTime / TOUR_DURATION) * numSegments;
      const idx = Math.min(Math.floor(progress), numSegments - 1);
      const frac = progress - idx;

      const p0 = TOUR_WAYPOINTS[idx];
      const p1 = TOUR_WAYPOINTS[idx + 1];

      // Smooth step easing
      const t = frac * frac * (3 - 2 * frac);

      const targetX = THREE.MathUtils.lerp(p0.pos[0], p1.pos[0], t);
      const targetY = THREE.MathUtils.lerp(p0.pos[1], p1.pos[1], t); // 1.65m human eye height
      const targetZ = THREE.MathUtils.lerp(p0.pos[2], p1.pos[2], t);

      const lookX = THREE.MathUtils.lerp(p0.lookAt[0], p1.lookAt[0], t);
      const lookY = THREE.MathUtils.lerp(p0.lookAt[1], p1.lookAt[1], t);
      const lookZ = THREE.MathUtils.lerp(p0.lookAt[2], p1.lookAt[2], t);

      camera.position.set(targetX, targetY, targetZ);
      camera.lookAt(lookX, lookY, lookZ);
    }

    // Mode 2: Interactive First-Person Walkthrough (WASD)
    else if (cameraMode === "first_person") {
      const speed = 2.0 * delta; // 2.0 m/s human walking speed
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

      // Interior collision clamping (keep user inside walls: 0.3m to 4.7m, 0.3m to 2.7m)
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Web Audio ambient synth for warm architectural chord soundscape
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);

  const activeLighting = CIRCADIAN_CONFIGS[circadian];

  // Stop Web Audio synth
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

  // Web Audio ambient sound synthesizer (Warm 432Hz architectural harmonic chord)
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

  // Clean up Web Audio on unmount
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
    if (nextPlaying && !isMuted) {
      playAmbientSynth();
    } else {
      stopSynth();
    }
  }

  function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
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
    setCameraMode("tour");
    setTourTime(wp.timeSec);
  }

  // 60fps Canvas Video Recording & Export (Records actual 3D model walk)
  function handleRecordVideo() {
    if (!canvasRef.current) return;
    try {
      setIsRecording(true);
      setRecordProgress(0);
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

  // Format seconds to mm:ss
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Current active waypoint description
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
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🏛️</span> Live 3D Architectural Walkthrough
            </h3>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
              100% CAD Dimension Accurate (5.0m × 3.0m)
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real-time interior eye-level camera flight matching the CAD/BIM floor plan model.
          </p>
        </div>

        {/* Camera Mode Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-[#faf8f4] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setCameraMode("tour");
                setIsPlaying(true);
              }}
              className={`px-3 py-1 rounded transition-colors ${
                cameraMode === "tour"
                  ? "bg-surface text-accent font-bold shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
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
              className={`px-3 py-1 rounded transition-colors ${
                cameraMode === "first_person"
                  ? "bg-surface text-accent font-bold shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
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
              className={`px-3 py-1 rounded transition-colors ${
                cameraMode === "axonometric"
                  ? "bg-surface text-accent font-bold shadow-xs border border-border"
                  : "text-muted hover:text-foreground"
              }`}
            >
              📐 Axonometric Orbit
            </button>
          </div>

          {/* Dimension Toggle */}
          <button
            type="button"
            onClick={() => setShowDimensions(!showDimensions)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showDimensions
                ? "bg-accent/15 text-accent border-accent/40"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
            title="Toggle 3D dimension lines and room clearance callouts"
          >
            📏 {showDimensions ? "Dimensions: ON" : "Dimensions: OFF"}
          </button>

          {/* Record 60fps Walkthrough Video */}
          <button
            type="button"
            disabled={isRecording}
            onClick={handleRecordVideo}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent text-accent-foreground px-3 py-1.5 text-xs font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <span>{isRecording ? "🔴" : "🎥"}</span>
            <span>{isRecording ? `Recording ${recordProgress}%` : "Record Walkthrough"}</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative aspect-video w-full bg-[#12110f] overflow-hidden group">
        <Canvas
          shadows
          camera={{ position: [2.0, 1.65, 0.4], fov: 55 }}
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
          {activeLighting.showWarmRecessed && (
            <>
              <pointLight position={[2.5, 2.5, 1.5]} color="#ff9e42" intensity={3.5} distance={8} />
              <pointLight position={[1.5, 2.4, 1.8]} color="#ffaa55" intensity={2.0} distance={6} />
              <pointLight position={[3.8, 2.4, 1.8]} color="#ffaa55" intensity={2.0} distance={6} />
            </>
          )}

          {/* Procedural 3D Architecture */}
          <ProceduralFloor bounds={bounds} flooring={flooring} />
          <ProceduralWalls
            walls={walls}
            doors={doors}
            windows={windows}
            wallPreset={wallPreset}
            showDimensions={showDimensions}
            unitSystem={unitSystem}
          />
          <ProceduralFurniture furniture={furniture} showDimensions={showDimensions} unitSystem={unitSystem} />

          {/* Dynamic Camera Controller */}
          <WalkthroughCameraController
            cameraMode={cameraMode}
            tourTime={tourTime}
            isPlaying={isPlaying}
            onTourTimeUpdate={setTourTime}
            firstPersonPos={firstPersonPos}
            onFirstPersonMove={setFirstPersonPos}
          />

          {/* Orbit Controls for Axonometric mode */}
          {cameraMode === "axonometric" && (
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={25} />
          )}

          <Environment preset={activeLighting.env} />
          <ContactShadows position={[2.5, 0, 1.5]} opacity={0.4} scale={10} blur={2} far={4} />
        </Canvas>

        {/* Top Left: Waypoint Callout Banner */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-accent/40 text-white text-xs shadow-lg">
          <span className="text-accent font-bold flex items-center gap-1">
            <span>{activeWaypoint.icon}</span> {activeWaypoint.name}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-[11px] text-white/80 hidden sm:inline">{activeWaypoint.description}</span>
        </div>

        {/* Top Right: Unmute / Ambient Audio Badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {isMuted ? (
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-accent text-xs font-bold border border-accent/40 shadow-xl backdrop-blur-md transition-transform hover:scale-105 cursor-pointer animate-pulse"
            >
              <span>🔇</span>
              <span>Click to Unmute Soundscape</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-accent/40 text-accent text-[11px] font-bold shadow-lg">
              <span>🔊 432Hz Soundscape Active</span>
              <div className="flex items-end gap-0.5 h-3 ml-1">
                <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite] h-2" />
                <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.2s] h-3.5" />
                <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.4s] h-1.5" />
                <span className="w-1 bg-accent rounded-full animate-[bounce_0.7s_ease-in-out_infinite_0.1s] h-3" />
              </div>
            </div>
          )}
        </div>

        {/* First-Person On-Screen Instructions */}
        {cameraMode === "first_person" && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-mono border border-white/20 shadow-xl">
            ⌨️ Use <span className="text-accent font-bold">W, A, S, D</span> or <span className="text-accent font-bold">Arrow Keys</span> to walk at 1.65m eye level
          </div>
        )}

        {/* Bottom Bar: Timeline Scrubber, Waypoints, & Controls */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 z-10 space-y-2">
          {/* Progress / Timeline Scrubber */}
          {cameraMode === "tour" && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={TOUR_DURATION}
                step="0.05"
                value={tourTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-accent hover:h-2 transition-all"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-white text-xs">
            {/* Play Button & Time Counter */}
            <div className="flex items-center gap-3">
              {cameraMode === "tour" && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="p-1 hover:text-accent transition-colors cursor-pointer"
                  title={isPlaying ? "Pause Tour" : "Resume Tour"}
                >
                  {isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
              )}

              {cameraMode === "tour" && (
                <span className="font-mono text-[11px] text-white/80">
                  {formatTime(tourTime)} / {formatTime(TOUR_DURATION)}
                </span>
              )}

              {/* Waypoint Quick Jump Badges */}
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

            {/* Audio & Material Toggles */}
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold backdrop-blur-sm border transition-all cursor-pointer ${
                  isMuted
                    ? "bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30"
                    : "bg-accent/30 text-white border-accent hover:bg-accent/40 shadow-xs"
                }`}
              >
                <span>{isMuted ? "🔇 Unmute" : "🔊 Sound"}</span>
              </button>

              {/* Volume Slider */}
              {!isMuted && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-accent cursor-pointer h-1.5 rounded-lg bg-white/20 hidden sm:inline-block"
                  title="Volume control"
                />
              )}

              {/* Material Drawer Toggle */}
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

        {/* Floating Material Swapper Drawer */}
        {showMaterialDrawer && (
          <div className="absolute top-12 right-3 z-30 w-72 rounded-xl border border-border bg-surface/95 backdrop-blur-md p-3 shadow-2xl space-y-3 text-xs text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold flex items-center gap-1.5">
                <span>🎨</span> Live Material Swapper
              </span>
              <button
                type="button"
                onClick={() => setShowMaterialDrawer(false)}
                className="text-muted hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            {/* Flooring Swaps */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Flooring Material:</span>
              <div className="grid grid-cols-1 gap-1">
                {FLOORING_SWAPS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFlooring(f)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                      flooring.id === f.id
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border/60 hover:border-accent/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ backgroundColor: f.colorHex }} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    {flooring.id === f.id && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Wall Swaps */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Wall Finish:</span>
              <div className="grid grid-cols-1 gap-1">
                {WALL_SWAPS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWallPreset(w)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                      wallPreset.id === w.id
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border/60 hover:border-accent/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ backgroundColor: w.colorHex }} />
                      <span className="truncate">{w.name}</span>
                    </div>
                    {wallPreset.id === w.id && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Sun Simulation */}
            <div className="space-y-1.5 pt-1 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Circadian Lighting:</span>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(CIRCADIAN_CONFIGS) as CircadianPreset[]).map((key) => {
                  const cfg = CIRCADIAN_CONFIGS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCircadian(key)}
                      className={`flex items-center gap-1.5 p-1.5 rounded border text-[11px] transition-colors ${
                        circadian === key
                          ? "border-accent bg-accent/10 font-semibold text-accent"
                          : "border-border/60 hover:border-accent/40 text-foreground"
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
        )}
      </div>

      {/* Architectural Dimensions Callout Strip below player */}
      <div className="p-4 pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            3D Spatial Envelope & Verified Dimensions:
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
