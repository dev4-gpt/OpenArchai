import type { FloorPlan } from "../types";

export interface ConstructionElements {
  walls: { start: [number, number]; end: [number, number] }[];
  doors: { position: [number, number]; width_m: number | null }[];
  windows: { position: [number, number]; width_m: number | null }[];
  floor_bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  units_source?: string;
  furniture?: {
    id: string;
    ffeId?: string;
    name: string;
    type: string;
    position: [number, number];
    width_m: number;
    depth_m: number;
    rotation_deg?: number;
    tag?: string;
  }[];
}

/**
 * Converts a 2D floor plan from the editor into the exact construction_models.elements
 * JSON structure consumed by build_ifc.py and the construction review workflow.
 */
export function floorPlanToElements(plan: FloorPlan): ConstructionElements {
  const walls = plan.walls.map((w) => ({
    start: [w.start.x, w.start.y] as [number, number],
    end: [w.end.x, w.end.y] as [number, number],
  }));

  const doors = plan.doors.map((d) => ({
    position: [d.position.x, d.position.y] as [number, number],
    width_m: d.width,
  }));

  const windows = plan.windows.map((w) => ({
    position: [w.position.x, w.position.y] as [number, number],
    width_m: w.width,
  }));

  const furniture = (plan.furniture || []).map((f) => ({
    id: f.id,
    ffeId: f.ffeId,
    name: f.name,
    type: f.type,
    position: [f.position.x, f.position.y] as [number, number],
    width_m: f.width,
    depth_m: f.depth,
    rotation_deg: f.rotation,
    tag: f.tag,
  }));

  let min_x = 0;
  let min_y = 0;
  let max_x = 10;
  let max_y = 10;

  const allPoints: [number, number][] = [];
  for (const w of plan.walls) {
    allPoints.push([w.start.x, w.start.y]);
    allPoints.push([w.end.x, w.end.y]);
  }

  if (allPoints.length > 0) {
    min_x = Math.min(...allPoints.map((p) => p[0]));
    max_x = Math.max(...allPoints.map((p) => p[0]));
    min_y = Math.min(...allPoints.map((p) => p[1]));
    max_y = Math.max(...allPoints.map((p) => p[1]));
  }

  return {
    walls,
    doors,
    windows,
    floor_bounds: { min_x, min_y, max_x, max_y },
    units_source: "editor_metric",
    furniture,
  };
}
