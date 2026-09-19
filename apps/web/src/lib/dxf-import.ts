// Client-side AutoCAD DXF Importer for AtelierOS
// Parses standard ASCII AutoCAD DXF files (R12 - R2018) extracting LINE and LWPOLYLINE entities
// into canonical AtelierOS FloorPlan walls and openings.

import type { Point, Wall } from "@/components/floor-plan-editor/types";

export interface ParsedDxfResult {
  walls: Wall[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  detectedLayers: string[];
  unitScaleFactor: number; // Converts raw coordinates to meters
}

export function parseDxfContent(dxfText: string): ParsedDxfResult {
  const lines = dxfText.split(/\r?\n/).map((l) => l.trim());
  const detectedLayers = new Set<string>();
  const rawSegments: { start: Point; end: Point; layer: string }[] = [];

  let i = 0;
  let inEntitiesSection = false;

  while (i < lines.length - 1) {
    const code = lines[i];
    const val = lines[i + 1];

    if (code === "2" && val === "ENTITIES") {
      inEntitiesSection = true;
      i += 2;
      continue;
    }

    if (inEntitiesSection && code === "0" && val === "ENDSEC") {
      break;
    }

    if (inEntitiesSection && code === "0") {
      const entityType = val.toUpperCase();

      if (entityType === "LINE") {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        let layer = "0";

        i += 2;
        while (i < lines.length - 1 && lines[i] !== "0") {
          const c = lines[i];
          const v = lines[i + 1];
          if (c === "8") layer = v;
          else if (c === "10") startX = parseFloat(v) || 0;
          else if (c === "20") startY = parseFloat(v) || 0;
          else if (c === "11") endX = parseFloat(v) || 0;
          else if (c === "21") endY = parseFloat(v) || 0;
          i += 2;
        }

        detectedLayers.add(layer);
        if (Math.hypot(endX - startX, endY - startY) > 0.001) {
          rawSegments.push({ start: { x: startX, y: startY }, end: { x: endX, y: endY }, layer });
        }
        continue;
      } else if (entityType === "LWPOLYLINE") {
        let layer = "0";
        const vertices: Point[] = [];
        let curX = 0;
        let hasX = false;
        let isClosed = false;

        i += 2;
        while (i < lines.length - 1 && lines[i] !== "0") {
          const c = lines[i];
          const v = lines[i + 1];
          if (c === "8") layer = v;
          else if (c === "70" && (parseInt(v, 10) & 1) === 1) isClosed = true;
          else if (c === "10") {
            curX = parseFloat(v) || 0;
            hasX = true;
          } else if (c === "20" && hasX) {
            vertices.push({ x: curX, y: parseFloat(v) || 0 });
            hasX = false;
          }
          i += 2;
        }

        detectedLayers.add(layer);
        for (let j = 0; j < vertices.length - 1; j++) {
          rawSegments.push({ start: vertices[j], end: vertices[j + 1], layer });
        }
        if (isClosed && vertices.length > 2) {
          rawSegments.push({ start: vertices[vertices.length - 1], end: vertices[0], layer });
        }
        continue;
      }
    }

    i += 2;
  }

  // Determine scale factor: CAD files can be in mm, cm, inches, or meters.
  // We inspect coordinate spans to normalize building dimensions into meters (~5m to 50m typical footprint).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of rawSegments) {
    minX = Math.min(minX, s.start.x, s.end.x);
    maxX = Math.max(maxX, s.start.x, s.end.x);
    minY = Math.min(minY, s.start.y, s.end.y);
    maxY = Math.max(maxY, s.start.y, s.end.y);
  }

  if (minX === Infinity) {
    return { walls: [], bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, detectedLayers: [], unitScaleFactor: 1 };
  }

  const rawWidth = maxX - minX;
  const rawHeight = maxY - minY;
  const maxSpan = Math.max(rawWidth, rawHeight);

  let scale = 1.0;
  if (maxSpan > 500) {
    // Likely in millimeters (e.g. 10000mm = 10m)
    scale = 0.001;
  } else if (maxSpan > 50) {
    // Likely in centimeters or inches
    scale = 0.01;
  } else if (maxSpan < 0.5) {
    // Likely in kilometers or scaled down
    scale = 10.0;
  }

  // Center around origin
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const walls: Wall[] = rawSegments.map((s, idx) => ({
    id: `wall_dxf_${idx + 1}`,
    start: {
      x: Number(((s.start.x - centerX) * scale).toFixed(3)),
      y: Number(((s.start.y - centerY) * scale).toFixed(3)),
    },
    end: {
      x: Number(((s.end.x - centerX) * scale).toFixed(3)),
      y: Number(((s.end.y - centerY) * scale).toFixed(3)),
    },
    thickness: 0.15,
  }));

  return {
    walls,
    bounds: {
      minX: (minX - centerX) * scale,
      minY: (minY - centerY) * scale,
      maxX: (maxX - centerX) * scale,
      maxY: (maxY - centerY) * scale,
    },
    detectedLayers: Array.from(detectedLayers),
    unitScaleFactor: scale,
  };
}
