// Revit BIM Bridge for AtelierOS
// Seamlessly translates Autodesk Revit models, room schedules, 3D camera viewpoints,
// and materials into AtelierOS 3D WebGL scenes and Higgsfield AI video walkthroughs.

import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { HiggsfieldCameraWaypoint } from "@/lib/higgsfield-api";

export interface RevitRoomSchedule {
  id: string;
  name: string;
  number: string;
  areaSqM: number;
  perimeterM: number;
  unboundedHeightM: number;
  level: string;
  boundaryPoints: Array<[number, number]>; // 2D polygon [x, y] in meters
  finishSchedule?: {
    floorFinish?: string;
    wallFinish?: string;
    ceilingFinish?: string;
    baseFinish?: string;
  };
}

export interface RevitCameraView {
  viewName: string;
  viewType: "Perspective" | "Walkthrough" | "Axonometric";
  eyePosition: [number, number, number]; // [x, y, z] in meters
  targetPosition: [number, number, number]; // [x, y, z] in meters
  upDirection?: [number, number, number];
  fieldOfViewDeg: number; // e.g. 50-60 deg
  focalLengthMm?: number; // e.g. 28mm cine prime
  cropRegion?: { width: number; height: number };
}

export interface RevitBIMPayload {
  version: "1.0";
  revitVersion: string; // e.g. "Revit 2024", "Revit 2025"
  projectName: string;
  projectNumber?: string;
  clientName?: string;
  units: "metric" | "imperial";
  levels: Array<{ name: string; elevationM: number }>;
  rooms: RevitRoomSchedule[];
  cameras: RevitCameraView[];
  materials?: Array<{ name: string; category: string; colorHex?: string }>;
  exportedAt: string;
}

/**
 * Converts a Revit BIM payload into AtelierOS ConstructionElements
 * for 2D floor plan rendering and 3D WebGL visualization.
 */
export function convertRevitToConstructionElements(payload: RevitBIMPayload): ConstructionElements {
  const walls: ConstructionElements["walls"] = [];
  const rooms: NonNullable<ConstructionElements["rooms"]> = [];

  for (const r of payload.rooms) {
    if (!r.boundaryPoints || r.boundaryPoints.length < 3) continue;

    // Register room
    rooms.push({
      id: r.id || `revit_room_${r.number}`,
      label: r.name,
      area_m2: r.areaSqM,
      direction: mapRevitRoomDirection(r.name),
    });

    // Create walls from boundary polygon
    const pts = r.boundaryPoints;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];

      walls.push({
        start: [p1[0], p1[1]],
        end: [p2[0], p2[1]],
      });
    }
  }

  let min_x = 0;
  let min_y = 0;
  let max_x = 10;
  let max_y = 10;

  if (walls.length > 0) {
    const allX = walls.flatMap((w) => [w.start[0], w.end[0]]);
    const allY = walls.flatMap((w) => [w.start[1], w.end[1]]);
    min_x = Math.min(...allX);
    max_x = Math.max(...allX);
    min_y = Math.min(...allY);
    max_y = Math.max(...allY);
  }

  return {
    walls,
    doors: [],
    windows: [],
    floor_bounds: { min_x, min_y, max_x, max_y },
    rooms,
  };
}

function mapRevitRoomDirection(name: string): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "center" {
  const n = name.toLowerCase();
  if (n.includes("kitchen")) return "SE"; // Agni
  if (n.includes("master")) return "SW"; // Nairutya
  if (n.includes("foyer") || n.includes("entry")) return "E";
  if (n.includes("living")) return "NE";
  if (n.includes("balcony")) return "N";
  return "center";
}

/**
 * Maps Revit 3D camera viewpoints and walkthrough paths to Higgsfield AI waypoints.
 */
export function convertRevitCamerasToHiggsfieldWaypoints(
  cameras: RevitCameraView[],
): HiggsfieldCameraWaypoint[] {
  if (!cameras || cameras.length === 0) {
    return [
      {
        timeSec: 0,
        position: [2.0, 1.65, 0.5],
        target: [2.0, 1.45, 2.5],
        fov: 55,
        description: "Revit Entrance Foyer camera at 1.65m human eye level",
      },
    ];
  }

  return cameras.map((cam, idx) => ({
    timeSec: idx * 3, // 3 seconds per viewpoint
    position: cam.eyePosition,
    target: cam.targetPosition,
    fov: cam.fieldOfViewDeg || 55,
    description: `Revit View: ${cam.viewName} (${cam.focalLengthMm || 28}mm Cine Prime)`,
  }));
}

/**
 * Auto-classifies Revit room strings to standard architectural zone categories.
 */
function mapRevitRoomNameToType(name: string): "living" | "bedroom" | "kitchen" | "bath" | "circulation" | "balcony" | "utility" {
  const n = name.toLowerCase();
  if (n.includes("living") || n.includes("drawing") || n.includes("lounge") || n.includes("family")) return "living";
  if (n.includes("bed") || n.includes("master") || n.includes("guest") || n.includes("suite")) return "bedroom";
  if (n.includes("kitchen") || n.includes("pantry") || n.includes("dining")) return "kitchen";
  if (n.includes("bath") || n.includes("toilet") || n.includes("powder") || n.includes("wc")) return "bath";
  if (n.includes("foyer") || n.includes("corridor") || n.includes("lobby") || n.includes("hall") || n.includes("passage")) return "circulation";
  if (n.includes("balcony") || n.includes("terrace") || n.includes("deck") || n.includes("verandah")) return "balcony";
  return "utility";
}
