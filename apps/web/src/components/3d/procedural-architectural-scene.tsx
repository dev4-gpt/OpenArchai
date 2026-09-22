"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { MaterialPreset } from "@/components/model-viewer";
import type { UnitSystem } from "@/lib/units";
import { metersToUnit, unitLabel } from "@/lib/units";

// =============================================================================
// Procedural High-Definition PBR Architectural Textures
// =============================================================================

export function createMarbleTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Soft warm alabaster base with subtle tonal graduation
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, "#faf8f5");
  grad.addColorStop(0.5, "#f6f3ee");
  grad.addColorStop(1, "#fbf9f6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Broad feathered translucent grey-golden veins
  ctx.strokeStyle = "rgba(185, 178, 168, 0.45)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(200, 195, 185, 0.35)";
  ctx.shadowBlur = 12;

  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = (i * 200 + 40) % 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.48) * 80;
      y += Math.random() * 90 + 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Sharp dark crystalline charcoal veins
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(85, 80, 75, 0.85)";
  ctx.lineWidth = 2.0;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = (i * 260 + 100) % 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.48) * 55;
      y += Math.random() * 65 + 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Fine micro-hairline vein fissures
  ctx.strokeStyle = "rgba(125, 120, 115, 0.6)";
  ctx.lineWidth = 1.0;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = (i * 310 + 160) % 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 50 + 25;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.needsUpdate = true;
  return texture;
}

export function createKotaTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Kota greenish-grey stone base
  ctx.fillStyle = "#708172";
  ctx.fillRect(0, 0, 1024, 1024);

  // 600mm x 600mm Architectural Flagstone Tile Grid
  const tileSize = 256; // 4x4 tiles across 1024px
  const tileShades = ["#6b7c6d", "#748576", "#718273", "#6e7f70", "#78897a", "#697a6b"];

  for (let y = 0; y < 1024; y += tileSize) {
    for (let x = 0; x < 1024; x += tileSize) {
      const shade = tileShades[(x / tileSize + (y / tileSize) * 4) % tileShades.length];
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Fine honed mineral micro-stippling inside each stone tile
      for (let dot = 0; dot < 40; dot++) {
        const dotX = x + 4 + Math.random() * (tileSize - 8);
        const dotY = y + 4 + Math.random() * (tileSize - 8);
        const isDark = Math.random() > 0.5;
        ctx.fillStyle = isDark ? "rgba(45, 55, 46, 0.25)" : "rgba(220, 235, 222, 0.2)";
        ctx.fillRect(dotX, dotY, Math.random() * 2 + 1, Math.random() * 2 + 1);
      }
    }
  }

  // Recessed architectural grout joints
  ctx.strokeStyle = "#475448";
  ctx.lineWidth = 4;
  for (let y = 0; y <= 1024; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 1024; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.needsUpdate = true;
  return texture;
}

export function createHerringboneTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#b58a5b";
  ctx.fillRect(0, 0, 1024, 1024);

  const plankW = 128;
  const plankH = 32;
  const plankColors = ["#b28758", "#be9260", "#a87d4e", "#ba8e5d", "#c59a67", "#a27749"];

  for (let y = 0; y < 1024; y += plankH) {
    const rowOffset = (Math.floor(y / plankH) % 2) * (plankW / 2);
    for (let x = -plankW; x < 1024 + plankW; x += plankW) {
      const plankX = x + rowOffset;
      const colIdx = (Math.floor(x / plankW) + Math.floor(y / plankH) * 5) % plankColors.length;
      ctx.fillStyle = plankColors[Math.abs(colIdx)];
      ctx.fillRect(plankX + 1, y + 1, plankW - 2, plankH - 2);

      // Fine longitudinal wood grain lines
      ctx.strokeStyle = "rgba(110, 75, 35, 0.22)";
      ctx.lineWidth = 1;
      for (let g = 6; g < plankH - 4; g += 8) {
        ctx.beginPath();
        ctx.moveTo(plankX + 2, y + g);
        ctx.lineTo(plankX + plankW - 2, y + g);
        ctx.stroke();
      }

      // Micro-chamfer bevel joint edge
      ctx.strokeStyle = "#724c25";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(plankX, y, plankW, plankH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}

export function createTeakWoodTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(0, 0, 1024, 1024);

  // Longitudinal wide plank boards
  const plankH = 96;
  const teakShades = ["#855426", "#915f30", "#7f4e21", "#8e5c2d", "#996636", "#804f23"];

  for (let y = 0; y < 1024; y += plankH) {
    const colIdx = Math.floor(y / plankH) % teakShades.length;
    ctx.fillStyle = teakShades[colIdx];
    ctx.fillRect(0, y + 1, 1024, plankH - 2);

    // Natural flowing teak grain striations
    ctx.strokeStyle = "rgba(80, 45, 15, 0.35)";
    ctx.lineWidth = 1.5;
    for (let g = 8; g < plankH - 6; g += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y + g);
      for (let x = 0; x <= 1024; x += 64) {
        const offset = Math.sin((x + y) * 0.02) * 5;
        ctx.lineTo(x, y + g + offset);
      }
      ctx.stroke();
    }

    // Plank seam bevel
    ctx.strokeStyle = "#4e2b0e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

export function createConcreteTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#949699";
  ctx.fillRect(0, 0, 512, 512);

  // Formwork seams and aggregate stippling
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }

  // Tie rod holes
  ctx.fillStyle = "#555759";
  ctx.beginPath();
  ctx.arc(128, 128, 8, 0, Math.PI * 2);
  ctx.arc(384, 128, 8, 0, Math.PI * 2);
  ctx.arc(128, 384, 8, 0, Math.PI * 2);
  ctx.arc(384, 384, 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// Scene Components
// =============================================================================

export interface ProceduralSceneProps {
  elements: ConstructionElements;
  flooring: MaterialPreset;
  wallPreset: MaterialPreset;
  showDimensions?: boolean;
  unitSystem?: UnitSystem;
  onPointerDown?: (e: any) => void;
  showCeiling?: boolean;
  showLights?: boolean;
}

export function ProceduralArchitecturalScene({
  elements,
  flooring,
  wallPreset,
  showDimensions = false,
  unitSystem = "metric",
  onPointerDown,
  showCeiling = false,
  showLights = true,
}: ProceduralSceneProps) {
  const walls = elements?.walls || [];
  const doors = elements?.doors || [];
  const windows = elements?.windows || [];
  const furniture = elements?.furniture || [];

  // Calculate dynamic bounding envelope encompassing all walls and furniture
  const bounds = useMemo(() => {
    let minX = elements?.floor_bounds?.min_x ?? 0;
    let minZ = elements?.floor_bounds?.min_y ?? 0;
    let maxX = elements?.floor_bounds?.max_x ?? 5;
    let maxZ = elements?.floor_bounds?.max_y ?? 3;

    const allX: number[] = [];
    const allZ: number[] = [];

    for (const w of walls) {
      allX.push(w.start[0], w.end[0]);
      allZ.push(w.start[1], w.end[1]);
    }
    for (const f of furniture) {
      const hw = (f.width_m || 1.0) / 2;
      const hd = (f.depth_m || 1.0) / 2;
      allX.push(f.position[0] - hw, f.position[0] + hw);
      allZ.push(f.position[1] - hd, f.position[1] + hd);
    }

    if (allX.length > 0 && allZ.length > 0) {
      minX = Math.min(...allX) - 0.35;
      maxX = Math.max(...allX) + 0.35;
      minZ = Math.min(...allZ) - 0.35;
      maxZ = Math.max(...allZ) + 0.35;
    }

    return { minX, minZ, maxX, maxZ, width: Math.max(2, maxX - minX), depth: Math.max(2, maxZ - minZ) };
  }, [elements, walls, furniture]);

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const wallHeight = 2.7;
  const thickness = 0.15;

  // Textures
  const marbleTex = useMemo(() => createMarbleTexture(), []);
  const kotaTex = useMemo(() => createKotaTexture(), []);
  const oakTex = useMemo(() => createHerringboneTexture(), []);
  const teakTex = useMemo(() => createTeakWoodTexture(), []);
  const concreteTex = useMemo(() => createConcreteTexture(), []);

  // Floor Material
  const floorMaterial = useMemo(() => {
    if (flooring.id === "fl_italian_statuario" && marbleTex) {
      return new THREE.MeshStandardMaterial({
        map: marbleTex,
        roughness: 0.12,
        metalness: 0.05,
      });
    }
    if (flooring.id === "fl_kota_stone" && kotaTex) {
      return new THREE.MeshStandardMaterial({
        map: kotaTex,
        roughness: 0.78,
        metalness: 0.02,
      });
    }
    if (flooring.id === "fl_herringbone_oak" && oakTex) {
      return new THREE.MeshStandardMaterial({
        map: oakTex,
        roughness: 0.42,
        metalness: 0.02,
      });
    }
    if (flooring.id === "fl_wooden_teak" && teakTex) {
      return new THREE.MeshStandardMaterial({
        map: teakTex,
        roughness: 0.45,
        metalness: 0.02,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(flooring.colorHex),
      roughness: flooring.roughness,
      metalness: flooring.metalness,
    });
  }, [flooring, marbleTex, kotaTex, oakTex, teakTex]);

  // Wall Material
  const wallMaterial = useMemo(() => {
    if (wallPreset.id === "wl_raw_concrete" && concreteTex) {
      return new THREE.MeshStandardMaterial({
        map: concreteTex,
        roughness: 0.92,
        metalness: 0.04,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallPreset.colorHex),
      roughness: wallPreset.roughness,
      metalness: wallPreset.metalness,
    });
  }, [wallPreset, concreteTex]);

  // Frame & Trim Materials
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1e1c18", roughness: 0.4, metalness: 0.7 }), []);
  const doorWoodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b4226", roughness: 0.45, metalness: 0.05 }), []);
  const flutedWoodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a5332", roughness: 0.5, metalness: 0.02 }), []);
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e8f4fc",
        transparent: true,
        opacity: 0.28,
        roughness: 0.05,
        metalness: 0.9,
        transmission: 0.85,
      }),
    [],
  );

  // Furniture Materials
  const fabricMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d3935", roughness: 0.88 }), []);
  const pillowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c29b68", roughness: 0.75 }), []);
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a4e2d", roughness: 0.45 }), []);
  const linenMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f5f2eb", roughness: 0.92 }), []);
  const rugMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8dfd3", roughness: 0.95 }), []);

  return (
    <group onPointerDown={onPointerDown}>
      {/* 1. Dynamic Floor Slab with High-Res PBR Material */}
      <group position={[centerX, -0.05, centerZ]}>
        <mesh receiveShadow material={floorMaterial}>
          <boxGeometry args={[bounds.width, 0.1, bounds.depth]} />
        </mesh>
      </group>

      {/* 2. Optional Ceiling Slab */}
      {showCeiling && (
        <group position={[centerX, wallHeight + 0.05, centerZ]}>
          <mesh material={new THREE.MeshStandardMaterial({ color: "#f7f5f0", roughness: 0.95 })}>
            <boxGeometry args={[bounds.width, 0.1, bounds.depth]} />
          </mesh>
        </group>
      )}

      {/* 3. Extruded 3D Architectural Walls */}
      {walls.map((w, idx) => {
        const dx = w.end[0] - w.start[0];
        const dz = w.end[1] - w.start[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.1) return null;

        const angle = Math.atan2(dz, dx);
        const midX = (w.start[0] + w.end[0]) / 2;
        const midZ = (w.start[1] + w.end[1]) / 2;

        return (
          <group key={`wall-${idx}`} position={[midX, wallHeight / 2, midZ]} rotation={[0, -angle, 0]}>
            <mesh castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[len, wallHeight, thickness]} />
            </mesh>
            {/* Baseboard Skirting */}
            <mesh position={[0, -wallHeight / 2 + 0.05, thickness / 2 + 0.008]} material={frameMat}>
              <boxGeometry args={[len, 0.1, 0.016]} />
            </mesh>
          </group>
        );
      })}

      {/* 4. Doors & Openings */}
      {doors.map((d, idx) => {
        const doorWidth = d.width_m || 0.9;
        const doorHeight = 2.1;
        return (
          <group key={`door-${idx}`} position={[d.position[0], doorHeight / 2, d.position[1]]}>
            <mesh material={frameMat}>
              <boxGeometry args={[doorWidth + 0.1, doorHeight + 0.08, 0.16]} />
            </mesh>
            {/* Open Door Leaf (swung 65 degrees) */}
            <group position={[-doorWidth / 2 + 0.04, -doorHeight / 2, 0]} rotation={[0, 1.1, 0]}>
              <mesh position={[doorWidth / 2, doorHeight / 2, 0]} castShadow material={doorWoodMat}>
                <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
              </mesh>
              <mesh position={[doorWidth - 0.08, 1.0, 0.04]} material={frameMat}>
                <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
              </mesh>
            </group>
            {showDimensions && (
              <Html position={[0, doorHeight + 0.25, 0]} center>
                <div className="bg-surface/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono border border-accent/40 text-accent whitespace-nowrap shadow-xs pointer-events-none">
                  🚪 Door: {metersToUnit(doorWidth, unitSystem).toFixed(2)} {unitLabel(unitSystem)}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* 5. Windows & Glazing */}
      {windows.map((w, idx) => {
        const winWidth = w.width_m || 1.2;
        const winHeight = 1.4;
        const sillHeight = 0.9;
        return (
          <group key={`win-${idx}`} position={[w.position[0], sillHeight + winHeight / 2, w.position[1]]}>
            <mesh material={frameMat}>
              <boxGeometry args={[0.16, winHeight, winWidth + 0.08]} />
            </mesh>
            <mesh material={glassMat}>
              <boxGeometry args={[0.02, winHeight - 0.08, winWidth - 0.08]} />
            </mesh>
            <mesh material={frameMat}>
              <boxGeometry args={[0.04, winHeight - 0.08, 0.03]} />
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

      {/* 6. Complete Furniture Collection */}
      {furniture.map((item) => {
        const x = item.position[0];
        const z = item.position[1];
        const rotY = ((item.rotation_deg || 0) * Math.PI) / 180;
        const w = item.width_m || 1.0;
        const d = item.depth_m || 1.0;
        const type = (item.type || "").toLowerCase();

        return (
          <group key={item.id} position={[x, 0, z]} rotation={[0, -rotY, 0]}>
            {/* Sofa */}
            {type === "sofa" && (
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
                <mesh position={[-w * 0.25, 0.3, -d * 0.25]} rotation={[0.2, 0.3, 0]} material={pillowMat}>
                  <boxGeometry args={[0.4, 0.4, 0.15]} />
                </mesh>
                <mesh position={[w * 0.25, 0.3, -d * 0.25]} rotation={[0.2, -0.3, 0]} material={pillowMat}>
                  <boxGeometry args={[0.4, 0.4, 0.15]} />
                </mesh>
              </group>
            )}

            {/* Bed */}
            {type === "bed" && (
              <group position={[0, 0.3, 0]}>
                {/* Platform Base */}
                <mesh position={[0, 0, 0]} castShadow material={woodMat}>
                  <boxGeometry args={[w + 0.08, 0.25, d + 0.08]} />
                </mesh>
                {/* Plush Mattress */}
                <mesh position={[0, 0.22, 0]} castShadow material={linenMat}>
                  <boxGeometry args={[w, 0.3, d]} />
                </mesh>
                {/* Upholstered Headboard */}
                <mesh position={[0, 0.55, -d / 2 - 0.04]} castShadow material={fabricMat}>
                  <boxGeometry args={[w + 0.08, 0.9, 0.12]} />
                </mesh>
                {/* Pillows */}
                <mesh position={[-w * 0.25, 0.44, -d * 0.35]} material={linenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
                <mesh position={[w * 0.25, 0.44, -d * 0.35]} material={linenMat}>
                  <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
                </mesh>
                {/* Plinth LED glow */}
                <pointLight position={[0, -0.1, 0]} color="#ffb766" intensity={1.2} distance={2.5} />
              </group>
            )}

            {/* Coffee Table or Dining Table */}
            {type === "table" && item.name.toLowerCase().includes("coffee") && (
              <group position={[0, 0.22, 0]}>
                <mesh position={[0, -0.06, 0]} castShadow material={woodMat}>
                  <cylinderGeometry args={[w * 0.28, w * 0.38, 0.3, 16]} />
                </mesh>
                <mesh position={[0, 0.16, 0]} receiveShadow material={glassMat}>
                  <boxGeometry args={[w, 0.035, d]} />
                </mesh>
              </group>
            )}

            {type === "table" && !item.name.toLowerCase().includes("coffee") && (
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

            {/* Chair */}
            {type === "chair" && (
              <group position={[0, 0.35, 0]}>
                <mesh position={[0, 0, 0]} castShadow material={fabricMat}>
                  <boxGeometry args={[w, 0.35, d * 0.8]} />
                </mesh>
                <mesh position={[0, 0.3, -d * 0.3]} castShadow material={woodMat}>
                  <boxGeometry args={[w, 0.45, 0.15]} />
                </mesh>
              </group>
            )}

            {/* Credenza / Media Console */}
            {type === "credenza" && (
              <group position={[0, 0.35, 0]}>
                <mesh castShadow receiveShadow material={woodMat}>
                  <boxGeometry args={[w, 0.7, d]} />
                </mesh>
                <mesh position={[0, 0.1, d / 2 + 0.01]} material={flutedWoodMat}>
                  <boxGeometry args={[w - 0.08, 0.5, 0.02]} />
                </mesh>
              </group>
            )}

            {/* Wardrobe */}
            {type === "wardrobe" && (
              <group position={[0, 1.1, 0]}>
                <mesh castShadow receiveShadow material={woodMat}>
                  <boxGeometry args={[w, 2.2, d]} />
                </mesh>
                <mesh position={[0, 0, d / 2 + 0.01]} material={frameMat}>
                  <boxGeometry args={[0.02, 2.0, 0.02]} />
                </mesh>
              </group>
            )}

            {/* Standing Floor Lamp */}
            {type === "lamp" && (
              <group position={[0, 0.75, 0]}>
                <mesh position={[0, -0.73, 0]} material={frameMat}>
                  <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
                </mesh>
                <mesh position={[0, 0, 0]} material={frameMat}>
                  <cylinderGeometry args={[0.015, 0.015, 1.5, 8]} />
                </mesh>
                <mesh position={[0, 0.65, 0]} material={linenMat}>
                  <cylinderGeometry args={[0.22, 0.28, 0.35, 16]} />
                </mesh>
                <pointLight position={[0, 0.65, 0]} color="#ffb766" intensity={1.8} distance={3.5} />
              </group>
            )}

            {/* Sanitaryware / Bathroom Vanity */}
            {type === "sanitaryware" && (
              <group position={[0, 0.42, 0]}>
                <mesh castShadow material={new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1 })}>
                  <boxGeometry args={[w, 0.84, d]} />
                </mesh>
                {/* Mirror above */}
                <mesh position={[0, 0.8, -d / 2 + 0.02]} material={glassMat}>
                  <boxGeometry args={[w * 0.9, 0.8, 0.02]} />
                </mesh>
              </group>
            )}

            {/* Custom / Architectural Accent / Pouffe / Rug */}
            {type === "custom" && item.name.toLowerCase().includes("rug") && (
              <group position={[0, 0.01, 0]}>
                <mesh receiveShadow material={rugMat}>
                  <cylinderGeometry args={[w / 2, w / 2, 0.02, 32]} />
                </mesh>
              </group>
            )}

            {type === "custom" && !item.name.toLowerCase().includes("rug") && (
              <group position={[0, 0.3, 0]}>
                <mesh castShadow material={woodMat}>
                  <boxGeometry args={[w, 0.6, d]} />
                </mesh>
              </group>
            )}

            {/* Dimensions Tag */}
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

      {/* Decorative Potted Plant & Wall Art */}
      <group position={[bounds.minX + 0.6, 0.35, bounds.minZ + 0.6]}>
        <mesh castShadow material={new THREE.MeshStandardMaterial({ color: "#8a5832", roughness: 0.8 })}>
          <cylinderGeometry args={[0.18, 0.14, 0.4, 16]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#2d5a27", roughness: 0.6 })}>
          <sphereGeometry args={[0.26, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
