"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { floorPlanStore, useFloorPlanStore } from "./state/floor-plan-store";
import type { Point, Wall, Door, Window, Room, FurnitureItem, FloorPlan, PendingFurniture } from "./types";
import { metersToUnit, unitLabel, type UnitSystem } from "@/lib/units";
import { parseDxfContent } from "@/lib/dxf-import";
import { calculateEgressOverlay } from "@/lib/calculators/egress-overlay-geometry";
import { lintFloorPlanGeometry, type LinterIssue } from "@/lib/calculators/geometry-linter";

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
    showEgressOverlay,
    showLinter,
  } = state;
  const { zoom, panOffset, walls, doors, windows, rooms, furniture = [] } = floorPlan;

  // Auto-focus container when pending furniture is armed for instant R / Esc / arrow key controls
  useEffect(() => {
    if (pendingFurniture) {
      containerRef.current?.focus();
    }
  }, [pendingFurniture]);

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

    // 3. Render rooms (polygons)
    for (const room of rooms) {
      if (room.vertices.length < 3) continue;
      const isRoomDeleteHover = tool === "eraser" && hoveredDeleteId === room.id;

      ctx.beginPath();
      const first = worldToScreen(room.vertices[0].x, room.vertices[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < room.vertices.length; i++) {
        const pt = worldToScreen(room.vertices[i].x, room.vertices[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fillStyle = isRoomDeleteHover ? "rgba(239, 68, 68, 0.15)" : "rgba(161, 92, 62, 0.05)";
      ctx.fill();

      // Label at centroid
      const cx = room.vertices.reduce((s, p) => s + p.x, 0) / room.vertices.length;
      const cy = room.vertices.reduce((s, p) => s + p.y, 0) / room.vertices.length;
      const labelPt = worldToScreen(cx, cy);

      ctx.fillStyle = isRoomDeleteHover ? "#ef4444" : "#2a2621";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(room.label, labelPt.x, labelPt.y - 4);

      ctx.fillStyle = isRoomDeleteHover ? "#ef4444" : "#8a8073";
      ctx.font = "10px sans-serif";
      const areaDisplay =
        unitSystem === "metric"
          ? `${room.area.toFixed(1)} m²`
          : `${(room.area * 10.7639).toFixed(0)} sq ft`;
      ctx.fillText(areaDisplay, labelPt.x, labelPt.y + 12);
    }

    // 4. Render walls
    for (const wall of walls) {
      const p1 = worldToScreen(wall.start.x, wall.start.y);
      const p2 = worldToScreen(wall.end.x, wall.end.y);
      const isSelected = selectedIds.includes(wall.id);
      const isDeleteHover = tool === "eraser" && hoveredDeleteId === wall.id;

      // Wall core
      ctx.strokeStyle = isDeleteHover ? "#ef4444" : isSelected ? "#a15c3e" : "#2a2621";
      ctx.lineWidth = isDeleteHover ? Math.max(5, (wall.thickness + 0.04) * zoom) : Math.max(3, wall.thickness * zoom);
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Wall dimension label
      const lenMeters = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
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

    // 6. Render doors
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
    }

    // 6.5. Render Furniture Elements
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

        ctx.restore();
      }

      // B. Render Egress Travel Distance Vector Path
      if (waypoints && waypoints.length >= 2) {
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

    ctx.restore();
  }, [
    walls,
    doors,
    windows,
    rooms,
    furniture,
    pendingFurniture,
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
    hoveredLintIssue,
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
    } else if (tool === "eraser") {
      const targetId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture);
      if (targetId) {
        floorPlanStore.deleteElement(targetId);
        setHoveredDeleteId(null);
      }
    } else if (tool === "select") {
      const foundId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture);
      if (foundId) {
        floorPlanStore.selectElement(foundId, e.shiftKey);
        // Initiate drag tracking
        const elemPos = getElementPosition(foundId, walls, doors, windows, rooms, furniture);
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
      const hitId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture);
      setHoveredDeleteId(hitId);
    } else if (hoveredDeleteId) {
      setHoveredDeleteId(null);
    }

    if (tool === "select") {
      const hitId = findElementAt(rawWorld, walls, doors, windows, rooms, furniture);
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
      floorPlanStore.finishDrawing();
      floorPlanStore.clearSelection();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      floorPlanStore.deleteSelected();
    } else if (e.key === "r" || e.key === "R") {
      if (pendingFurniture) {
        floorPlanStore.rotatePendingFurniture();
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
    : tool === "furniture" && pendingFurniture
    ? "cursor-crosshair"
    : draggingId
    ? "cursor-grabbing"
    : tool === "select" && hoveredElementId
    ? "cursor-grab"
    : tool === "wall" || tool === "door" || tool === "window"
    ? "cursor-crosshair"
    : "cursor-default";

  const tooltipText = pendingFurniture
    ? `🛋️ Click anywhere on canvas to place ${pendingFurniture.tag || pendingFurniture.name}. Press 'R' to rotate, Esc to cancel.`
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
  furniture: FurnitureItem[] = []
): Point | null {
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
  furniture: FurnitureItem[] = []
): string | null {
  // Check furniture first (clickable bounds)
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
