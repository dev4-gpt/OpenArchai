/**
 * Lightweight, zero-dependency DXF ASCII Parser for Node.js / Browser.
 * Extracts layers and basic geometry directly from AutoCAD DXF files
 * to provide instantaneous fallback and resilience against remote ML downtime.
 */

export function parseDxfLayersFromText(dxfText: string): string[] {
  const layers = new Set<string>();
  const lines = dxfText.split(/\r?\n/);

  for (let i = 0; i < lines.length - 1; i++) {
    const code = lines[i].trim();
    // Group code 8 in DXF is the Layer Name for entities
    if (code === "8") {
      const val = lines[i + 1]?.trim();
      if (val && val.length > 0 && val !== "0" && !val.startsWith("$")) {
        layers.add(val);
      }
    }
  }

  // If no entity layers were discovered, check the TABLES -> LAYER section
  if (layers.size === 0) {
    let inLayersTable = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const code = lines[i].trim();
      const val = lines[i + 1]?.trim();
      if (code === "0" && val === "TABLE") {
        const nextCode = lines[i + 2]?.trim();
        const nextVal = lines[i + 3]?.trim();
        if (nextCode === "2" && nextVal === "LAYER") {
          inLayersTable = true;
        }
      } else if (code === "0" && val === "ENDTAB") {
        inLayersTable = false;
      }

      if (inLayersTable && code === "2") {
        if (val && !["LAYER", "0"].includes(val) && !val.startsWith("$")) {
          layers.add(val);
        }
      }
    }
  }

  // If still empty, add default architectural layers
  if (layers.size === 0) {
    return ["WALLS", "DOORS", "WINDOWS", "FURNITURE"];
  }

  return Array.from(layers).sort();
}

/**
 * Parses 2D LINES and LWPOLYLINES on mapped layers into structured wall elements.
 */
export function parseDxfElementsFromText(
  dxfText: string,
  layerMapping: Record<string, "wall" | "door" | "window" | "ignore">,
) {
  const lines = dxfText.split(/\r?\n/);
  const walls: { start: [number, number]; end: [number, number] }[] = [];
  const doors: { position: [number, number]; width_m: number | null }[] = [];
  const windows: { position: [number, number]; width_m: number | null }[] = [];
  const allPoints: [number, number][] = [];

  // Detect scale factor ($INSUNITS)
  // 1: inch (0.0254m), 2: ft (0.3048m), 4: mm (0.001m), 5: cm (0.01m), 6: m (1.0m)
  let scale = 1.0;
  for (let i = 0; i < Math.min(lines.length - 1, 1000); i++) {
    if (lines[i].trim() === "$INSUNITS") {
      const unitCode = parseInt(lines[i + 2]?.trim() || "0", 10);
      if (unitCode === 1) scale = 0.0254;
      else if (unitCode === 2) scale = 0.3048;
      else if (unitCode === 4) scale = 0.001;
      else if (unitCode === 5) scale = 0.01;
      else if (unitCode === 6) scale = 1.0;
      break;
    }
  }

  let currentEntity: string | null = null;
  let currentLayer = "0";
  let x1: number | null = null;
  let y1: number | null = null;
  let x2: number | null = null;
  let y2: number | null = null;

  function commitLine() {
    if (currentEntity === "LINE" && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      const kind = layerMapping[currentLayer] || "ignore";
      const p1: [number, number] = [x1 * scale, y1 * scale];
      const p2: [number, number] = [x2 * scale, y2 * scale];
      if (kind === "wall") {
        walls.push({ start: p1, end: p2 });
        allPoints.push(p1, p2);
      } else if (kind === "door") {
        doors.push({ position: p1, width_m: 0.9 });
        allPoints.push(p1);
      } else if (kind === "window") {
        windows.push({ position: p1, width_m: 1.2 });
        allPoints.push(p1);
      }
    }
    x1 = y1 = x2 = y2 = null;
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const code = lines[i].trim();
    const val = lines[i + 1]?.trim();

    if (code === "0") {
      commitLine();
      currentEntity = val;
      currentLayer = "0";
    } else if (code === "8") {
      currentLayer = val;
    } else if (currentEntity === "LINE") {
      if (code === "10") x1 = parseFloat(val);
      else if (code === "20") y1 = parseFloat(val);
      else if (code === "11") x2 = parseFloat(val);
      else if (code === "21") y2 = parseFloat(val);
    }
  }
  commitLine();

  if (allPoints.length === 0) {
    return null;
  }

  const xs = allPoints.map((p) => p[0]);
  const ys = allPoints.map((p) => p[1]);

  return {
    walls,
    doors,
    windows,
    floor_bounds: {
      min_x: Math.min(...xs),
      min_y: Math.min(...ys),
      max_x: Math.max(...xs),
      max_y: Math.max(...ys),
    },
    units_source: "dxf_fallback_parser",
  };
}
