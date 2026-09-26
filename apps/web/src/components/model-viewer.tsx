"use client";

import { Suspense, Component, type ReactNode, useState, useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Bounds, Center, ContactShadows, Html, Line } from "@react-three/drei";
import { Vector3, PerspectiveCamera as PerspectiveCameraType, WebGLRenderer, MeshStandardMaterial, Color } from "three";
import { metersToUnit, unitLabel, type UnitSystem } from "@/lib/units";
import {
  ProceduralArchitecturalScene,
  createMarbleTexture,
  createKotaTexture,
  createHerringboneTexture,
  createTeakWoodTexture,
} from "@/components/3d/procedural-architectural-scene";
import { useFloorPlanStore } from "@/components/floor-plan-editor/state/floor-plan-store";
import { floorPlanToElements, type ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export interface MaterialPreset {
  id: string;
  name: string;
  category: "flooring" | "walls";
  colorHex: string;
  roughness: number;
  metalness: number;
  badges?: string[];
  certifications?: {
    acousticRating?: string;
    moistureStandard?: string;
    airQuality?: string;
    fireRating?: string;
    leadTime?: string;
    sourcingOrigin?: string;
    adhesiveStandard?: string;
  };
}

export function get3DBadgeIcon(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes("stc") || b.includes("sound") || b.includes("acoustic") || b.includes("nrc")) return "🔊";
  if (b.includes("is 287") || b.includes("kiln") || b.includes("emc") || b.includes("teak") || b.includes("oak") || b.includes("bwp 710")) return "🪵";
  if (b.includes("greenguard") || b.includes("zero-voc") || b.includes("health shield") || b.includes("low-voc")) return "🌿";
  if (b.includes("is 15477") || b.includes("c2te") || b.includes("adhesive") || b.includes("polymer")) return "🧪";
  if (b.includes("lead time") || b.includes("sourced") || b.includes("rajasthan") || b.includes("wks")) return "⏱️";
  if (b.includes("fire") || b.includes("flame")) return "🔥";
  return "🛡️";
}

export function get3DBadgeTheme(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes("stc") || b.includes("sound") || b.includes("acoustic") || b.includes("nrc")) {
    return "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30";
  }
  if (b.includes("is 287") || b.includes("kiln") || b.includes("bwp 710") || b.includes("emc")) {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
  if (b.includes("greenguard") || b.includes("zero-voc") || b.includes("health shield")) {
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
  }
  if (b.includes("is 15477") || b.includes("c2te") || b.includes("adhesive")) {
    return "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30";
  }
  if (b.includes("rajasthan") || b.includes("lead time") || b.includes("sourced") || b.includes("wks")) {
    return "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30";
  }
  return "bg-accent/15 text-accent border-accent/30";
}

export const FLOORING_SWAPS: MaterialPreset[] = [
  {
    id: "fl_italian_statuario",
    name: "Italian Statuario Marble",
    category: "flooring",
    colorHex: "#f8f7f5",
    roughness: 0.15,
    metalness: 0.05,
    badges: [
      "Carrara Sourced | 12-14 Wks Lead Time",
      "IS 15477 C2TE S2 High-Flex Polymer",
    ],
    certifications: {
      moistureStandard: "Requires Penetrating Sealer",
      airQuality: "Zero-VOC Natural Stone",
      leadTime: "12-14 Wks Lead Time (Import)",
      sourcingOrigin: "Carrara, Italy",
      adhesiveStandard: "IS 15477 C2TE S2 High-Flex Polymer",
    },
  },
  {
    id: "fl_kota_stone",
    name: "Kota Stone (Honed)",
    category: "flooring",
    colorHex: "#7a8a7c",
    roughness: 0.8,
    metalness: 0.0,
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 15477 C2TE S1 Flexible Polymer",
      "Zero-VOC Natural Stone",
    ],
    certifications: {
      acousticRating: "Impact Sound ΔLw 14dB",
      moistureStandard: "Non-Porous <0.4% Water Absorption",
      airQuality: "Zero-VOC Natural Mineral",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
      sourcingOrigin: "Kota District, Rajasthan",
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer",
    },
  },
  {
    id: "fl_herringbone_oak",
    name: "Herringbone Oak Wood",
    category: "flooring",
    colorHex: "#b58a5b",
    roughness: 0.45,
    metalness: 0.0,
    badges: [
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "Multi-ply Birch Core",
    ],
    certifications: {
      acousticRating: "IIC 52 with Acoustic Underlayment",
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "E1 Standard & Low-VOC Lacquer",
      leadTime: "4-6 Wks Lead Time",
      sourcingOrigin: "European White Oak / Baltic Birch",
    },
  },
  {
    id: "fl_wooden_teak",
    name: "Warm Wooden Teak",
    category: "flooring",
    colorHex: "#8b5a2b",
    roughness: 0.45,
    metalness: 0.0,
    badges: [
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "FSC Certified Sustainable Teak",
    ],
    certifications: {
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "Low-VOC PU Sealer",
      leadTime: "3-4 Wks Lead Time",
      sourcingOrigin: "Burma Teak / Indian Plantation",
    },
  },
];

export const WALL_SWAPS: MaterialPreset[] = [
  {
    id: "wl_asian_paints_royale",
    name: "Asian Paints Royale Health Shield",
    category: "walls",
    colorHex: "#f5f0eb",
    roughness: 0.85,
    metalness: 0.0,
    badges: [
      "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      "Anti-Bacterial Silver Ion",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      moistureStandard: "Washable Teflon Surface Protector",
      leadTime: "Immediate Stock (Ready Available)",
      sourcingOrigin: "Asian Paints India",
    },
  },
  {
    id: "wl_raw_concrete",
    name: "Raw Concrete",
    category: "walls",
    colorHex: "#949699",
    roughness: 0.9,
    metalness: 0.05,
    badges: [
      "GreenGuard Gold Zero-VOC",
      "IS 456 Fair-Faced Structural Finish",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC (<5g/L)",
      fireRating: "Class A1 Non-Combustible",
      moistureStandard: "Silane-Siloxane Hydrophobic Sealer",
      leadTime: "On-site Application",
    },
  },
  {
    id: "wl_fluted_wood",
    name: "Fluted Wood Acoustic Panels",
    category: "walls",
    colorHex: "#7a5332",
    roughness: 0.5,
    metalness: 0.02,
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "NRC 0.85 Acoustic PET Felt",
    ],
    certifications: {
      acousticRating: "STC 56 Tested | Gyproc SoundStop | NRC 0.85",
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "Zero-Odor Recycled PET Acoustic Core",
      leadTime: "2-3 Wks Lead Time",
    },
  },
  {
    id: "wl_exposed_brick",
    name: "Exposed Brick Cladding",
    category: "walls",
    colorHex: "#a34c38",
    roughness: 0.95,
    metalness: 0.0,
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 1077 Common Burnt Clay Standard",
    ],
    certifications: {
      sourcingOrigin: "Rajasthan Kilns",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
      airQuality: "100% Natural Fired Clay (Zero-VOC)",
    },
  },
];

export type CircadianPreset = "morning" | "afternoon" | "golden" | "evening";

export const CIRCADIAN_CONFIGS: Record<
  CircadianPreset,
  {
    label: string;
    temp: string;
    icon: string;
    dirLight: { pos: [number, number, number]; color: string; intensity: number };
    ambientLight: { color: string; intensity: number };
    bg: string;
    env: "dawn" | "apartment" | "sunset" | "night";
    showWarmRecessed: boolean;
  }
> = {
  morning: {
    label: "Morning Sun",
    temp: "5000K",
    icon: "🌅",
    dirLight: { pos: [12, 6, 8], color: "#fff6ea", intensity: 1.3 },
    ambientLight: { color: "#eef4ff", intensity: 0.8 },
    bg: "#f2f6fc",
    env: "dawn",
    showWarmRecessed: false,
  },
  afternoon: {
    label: "Afternoon Haze",
    temp: "4000K",
    icon: "☀️",
    dirLight: { pos: [3, 14, 5], color: "#fff9e6", intensity: 1.5 },
    ambientLight: { color: "#fdfbf7", intensity: 0.7 },
    bg: "#f5f2ec",
    env: "apartment",
    showWarmRecessed: false,
  },
  golden: {
    label: "Golden Hour",
    temp: "3200K",
    icon: "🌇",
    dirLight: { pos: [-12, 3, 6], color: "#ffb066", intensity: 1.2 },
    ambientLight: { color: "#ffe4cc", intensity: 0.65 },
    bg: "#fef3e7",
    env: "sunset",
    showWarmRecessed: false,
  },
  evening: {
    label: "Evening Recessed",
    temp: "2700K",
    icon: "🌙",
    dirLight: { pos: [0, 2, 0], color: "#281b14", intensity: 0.2 },
    ambientLight: { color: "#111827", intensity: 0.35 },
    bg: "#0b0f19",
    env: "night",
    showWarmRecessed: true,
  },
};

function Model({
  url,
  flooringPreset,
  wallPreset,
  onPointerDown,
}: {
  url: string;
  flooringPreset?: MaterialPreset;
  wallPreset?: MaterialPreset;
  onPointerDown?: (e: any) => void;
}) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        child.geometry.computeBoundingBox();
        const box = child.geometry.boundingBox;
        const name = (child.name || "").toLowerCase();
        const matName = (child.material?.name || "").toLowerCase();

        const isFloor =
          name.includes("floor") ||
          name.includes("slab") ||
          name.includes("ground") ||
          name.includes("flr") ||
          matName.includes("floor") ||
          matName.includes("slab") ||
          (box && box.max.y - box.min.y < 0.25);

        const isWall =
          name.includes("wall") ||
          matName.includes("wall") ||
          (box && box.max.y - box.min.y >= 0.25);

        if (isFloor && flooringPreset) {
          let map = null;
          if (flooringPreset.id === "fl_italian_statuario") map = createMarbleTexture();
          else if (flooringPreset.id === "fl_kota_stone") map = createKotaTexture();
          else if (flooringPreset.id === "fl_herringbone_oak") map = createHerringboneTexture();
          else if (flooringPreset.id === "fl_wooden_teak") map = createTeakWoodTexture();

          child.material = new MeshStandardMaterial({
            map: map || undefined,
            color: map ? new Color("#ffffff") : new Color(flooringPreset.colorHex),
            roughness: flooringPreset.roughness,
            metalness: flooringPreset.metalness,
          });
          child.material.needsUpdate = true;
        } else if (isWall && wallPreset) {
          child.material = new MeshStandardMaterial({
            color: new Color(wallPreset.colorHex),
            roughness: wallPreset.roughness,
            metalness: wallPreset.metalness,
          });
          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene, flooringPreset, wallPreset]);

  return <primitive object={scene} onPointerDown={onPointerDown} />;
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-lg bg-border animate-pulse" />
        <p className="whitespace-nowrap text-xs text-muted">Loading 3D model…</p>
      </div>
    </Html>
  );
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <p className="whitespace-nowrap text-xs text-danger">Couldn&apos;t display this model</p>
        </Html>
      );
    }
    return this.props.children;
  }
}

function TopIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FrontIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function PerspectiveIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MeasureIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12h20M7 12v3M12 12v3M17 12v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScreenshotIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14h6v6m10-10h-6V4m0 6 7-7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ModelViewer({ 
  url, 
  elements,
  unitSystem = "metric",
  liveSync = true,
  activeFlooringId,
  activeWallId,
  activeCircadian,
  onFlooringChange,
  onWallChange,
  className = "",
}: { 
  url?: string | null; 
  elements?: ConstructionElements | null;
  unitSystem?: UnitSystem;
  liveSync?: boolean;
  activeFlooringId?: string;
  activeWallId?: string;
  activeCircadian?: CircadianPreset;
  onFlooringChange?: (preset: MaterialPreset) => void;
  onWallChange?: (preset: MaterialPreset) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<PerspectiveCameraType | null>(null);
  const controlsRef = useRef<any>(null);
  const glRef = useRef<WebGLRenderer | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Vector3[]>([]);
  const [circadian, setCircadian] = useState<CircadianPreset>(activeCircadian || "afternoon");
  const [selectedFlooring, setSelectedFlooring] = useState<MaterialPreset>(
    FLOORING_SWAPS.find((f) => f.id === activeFlooringId) || FLOORING_SWAPS[0]
  );
  const [selectedWall, setSelectedWall] = useState<MaterialPreset>(
    WALL_SWAPS.find((w) => w.id === activeWallId) || WALL_SWAPS[0]
  );
  const [showMaterialDrawer, setShowMaterialDrawer] = useState(false);
  const [inspectedMaterial, setInspectedMaterial] = useState<MaterialPreset | null>(null);

  // Sync external prop updates
  useEffect(() => {
    if (activeFlooringId) {
      const match = FLOORING_SWAPS.find((f) => f.id === activeFlooringId);
      if (match) setSelectedFlooring(match);
    }
  }, [activeFlooringId]);

  useEffect(() => {
    if (activeWallId) {
      const match = WALL_SWAPS.find((w) => w.id === activeWallId);
      if (match) setSelectedWall(match);
    }
  }, [activeWallId]);

  useEffect(() => {
    if (activeCircadian) {
      setCircadian(activeCircadian);
    }
  }, [activeCircadian]);

  // Live 2D floor plan store subscription
  const editorState = useFloorPlanStore();
  const storeElements = useMemo(() => {
    if (!liveSync) return null;
    const plan = editorState?.floorPlan;
    if (plan && (plan.walls.length > 0 || (plan.furniture && plan.furniture.length > 0))) {
      return floorPlanToElements(plan);
    }
    return null;
  }, [liveSync, editorState?.floorPlan]);

  // Prefer explicit elements prop, or fallback to live synchronized store elements
  const activeElements = elements || storeElements;
  const hasProceduralElements = activeElements && (
    (activeElements.walls && activeElements.walls.length > 0) ||
    (activeElements.furniture && activeElements.furniture.length > 0)
  );

  const currentLighting = CIRCADIAN_CONFIGS[circadian];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleScreenshot = () => {
    if (glRef.current) {
      const link = document.createElement("a");
      link.download = "architectural-model.png";
      link.href = glRef.current.domElement.toDataURL("image/png");
      link.click();
    }
  };

  const setView = (pos: [number, number, number]) => {
    if (cameraRef.current && controlsRef.current) {
      if (pos[0] === 0 && pos[2] === 0) {
        cameraRef.current.position.set(0.001, pos[1], 0);
      } else {
        cameraRef.current.position.set(...pos);
      }
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleReset = () => {
    if (controlsRef.current?.reset) {
      controlsRef.current.reset();
    }
    setView([6, 6, 6]);
  };

  const handlePointerDown = (e: any) => {
    if (!isMeasuring) return;
    e.stopPropagation();
    if (measurePoints.length >= 2) {
      setMeasurePoints([e.point]);
    } else {
      setMeasurePoints((prev) => [...prev, e.point]);
    }
  };

  const toggleMeasuring = () => {
    setIsMeasuring((prev) => !prev);
    if (isMeasuring) {
      setMeasurePoints([]);
    }
  };

  const handleSelectFlooring = (preset: MaterialPreset) => {
    setSelectedFlooring(preset);
    onFlooringChange?.(preset);
  };

  const handleSelectWall = (preset: MaterialPreset) => {
    setSelectedWall(preset);
    onWallChange?.(preset);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-lg border border-border bg-surface ${
        isFullscreen ? "h-screen" : "h-96"
      } ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 sm:gap-1.5 rounded-lg bg-surface/85 backdrop-blur-md p-1.5 shadow-sm border border-border max-w-[calc(100%-16px)] overflow-x-auto">
        {/* View Presets */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 shrink-0">
          <button onClick={() => setView([0, 10, 0])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Top">
            <TopIcon /> <span className="hidden sm:inline">Top</span>
          </button>
          <button onClick={() => setView([0, 0, 10])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Front">
            <FrontIcon /> <span className="hidden sm:inline">Front</span>
          </button>
          <button onClick={() => setView([6, 6, 6])} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Perspective">
            <PerspectiveIcon /> <span className="hidden sm:inline">Perspective</span>
          </button>
          <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Reset View">
            <ResetIcon /> <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 pl-1 shrink-0">
          <button
            onClick={toggleMeasuring}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isMeasuring ? "bg-accent/10 text-accent font-semibold" : "hover:bg-accent/10 hover:text-accent"
            }`}
            title="Measure"
          >
            <MeasureIcon /> <span className="hidden sm:inline">Measure</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 pl-1 shrink-0">
          <button onClick={handleScreenshot} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Screenshot">
            <ScreenshotIcon /> <span className="hidden sm:inline">Screenshot</span>
          </button>
          <button onClick={toggleFullscreen} className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/10 hover:text-accent rounded transition-colors" title="Fullscreen">
            {isFullscreen ? (
              <>
                <ExitFullscreenIcon /> <span className="hidden sm:inline">Exit</span>
              </>
            ) : (
              <>
                <FullscreenIcon /> <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          <div className="mx-1 h-4 w-px bg-border" />

          {/* Material Swapper Button in Top Toolbar */}
          <button
            type="button"
            onClick={() => setShowMaterialDrawer((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded transition-colors ${
              showMaterialDrawer
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-foreground hover:bg-accent/10 hover:text-accent"
            }`}
            title="Swap PBR Flooring & Wall Materials"
          >
            <span>🎨</span>
            <span className="hidden sm:inline">Materials</span>
          </button>
        </div>
      </div>

      {/* Active Material Badges Pill Overlay */}
      <div className="absolute top-12 left-2 sm:left-4 z-10 hidden sm:flex flex-col gap-1.5 pointer-events-auto">
        <div
          onClick={() => setInspectedMaterial(selectedFlooring)}
          className="group/pill flex items-center gap-2 rounded-lg bg-surface/85 backdrop-blur-md px-2.5 py-1 text-xs border border-border shadow-2xs text-foreground cursor-pointer hover:border-accent/50 transition-all"
          title="Click to inspect active Flooring certifications"
        >
          <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: selectedFlooring.colorHex }} />
          <span className="font-semibold text-[11px]">{selectedFlooring.name}</span>
          {selectedFlooring.badges?.[0] && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-semibold border ${get3DBadgeTheme(selectedFlooring.badges[0])}`}>
              <span>{get3DBadgeIcon(selectedFlooring.badges[0])}</span>
              <span className="truncate max-w-[130px]">{selectedFlooring.badges[0]}</span>
            </span>
          )}
          <span className="text-[10px] text-muted opacity-60 group-hover/pill:opacity-100 transition-opacity">ℹ️</span>
        </div>

        <div
          onClick={() => setInspectedMaterial(selectedWall)}
          className="group/pill flex items-center gap-2 rounded-lg bg-surface/85 backdrop-blur-md px-2.5 py-1 text-xs border border-border shadow-2xs text-foreground cursor-pointer hover:border-accent/50 transition-all"
          title="Click to inspect active Wall certifications"
        >
          <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: selectedWall.colorHex }} />
          <span className="font-semibold text-[11px]">{selectedWall.name}</span>
          {selectedWall.badges?.[0] && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-semibold border ${get3DBadgeTheme(selectedWall.badges[0])}`}>
              <span>{get3DBadgeIcon(selectedWall.badges[0])}</span>
              <span className="truncate max-w-[130px]">{selectedWall.badges[0]}</span>
            </span>
          )}
          <span className="text-[10px] text-muted opacity-60 group-hover/pill:opacity-100 transition-opacity">ℹ️</span>
        </div>
      </div>

      {/* Floating Material Drawer (Anchored from Top) */}
      {showMaterialDrawer && (
        <div className="absolute top-12 right-2 sm:right-6 z-20 w-80 sm:w-84 max-h-[82vh] overflow-y-auto rounded-xl border border-border bg-surface/95 backdrop-blur-md p-3.5 shadow-xl space-y-3 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span>🎨</span> Live Material Swapper & Metadata
            </span>
            <button
              type="button"
              onClick={() => setShowMaterialDrawer(false)}
              className="text-muted hover:text-foreground text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* Flooring Swaps */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Flooring:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {FLOORING_SWAPS.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleSelectFlooring(f)}
                  className={`flex flex-col gap-1 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedFlooring.id === f.id
                      ? "border-accent bg-accent/10 font-semibold text-accent shadow-2xs"
                      : "border-border/60 hover:border-accent/40 text-foreground bg-surface/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: f.colorHex }} />
                      <span className="truncate text-xs font-medium">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedMaterial(f);
                        }}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface hover:bg-accent/20 text-muted hover:text-accent border border-border transition-colors"
                        title="Inspect Environmental & Acoustic Certifications"
                      >
                        ℹ️ Inspect
                      </button>
                      {selectedFlooring.id === f.id && <span className="text-[11px] text-accent font-bold">✓</span>}
                    </div>
                  </div>

                  {/* Badges chips row */}
                  {f.badges && f.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5 pl-5">
                      {f.badges.map((b) => (
                        <span
                          key={b}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-tight border ${get3DBadgeTheme(b)}`}
                        >
                          <span>{get3DBadgeIcon(b)}</span>
                          <span className="truncate max-w-[200px]">{b}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wall Swaps */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Wall Finishes:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {WALL_SWAPS.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleSelectWall(w)}
                  className={`flex flex-col gap-1 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedWall.id === w.id
                      ? "border-accent bg-accent/10 font-semibold text-accent shadow-2xs"
                      : "border-border/60 hover:border-accent/40 text-foreground bg-surface/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: w.colorHex }} />
                      <span className="truncate text-xs font-medium">{w.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedMaterial(w);
                        }}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface hover:bg-accent/20 text-muted hover:text-accent border border-border transition-colors"
                        title="Inspect Environmental & Acoustic Certifications"
                      >
                        ℹ️ Inspect
                      </button>
                      {selectedWall.id === w.id && <span className="text-[11px] text-accent font-bold">✓</span>}
                    </div>
                  </div>

                  {/* Badges chips row */}
                  {w.badges && w.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5 pl-5">
                      {w.badges.map((b) => (
                        <span
                          key={b}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-tight border ${get3DBadgeTheme(b)}`}
                        >
                          <span>{get3DBadgeIcon(b)}</span>
                          <span className="truncate max-w-[200px]">{b}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Environmental & Acoustic Metadata Inspect Popover */}
      {inspectedMaterial && (
        <div className="absolute top-12 left-2 sm:left-auto sm:right-92 z-30 w-80 sm:w-84 rounded-xl border border-border bg-surface/95 backdrop-blur-md p-4 shadow-2xl space-y-3 text-xs animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between border-b border-border pb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                {inspectedMaterial.category === "flooring" ? "Flooring Material Spec" : "Wall Material Spec"}
              </span>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: inspectedMaterial.colorHex }} />
                <span>{inspectedMaterial.name}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setInspectedMaterial(null)}
              className="text-muted hover:text-foreground text-xs p-1 rounded hover:bg-accent/10"
              title="Close Inspector"
            >
              ✕
            </button>
          </div>

          {/* Statutory Badges List */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Statutory Certifications & Badges:
            </span>
            <div className="flex flex-wrap gap-1">
              {inspectedMaterial.badges?.map((b) => (
                <span
                  key={b}
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${get3DBadgeTheme(b)}`}
                >
                  <span>{get3DBadgeIcon(b)}</span>
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Structured Environmental & Performance Metrics */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Performance & Environmental Metrics:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-2 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-sky-800 dark:text-sky-300">
                  <span>🔊</span>
                  <span>Acoustic Isolation:</span>
                </div>
                <p className="text-[11px] font-medium text-foreground pl-3.5">
                  {inspectedMaterial.certifications?.acousticRating ||
                    inspectedMaterial.badges?.find((b) => b.includes("STC") || b.includes("NRC")) ||
                    "Standard Residential Isolation (STC 38+)"}
                </p>
                <span className="text-[9px] text-muted block pl-3.5">
                  ASTM E90 Sound Transmission Class Tested
                </span>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                  <span>🪵</span>
                  <span>Moisture & Substrate:</span>
                </div>
                <p className="text-[11px] font-medium text-foreground pl-3.5">
                  {inspectedMaterial.certifications?.moistureStandard ||
                    inspectedMaterial.badges?.find((b) => b.includes("IS 287") || b.includes("EMC")) ||
                    "Atmospheric Moisture Equilibrium"}
                </p>
                <span className="text-[9px] text-muted block pl-3.5">
                  IS 287 Kiln-Dried 8-12% EMC / Monsoon Resistant
                </span>
              </div>

              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span>🌿</span>
                  <span>Air Quality & VOC:</span>
                </div>
                <p className="text-[11px] font-medium text-foreground pl-3.5">
                  {inspectedMaterial.certifications?.airQuality ||
                    inspectedMaterial.badges?.find((b) => b.includes("GreenGuard") || b.includes("VOC")) ||
                    "Ultra-Low Chemical Emissions"}
                </p>
                <span className="text-[9px] text-muted block pl-3.5">
                  GreenGuard Gold Zero-VOC Certified
                </span>
              </div>

              <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-2 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-800 dark:text-orange-300">
                  <span>⏱️</span>
                  <span>Sourcing & Lead Time:</span>
                </div>
                <p className="text-[11px] font-medium text-foreground pl-3.5">
                  {inspectedMaterial.certifications?.leadTime ||
                    inspectedMaterial.badges?.find((b) => b.includes("Lead Time") || b.includes("Wks")) ||
                    "Ready Stock"}
                </p>
                <span className="text-[9px] text-muted block pl-3.5">
                  {inspectedMaterial.certifications?.sourcingOrigin || "Domestic Quarry / Fast-Track Delivery"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Circadian Lighting Simulation Bar */}
      <div className="absolute bottom-2 left-2 sm:left-4 z-10 flex flex-wrap items-center gap-1 rounded-lg bg-surface/85 backdrop-blur-md p-1 shadow-sm border border-border text-xs">
        <span className="px-1 text-[10px] font-bold text-muted uppercase tracking-wider hidden sm:inline">Sun:</span>
        {(Object.keys(CIRCADIAN_CONFIGS) as CircadianPreset[]).map((key) => {
          const cfg = CIRCADIAN_CONFIGS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCircadian(key)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                circadian === key
                  ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface/50"
              }`}
              title={`${cfg.label} (${cfg.temp})`}
            >
              <span>{cfg.icon}</span>
              <span className="hidden md:inline">{cfg.label}</span>
              <span className="text-[9px] opacity-75 font-mono">({cfg.temp})</span>
            </button>
          );
        })}
      </div>

      <Canvas
        camera={{ position: [6, 6, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl, camera }) => {
          glRef.current = gl;
          cameraRef.current = camera as PerspectiveCameraType;
        }}
      >
        <color attach="background" args={[currentLighting.bg]} />
        <ambientLight color={currentLighting.ambientLight.color} intensity={currentLighting.ambientLight.intensity} />
        <directionalLight
          position={currentLighting.dirLight.pos}
          color={currentLighting.dirLight.color}
          intensity={currentLighting.dirLight.intensity}
        />
        {currentLighting.showWarmRecessed && (
          <>
            <pointLight position={[0, 2.5, 0]} color="#ff9e42" intensity={3.5} distance={10} />
            <pointLight position={[2, 2.2, 2]} color="#ffaa55" intensity={2.5} distance={8} />
            <pointLight position={[-2, 2.2, -2]} color="#ffaa55" intensity={2.5} distance={8} />
          </>
        )}
        <ViewerErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Bounds fit clip observe margin={1.3}>
              <Center>
                {hasProceduralElements ? (
                  <ProceduralArchitecturalScene
                    elements={activeElements!}
                    flooring={selectedFlooring}
                    wallPreset={selectedWall}
                    unitSystem={unitSystem}
                    onPointerDown={handlePointerDown}
                  />
                ) : url ? (
                  <Model
                    url={url}
                    flooringPreset={selectedFlooring}
                    wallPreset={selectedWall}
                    onPointerDown={handlePointerDown}
                  />
                ) : (
                  <Html center>
                    <p className="whitespace-nowrap text-xs text-muted">
                      Draw in the 2D floor plan editor to see real-time 3D space
                    </p>
                  </Html>
                )}
              </Center>
            </Bounds>
            {measurePoints.length === 2 && (
              <>
                <Line points={[measurePoints[0], measurePoints[1]]} color="#a15c3e" lineWidth={4} />
                <Html position={measurePoints[0].clone().lerp(measurePoints[1], 0.5)} center>
                  <div className="bg-surface/90 backdrop-blur px-2 py-1 rounded text-xs border border-border shadow-sm font-mono whitespace-nowrap text-foreground pointer-events-none">
                    {metersToUnit(measurePoints[0].distanceTo(measurePoints[1]), unitSystem).toFixed(2)}{" "}
                    {unitLabel(unitSystem)}
                  </div>
                </Html>
              </>
            )}
            <Environment preset={currentLighting.env} />
            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={circadian === "evening" ? 0.15 : 0.35}
              scale={12}
              blur={2}
              far={10}
            />
          </Suspense>
        </ViewerErrorBoundary>
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={40} />
      </Canvas>
    </div>
  );
}
