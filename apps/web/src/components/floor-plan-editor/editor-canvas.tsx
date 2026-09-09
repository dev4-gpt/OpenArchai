"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { floorPlanStore, useFloorPlanStore } from "./state/floor-plan-store";
import type { Point, Wall } from "./types";
import { metersToUnit, unitLabel, type UnitSystem } from "@/lib/units";

export function EditorCanvas({ unitSystem = "metric" }: { unitSystem?: UnitSystem }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const state = useFloorPlanStore();
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const { floorPlan, tool, drawingPoints, snapPoint, selectedIds } = state;
  const { zoom, panOffset, walls, doors, windows, rooms } = floorPlan;

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
      ctx.beginPath();
      const first = worldToScreen(room.vertices[0].x, room.vertices[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < room.vertices.length; i++) {
        const pt = worldToScreen(room.vertices[i].x, room.vertices[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(161, 92, 62, 0.05)";
      ctx.fill();

      // Label at centroid
      const cx = room.vertices.reduce((s, p) => s + p.x, 0) / room.vertices.length;
      const cy = room.vertices.reduce((s, p) => s + p.y, 0) / room.vertices.length;
      const labelPt = worldToScreen(cx, cy);

      ctx.fillStyle = "#2a2621";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(room.label, labelPt.x, labelPt.y - 4);

      ctx.fillStyle = "#8a8073";
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

      // Wall core
      ctx.strokeStyle = isSelected ? "#a15c3e" : "#2a2621";
      ctx.lineWidth = Math.max(3, wall.thickness * zoom);
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
        ctx.fillStyle = "#595045";
        ctx.textAlign = "center";
        ctx.fillText(label, midX, midY - 6);
      }
    }

    // 5. Render windows
    for (const win of windows) {
      const pos = worldToScreen(win.position.x, win.position.y);
      const halfW = (win.width * zoom) / 2;
      const isSelected = selectedIds.includes(win.id);

      ctx.strokeStyle = isSelected ? "#a15c3e" : "#3b82f6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pos.x - halfW, pos.y);
      ctx.lineTo(pos.x + halfW, pos.y);
      ctx.stroke();

      // Window sill indicator
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - halfW, pos.y - 3, win.width * zoom, 6);
    }

    // 6. Render doors
    for (const door of doors) {
      const pos = worldToScreen(door.position.x, door.position.y);
      const doorRadius = door.width * zoom;
      const isSelected = selectedIds.includes(door.id);

      // Door leaf
      ctx.strokeStyle = isSelected ? "#a15c3e" : "#a15c3e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y - doorRadius);
      ctx.stroke();

      // Door swing arc
      ctx.strokeStyle = "#d4b09b";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, doorRadius, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7. Active drawing wall preview
    if (drawingPoints.length === 1 && mousePos) {
      const p1 = worldToScreen(drawingPoints[0].x, drawingPoints[0].y);
      const snap = snapPoint || mousePos;
      const p2 = worldToScreen(snap.x, snap.y);

      ctx.strokeStyle = "#a15c3e";
      ctx.lineWidth = 0.15 * zoom;
      ctx.lineCap = "round";
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

    // 8. Snap point circle indicator
    if (snapPoint) {
      const sp = worldToScreen(snapPoint.x, snapPoint.y);
      ctx.strokeStyle = "#a15c3e";
      ctx.fillStyle = "rgba(161, 92, 62, 0.2)";
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
    zoom,
    panOffset,
    drawingPoints,
    mousePos,
    snapPoint,
    selectedIds,
    unitSystem,
    worldToScreen,
  ]);

  // Mouse event handlers
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Pan with middle click or spacebar
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
    } else if (tool === "select") {
      // Find closest entity to select
      let foundId: string | null = null;
      for (const w of walls) {
        const d = distToSegment(rawWorld, w.start, w.end);
        if (d < 0.3) {
          foundId = w.id;
          break;
        }
      }
      if (!foundId) {
        for (const d of doors) {
          if (Math.hypot(d.position.x - rawWorld.x, d.position.y - rawWorld.y) < 0.4) {
            foundId = d.id;
            break;
          }
        }
      }
      if (foundId) {
        floorPlanStore.selectElement(foundId, e.shiftKey);
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
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    floorPlanStore.setZoom(zoom * factor);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      floorPlanStore.finishDrawing();
      floorPlanStore.clearSelection();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      floorPlanStore.deleteSelected();
    } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
      if (e.shiftKey) {
        floorPlanStore.redo();
      } else {
        floorPlanStore.undo();
      }
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative h-[500px] w-full overflow-hidden rounded-b-lg bg-[#faf8f4] outline-none cursor-crosshair"
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
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-1 text-[11px] text-muted border border-border shadow-xs">
        {tool === "wall"
          ? "Click to place wall points. Press Escape to finish."
          : tool === "select"
          ? "Click wall/opening to select. Backspace to delete."
          : `Click to place ${tool}.`}
      </div>
    </div>
  );
}

// Distance from point to line segment
function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
