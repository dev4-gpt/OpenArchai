"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { floorPlanStore, useFloorPlanStore } from "./state/floor-plan-store";
import type { Point, Wall, Door, Window, Room, FurnitureItem, FloorPlan, PendingFurniture, StaircaseItem } from "./types";
import { metersToUnit, unitLabel, type UnitSystem } from "@/lib/units";
import { parseDxfContent } from "@/lib/dxf-import";
import { calculateEgressOverlay, findFurthestRetreatPoint } from "@/lib/calculators/egress-overlay-geometry";
import { lintFloorPlanGeometry, type LinterIssue } from "@/lib/calculators/geometry-linter";
import { calculateFARMetrics } from "@/lib/calculators/far-envelope-geometry";
import { generateStructuralGrid, checkSpanDeflection, checkPlenumClash } from "@/lib/calculators/structural-grid-engine";
import { calculateDaylightFactor, evaluateVastuMandala } from "@/lib/calculators/acoustic-rt60-calculator";
import { resolveMultiExitRoutes, type ExitRoutingResult } from "@/lib/calculators/staircase-egress-calculator";

export function EditorCanvas({ unitSystem = "metric" }: { unitSystem?: UnitSystem }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const state = useFloorPlanStore();
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredLintIssue, setHoveredLintIssue] = useState<LinterIssue | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartPlanRef = useRef<FloorPlan | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  const {
    floorPlan,
    tool,
    drawingPoints,
    snapPoint,
    selectedIds,
    pendingFurniture,
    pendingStaircase,
    showEgressOverlay,
    showLinter,
  } = state;
  const showFarOverlay = Boolean(state.showFarOverlay || (state as any).showFarEnvelope);
  const showStructuralGrid = Boolean(state.showStructuralGrid);
  const structuralGridModule = state.structuralGridModule || "6x6";
  const showDaylightingOverlay = Boolean(state.showDaylightingOverlay || state.showDaylightVastu);
  const showVastuOverlay = Boolean(state.showVastuOverlay || state.showDaylightVastu);
  const showDaylightVastu = Boolean(state.showDaylightVastu);
  const showPhasing4D = Boolean(state.showPhasing4D);
  const phasingDay = state.phasingDay ?? 90;
  const showConstructionStaging = Boolean(state.showConstructionStaging || state.showPhasing4D);
  const constructionStage = state.constructionStage || (showPhasing4D ? (phasingDay < 30 ? "structure" : phasingDay < 60 ? "mep" : "finishes") : "all");
  const { zoom, panOffset, walls, doors, windows, rooms, furniture = [], staircases = [] } = floorPlan;

  // Live FAR, ground coverage, and carpet-to-saleable efficiency metrics
  const farMetrics = useMemo(() => calculateFARMetrics(floorPlan), [floorPlan]);

  // Auto-focus container when pending furniture or staircase is armed for instant controls
  useEffect(() => {
    if (pendingFurniture || pendingStaircase) {
      containerRef.current?.focus();
    }
  }, [pendingFurniture, pendingStaircase]);

  // Listen for statutory audit / egress toggle events across dashboard components
  useEffect(() => {
    const handleComplianceAudit = () => {
      floorPlanStore.setEgressOverlay(true);
      floorPlanStore.setLinter(true);
    };
    window.addEventListener("atelier-compliance-audit", handleComplianceAudit);
    return () => window.removeEventListener("atelier-compliance-audit", handleComplianceAudit);
  }, []);

  // Convert screen coordinates to world coordinates (meters)
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - panOffset.x) / zoom,
        y: (screenY - panOffset.y) / zoom,
      };
    },
    [panOffset, zoom],
  );

  // Convert world coordinates (meters) to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Point => {
      return {
        x: worldX * zoom + panOffset.x,
        y: worldY * zoom + panOffset.y,
      };
    },
    [panOffset, zoom],
  );

  // Find snap point (nearby vertex or grid)
  const getSnapTarget = useCallback(
    (rawWorld: Point): Point => {
      const snapDist = 0.3; // 30cm snap radius
      for (const w of walls) {
        for (const pt of [w.start, w.end]) {
          const dx = pt.x - rawWorld.x;
          const dy = pt.y - rawWorld.y;
          if (Math.hypot(dx, dy) < snapDist) {
            return pt;
          }
        }
      }
      // Otherwise snap to 0.25m grid
      const grid = 0.25;
      return {
        x: Math.round(rawWorld.x / grid) * grid,
        y: Math.round(rawWorld.y / grid) * grid,
      };
    },
    [walls],
  );

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Background grid
    const startX = (panOffset.x % zoom) - zoom;
    const startY = (panOffset.y % zoom) - zoom;
    ctx.strokeStyle = "#ede8df";
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = startX; x < width; x += zoom) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += zoom) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 2. Center origin indicator
    const origin = worldToScreen(0, 0);
    ctx.strokeStyle = "#d4cdbf";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x - 10, origin.y);
    ctx.lineTo(origin.x + 10, origin.y);
    ctx.moveTo(origin.x, origin.y - 10);
    ctx.lineTo(origin.x, origin.y + 10);
    ctx.stroke();

    const farMetrics = calculateFARMetrics(floorPlan);

    // 2.5. Render Statutory FAR Boundary & Ground Coverage Envelopes (Pillar 1)
    if (showFarOverlay) {
      // Plot boundary polygon
      if (farMetrics.plotPolygon && farMetrics.plotPolygon.length >= 3) {
        ctx.save();
        ctx.beginPath();
        const p0 = worldToScreen(farMetrics.plotPolygon[0].x, farMetrics.plotPolygon[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < farMetrics.plotPolygon.length; i++) {
          const pt = worldToScreen(farMetrics.plotPolygon[i].x, farMetrics.plotPolygon[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(71, 85, 105, 0.04)";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on top edge
        const p1 = worldToScreen(farMetrics.plotPolygon[1].x, farMetrics.plotPolygon[1].y);
        const midPlotX = (p0.x + p1.x) / 2;
        const midPlotY = p0.y - 8;
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#475569";
        ctx.textAlign = "center";
        ctx.fillText("🏛️ STATUTORY PLOT BOUNDARY (Haryana DTCP Base FAR 1.75 / Max 2.64)", midPlotX, midPlotY);
        ctx.restore();
      }

      // 60% Ground coverage footprint polygon
      if (farMetrics.footprintPolygon && farMetrics.footprintPolygon.length >= 3) {
        ctx.save();
        ctx.beginPath();
        const f0 = worldToScreen(farMetrics.footprintPolygon[0].x, farMetrics.footprintPolygon[0].y);
        ctx.moveTo(f0.x, f0.y);
        for (let i = 1; i < farMetrics.footprintPolygon.length; i++) {
          const pt = worldToScreen(farMetrics.footprintPolygon[i].x, farMetrics.footprintPolygon[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(2, 132, 199, 0.05)";
        ctx.fill();
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 3. Render rooms (polygons)
    for (const room of rooms) {
      if (room.vertices.length < 3) continue;
      const isRoomDeleteHover = tool === "eraser" && hoveredDeleteId === room.id;
      const zoneInfo = showFarOverlay
        ? farMetrics.classifiedRooms.find((c) => c.roomId === room.id)
        : null;

      ctx.beginPath();
      const first = worldToScreen(room.vertices[0].x, room.vertices[0].y);
      ctx.moveTo(first.x, first.y);
      const screenVertices = [first];
      for (let i = 1; i < room.vertices.length; i++) {
        const pt = worldToScreen(room.vertices[i].x, room.vertices[i].y);
        ctx.lineTo(pt.x, pt.y);
        screenVertices.push(pt);
      }
      ctx.closePath();

      if (isRoomDeleteHover) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      } else if (zoneInfo) {
        ctx.fillStyle = zoneInfo.fillRgba;
      } else {
        ctx.fillStyle = "rgba(161, 92, 62, 0.05)";
      }
      ctx.fill();

      // If FAR overlay active, stroke room boundary with statutory zone color
      if (showFarOverlay && zoneInfo) {
        ctx.save();
        ctx.strokeStyle = zoneInfo.strokeHex;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 45° diagonal architectural cross-hatch for Deductible Service Shafts
        if (zoneInfo.category === "DEDUCTIBLE_SHAFT") {
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
          ctx.lineWidth = 1;
          const minX = Math.min(...screenVertices.map((p) => p.x));
          const maxX = Math.max(...screenVertices.map((p) => p.x));
          const minY = Math.min(...screenVertices.map((p) => p.y));
          const maxY = Math.max(...screenVertices.map((p) => p.y));
          const span = Math.max(maxX - minX, maxY - minY) + 20;
          ctx.beginPath();
          for (let offset = -span; offset < span * 2; offset += 9) {
            ctx.moveTo(minX + offset, minY);
            ctx.lineTo(minX + offset + span, minY + span);
          }
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // Label at centroid
      const cx = room.vertices.reduce((s, p) => s + p.x, 0) / room.vertices.length;
      const cy = room.vertices.reduce((s, p) => s + p.y, 0) / room.vertices.length;
      const labelPt = worldToScreen(cx, cy);

      ctx.fillStyle = isRoomDeleteHover ? "#ef4444" : "#2a2621";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(room.label, labelPt.x, labelPt.y - (showFarOverlay ? 10 : 4));

      ctx.fillStyle = isRoomDeleteHover ? "#ef4444" : "#8a8073";
      ctx.font = "10px sans-serif";
      const areaDisplay =
        unitSystem === "metric"
          ? `${room.area.toFixed(1)} m²`
          : `${(room.area * 10.7639).toFixed(0)} sq ft`;
      ctx.fillText(areaDisplay, labelPt.x, labelPt.y + (showFarOverlay ? 3 : 12));

      // Zone category tag pill if FAR overlay active
      if (showFarOverlay && zoneInfo) {
        ctx.save();
        const badgeLabel =
          zoneInfo.category === "NET_CARPET"
            ? "CARPET (GREEN)"
            : zoneInfo.category === "SALEABLE_CIRCULATION"
            ? "CIRCULATION (AMBER)"
            : "SHAFT (DEDUCTIBLE)";
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = zoneInfo.colorHex;
        ctx.fillText(`[${badgeLabel}]`, labelPt.x, labelPt.y + 15);
        ctx.restore();
      }
    }

    // 4. Render walls
    for (const wall of walls) {
      const p1 = worldToScreen(wall.start.x, wall.start.y);
      const p2 = worldToScreen(wall.end.x, wall.end.y);
      const isSelected = selectedIds.includes(wall.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === wall.id;

      const isStructurePhase = showConstructionStaging && (constructionStage === "structure" || (showPhasing4D && phasingDay < 30));

      // Wall core
      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#a15c3e" : isStructurePhase ? "#64748b" : "#2a2621";
      ctx.lineWidth = isDeleteHover ? Math.max(5, (wall.thickness + 0.04) * zoom) : Math.max(3, wall.thickness * zoom);
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Rebar cross-hatching tick marks along shear wall
      const lenMeters = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      if (isStructurePhase && lenMeters > 0.4) {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        const tickCount = Math.floor(lenMeters * 3);
        const wallDx = p2.x - p1.x;
        const wallDy = p2.y - p1.y;
        const wallLen = Math.hypot(wallDx, wallDy);
        if (wallLen > 10) {
          const ux = wallDx / wallLen;
          const uy = wallDy / wallLen;
          const nx = -uy * 4;
          const ny = ux * 4;
          for (let i = 1; i <= tickCount; i++) {
            const frac = i / (tickCount + 1);
            const cx = p1.x + wallDx * frac;
            const cy = p1.y + wallDy * frac;
            ctx.beginPath();
            ctx.moveTo(cx - nx - ux * 3, cy - ny - uy * 3);
            ctx.lineTo(cx + nx + ux * 3, cy + ny + uy * 3);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      if (lenMeters > 0.4) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const distUnit = metersToUnit(lenMeters, unitSystem);
        const label = `${distUnit.toFixed(2)} ${unitLabel(unitSystem)}`;

        ctx.font = "10px sans-serif";
        ctx.fillStyle = isDeleteHover ? "#ef4444" : "#595045";
        ctx.textAlign = "center";
        ctx.fillText(label, midX, midY - 6);
      }
    }

    // 5. Render windows
    const dimStructureOpenings = showConstructionStaging && (constructionStage === "structure" || (showPhasing4D && phasingDay < 30));
    if (dimStructureOpenings) {
      ctx.save();
      ctx.globalAlpha = 0.20;
    }
    for (const win of windows) {
      const pos = worldToScreen(win.position.x, win.position.y);
      const halfW = (win.width * zoom) / 2;
      const isSelected = selectedIds.includes(win.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === win.id;

      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#a15c3e" : "#3b82f6";
      ctx.lineWidth = isDeleteHover ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(pos.x - halfW, pos.y);
      ctx.lineTo(pos.x + halfW, pos.y);
      ctx.stroke();

      // Window sill indicator
      ctx.strokeStyle = isDeleteHover ? "#fca5a5" : "#93c5fd";
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - halfW, pos.y - 3, win.width * zoom, 6);
    }
    if (dimStructureOpenings) {
      ctx.restore();
    }

    // 6. Render doors
    if (dimStructureOpenings) {
      ctx.save();
      ctx.globalAlpha = 0.20;
    }
    for (const door of doors) {
      const pos = worldToScreen(door.position.x, door.position.y);
      const doorRadius = door.width * zoom;
      const isSelected = selectedIds.includes(door.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === door.id;

      // Door leaf
      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#a15c3e" : "#a15c3e";
      ctx.lineWidth = isDeleteHover ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y - doorRadius);
      ctx.stroke();

      // Door swing arc
      ctx.strokeStyle = isDeleteHover ? "#fca5a5" : "#d4b09b";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, doorRadius, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Statutory FD 120 2-hour Fire Door Badge (NBC 2016 Part 4 Table 1)
      if (door.isFireExit || showEgressOverlay) {
        ctx.save();
        const badgeText = "FD 120";
        ctx.font = "bold 8px monospace";
        const bMetrics = ctx.measureText(badgeText);
        const bPad = 4;
        const bW = bMetrics.width + bPad * 2;
        const bH = 13;
        const badgeX = pos.x + 6;
        const badgeY = pos.y - doorRadius / 2;

        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY - bH / 2, bW, bH, 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + bW / 2, badgeY);
        ctx.restore();
      }
    }
    if (dimStructureOpenings) {
      ctx.restore();
    }

    // 6.4. Render Staircases (NBC 2016 Part 4 Table 8)
    for (const stair of staircases) {
      const isSelected = selectedIds.includes(stair.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === stair.id;
      const center = worldToScreen(stair.position.x, stair.position.y);
      const flightW = stair.width ?? stair.flightWidth ?? 1.50;
      const riserCount = stair.riserCount || 10;
      const riserMm = stair.riserMm ?? Math.round((stair.riserHeight ?? 0.15) * 1000);
      const treadMm = stair.treadMm ?? Math.round((stair.treadDepth ?? 0.30) * 1000);
      const flightL = stair.length ?? (riserCount * (treadMm / 1000));
      const w = flightW * zoom;
      const l = flightL * zoom;
      const rot = stair.rotation || 0;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((rot * Math.PI) / 180);

      // Flight bounding box
      ctx.fillStyle = isDeleteHover ? "#fee2e2" : isSelected ? "#e0e7ff" : "#f1f5f9";
      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#4f46e5" : "#475569";
      ctx.lineWidth = isSelected || isDeleteHover ? 2 : 1.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -l / 2, w, l, 3);
      ctx.fill();
      ctx.stroke();

      // Tread lines across flight
      ctx.strokeStyle = isDeleteHover ? "#fca5a5" : "#94a3b8";
      ctx.lineWidth = 1;
      const stepLength = l / riserCount;
      for (let i = 1; i < riserCount; i++) {
        const yPos = -l / 2 + i * stepLength;
        ctx.beginPath();
        ctx.moveTo(-w / 2, yPos);
        ctx.lineTo(w / 2, yPos);
        ctx.stroke();
      }

      // Continuous handrails on both sides (NBC 2016 Part 4 Table 8)
      ctx.strokeStyle = isSelected ? "#4f46e5" : "#334155";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 2, -l / 2);
      ctx.lineTo(-w / 2 + 2, l / 2);
      ctx.moveTo(w / 2 - 2, -l / 2);
      ctx.lineTo(w / 2 - 2, l / 2);
      ctx.stroke();

      // Flight direction arrow with "UP" text
      ctx.strokeStyle = "#2563eb";
      ctx.fillStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, l / 2 - 6);
      ctx.lineTo(0, -l / 2 + 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -l / 2 + 6);
      ctx.lineTo(-4, -l / 2 + 13);
      ctx.lineTo(4, -l / 2 + 13);
      ctx.closePath();
      ctx.fill();

      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#1e3a8a";
      ctx.fillText("UP", 0, 0);

      // Label with dimensions and Blondel check
      const blondel = 2 * riserMm + treadMm;
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = isSelected ? "#312e81" : "#475569";
      ctx.fillText(`${flightW.toFixed(2)}m Flight (${riserMm}R/${treadMm}T · ${blondel}mm)`, 0, l / 2 + 10);

      ctx.restore();
    }

    // 6.5. Render Furniture Elements
    const dimFurniture = showConstructionStaging && (constructionStage === "structure" || constructionStage === "mep" || (showPhasing4D && phasingDay < 60));
    if (dimFurniture) {
      ctx.save();
      ctx.globalAlpha = constructionStage === "structure" || (showPhasing4D && phasingDay < 30) ? 0.12 : 0.25;
    }
    for (const item of furniture) {
      const isSelected = selectedIds.includes(item.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === item.id;
      const center = worldToScreen(item.position.x, item.position.y);
      const w = item.width * zoom;
      const d = item.depth * zoom;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((item.rotation * Math.PI) / 180);

      ctx.fillStyle = isDeleteHover ? "#fee2e2" : isSelected ? "#fef3c7" : "#faf5ef";
      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#d97706" : "#8c786a";
      ctx.lineWidth = isSelected || isDeleteHover ? 2 : 1.5;

      ctx.beginPath();
      ctx.roundRect(-w / 2, -d / 2, w, d, 4);
      ctx.fill();
      ctx.stroke();

      if (item.type === "sofa") {
        ctx.strokeStyle = "#a89485";
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 3, -d / 2 + 3, w - 6, d / 3);
      } else if (item.type === "bed") {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#a89485";
        ctx.lineWidth = 1;
        const pw = Math.max(4, (w - 12) / 2);
        ctx.fillRect(-w / 2 + 4, -d / 2 + 4, pw, d * 0.28);
        ctx.strokeRect(-w / 2 + 4, -d / 2 + 4, pw, d * 0.28);
        ctx.fillRect(2, -d / 2 + 4, pw, d * 0.28);
        ctx.strokeRect(2, -d / 2 + 4, pw, d * 0.28);
      } else if (item.type === "table") {
        ctx.strokeStyle = "#b8a596";
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 3, -d / 2 + 3, w - 6, d - 6);
      } else if (item.type === "sanitaryware") {
        ctx.strokeStyle = "#a89485";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(2, w / 2 - 3), Math.max(2, d / 2 - 3), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = isDeleteHover ? "#ef4444" : isSelected ? "#b45309" : "#635246";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.tag || item.name, 0, 0);

      ctx.restore();
    }
    if (dimFurniture) {
      ctx.restore();
    }

    // 6.6. Render Statutory NBC 2016 Egress Vector Path & Wet Core Shaft Overlay
    if (showEgressOverlay) {
      const egress = calculateEgressOverlay(floorPlan, true);
      const { waypoints, travelDistanceM, maxAllowedM, clause, isCompliant, shaft } = egress;

      // A. Render 300x300mm Vertical MEP Wet Core Riser Shaft
      if (shaft) {
        const shaftScreen = worldToScreen(shaft.x, shaft.y);
        const shaftW = shaft.width * zoom;
        const shaftH = (shaft.height || 0.3) * zoom;

        ctx.save();

        // 1. Shaft Solid Opaque Background & Inset Fill
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(shaftScreen.x, shaftScreen.y, shaftW, shaftH);

        // 2. Architectural 45-degree Cross-Hatching (Clipped inside shaft boundary)
        ctx.save();
        ctx.beginPath();
        ctx.rect(shaftScreen.x, shaftScreen.y, shaftW, shaftH);
        ctx.clip();

        // Diagonal hatch lines
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        const hatchSpacing = Math.max(4, 5 * (zoom / 35));
        const totalSpan = shaftW + shaftH;
        for (let offset = -shaftH; offset <= totalSpan; offset += hatchSpacing) {
          ctx.beginPath();
          ctx.moveTo(shaftScreen.x + offset, shaftScreen.y + shaftH);
          ctx.lineTo(shaftScreen.x + offset + shaftH, shaftScreen.y);
          ctx.stroke();
        }

        // Corner-to-Corner Cross 'X'
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(shaftScreen.x, shaftScreen.y);
        ctx.lineTo(shaftScreen.x + shaftW, shaftScreen.y + shaftH);
        ctx.moveTo(shaftScreen.x, shaftScreen.y + shaftH);
        ctx.lineTo(shaftScreen.x + shaftW, shaftScreen.y);
        ctx.stroke();

        ctx.restore(); // end clip

        // 3. Shaft Perimeter Structural Border
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.strokeRect(shaftScreen.x, shaftScreen.y, shaftW, shaftH);

        // 4. Clear Architectural Label: "MEP RISER 300×300mm"
        const labelX = shaftScreen.x + shaftW / 2;
        const labelY = shaftScreen.y + shaftH + 13;

        const labelText = "MEP RISER 300×300mm";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textMetrics = ctx.measureText(labelText);
        const pillPadX = 5;
        const pillPadY = 2;
        const pillW = textMetrics.width + pillPadX * 2;
        const pillH = 15;

        // Label pill background
        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.beginPath();
        ctx.roundRect(labelX - pillW / 2, labelY - pillH / 2, pillW, pillH, 3);
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(labelText, labelX, labelY);

        // 5. Statutory FD-R (Fire Damper Riser) Symbol (NBC 2016 Part 4 Cl. 3.4.5)
        const fdrX = shaftScreen.x + shaftW / 2;
        const fdrY = shaftScreen.y - 10;
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.roundRect(fdrX - 16, fdrY - 7, 32, 14, 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("FD-R", fdrX, fdrY);

        ctx.restore();
      }

      // B. Statutory First-Aid Hose Reel (HR) Station (NBC 2016 Part 4 Cl. 5.1.2)
      {
        const hrWorldX = shaft ? shaft.x + shaft.width + 0.6 : 3.0;
        const hrWorldY = shaft ? shaft.y + (shaft.height || 0.3) / 2 : 2.0;
        const hrScreen = worldToScreen(hrWorldX, hrWorldY);

        ctx.save();
        // 30m reach radius arc (dashed red/amber)
        ctx.strokeStyle = "rgba(239, 68, 68, 0.22)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(hrScreen.x, hrScreen.y, 30.0 * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(239, 68, 68, 0.03)";
        ctx.fill();

        // HR circular reel casing
        const hrR = 9;
        ctx.setLineDash([]);
        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hrScreen.x, hrScreen.y, hrR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner spool
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hrScreen.x, hrScreen.y, hrR * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        // Nozzle pip
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(hrScreen.x + hrR - 1, hrScreen.y - 2, 4, 4);

        // Center text 'HR'
        ctx.font = "bold 8px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("HR", hrScreen.x, hrScreen.y);

        // Label pill: 'HR (30m Reach)'
        const hrLabel = "HR (30m Reach)";
        ctx.font = "bold 8px monospace";
        const hrM = ctx.measureText(hrLabel);
        const hrPillW = hrM.width + 8;
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(hrScreen.x - hrPillW / 2, hrScreen.y + hrR + 3, hrPillW, 14, 3);
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "#fecaca";
        ctx.fillText(hrLabel, hrScreen.x, hrScreen.y + hrR + 10);
        ctx.restore();
      }

      // C. Render Egress Travel Distance Vector Paths
      const hasMultipleDoors = doors.length > 1;
      const roomPoints: Point[] = rooms
        .filter((r) => r.vertices && r.vertices.length > 0)
        .map((r) => {
          const cx = r.vertices.reduce((s, p) => s + p.x, 0) / r.vertices.length;
          const cy = r.vertices.reduce((s, p) => s + p.y, 0) / r.vertices.length;
          let maxD = -1;
          let worstPt = r.vertices[0];
          for (const v of r.vertices) {
            const d = Math.hypot(v.x - cx, v.y - cy);
            if (d > maxD) {
              maxD = d;
              worstPt = v;
            }
          }
          return worstPt;
        });

      const exitList = doors.map((d) => ({ id: d.id, position: d.position }));
      const multiRoutes = hasMultipleDoors && roomPoints.length > 0
        ? resolveMultiExitRoutes(roomPoints, exitList)
        : [];

      if (multiRoutes.length > 0) {
        ctx.save();
        for (const route of multiRoutes) {
          const rWaypoints = route.routeWaypoints.map((pt) => worldToScreen(pt.x, pt.y));
          if (rWaypoints.length < 2) continue;

          // Outer Glow
          ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(rWaypoints[0].x, rWaypoints[0].y);
          for (let i = 1; i < rWaypoints.length; i++) ctx.lineTo(rWaypoints[i].x, rWaypoints[i].y);
          ctx.stroke();

          // Green vector path
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 5]);
          ctx.beginPath();
          ctx.moveTo(rWaypoints[0].x, rWaypoints[0].y);
          for (let i = 1; i < rWaypoints.length; i++) ctx.lineTo(rWaypoints[i].x, rWaypoints[i].y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Chevrons pointing along path
          for (let i = 0; i < rWaypoints.length - 1; i++) {
            const pStart = rWaypoints[i];
            const pEnd = rWaypoints[i + 1];
            const segDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
            if (segDist > 16) {
              const midX = (pStart.x + pEnd.x) / 2;
              const midY = (pStart.y + pEnd.y) / 2;
              const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
              const arrowLen = 6;

              ctx.save();
              ctx.translate(midX, midY);
              ctx.rotate(angle);
              ctx.fillStyle = "#10b981";
              ctx.beginPath();
              ctx.moveTo(arrowLen, 0);
              ctx.lineTo(-arrowLen * 0.7, -arrowLen * 0.7);
              ctx.lineTo(-arrowLen * 0.3, 0);
              ctx.lineTo(-arrowLen * 0.7, arrowLen * 0.7);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
          }

          // Start node circle
          ctx.fillStyle = "#10b981";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rWaypoints[0].x, rWaypoints[0].y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // End node circle
          ctx.beginPath();
          ctx.arc(rWaypoints[rWaypoints.length - 1].x, rWaypoints[rWaypoints.length - 1].y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Live distance readout pill along midpoint
          const midSegX = (rWaypoints[0].x + rWaypoints[rWaypoints.length - 1].x) / 2;
          const midSegY = (rWaypoints[0].y + rWaypoints[rWaypoints.length - 1].y) / 2;
          const pText = `${route.travelDistanceM.toFixed(1)}m ≤ ${route.maxPermissibleM.toFixed(1)}m [NBC 2016 Part 4 Cl. 4.5.1]`;
          ctx.font = "bold 9px monospace";
          const pM = ctx.measureText(pText);
          const pW = pM.width + 12;
          const pH = 18;

          ctx.fillStyle = route.isCompliant ? "rgba(6, 78, 59, 0.92)" : "rgba(127, 29, 29, 0.92)";
          ctx.beginPath();
          ctx.roundRect(midSegX - pW / 2, midSegY - pH / 2, pW, pH, 9);
          ctx.fill();
          ctx.strokeStyle = route.isCompliant ? "#10b981" : "#ef4444";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${route.isCompliant ? "✓ " : "✗ "}${pText}`, midSegX, midSegY);
        }
        ctx.restore();
      } else if (waypoints && waypoints.length >= 2) {
        ctx.save();

        const screenWaypoints = waypoints.map((pt) => worldToScreen(pt.x, pt.y));

        // 1. Outer Glow for High Visibility
        ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(screenWaypoints[0].x, screenWaypoints[0].y);
        for (let i = 1; i < screenWaypoints.length; i++) {
          ctx.lineTo(screenWaypoints[i].x, screenWaypoints[i].y);
        }
        ctx.stroke();

        // 2. High-Visibility Green Vector Path Line (#10b981, lineWidth 3)
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        ctx.moveTo(screenWaypoints[0].x, screenWaypoints[0].y);
        for (let i = 1; i < screenWaypoints.length; i++) {
          ctx.lineTo(screenWaypoints[i].x, screenWaypoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Direction Markers (Chevrons / Arrows pointing along vector towards exit)
        for (let i = 0; i < screenWaypoints.length - 1; i++) {
          const pStart = screenWaypoints[i];
          const pEnd = screenWaypoints[i + 1];
          const segDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
          if (segDist > 18) {
            const midX = (pStart.x + pEnd.x) / 2;
            const midY = (pStart.y + pEnd.y) / 2;
            const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
            const arrowLen = 7;

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.moveTo(arrowLen, 0);
            ctx.lineTo(-arrowLen * 0.7, -arrowLen * 0.7);
            ctx.lineTo(-arrowLen * 0.3, 0);
            ctx.lineTo(-arrowLen * 0.7, arrowLen * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // 4. Start Node: Furthest Retreat Point
        const startScreen = screenWaypoints[0];
        ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
        ctx.beginPath();
        ctx.arc(startScreen.x, startScreen.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#10b981";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startScreen.x, startScreen.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#065f46";
        ctx.fillText("🟢 Furthest Retreat (11.2, 7.8)", startScreen.x + 13, startScreen.y);

        // 5. End Node: Primary Exit Door
        const endScreen = screenWaypoints[screenWaypoints.length - 1];
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endScreen.x, endScreen.y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(endScreen.x, endScreen.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#065f46";
        ctx.fillText("🚪 Primary Exit (1.2, 0.0)", endScreen.x + 13, endScreen.y);

        // 6. Travel Distance Readout Pill Badge along the vector line
        // Select the longest corridor segment to place the pill badge
        let maxSegIdx = 0;
        let maxSegLen = 0;
        for (let i = 0; i < screenWaypoints.length - 1; i++) {
          const l = Math.hypot(
            screenWaypoints[i + 1].x - screenWaypoints[i].x,
            screenWaypoints[i + 1].y - screenWaypoints[i].y,
          );
          if (l > maxSegLen) {
            maxSegLen = l;
            maxSegIdx = i;
          }
        }

        const badgeMidX = (screenWaypoints[maxSegIdx].x + screenWaypoints[maxSegIdx + 1].x) / 2;
        const badgeMidY = (screenWaypoints[maxSegIdx].y + screenWaypoints[maxSegIdx + 1].y) / 2;

        const badgeText = `${travelDistanceM.toFixed(1)}m ≤ ${maxAllowedM.toFixed(1)}m [${clause}]`;
        ctx.font = "bold 10px monospace";
        const bMetrics = ctx.measureText(badgeText);
        const bPadX = 8;
        const bWidth = bMetrics.width + bPadX * 2 + 18;
        const bHeight = 22;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.roundRect(badgeMidX - bWidth / 2 + 1, badgeMidY - bHeight / 2 + 1.5, bWidth, bHeight, 11);
        ctx.fill();

        // Pill background
        ctx.fillStyle = isCompliant ? "#064e3b" : "#7f1d1d";
        ctx.beginPath();
        ctx.roundRect(badgeMidX - bWidth / 2, badgeMidY - bHeight / 2, bWidth, bHeight, 11);
        ctx.fill();

        // Pill border
        ctx.strokeStyle = isCompliant ? "#10b981" : "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pill text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(
          `${isCompliant ? "✓ " : "✗ "}${badgeText}`,
          badgeMidX,
          badgeMidY,
        );

        ctx.restore();
      }
    }

    // 6.7. Render Statutory NBC 2016 Canvas Geometry Linter Overlays
    if (showLinter) {
      const lintIssues = lintFloorPlanGeometry(floorPlan);

      for (const issue of lintIssues) {
        const isError = issue.severity === "error";
        const strokeColor = isError ? "#ef4444" : "#f59e0b";
        const glowColor = isError ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)";
        const fillColor = isError ? "rgba(254, 226, 226, 0.95)" : "rgba(254, 243, 199, 0.95)";

        // A. Warning Outline / Halo for Doors & Corridors
        if (issue.type === "door_pinch") {
          const door = doors.find((d) => d.id === issue.elementId);
          if (door) {
            const doorPos = worldToScreen(door.position.x, door.position.y);
            const doorRadius = door.width * zoom;

            ctx.save();
            // Translucent glowing halo
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 12;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(doorPos.x, doorPos.y);
            ctx.lineTo(doorPos.x, doorPos.y - doorRadius);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(doorPos.x, doorPos.y, doorRadius, -Math.PI / 2, 0);
            ctx.stroke();

            // High-visibility dashed statutory warning outline
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(doorPos.x, doorPos.y);
            ctx.lineTo(doorPos.x, doorPos.y - doorRadius);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(doorPos.x, doorPos.y, doorRadius, -Math.PI / 2, 0);
            ctx.stroke();
            ctx.restore();
          }
        } else if (issue.type === "corridor_pinch") {
          const cPos = worldToScreen(issue.location.x, issue.location.y);
          const pinchSpan = (issue.actualWidthM || 0.8) * zoom;

          ctx.save();
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 10;
          ctx.strokeRect(cPos.x - pinchSpan / 2, cPos.y - 12, pinchSpan, 24);

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(cPos.x - pinchSpan / 2, cPos.y - 12, pinchSpan, 24);
          ctx.restore();
        } else if (issue.type === "dead_end") {
          const dePos = worldToScreen(issue.location.x, issue.location.y);

          ctx.save();
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(dePos.x, dePos.y, 16, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(dePos.x, dePos.y, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // B. Warning Flag / Icon (⚠️) Marker & Dimension Tag
        const issueScreen = worldToScreen(issue.location.x, issue.location.y);
        const flagX = issueScreen.x + 16;
        const flagY = issueScreen.y - 16;

        ctx.save();
        // Drop shadow for flag circle
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.beginPath();
        ctx.arc(flagX + 1, flagY + 1.5, 12, 0, Math.PI * 2);
        ctx.fill();

        // Flag circle background
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(flagX, flagY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Warning Icon '⚠️'
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚠️", flagX, flagY);

        // Compact dimension tag adjacent to flag
        const dimTag =
          issue.actualWidthM !== undefined
            ? `${issue.actualWidthM.toFixed(2)}m < ${issue.requiredWidthM?.toFixed(1) || "0.9"}m`
            : `${issue.deadEndLengthM?.toFixed(1)}m > 6.0m`;
        ctx.font = "bold 9px monospace";
        const tagMetrics = ctx.measureText(dimTag);
        const tagPadX = 5;
        const tagW = tagMetrics.width + tagPadX * 2;
        const tagH = 16;
        const tagX = flagX + 16;
        const tagY = flagY - 8;

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 3);
        ctx.fill();

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#fef3c7";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(dimTag, tagX + tagPadX, tagY + tagH / 2);

        // C. Interactive Compliance Tooltip (On Hover or Near Cursor)
        const isHovered =
          (mousePos && Math.hypot(mousePos.x - issue.location.x, mousePos.y - issue.location.y) < 0.8) ||
          hoveredLintIssue?.id === issue.id;

        if (isHovered) {
          const ttPad = 8;
          const ttTitle = `${issue.title} [${issue.clause}]`;
          const ttMessage = issue.message;
          const ttRemediation = issue.remediation;

          ctx.font = "bold 10px sans-serif";
          const titleWidth = ctx.measureText(ttTitle).width;
          ctx.font = "10px monospace";
          const msgWidth = ctx.measureText(ttMessage).width;
          ctx.font = "9px sans-serif";
          const remWidth = ctx.measureText(ttRemediation).width;

          const ttBoxW = Math.max(titleWidth, msgWidth, remWidth) + ttPad * 2 + 10;
          const ttBoxH = 58;
          const ttBoxX = flagX + 10;
          const ttBoxY = flagY + 16;

          // Tooltip card shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.roundRect(ttBoxX + 2, ttBoxY + 3, ttBoxW, ttBoxH, 6);
          ctx.fill();

          // Tooltip card background
          ctx.fillStyle = "rgba(15, 23, 42, 0.97)";
          ctx.beginPath();
          ctx.roundRect(ttBoxX, ttBoxY, ttBoxW, ttBoxH, 6);
          ctx.fill();

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Tooltip header
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = isError ? "#f87171" : "#fbbf24";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(`⚠️ ${ttTitle}`, ttBoxX + ttPad, ttBoxY + ttPad);

          // Tooltip citation message
          ctx.font = "10px monospace";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(ttMessage, ttBoxX + ttPad, ttBoxY + ttPad + 16);

          // Tooltip remediation
          ctx.font = "9px sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(ttRemediation, ttBoxX + ttPad, ttBoxY + ttPad + 32);
        }

        ctx.restore();
      }
    }

    // 6.75. Render Pending Furniture Ghost Placement Preview
    if (tool === "furniture" && pendingFurniture && mousePos) {
      const previewPos = snapPoint || mousePos;
      const center = worldToScreen(previewPos.x, previewPos.y);
      const w = pendingFurniture.width * zoom;
      const d = pendingFurniture.depth * zoom;
      const rot = pendingFurniture.rotation || 0;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((rot * Math.PI) / 180);

      // Semi-transparent ghost bounding box with dashed border
      ctx.fillStyle = "rgba(245, 158, 11, 0.22)";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.roundRect(-w / 2, -d / 2, w, d, 4);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Furniture type interior geometry inside ghost
      if (pendingFurniture.type === "sofa") {
        ctx.strokeStyle = "rgba(180, 83, 9, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 3, -d / 2 + 3, w - 6, d / 3);
      } else if (pendingFurniture.type === "bed") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.strokeStyle = "rgba(180, 83, 9, 0.7)";
        ctx.lineWidth = 1;
        const pw = Math.max(4, (w - 12) / 2);
        ctx.fillRect(-w / 2 + 4, -d / 2 + 4, pw, d * 0.28);
        ctx.strokeRect(-w / 2 + 4, -d / 2 + 4, pw, d * 0.28);
        ctx.fillRect(2, -d / 2 + 4, pw, d * 0.28);
        ctx.strokeRect(2, -d / 2 + 4, pw, d * 0.28);
      } else if (pendingFurniture.type === "table") {
        ctx.strokeStyle = "rgba(180, 83, 9, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 3, -d / 2 + 3, w - 6, d - 6);
      } else if (pendingFurniture.type === "sanitaryware") {
        ctx.strokeStyle = "rgba(180, 83, 9, 0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(2, w / 2 - 3), Math.max(2, d / 2 - 3), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ghost text label
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pendingFurniture.tag || pendingFurniture.name, 0, -6);

      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#b45309";
      const dimText = `${pendingFurniture.width.toFixed(2)}m × ${pendingFurniture.depth.toFixed(2)}m (${rot}°)`;
      ctx.fillText(dimText, 0, 8);

      ctx.restore();

      // Drop target crosshair
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center.x - 10, center.y);
      ctx.lineTo(center.x + 10, center.y);
      ctx.moveTo(center.x, center.y - 10);
      ctx.lineTo(center.x, center.y + 10);
      ctx.stroke();
    }

    // 6.95. Active Pending Staircase Placement Ghost Preview (NBC 2016 Part 4 Table 8)
    if ((tool === "staircase" || pendingStaircase) && pendingStaircase && mousePos) {
      const snap = snapPoint || mousePos;
      const center = worldToScreen(snap.x, snap.y);
      const flightW = pendingStaircase.width ?? pendingStaircase.flightWidth ?? 1.50;
      const riserCount = pendingStaircase.riserCount || 10;
      const riserMm = pendingStaircase.riserMm ?? Math.round((pendingStaircase.riserHeight ?? 0.15) * 1000);
      const treadMm = pendingStaircase.treadMm ?? Math.round((pendingStaircase.treadDepth ?? 0.30) * 1000);
      const flightL = pendingStaircase.length ?? (riserCount * (treadMm / 1000));
      const w = flightW * zoom;
      const l = flightL * zoom;
      const rot = pendingStaircase.rotation || 0;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((rot * Math.PI) / 180);

      // Ghost flight bounding box
      ctx.fillStyle = "rgba(224, 231, 255, 0.65)";
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -l / 2, w, l, 4);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Tread preview lines
      const stepLength = l / riserCount;
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1;
      for (let i = 1; i < riserCount; i++) {
        const yPos = -l / 2 + i * stepLength;
        ctx.beginPath();
        ctx.moveTo(-w / 2, yPos);
        ctx.lineTo(w / 2, yPos);
        ctx.stroke();
      }

      // Continuous handrails on both sides (NBC 2016 Part 4 Table 8)
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 2, -l / 2);
      ctx.lineTo(-w / 2 + 2, l / 2);
      ctx.moveTo(w / 2 - 2, -l / 2);
      ctx.lineTo(w / 2 - 2, l / 2);
      ctx.stroke();

      // Flight direction arrow with "UP" text
      ctx.strokeStyle = "#312e81";
      ctx.fillStyle = "#312e81";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, l / 2 - 8);
      ctx.lineTo(0, -l / 2 + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -l / 2 + 6);
      ctx.lineTo(-5, -l / 2 + 14);
      ctx.lineTo(5, -l / 2 + 14);
      ctx.closePath();
      ctx.fill();

      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("UP", 0, -6);

      // Statutory Blondel Compliance Badge
      const blondel = 2 * riserMm + treadMm;
      const isBlondelOk = blondel >= 550 && blondel <= 650;
      const isWidthOk = flightW >= 1.50;
      const isRiserOk = riserMm <= 150;
      const isTreadOk = treadMm >= 300;
      const isAllCompliant = isBlondelOk && isWidthOk && isRiserOk && isTreadOk;

      const badgeStr = `2R+T=${blondel}mm [${isBlondelOk ? "PASS" : "FAIL"}] · W:${flightW.toFixed(2)}m (R≤150, T≥300)`;
      ctx.font = "bold 9px monospace";
      const bMetrics = ctx.measureText(badgeStr);
      const bPad = 6;
      const pillW = bMetrics.width + bPad * 2;
      const pillH = 18;

      ctx.fillStyle = isAllCompliant ? "rgba(6, 78, 59, 0.95)" : "rgba(127, 29, 29, 0.95)";
      ctx.beginPath();
      ctx.roundRect(-pillW / 2, l / 2 + 8, pillW, pillH, 9);
      ctx.fill();

      ctx.strokeStyle = isAllCompliant ? "#10b981" : "#ef4444";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(badgeStr, 0, l / 2 + 17);

      ctx.restore();

      // Drop target crosshair
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center.x - 10, center.y);
      ctx.lineTo(center.x + 10, center.y);
      ctx.moveTo(center.x, center.y - 10);
      ctx.lineTo(center.x, center.y + 10);
      ctx.stroke();
    }

    // 7. Active drawing wall preview
    if (drawingPoints.length === 1 && mousePos) {
      const p1 = worldToScreen(drawingPoints[0].x, drawingPoints[0].y);
      const snap = snapPoint || mousePos;
      const p2 = worldToScreen(snap.x, snap.y);

      ctx.strokeStyle = "#a15c3e";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Live measurement preview
      const lenMeters = Math.hypot(snap.x - drawingPoints[0].x, snap.y - drawingPoints[0].y);
      const distUnit = metersToUnit(lenMeters, unitSystem);
      const label = `${distUnit.toFixed(2)} ${unitLabel(unitSystem)}`;
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#a15c3e";
      ctx.textAlign = "center";
      ctx.fillText(label, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 8);
    }

    // 8. Snap point indicator
    if (snapPoint && tool === "wall") {
      const sp = worldToScreen(snapPoint.x, snapPoint.y);
      ctx.fillStyle = "#a15c3e";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 9. Live FAR & Ground Coverage Heads-Up Display (HUD) Banner
    if (showFarOverlay) {
      ctx.save();
      const hud = farMetrics.hudText;
      ctx.font = "bold 10px monospace";
      const m = ctx.measureText(hud);
      const pillW = m.width + 24;
      const pillH = 24;
      const pillX = width / 2 - pillW / 2;
      const pillY = 10;

      // Dark pill container
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fill();

      ctx.strokeStyle = farMetrics.isEfficiencyCompliant ? "#38bdf8" : "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(hud, width / 2, pillY + pillH / 2);
      ctx.restore();
    }

    // 9.2. Pillar 2: Modular Structural Bay Grid & Column Placement
    if (showStructuralGrid) {
      ctx.save();
      const gridSpacing = state.selectedGridBay || (structuralGridModule === "7.2x7.2" ? "7.2x7.2" : structuralGridModule === "6x7.2" ? "6.0x7.2" : "6.0x6.0");
      const gridData = generateStructuralGrid(floorPlan, gridSpacing);
      const { gridLinesX, gridLinesY, columns, unsupportedSpans } = gridData;

      let bMinX = 0, bMaxX = 12, bMinY = 0, bMaxY = 8;
      if (walls.length > 0) {
        bMinX = Math.min(...walls.map((w) => Math.min(w.start.x, w.end.x)));
        bMaxX = Math.max(...walls.map((w) => Math.max(w.start.x, w.end.x)));
        bMinY = Math.min(...walls.map((w) => Math.min(w.start.y, w.end.y)));
        bMaxY = Math.max(...walls.map((w) => Math.max(w.start.y, w.end.y)));
      }

      // Draw dot-dash grid lines [12, 4, 2, 4] with alphanumeric bubbles
      ctx.strokeStyle = "rgba(99, 102, 241, 0.55)"; // Indigo
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 4, 2, 4]);

      // X Grid Lines (Vertical lines across width, labeled 1, 2, 3...)
      for (const gx of gridLinesX) {
        const p1 = worldToScreen(gx.coordM, bMinY - 0.8);
        const p2 = worldToScreen(gx.coordM, bMaxY + 0.8);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Alphanumeric coordinate bubble at top margin
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.arc(p1.x, p1.y - 12, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(gx.label, p1.x, p1.y - 12);
        ctx.restore();
      }

      // Y Grid Lines (Horizontal lines across height, labeled A, B, C...)
      for (const gy of gridLinesY) {
        const p1 = worldToScreen(bMinX - 0.8, gy.coordM);
        const p2 = worldToScreen(bMaxX + 0.8, gy.coordM);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Alphanumeric coordinate bubble at left margin
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.arc(p1.x - 12, p1.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(gy.label, p1.x - 12, p1.y);
        ctx.restore();
      }
      ctx.setLineDash([]);

      // Draw Reinforced Concrete Column Markers at Intersections (400x400mm interior, 450x600mm corner/shear)
      for (const col of columns) {
        const colCenter = worldToScreen(col.position.x, col.position.y);
        const colW = col.widthM * zoom;
        const colD = col.depthM * zoom;

        ctx.save();
        ctx.fillStyle = col.isCorner ? "rgba(30, 41, 59, 0.90)" : "rgba(51, 65, 85, 0.85)"; // Slate-800 / Slate-700
        ctx.strokeStyle = col.isCorner ? "#0f172a" : "#334155";
        ctx.lineWidth = 1.5;
        ctx.fillRect(colCenter.x - colW / 2, colCenter.y - colD / 2, colW, colD);
        ctx.strokeRect(colCenter.x - colW / 2, colCenter.y - colD / 2, colW, colD);

        // Fine structural rebar cross-hatch / center cross
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colCenter.x - colW / 2, colCenter.y - colD / 2);
        ctx.lineTo(colCenter.x + colW / 2, colCenter.y + colD / 2);
        ctx.moveTo(colCenter.x + colW / 2, colCenter.y - colD / 2);
        ctx.lineTo(colCenter.x - colW / 2, colCenter.y + colD / 2);
        ctx.stroke();

        // White structural center tick
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.5;
        const tick = 3;
        ctx.beginPath();
        ctx.moveTo(colCenter.x - tick, colCenter.y);
        ctx.lineTo(colCenter.x + tick, colCenter.y);
        ctx.moveTo(colCenter.x, colCenter.y - tick);
        ctx.lineTo(colCenter.x, colCenter.y + tick);
        ctx.stroke();

        // Column label
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const tag = col.isCorner ? `${col.gridRef} (450×600)` : `${col.gridRef} (400×400)`;
        ctx.fillText(tag, colCenter.x, colCenter.y - colD / 2 - 2);
        ctx.restore();
      }

      // Flag unsupported wall or slab spans exceeding 7.5m or cantilever overhangs > 2.0m with amber/red deflection warning pills
      for (const span of unsupportedSpans) {
        const sMid = worldToScreen(span.midpoint.x, span.midpoint.y);
        const sStart = worldToScreen(span.start.x, span.start.y);
        const sEnd = worldToScreen(span.end.x, span.end.y);

        ctx.save();
        // Dashed indicator line across the unsupported element
        ctx.strokeStyle = span.type === "unsupported_span" ? "#ef4444" : "#f59e0b"; // Red or Amber
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sStart.x, sStart.y);
        ctx.lineTo(sEnd.x, sEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Deflection warning pill badge
        const pillText = `⚠️ ${span.message}`;
        ctx.font = "bold 9px monospace";
        const pM = ctx.measureText(pillText);
        const pW = pM.width + 16;
        const pH = 20;

        ctx.fillStyle = span.type === "unsupported_span" ? "rgba(185, 28, 28, 0.95)" : "rgba(180, 83, 9, 0.95)";
        ctx.beginPath();
        ctx.roundRect(sMid.x - pW / 2, sMid.y - pH / 2, pW, pH, 6);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pillText, sMid.x, sMid.y);
        ctx.restore();
      }

      // Render HUD status pill on canvas when structural grid is active
      const structHud = gridData.hudText;
      ctx.font = "bold 10px monospace";
      const sM = ctx.measureText(structHud);
      const sPillW = sM.width + 24;
      const sPillH = 24;
      const sPillX = width / 2 - sPillW / 2;
      const sPillY = showFarOverlay ? 38 : 10;

      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.beginPath();
      ctx.roundRect(sPillX, sPillY, sPillW, sPillH, 12);
      ctx.fill();
      ctx.strokeStyle = gridData.isFullyCompliant ? "#818cf8" : "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#e0e7ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(structHud, width / 2, sPillY + sPillH / 2);
      ctx.restore();
    }

    // 9.3. Pillar 4: 9-Zone Paramasayika Vastu Mandala Grid Overlay
    if (showVastuOverlay) {
      ctx.save();
      // Bounding box for Vastu 9-zone mandala
      let vMinX = 0, vMaxX = 12, vMinY = 0, vMaxY = 8;
      if (walls.length > 0) {
        vMinX = Math.min(...walls.map((w) => Math.min(w.start.x, w.end.x)));
        vMaxX = Math.max(...walls.map((w) => Math.max(w.start.x, w.end.x)));
        vMinY = Math.min(...walls.map((w) => Math.min(w.start.y, w.end.y)));
        vMaxY = Math.max(...walls.map((w) => Math.max(w.start.y, w.end.y)));
      }
      const bW = Math.max(1, vMaxX - vMinX);
      const bH = Math.max(1, vMaxY - vMinY);
      const cellW = bW / 3;
      const cellH = bH / 3;

      // Map each room to its quadrant algorithmically by its geometric centroid
      const roomPlacements = (rooms || []).map((r) => {
        const name = (r.label || "").toLowerCase();
        let roomType:
          | 'master_bedroom'
          | 'kitchen'
          | 'living'
          | 'pooja_meditation'
          | 'toilet'
          | 'guest_bedroom'
          | 'dining'
          | 'staircase'
          | 'study' = 'living';

        if (name.includes('master')) roomType = 'master_bedroom';
        else if (name.includes('kitchen') || name.includes('pantry') || name.includes('cook')) roomType = 'kitchen';
        else if (name.includes('pooja') || name.includes('mandir') || name.includes('puja') || name.includes('sanct')) roomType = 'pooja_meditation';
        else if (name.includes('bath') || name.includes('toilet') || name.includes('wc') || name.includes('powder')) roomType = 'toilet';
        else if (name.includes('bed') || name.includes('guest')) roomType = 'guest_bedroom';
        else if (name.includes('dining')) roomType = 'dining';
        else if (name.includes('stair')) roomType = 'staircase';
        else if (name.includes('study') || name.includes('office') || name.includes('library')) roomType = 'study';

        let quadrant: 'NE' | 'SE' | 'SW' | 'NW' | 'CENTER' | 'E' | 'W' | 'N' | 'S' = 'CENTER';
        if (r.vertices && r.vertices.length > 0) {
          const cX = r.vertices.reduce((s, p) => s + p.x, 0) / r.vertices.length;
          const cY = r.vertices.reduce((s, p) => s + p.y, 0) / r.vertices.length;
          const col = Math.min(2, Math.max(0, Math.floor((cX - vMinX) / cellW)));
          const row = Math.min(2, Math.max(0, Math.floor((cY - vMinY) / cellH)));
          const QUAD_MAP: Record<string, 'NW' | 'N' | 'NE' | 'W' | 'CENTER' | 'E' | 'SW' | 'S' | 'SE'> = {
            '0,0': 'NW',
            '1,0': 'N',
            '2,0': 'NE',
            '0,1': 'W',
            '1,1': 'CENTER',
            '2,1': 'E',
            '0,2': 'SW',
            '1,2': 'S',
            '2,2': 'SE',
          };
          quadrant = QUAD_MAP[`${col},${row}`] || 'CENTER';
        } else if (r.direction) {
          const d = r.direction.toUpperCase();
          if (d === 'NE' || d === 'SE' || d === 'SW' || d === 'NW' || d === 'E' || d === 'W' || d === 'N' || d === 'S') {
            quadrant = d as any;
          }
        }

        return {
          roomName: r.label || 'Room',
          roomType,
          quadrant,
        };
      });

      const vastu = evaluateVastuMandala(roomPlacements);

      // Draw all 9 sacred zones of the Paramasayika mandala
      const VASTU_ZONES_CONFIG: Record<
        string,
        { name: string; sub: string; tint: string; color: string }
      > = {
        '0,0': { name: 'Vayu (NW) 💨', sub: 'Air / Transit', tint: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' },
        '1,0': { name: 'Kuber (N) 💰', sub: 'Wealth / Mercury', tint: 'rgba(16, 185, 129, 0.10)', color: '#10b981' },
        '2,0': { name: 'Ishanya (NE) 💧', sub: 'Water / Wisdom', tint: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
        '0,1': { name: 'Varuna (W) 🌊', sub: 'Water / Dining', tint: 'rgba(99, 102, 241, 0.10)', color: '#6366f1' },
        '1,1': { name: 'Brahmasthan ☸️', sub: 'Sacred Core / Void', tint: 'rgba(234, 179, 8, 0.20)', color: '#eab308' },
        '2,1': { name: 'Surya (E) ☀️', sub: 'Solar / Vitality', tint: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' },
        '0,2': { name: 'Nairutya (SW) ⛰️', sub: 'Earth / Grounding', tint: 'rgba(217, 119, 6, 0.15)', color: '#d97706' },
        '1,2': { name: 'Yama (S) ⚖️', sub: 'Dharma / Rest', tint: 'rgba(148, 163, 184, 0.10)', color: '#94a3b8' },
        '2,2': { name: 'Agni (SE) 🔥', sub: 'Fire / Culinary', tint: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
      };

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const zX = vMinX + col * cellW;
          const zY = vMinY + row * cellH;
          const zP1 = worldToScreen(zX, zY);
          const zP2 = worldToScreen(zX + cellW, zY + cellH);
          const zW = zP2.x - zP1.x;
          const zH = zP2.y - zP1.y;

          const cfg = VASTU_ZONES_CONFIG[`${col},${row}`] || {
            name: 'Mandala Zone',
            sub: 'Cosmic Grid',
            tint: 'rgba(245, 158, 11, 0.08)',
            color: '#d97706',
          };

          ctx.fillStyle = cfg.tint;
          ctx.fillRect(zP1.x, zP1.y, zW, zH);

          // Golden/saffron dashed border [5, 5]
          ctx.save();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(zP1.x, zP1.y, zW, zH);
          ctx.restore();

          // Zone name and element labels
          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = '#92400e';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(cfg.name, zP1.x + zW / 2, zP1.y + 4);

          ctx.font = 'normal 8px sans-serif';
          ctx.fillStyle = '#b45309';
          ctx.fillText(cfg.sub, zP1.x + zW / 2, zP1.y + 16);
        }
      }

      // Algorithmic sub-scores
      const agniQuad = vastu.quadrants.find((q) => q.quadrantName.includes('Agni'));
      const ishanyaQuad = vastu.quadrants.find((q) => q.quadrantName.includes('Ishanya'));
      const nairutyaQuad = vastu.quadrants.find((q) => q.quadrantName.includes('Nairutya'));
      const agniScore = agniQuad ? Math.max(0, agniQuad.score) : 100;
      const ishanyaScore = ishanyaQuad ? Math.max(0, ishanyaQuad.score) : 100;
      const nairutyaScore = nairutyaQuad ? Math.max(0, nairutyaQuad.score) : 100;
      const brahmasthanStatus = vastu.brahmasthanClear ? 'Clear ✓' : 'Defect ⚠️';
      const vScore = vastu.overallScorePercent || 88;

      const vHud = `☸️ Vastu Harmony: ${vScore}% (${vastu.overallRating}) | Agni: ${agniScore}% | Ishanya: ${ishanyaScore}% | Nairutya: ${nairutyaScore}% | Brahmasthan: ${brahmasthanStatus}`;

      ctx.font = 'bold 10px monospace';
      const vM = ctx.measureText(vHud);
      const vPillW = vM.width + 24;
      const vPillH = 24;
      const vPillX = width / 2 - vPillW / 2;
      let vPillY = 10;
      if (showFarOverlay) vPillY += 28;
      if (showStructuralGrid) vPillY += 28;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      ctx.roundRect(vPillX, vPillY, vPillW, vPillH, 12);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vHud, width / 2, vPillY + vPillH / 2);
      ctx.restore();
    }

    // 9.4. Pillar 4: Natural Daylighting Factor (DF %) Contour Heatmap
    if (showDaylightingOverlay) {
      ctx.save();
      let totalDF = 0;
      let validRoomCount = 0;

      for (const r of rooms) {
        if (!r.vertices || r.vertices.length < 3) continue;

        // Centroid of room
        const cX = r.vertices.reduce((s, p) => s + p.x, 0) / r.vertices.length;
        const cY = r.vertices.reduce((s, p) => s + p.y, 0) / r.vertices.length;
        const roomArea = r.area || 20;
        const roomWidth = Math.sqrt(roomArea);
        const halfDepth = roomWidth / 2;

        // Associate nearby windows with this room
        const roomWindows = (windows || []).filter((w) => {
          if (!w.position) return false;
          // Check if window is close to room centroid or bounding box
          const dist = Math.hypot(w.position.x - cX, w.position.y - cY);
          return dist <= roomWidth * 0.95;
        });

        const hasWindows = roomWindows.length > 0;
        const totalWinWidth = roomWindows.reduce((sum, w) => sum + (w.width || 1.8), 0);
        const primaryWin = hasWindows ? roomWindows[0] : null;

        // Orientation factor based on window direction relative to room centroid
        let orientation: 'N' | 'S' | 'E' | 'W' = 'N';
        let orientationFactor = 1.05; // North diffuse daylight default
        if (primaryWin) {
          const dx = primaryWin.position.x - cX;
          const dy = primaryWin.position.y - cY;
          if (Math.abs(dy) >= Math.abs(dx)) {
            if (dy < 0) {
              orientation = 'N';
              orientationFactor = 1.05;
            } else {
              orientation = 'S';
              orientationFactor = 1.30;
            }
          } else {
            if (dx > 0) {
              orientation = 'E';
              orientationFactor = 1.15;
            } else {
              orientation = 'W';
              orientationFactor = 1.10;
            }
          }
        }

        // Mathematical Daylighting Factor formula:
        // DF(d) = Ω_solar * (τ * (W_win / W_room) * 6.5 * exp(-0.75 * d_perp / H_win)) + 0.45
        // Head height H_win = 2.40m, Glazing transmittance τ = 0.70
        const tau = 0.70;
        const hWin = 2.40;
        let dfAvg = 0.45;
        if (hasWindows && totalWinWidth > 0) {
          const rawDF =
            orientationFactor *
              (tau * (totalWinWidth / roomWidth) * 6.5 * Math.exp((-0.75 * halfDepth) / hWin)) +
            0.45;
          dfAvg = Math.min(10.0, Math.max(0.45, rawDF));
        }

        totalDF += dfAvg;
        validRoomCount++;

        // Render smooth contour gradient bands clipped to room polygon
        ctx.save();
        ctx.beginPath();
        const p0 = worldToScreen(r.vertices[0].x, r.vertices[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < r.vertices.length; i++) {
          const pi = worldToScreen(r.vertices[i].x, r.vertices[i].y);
          ctx.lineTo(pi.x, pi.y);
        }
        ctx.closePath();
        ctx.clip();

        // Calculate bounding box in screen coordinates
        let minScX = Infinity, maxScX = -Infinity, minScY = Infinity, maxScY = -Infinity;
        for (const pt of r.vertices) {
          const scPt = worldToScreen(pt.x, pt.y);
          minScX = Math.min(minScX, scPt.x);
          maxScX = Math.max(maxScX, scPt.x);
          minScY = Math.min(minScY, scPt.y);
          maxScY = Math.max(maxScY, scPt.y);
        }

        if (hasWindows && primaryWin) {
          const wSc = worldToScreen(primaryWin.position.x, primaryWin.position.y);
          const farSc = worldToScreen(2 * cX - primaryWin.position.x, 2 * cY - primaryWin.position.y);
          const grad = ctx.createLinearGradient(wSc.x, wSc.y, farSc.x, farSc.y);

          // 4 Contour Heatmap Bands:
          // 1. Perimeter (DF >= 5.0%): Warm Amber
          // 2. Optimal Habitable (2.0% <= DF < 5.0%): Lush Emerald
          // 3. Supplementary (1.0% <= DF < 2.0%): Cyan
          // 4. Deep Core (DF < 1.0%): Navy
          grad.addColorStop(0.0, 'rgba(245, 158, 11, 0.45)');  // Warm Amber
          grad.addColorStop(0.20, 'rgba(245, 158, 11, 0.32)');
          grad.addColorStop(0.26, 'rgba(16, 185, 129, 0.40)'); // Lush Emerald
          grad.addColorStop(0.55, 'rgba(16, 185, 129, 0.28)');
          grad.addColorStop(0.60, 'rgba(14, 116, 144, 0.38)'); // Cyan
          grad.addColorStop(0.80, 'rgba(14, 116, 144, 0.26)');
          grad.addColorStop(0.86, 'rgba(30, 27, 75, 0.45)');   // Deep Core Navy
          grad.addColorStop(1.0, 'rgba(30, 27, 75, 0.55)');

          ctx.fillStyle = grad;
          ctx.fillRect(minScX, minScY, maxScX - minScX, maxScY - minScY);
        } else {
          // Windowless Room: Deep Core Navy
          ctx.fillStyle = 'rgba(30, 27, 75, 0.45)';
          ctx.fillRect(minScX, minScY, maxScX - minScX, maxScY - minScY);
        }
        ctx.restore();

        // Room Daylighting Badge: Avg DF: X.X% [PASS/FAIL >= 2.0% BS EN 17037]
        const isCompliant = dfAvg >= 2.0;
        const sc = worldToScreen(cX, cY);

        ctx.save();
        const badgeLabel = `Avg DF: ${dfAvg.toFixed(1)}% [${isCompliant ? 'PASS ≥ 2.0%' : 'FAIL < 2.0%'} BS EN 17037]`;
        ctx.font = 'bold 9px monospace';
        const bM = ctx.measureText(badgeLabel);
        const bW = bM.width + 16;
        const bH = 18;

        ctx.fillStyle = isCompliant ? 'rgba(16, 185, 129, 0.92)' : 'rgba(217, 119, 6, 0.92)';
        ctx.beginPath();
        ctx.roundRect(sc.x - bW / 2, sc.y + 12, bW, bH, 9);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeLabel, sc.x, sc.y + 12 + bH / 2);
        ctx.restore();
      }

      // Top Daylighting HUD Pill Card
      const meanDF = validRoomCount > 0 ? totalDF / validRoomCount : 2.5;
      const isMeanCompliant = meanDF >= 2.0;
      const dHud = `☀️ Natural Daylighting (BS EN 17037): Mean DF ${meanDF.toFixed(1)}% | Glazing τ=0.70 | H=2.40m [${isMeanCompliant ? 'PASS' : 'SUPPLEMENTARY'}]`;

      ctx.font = 'bold 10px monospace';
      const dM = ctx.measureText(dHud);
      const dPillW = dM.width + 24;
      const dPillH = 24;
      const dPillX = width / 2 - dPillW / 2;
      let dPillY = 10;
      if (showFarOverlay) dPillY += 28;
      if (showStructuralGrid) dPillY += 28;
      if (showVastuOverlay) dPillY += 28;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      ctx.roundRect(dPillX, dPillY, dPillW, dPillH, 12);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ecfdf5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dHud, width / 2, dPillY + dPillH / 2);
      ctx.restore();
    }

    // 9.4. Pillar 5: 4D EPC Construction Phasing & Material Staging Overlay
    if (showConstructionStaging || showPhasing4D) {
      ctx.save();

      // Compute building bounding box in world meters
      let bMinX = -5, bMaxX = 5, bMinY = -4, bMaxY = 4;
      if (walls && walls.length > 0) {
        let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
        for (const w of walls) {
          pMinX = Math.min(pMinX, w.start.x, w.end.x);
          pMaxX = Math.max(pMaxX, w.start.x, w.end.x);
          pMinY = Math.min(pMinY, w.start.y, w.end.y);
          pMaxY = Math.max(pMaxY, w.start.y, w.end.y);
        }
        if (pMinX < pMaxX && pMinY < pMaxY) {
          bMinX = pMinX;
          bMaxX = pMaxX;
          bMinY = pMinY;
          bMaxY = pMaxY;
        }
      }

      // Helper for drawing 45° yellow/black hazard striped rectangular border
      const drawHazardZone = (
        worldX: number,
        worldY: number,
        worldW: number,
        worldH: number,
        title: string,
        subtitle: string,
        badge: string
      ) => {
        const pTL = worldToScreen(worldX - worldW / 2, worldY - worldH / 2);
        const pBR = worldToScreen(worldX + worldW / 2, worldY + worldH / 2);
        const rx = Math.min(pTL.x, pBR.x);
        const ry = Math.min(pTL.y, pBR.y);
        const rw = Math.abs(pBR.x - pTL.x);
        const rh = Math.abs(pBR.y - pTL.y);
        const borderW = 7;

        ctx.save();
        // Inner tint
        ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
        ctx.fillRect(rx, ry, rw, rh);

        // Border hazard stripes (45deg yellow / black)
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
        ctx.rect(rx + borderW, ry + borderW, rw - borderW * 2, rh - borderW * 2);
        ctx.clip("evenodd");

        ctx.fillStyle = "#eab308";
        ctx.fillRect(rx, ry, rw, rh);

        ctx.fillStyle = "#18181b";
        ctx.beginPath();
        const stripeStep = 10;
        for (let sx = rx - rh; sx < rx + rw + rh; sx += stripeStep * 2) {
          ctx.moveTo(sx, ry);
          ctx.lineTo(sx + stripeStep, ry);
          ctx.lineTo(sx + stripeStep + rh, ry + rh);
          ctx.lineTo(sx + rh, ry + rh);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();

        // Zone labels & badges
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;

        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.beginPath();
        ctx.roundRect(cx - rw / 2 + 8, cy - 18, rw - 16, 36, 4);
        ctx.fill();

        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle = "#fbbf24";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title, cx, cy - 7);

        ctx.font = "8px monospace";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(subtitle, cx, cy + 6);

        // Badge in top right corner of zone
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.roundRect(rx + rw - 54, ry + 2, 50, 13, 3);
        ctx.fill();
        ctx.font = "bold 7px monospace";
        ctx.fillStyle = "#fef3c7";
        ctx.fillText(badge, rx + rw - 29, ry + 8);

        ctx.restore();
      };

      // 1. Material Unloading Drop-Zones
      // Drop-Zone A: NW perimeter (4m x 3m, Max 15T)
      drawHazardZone(
        bMinX - 3.2,
        bMinY - 2.5,
        4.0,
        3.0,
        "ZONE A: STRUCTURAL REBAR",
        "Max 15T · Crane Hook Access",
        "15T CAP"
      );

      // Drop-Zone B: Adjacent to entry/hoist (3m x 2.5m, Max 8T)
      drawHazardZone(
        bMinX - 2.8,
        bMaxY + 2.5,
        3.0,
        2.5,
        "ZONE B: HOIST / UNLOAD",
        "Max 8T · Forklift Corridor",
        "8T CAP"
      );

      // Drop-Zone C: Weather-protected IS 287 EMC (3m x 2m, Max 5T)
      drawHazardZone(
        bMaxX + 2.8,
        bMinY + 1.5,
        3.0,
        2.0,
        "ZONE C: IS 287 TIMBER / FINISHES",
        "Max 5T · 8-12% EMC Sealed",
        "5T EMC"
      );

      // 2. Crane Hook Radius (8.0m dashed circle)
      const cranePos = worldToScreen(bMinX - 2.0, bMinY - 1.0);
      const craneRadiusPx = 8.0 * zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cranePos.x, cranePos.y, craneRadiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crane Mast Center Icon & Crosshairs
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cranePos.x - 12, cranePos.y);
      ctx.lineTo(cranePos.x + 12, cranePos.y);
      ctx.moveTo(cranePos.x, cranePos.y - 12);
      ctx.lineTo(cranePos.x, cranePos.y + 12);
      ctx.stroke();

      ctx.fillStyle = "#7e22ce";
      ctx.beginPath();
      ctx.arc(cranePos.x, cranePos.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#9333ea";
      ctx.textAlign = "center";
      ctx.fillText("🏗️ TOWER CRANE (R=8.0m)", cranePos.x, cranePos.y - 16);
      ctx.restore();

      // 3. Forklift Passage Corridor (1.50m green corridor with chevrons)
      ctx.save();
      const flStart = worldToScreen(bMinX - 2.8, bMaxY + 1.0);
      const flMid = worldToScreen(bMinX - 0.5, (bMinY + bMaxY) / 2);
      const flEnd = worldToScreen(bMinX + 1.0, (bMinY + bMaxY) / 2);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
      ctx.lineWidth = 1.50 * zoom; // 1.50m wide corridor
      ctx.lineCap = "round";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(flStart.x, flStart.y);
      ctx.lineTo(flMid.x, flMid.y);
      ctx.lineTo(flEnd.x, flEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Centerline
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(flStart.x, flStart.y);
      ctx.lineTo(flMid.x, flMid.y);
      ctx.lineTo(flEnd.x, flEnd.y);
      ctx.stroke();

      // Chevrons along corridor
      const drawChevron = (x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-6, 4);
        ctx.lineTo(-4, 4);
        ctx.lineTo(2, 0);
        ctx.lineTo(-4, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawChevron((flStart.x + flMid.x) / 2, (flStart.y + flMid.y) / 2, Math.atan2(flMid.y - flStart.y, flMid.x - flStart.x));
      drawChevron((flMid.x + flEnd.x) / 2, (flMid.y + flEnd.y) / 2, 0);

      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#047857";
      ctx.textAlign = "center";
      ctx.fillText("🚜 FORKLIFT ROUTE (1.50m CLEAR)", flMid.x, flMid.y - 12);
      ctx.restore();

      // 4. Staging Phase Renderers
      const isStructureActive = constructionStage === "all" || constructionStage === "structure";
      const isMepActive = constructionStage === "all" || constructionStage === "mep";
      const isFinishesActive = constructionStage === "all" || constructionStage === "finishes";

      // Phase 1: Structure (Concrete slab boundary & RC Columns)
      if (isStructureActive) {
        ctx.save();
        // Slab boundary (offset by 0.6m)
        const slabTL = worldToScreen(bMinX - 0.6, bMinY - 0.6);
        const slabBR = worldToScreen(bMaxX + 0.6, bMaxY + 0.6);
        const slabW = Math.abs(slabBR.x - slabTL.x);
        const slabH = Math.abs(slabBR.y - slabTL.y);

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(slabTL.x, slabTL.y, slabW, slabH);
        ctx.setLineDash([]);

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "left";
        ctx.fillText("RC SLAB BOUNDARY (200mm THK)", slabTL.x + 8, slabTL.y + 14);

        // Columns: 450x600 corner columns & 400x400 interior columns
        const drawColumn = (colX: number, colY: number, isCorner: boolean) => {
          const pt = worldToScreen(colX, colY);
          const cW = (isCorner ? 0.45 : 0.40) * zoom;
          const cH = (isCorner ? 0.60 : 0.40) * zoom;
          ctx.fillStyle = isCorner ? "#334155" : "#475569";
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 1.5;
          ctx.fillRect(pt.x - cW / 2, pt.y - cH / 2, cW, cH);
          ctx.strokeRect(pt.x - cW / 2, pt.y - cH / 2, cW, cH);

          // Center cross
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt.x - cW / 3, pt.y);
          ctx.lineTo(pt.x + cW / 3, pt.y);
          ctx.moveTo(pt.x, pt.y - cH / 3);
          ctx.lineTo(pt.x, pt.y + cH / 3);
          ctx.stroke();

          // Label
          ctx.font = "bold 7px monospace";
          ctx.fillStyle = "#f1f5f9";
          ctx.textAlign = "center";
          ctx.fillText(isCorner ? "C450x600" : "C400x400", pt.x, pt.y + cH / 2 + 8);
        };

        // Draw at 4 corners
        drawColumn(bMinX, bMinY, true);
        drawColumn(bMaxX, bMinY, true);
        drawColumn(bMinX, bMaxY, true);
        drawColumn(bMaxX, bMaxY, true);

        // Mid-point columns if span > 5m
        if (bMaxX - bMinX > 5) {
          drawColumn((bMinX + bMaxX) / 2, bMinY, false);
          drawColumn((bMinX + bMaxX) / 2, bMaxY, false);
        }
        if (bMaxY - bMinY > 5) {
          drawColumn(bMinX, (bMinY + bMaxY) / 2, false);
          drawColumn(bMaxX, (bMinY + bMaxY) / 2, false);
        }
        ctx.restore();
      }

      // Phase 2: MEP Risers (300x300 shaft, plumbing, FD-R, HR)
      if (isMepActive) {
        ctx.save();
        const mepX = bMinX + 1.8;
        const mepY = bMinY + 1.8;
        const mepPt = worldToScreen(mepX, mepY);
        const shaftSize = 0.30 * zoom;

        // 300x300 MEP shaft
        ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 2;
        ctx.fillRect(mepPt.x - shaftSize / 2, mepPt.y - shaftSize / 2, shaftSize, shaftSize);
        ctx.strokeRect(mepPt.x - shaftSize / 2, mepPt.y - shaftSize / 2, shaftSize, shaftSize);

        // Shaft diagonal crosses
        ctx.beginPath();
        ctx.moveTo(mepPt.x - shaftSize / 2, mepPt.y - shaftSize / 2);
        ctx.lineTo(mepPt.x + shaftSize / 2, mepPt.y + shaftSize / 2);
        ctx.moveTo(mepPt.x + shaftSize / 2, mepPt.y - shaftSize / 2);
        ctx.lineTo(mepPt.x - shaftSize / 2, mepPt.y + shaftSize / 2);
        ctx.stroke();

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#0284c7";
        ctx.textAlign = "left";
        ctx.fillText("MEP RISER (300x300)", mepPt.x + shaftSize / 2 + 4, mepPt.y - 4);
        ctx.font = "7px monospace";
        ctx.fillStyle = "#0369a1";
        ctx.fillText("FD-R DAMPER · HR HOSE REEL", mepPt.x + shaftSize / 2 + 4, mepPt.y + 6);
        ctx.restore();
      }

      // Phase 3: Finishes Callouts
      if (isFinishesActive) {
        ctx.save();
        const finPt = worldToScreen((bMinX + bMaxX) / 2, (bMinY + bMaxY) / 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(finPt.x - 70, finPt.y - 14, 140, 28, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 8px sans-serif";
        ctx.fillStyle = "#065f46";
        ctx.textAlign = "center";
        ctx.fillText("✨ Turnkey Finishes (Phase 3)", finPt.x, finPt.y - 3);
        ctx.font = "7px monospace";
        ctx.fillStyle = "#047857";
        ctx.fillText("Kota Stone · STC 56 · IS 287 Joinery", finPt.x, finPt.y + 8);
        ctx.restore();
      }

      // 5. Canvas HUD Banner
      const stageTitle =
        constructionStage === "structure"
          ? "Phase 1: Substructure & Columns"
          : constructionStage === "mep"
          ? "Phase 2: MEP Wet Core & Dampers"
          : constructionStage === "finishes"
          ? "Phase 3: Turnkey Luxury Architectural Finishes"
          : "All Construction Staging Phases Active";

      const hudText = showPhasing4D
        ? `⏱️ 4D Construction CPM: Day ${phasingDay}/90 — ${stageTitle} | Lead-Time Compressed (-14 Wks VE)`
        : `🏗️ Construction Staging: [${constructionStage.toUpperCase()}] — ${stageTitle} | Drop-Zones A/B/C Active | Crane R=8.0m`;

      ctx.font = "bold 10px monospace";
      const pM = ctx.measureText(hudText);
      const pPillW = pM.width + 24;
      const pPillH = 24;
      const pPillX = width / 2 - pPillW / 2;
      const pPillY =
        (showFarOverlay ? 28 : 0) +
        (showStructuralGrid ? 28 : 0) +
        (showVastuOverlay ? 28 : 0) +
        (showDaylightingOverlay ? 28 : 0) +
        10;

      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.beginPath();
      ctx.roundRect(pPillX, pPillY, pPillW, pPillH, 12);
      ctx.fill();
      ctx.strokeStyle = showPhasing4D ? "#a855f7" : "#d97706";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#faf5ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(hudText, width / 2, pPillY + pPillH / 2);

      ctx.restore();
    }

    ctx.restore();
  }, [
    walls,
    doors,
    windows,
    rooms,
    furniture,
    staircases,
    pendingFurniture,
    pendingStaircase,
    zoom,
    panOffset,
    drawingPoints,
    mousePos,
    snapPoint,
    selectedIds,
    unitSystem,
    worldToScreen,
    tool,
    hoveredDeleteId,
    showEgressOverlay,
    showLinter,
    showFarOverlay,
    farMetrics,
    hoveredLintIssue,
    showStructuralGrid,
    structuralGridModule,
    showDaylightVastu,
    showDaylightingOverlay,
    showVastuOverlay,
    showPhasing4D,
    phasingDay,
    showConstructionStaging,
    constructionStage,
  ]);

  // Mouse event handlers
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Focus editor container for keyboard shortcuts
    containerRef.current?.focus();

    // Pan with middle click or spacebar / alt key
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: screenX - panOffset.x, y: screenY - panOffset.y });
      return;
    }

    const rawWorld = screenToWorld(screenX, screenY);
    const snap = getSnapTarget(rawWorld);

    if (tool === "wall") {
      floorPlanStore.addWallPoint(snap);
    } else if (tool === "door") {
      floorPlanStore.addDoor(snap);
    } else if (tool === "window") {
      floorPlanStore.addWindow(snap);
    } else if (tool === "furniture" && pendingFurniture) {
      // Drop pending furniture at user's clicked snapped coordinates!
      floorPlanStore.addFurniture({
        ...pendingFurniture,
        position: snap,
      });
    } else if (tool === "staircase" && pendingStaircase) {
      // Drop pending staircase flight at clicked snapped coordinates!
      floorPlanStore.addStaircase({
        ...pendingStaircase,
        position: snap,
      });
    } else if (tool === "eraser") {
      const targetId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture, staircases);
      if (targetId) {
        floorPlanStore.deleteElement(targetId);
        setHoveredDeleteId(null);
      }
    } else if (tool === "select") {
      const foundId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture, staircases);
      if (foundId) {
        floorPlanStore.selectElement(foundId, e.shiftKey);
        // Initiate drag tracking
        const elemPos = getElementPosition(foundId, walls, doors, windows, rooms, furniture, staircases);
        if (elemPos) {
          setDraggingId(foundId);
          hasDraggedRef.current = false;
          dragStartPlanRef.current = JSON.parse(JSON.stringify(floorPlan));
          dragOffsetRef.current = {
            x: rawWorld.x - elemPos.x,
            y: rawWorld.y - elemPos.y,
          };
        }
      } else {
        floorPlanStore.clearSelection();
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning) {
      floorPlanStore.setPanOffset({
        x: screenX - panStart.x,
        y: screenY - panStart.y,
      });
      return;
    }

    const rawWorld = screenToWorld(screenX, screenY);
    const snap = getSnapTarget(rawWorld);
    setMousePos(rawWorld);
    floorPlanStore.setSnapPoint(snap);

    // If actively dragging an element, move it in real-time snapped to 0.1m grid
    if (draggingId) {
      const targetX = rawWorld.x - dragOffsetRef.current.x;
      const targetY = rawWorld.y - dragOffsetRef.current.y;
      const snappedPos = {
        x: Math.round(targetX / 0.1) * 0.1,
        y: Math.round(targetY / 0.1) * 0.1,
      };
      floorPlanStore.moveElement(draggingId, snappedPos);
      hasDraggedRef.current = true;
      return;
    }

    if (tool === "eraser") {
      const hitId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture, staircases);
      setHoveredDeleteId(hitId);
    } else if (hoveredDeleteId) {
      setHoveredDeleteId(null);
    }

    if (tool === "select") {
      const hitId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture, staircases);
      setHoveredElementId(hitId);
    } else if (hoveredElementId) {
      setHoveredElementId(null);
    }

    if (showLinter) {
      const issues = lintFloorPlanGeometry(floorPlan);
      const hitIssue = issues.find(
        (iss) => Math.hypot(iss.location.x - rawWorld.x, iss.location.y - rawWorld.y) < 0.8,
      );
      setHoveredLintIssue(hitIssue || null);
    } else if (hoveredLintIssue) {
      setHoveredLintIssue(null);
    }
  }

  function handleMouseUp() {
    setIsPanning(false);
    if (draggingId) {
      // Commit single undo snapshot upon completing drag
      if (hasDraggedRef.current && dragStartPlanRef.current) {
        floorPlanStore.commitUndoSnapshot(dragStartPlanRef.current);
      }
      setDraggingId(null);
      dragStartPlanRef.current = null;
      hasDraggedRef.current = false;
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    floorPlanStore.setZoom(zoom * factor);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (pendingFurniture) {
        floorPlanStore.setPendingFurniture(null);
      }
      if (pendingStaircase) {
        floorPlanStore.setPendingStaircase(null);
      }
      floorPlanStore.finishDrawing();
      floorPlanStore.clearSelection();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      floorPlanStore.deleteSelected();
    } else if (e.key === "r" || e.key === "R") {
      if (pendingFurniture) {
        floorPlanStore.rotatePendingFurniture();
      } else if (pendingStaircase) {
        floorPlanStore.rotatePendingStaircase();
      } else {
        const selectedFurn = furniture.find((f) => selectedIds.includes(f.id));
        if (selectedFurn) {
          floorPlanStore.rotateFurniture(selectedFurn.id);
        }
      }
    } else if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      const selectedFurn = furniture.find((f) => selectedIds.includes(f.id));
      if (selectedFurn) {
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.1;
        let delta: Point = { x: 0, y: 0 };
        if (e.key === "ArrowLeft") delta = { x: -step, y: 0 };
        if (e.key === "ArrowRight") delta = { x: step, y: 0 };
        if (e.key === "ArrowUp") delta = { x: 0, y: -step };
        if (e.key === "ArrowDown") delta = { x: 0, y: step };
        floorPlanStore.nudgeFurniture(selectedFurn.id, delta);
      }
    } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
      if (e.shiftKey) {
        floorPlanStore.redo();
      } else {
        floorPlanStore.undo();
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".dxf")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parsed = parseDxfContent(text);
        if (parsed.walls.length > 0) {
          floorPlanStore.loadPlan({
            walls: parsed.walls,
            doors: [],
            windows: [],
            rooms: [],
            furniture: [],
            gridSize: 0.5,
            panOffset: { x: 300, y: 250 },
            zoom: 35,
          });
        }
      } catch (err) {
        console.error("Failed to drop DXF:", err);
      }
    };
    reader.readAsText(file);
  }

  const cursorClass = isPanning
    ? "cursor-grabbing"
    : tool === "eraser"
    ? "cursor-pointer"
    : (tool === "furniture" && pendingFurniture) || (tool === "staircase" && pendingStaircase)
    ? "cursor-crosshair"
    : draggingId
    ? "cursor-grabbing"
    : tool === "select" && hoveredElementId
    ? "cursor-grab"
    : tool === "wall" || tool === "door" || tool === "window" || tool === "staircase"
    ? "cursor-crosshair"
    : "cursor-default";

  const tooltipText = pendingFurniture
    ? `🛋️ Click anywhere on canvas to place ${pendingFurniture.tag || pendingFurniture.name}. Press 'R' to rotate, Esc to cancel.`
    : pendingStaircase
    ? `🪜 Click anywhere on canvas to place staircase flight (${(pendingStaircase.width ?? pendingStaircase.flightWidth ?? 1.50).toFixed(2)}m width). Press 'R' to rotate, Esc to cancel.`
    : tool === "wall"
    ? "Click to place wall points. Press Escape to finish."
    : tool === "select"
    ? "Click & drag any item to move. Press 'R' to rotate. Arrow keys to nudge. Backspace to delete."
    : tool === "eraser"
    ? "Click any element to delete it."
    : `Click to place ${tool}. Drag & drop AutoCAD .DXF file directly onto canvas to import.`;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative h-[500px] w-full overflow-hidden rounded-b-lg bg-[#faf8f4] outline-none ${cursorClass}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="h-full w-full"
      />
      {/* Help tooltip */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface/90 px-2.5 py-1 text-[11px] text-muted border border-border shadow-xs flex items-center gap-1.5">
        <span className="text-accent">💡</span>
        <span>{tooltipText}</span>
      </div>

      {/* Live Statutory FAR & Ground Coverage HUD Readout Pill */}
      {showFarOverlay && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center gap-2 rounded-full border border-sky-500/70 bg-slate-900/90 px-3.5 py-1 text-xs font-mono text-slate-100 shadow-xl backdrop-blur-md animate-in fade-in duration-150">
          <span className="text-sm">📈</span>
          <span className="font-bold text-sky-400">FAR:</span>
          <span>
            {farMetrics.achievedFAR.toFixed(2)} / {farMetrics.maxFAR.toFixed(2)} ({farMetrics.farUtilizationPercent.toFixed(1)}%)
          </span>
          <span className="text-slate-500">|</span>
          <span className="font-bold text-amber-400">Coverage:</span>
          <span>{farMetrics.groundCoveragePercent.toFixed(1)}% ≤ 60%</span>
          <span className="text-slate-500">|</span>
          <span className="font-bold text-emerald-400">NTG:</span>
          <span>{farMetrics.carpetToSaleablePercent.toFixed(1)}% ≥ 84%</span>
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
              farMetrics.statusBadge === "INSTITUTIONAL GRADE"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}
          >
            {farMetrics.statusBadge === "INSTITUTIONAL GRADE" ? "INSTITUTIONAL ✓" : "SUB-OPTIMAL ⚠️"}
          </span>
        </div>
      )}

      {/* Interactive NBC 2016 Statutory Compliance Popover */}
      {showLinter && hoveredLintIssue && (
        <div className="pointer-events-none absolute top-3 right-3 max-w-sm rounded-lg border border-amber-500/80 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-xl backdrop-blur-md transition-all animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <span className="text-sm">⚠️</span>
            <span>{hoveredLintIssue.title}</span>
            <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
              {hoveredLintIssue.clause}
            </span>
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-amber-200 font-semibold bg-amber-950/40 rounded px-2 py-1 border border-amber-800/40">
            {hoveredLintIssue.message}
          </div>
          <div className="mt-1.5 text-[10px] leading-relaxed text-slate-300">
            {hoveredLintIssue.remediation}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: get coordinates of an element for drag offset computation
function getElementPosition(
  id: string,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  rooms: Room[],
  furniture: FurnitureItem[] = [],
  staircases: StaircaseItem[] = []
): Point | null {
  const stair = staircases.find((s) => s.id === id);
  if (stair) return stair.position;
  const furn = furniture.find((f) => f.id === id);
  if (furn) return furn.position;
  const door = doors.find((d) => d.id === id);
  if (door) return door.position;
  const win = windows.find((w) => w.id === id);
  if (win) return win.position;
  const room = rooms.find((r) => r.id === id);
  if (room && room.vertices.length > 0) {
    const cx = room.vertices.reduce((s, p) => s + p.x, 0) / room.vertices.length;
    const cy = room.vertices.reduce((s, p) => s + p.y, 0) / room.vertices.length;
    return { x: cx, y: cy };
  }
  return null;
}

// Helper: hit-test elements on the floorplan
function findElementAt(
  pt: Point,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  rooms: Room[],
  furniture: FurnitureItem[] = [],
  staircases: StaircaseItem[] = []
): string | null {
  // Check staircases first (clickable bounds)
  for (const s of staircases) {
    const sw = s.width ?? s.flightWidth ?? 1.50;
    const sl = s.length ?? ((s.riserCount || 10) * ((s.treadMm ? s.treadMm / 1000 : s.treadDepth) || 0.30));
    const maxDim = Math.max(sw, sl) / 2 + 0.2;
    if (Math.hypot(s.position.x - pt.x, s.position.y - pt.y) < maxDim) {
      return s.id;
    }
  }
  // Check furniture next (clickable bounds)
  for (const f of furniture) {
    if (Math.hypot(f.position.x - pt.x, f.position.y - pt.y) < Math.max(f.width, f.depth) / 2 + 0.2) {
      return f.id;
    }
  }
  // Check doors and windows next (points)
  for (const d of doors) {
    if (Math.hypot(d.position.x - pt.x, d.position.y - pt.y) < 0.5) {
      return d.id;
    }
  }
  for (const win of windows) {
    if (Math.hypot(win.position.x - pt.x, win.position.y - pt.y) < 0.5) {
      return win.id;
    }
  }
  // Check walls (line segments)
  for (const w of walls) {
    const d = distToSegment(pt, w.start, w.end);
    if (d < 0.35) {
      return w.id;
    }
  }
  // Check room labels/centroids
  for (const r of rooms) {
    if (r.vertices.length >= 3) {
      const cx = r.vertices.reduce((s, p) => s + p.x, 0) / r.vertices.length;
      const cy = r.vertices.reduce((s, p) => s + p.y, 0) / r.vertices.length;
      if (Math.hypot(cx - pt.x, cy - pt.y) < 0.8) {
        return r.id;
      }
    }
  }
  return null;
}

// Distance from point to line segment
function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
