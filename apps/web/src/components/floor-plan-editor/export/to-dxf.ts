import type { FloorPlan } from "../types";

/**
 * Generates an AutoCAD-compatible R12/2000 ASCII DXF file from the floor plan.
 * Uses meter units ($INSUNITS = 6).
 */
export function floorPlanToDxf(plan: FloorPlan): string {
  const lines: string[] = [];

  // Helper to add group code & value
  function code(c: number, val: string | number) {
    lines.push(c.toString());
    lines.push(val.toString());
  }

  // Header section
  code(0, "SECTION");
  code(2, "HEADER");
  code(9, "$ACADVER");
  code(1, "AC1009"); // AutoCAD R12 compatibility
  code(9, "$INSUNITS");
  code(70, 6); // Meters
  code(0, "ENDSEC");

  // Tables section with layers
  code(0, "SECTION");
  code(2, "TABLES");
  code(0, "TABLE");
  code(2, "LAYER");
  code(70, 3);

  // Wall layer (White/7)
  code(0, "LAYER");
  code(2, "WALLS");
  code(70, 0);
  code(62, 7);
  code(6, "CONTINUOUS");

  // Door layer (Cyan/4)
  code(0, "LAYER");
  code(2, "DOORS");
  code(70, 0);
  code(62, 4);
  code(6, "CONTINUOUS");

  // Window layer (Blue/5)
  code(0, "LAYER");
  code(2, "WINDOWS");
  code(70, 0);
  code(62, 5);
  code(6, "CONTINUOUS");

  code(0, "ENDTAB");
  code(0, "ENDSEC");

  // Entities section
  code(0, "SECTION");
  code(2, "ENTITIES");

  // Walls
  for (const wall of plan.walls) {
    code(0, "LINE");
    code(8, "WALLS");
    code(10, wall.start.x.toFixed(4));
    code(20, wall.start.y.toFixed(4));
    code(30, "0.0");
    code(11, wall.end.x.toFixed(4));
    code(21, wall.end.y.toFixed(4));
    code(31, "0.0");
  }

  // Doors
  for (const door of plan.doors) {
    const halfW = door.width / 2;
    code(0, "LINE");
    code(8, "DOORS");
    code(10, (door.position.x - halfW).toFixed(4));
    code(20, door.position.y.toFixed(4));
    code(30, "0.0");
    code(11, (door.position.x + halfW).toFixed(4));
    code(21, door.position.y.toFixed(4));
    code(31, "0.0");
  }

  // Windows
  for (const win of plan.windows) {
    const halfW = win.width / 2;
    code(0, "LINE");
    code(8, "WINDOWS");
    code(10, (win.position.x - halfW).toFixed(4));
    code(20, win.position.y.toFixed(4));
    code(30, "0.0");
    code(11, (win.position.x + halfW).toFixed(4));
    code(21, win.position.y.toFixed(4));
    code(31, "0.0");
  }

  code(0, "ENDSEC");
  code(0, "EOF");

  return lines.join("\n") + "\n";
}
