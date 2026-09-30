"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

export interface ZoningEnvelopeProps {
  visible?: boolean;
  roadWidthM?: number; // default 18.0m sector road
  heightCapM?: number; // default 24.0m statutory height cap
  slopeRatio?: number; // default 1.5 (1:1.5 -> 56.3° sky exposure plane)
  bounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Renders the statutory Haryana DTCP & NBC 2016 Part 3 Cl. 4.3 volumetric zoning envelope:
 * 1. Translucent volumetric maximum allowable massing envelope
 * 2. 56.3° (1:1.5) sloped sky-exposure plane starting from 18.0m sector road edge
 * 3. Amber horizontal height cap plane at 24.0m
 * 4. 18.0m sector road with road center markings
 * 5. Statutory HTML billboard badges with code citations
 */
export function ZoningEnvelope({
  visible = true,
  roadWidthM = 18.0,
  heightCapM = 24.0,
  slopeRatio = 1.5, // 56.3 degrees
  bounds,
}: ZoningEnvelopeProps) {
  if (!visible) return null;

  // Derive site geometry from floor plan bounds or default to standard luxury plot
  const site = useMemo(() => {
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

    // Buildable footprint bounded by setbacks and 60% ground coverage
    const buildMinX = minX + sideSetbackM;
    const buildMaxX = maxX - sideSetbackM;
    const buildMinZ = minZ + frontSetbackM;
    const buildMaxZ = maxZ - rearSetbackM;
    const buildWidth = buildMaxX - buildMinX;
    const buildDepth = buildMaxZ - buildMinZ;

    // Front road extends along -Z from the front plot boundary
    const roadZStart = minZ;
    const roadZEnd = minZ - roadWidthM;
    const roadMidZ = (roadZStart + roadZEnd) / 2;

    // Sky exposure plane starts at the opposite road boundary or front property line
    // Slope: dy/dz = 1.5 -> y(z) = slopeRatio * (z - minZ)
    // Distance to reach heightCap: deltaZ = heightCap / 1.5 = 16m
    const slopeTransitionZ = Math.min(buildMaxZ, minZ + heightCapM / slopeRatio);
    const slopeHeightAtTransition = Math.min(heightCapM, (slopeTransitionZ - minZ) * slopeRatio);

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      width,
      depth,
      buildMinX,
      buildMaxX,
      buildMinZ,
      buildMaxZ,
      buildWidth,
      buildDepth,
      roadZStart,
      roadZEnd,
      roadMidZ,
      slopeTransitionZ,
      slopeHeightAtTransition,
    };
  }, [bounds, roadWidthM, heightCapM, slopeRatio]);

  // Triangulated buffer geometry for the sloped sky-exposure plane
  const skyExposureGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const x0 = site.minX - 2;
    const x1 = site.maxX + 2;
    const z0 = site.minZ;
    const z1 = site.slopeTransitionZ;
    const y0 = 0;
    const y1 = site.slopeHeightAtTransition;

    // Two triangles forming a sloped quad
    const positions = new Float32Array([
      x0, y0, z0,
      x1, y0, z0,
      x1, y1, z1,

      x0, y0, z0,
      x1, y1, z1,
      x0, y1, z1,
    ]);

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }, [site]);

  // Edges geometry for clean crisp architectural wireframe
  const skyExposureEdges = useMemo(() => {
    return new THREE.EdgesGeometry(skyExposureGeometry);
  }, [skyExposureGeometry]);

  return (
    <group name="StatutoryZoningEnvelope" renderOrder={25}>
      {/* 1. 18.0m Sector Road Surface Plane */}
      <mesh
        position={[(site.minX + site.maxX) / 2, -0.02, site.roadMidZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[site.width + 12, roadWidthM]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.9}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Road Center Dashed Marking Line */}
      {Array.from({ length: Math.ceil((site.width + 12) / 3) }).map((_, i) => (
        <mesh
          key={i}
          position={[
            site.minX - 6 + i * 3,
            -0.015,
            site.roadMidZ,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.5, 0.2]} />
          <meshBasicMaterial color="#f8fafc" depthWrite={false} />
        </mesh>
      ))}

      {/* 2. Statutory Plot Boundary Ground Footprint */}
      <mesh
        position={[(site.minX + site.maxX) / 2, -0.01, (site.minZ + site.maxZ) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[site.width, site.depth]} />
        <meshStandardMaterial
          color="#475569"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Plot Boundary Wireframe Outline */}
      <lineSegments
        position={[(site.minX + site.maxX) / 2, 0.01, (site.minZ + site.maxZ) / 2]}
      >
        <edgesGeometry
          args={[new THREE.BoxGeometry(site.width, 0.05, site.depth)]}
        />
        <lineBasicMaterial color="#64748b" linewidth={1.5} />
      </lineSegments>

      {/* 3. Permissible Massing Envelope Volume ( हरियाणा DTCP Max FAR 2.64 / 60% Coverage ) */}
      <mesh
        position={[
          (site.buildMinX + site.buildMaxX) / 2,
          heightCapM / 2,
          (site.buildMinZ + site.buildMaxZ) / 2,
        ]}
      >
        <boxGeometry args={[site.buildWidth, heightCapM, site.buildDepth]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.08}
          roughness={0.2}
          metalness={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Massing Envelope Wireframe Outlines */}
      <lineSegments
        position={[
          (site.buildMinX + site.buildMaxX) / 2,
          heightCapM / 2,
          (site.buildMinZ + site.buildMaxZ) / 2,
        ]}
      >
        <edgesGeometry
          args={[new THREE.BoxGeometry(site.buildWidth, heightCapM, site.buildDepth)]}
        />
        <lineBasicMaterial color="#0284c7" linewidth={1.5} />
      </lineSegments>

      {/* 4. Sloped Sky-Exposure Plane (56.3° / 1:1.5 Slope per NBC 2016 Part 3 Cl. 4.3) */}
      <mesh geometry={skyExposureGeometry}>
        <meshStandardMaterial
          color="#f59e0b"
          transparent
          opacity={0.16}
          roughness={0.3}
          metalness={0.0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments geometry={skyExposureEdges}>
        <lineBasicMaterial color="#d97706" linewidth={2} />
      </lineSegments>

      {/* 5. Statutory Height Cap Amber Plane at 24.0m */}
      <mesh
        position={[
          (site.minX + site.maxX) / 2,
          heightCapM,
          (site.slopeTransitionZ + site.maxZ) / 2,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry
          args={[site.width + 4, Math.max(2, site.maxZ - site.slopeTransitionZ + 2)]}
        />
        <meshStandardMaterial
          color="#e8a849"
          transparent
          opacity={0.22}
          roughness={0.2}
          metalness={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Height Cap Wireframe Outline */}
      <lineSegments
        position={[
          (site.minX + site.maxX) / 2,
          heightCapM,
          (site.slopeTransitionZ + site.maxZ) / 2,
        ]}
      >
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(
              site.width + 4,
              0.05,
              Math.max(2, site.maxZ - site.slopeTransitionZ + 2)
            ),
          ]}
        />
        <lineBasicMaterial color="#f59e0b" linewidth={2} />
      </lineSegments>

      {/* 6. Statutory HTML Billboard Badges */}
      {/* Badge 1: 18.0m Sector Road */}
      <Html
        position={[(site.minX + site.maxX) / 2, 0.4, site.roadMidZ]}
        center
        distanceFactor={22}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-100 shadow-xl backdrop-blur-md">
          <span className="text-sky-400">🛣️ 18.0m Sector Road</span>{" "}
          <span className="text-[9px] text-slate-400">[NBC Part 3 Table 1]</span>
        </div>
      </Html>

      {/* Badge 2: Sky-Exposure Plane */}
      <Html
        position={[
          site.minX - 1.5,
          site.slopeHeightAtTransition / 2 + 1,
          (site.minZ + site.slopeTransitionZ) / 2,
        ]}
        center
        distanceFactor={22}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-md border border-amber-500/80 bg-slate-900/90 px-2.5 py-1 text-[11px] font-mono font-bold text-amber-300 shadow-xl backdrop-blur-md">
          <span>📐 Sky-Exposure Plane: 56.3° (1:1.5)</span>{" "}
          <span className="text-[9px] text-amber-400/80">[NBC Cl. 4.3]</span>
        </div>
      </Html>

      {/* Badge 3: Max Envelope FAR & Ground Coverage at Height Cap */}
      <Html
        position={[
          (site.buildMinX + site.buildMaxX) / 2,
          heightCapM + 1.2,
          (site.buildMinZ + site.buildMaxZ) / 2,
        ]}
        center
        distanceFactor={22}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-md border border-sky-500/80 bg-slate-900/95 px-3 py-1.5 text-xs font-mono font-bold text-sky-200 shadow-2xl backdrop-blur-md">
          <span>🏛️ Max Envelope: FAR 2.64 | Coverage ≤ 60%</span>{" "}
          <span className="ml-1 rounded bg-sky-500/20 px-1 py-0.5 text-[9px] text-sky-300 border border-sky-500/30">
            H_max = 24.0m [Haryana DTCP]
          </span>
        </div>
      </Html>
    </group>
  );
}
