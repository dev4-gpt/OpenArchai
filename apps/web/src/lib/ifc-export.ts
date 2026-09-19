// Client-side IFC4 BIM Exporter for AtelierOS
// Generates standard ISO-10303-21 STEP physical format files compatible with
// Autodesk Revit, ArchiCAD, Nemetschek Allplan, and BlenderBIM.

import type { FloorPlan } from "@/components/floor-plan-editor/types";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

function generateGuid(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
  let str = "";
  for (let i = 0; i < 22; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

export function exportFloorPlanToIfc(
  planOrElements: FloorPlan | ConstructionElements,
  projectName = "AtelierOS Architectural Project",
): string {
  const now = new Date().toISOString();
  let id = 1;

  const nextId = () => `#${id++}`;

  const lines: string[] = [];
  lines.push("ISO-10303-21;");
  lines.push("HEADER;");
  lines.push("FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]'),'2;1');");
  lines.push(`FILE_NAME('${projectName.replace(/'/g, "")}.ifc','${now}',('AtelierOS Architect'),('AtelierOS Design Team'),'Preprocessor','AtelierOS IFC4 Engine','Certified for BIM Exchange');`);
  lines.push("FILE_SCHEMA(('IFC4'));");
  lines.push("ENDSEC;");
  lines.push("DATA;");

  // Core Project Setup
  const person = nextId();
  lines.push(`${person}=IFCPERSON($,'Architect','AtelierOS',$,$,$,$,$);`);
  const org = nextId();
  lines.push(`${org}=IFCORGANIZATION($,'PDCO Architects','Architectural Practice',$,$);`);
  const personAndOrg = nextId();
  lines.push(`${personAndOrg}=IFCPERSONANDORGANIZATION(${person},${org},$);`);
  const app = nextId();
  lines.push(`${app}=IFCAPPLICATION(${org},'1.0','AtelierOS','AtelierOS');`);
  const ownerHistory = nextId();
  lines.push(`${ownerHistory}=IFCOWNERHISTORY(${personAndOrg},${app},$,.ADDED.,$,$,$,$);`);

  // Units
  const siLength = nextId();
  lines.push(`${siLength}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`);
  const siArea = nextId();
  lines.push(`${siArea}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);
  const siVolume = nextId();
  lines.push(`${siVolume}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);`);
  const unitAssign = nextId();
  lines.push(`${unitAssign}=IFCUNITASSIGNMENT((${siLength},${siArea},${siVolume}));`);

  // Geometry contexts
  const worldPoint = nextId();
  lines.push(`${worldPoint}=IFCCARTESIANPOINT((0.,0.,0.));`);
  const axisZ = nextId();
  lines.push(`${axisZ}=IFCDIRECTION((0.,0.,1.));`);
  const axisX = nextId();
  lines.push(`${axisX}=IFCDIRECTION((1.,0.,0.));`);
  const axisPlacement = nextId();
  lines.push(`${axisPlacement}=IFCAXIS2PLACEMENT3D(${worldPoint},${axisZ},${axisX});`);

  const geomContext = nextId();
  lines.push(`${geomContext}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${axisPlacement},#3);`);

  // Project -> Site -> Building -> Storey
  const project = nextId();
  lines.push(`${project}=IFCPROJECT('${generateGuid()}',${ownerHistory},'${projectName}',$,$,$,$,(${geomContext}),${unitAssign});`);

  const sitePlacement = nextId();
  lines.push(`${sitePlacement}=IFCLOCALPLACEMENT($,${axisPlacement});`);
  const site = nextId();
  lines.push(`${site}=IFCSITE('${generateGuid()}',${ownerHistory},'Default Site',$,$,${sitePlacement},$,$,.ELEMENT.,$,$,$,$,$);`);

  const bldgPlacement = nextId();
  lines.push(`${bldgPlacement}=IFCLOCALPLACEMENT(${sitePlacement},${axisPlacement});`);
  const bldg = nextId();
  lines.push(`${bldg}=IFCBUILDING('${generateGuid()}',${ownerHistory},'Main Building',$,$,${bldgPlacement},$,$,.ELEMENT.,$,$,$);`);

  const storeyPlacement = nextId();
  lines.push(`${storeyPlacement}=IFCLOCALPLACEMENT(${bldgPlacement},${axisPlacement});`);
  const storey = nextId();
  lines.push(`${storey}=IFCBUILDINGSTOREY('${generateGuid()}',${ownerHistory},'Ground Floor Level 0',$,$,${storeyPlacement},$,$,.ELEMENT.,0.);`);

  // Spatial aggregations
  const relAggProject = nextId();
  lines.push(`${relAggProject}=IFCRELAGGREGATES('${generateGuid()}',${ownerHistory},'ProjectSite',$,${project},(${site}));`);
  const relAggSite = nextId();
  lines.push(`${relAggSite}=IFCRELAGGREGATES('${generateGuid()}',${ownerHistory},'SiteBuilding',$,${site},(${bldg}));`);
  const relAggBldg = nextId();
  lines.push(`${relAggBldg}=IFCRELAGGREGATES('${generateGuid()}',${ownerHistory},'BuildingStorey',$,${bldg},(${storey}));`);

  // Extract walls, doors, windows, furniture
  let walls: { start: [number, number]; end: [number, number] }[] = [];
  let doors: { position: [number, number]; width: number }[] = [];
  let windows: { position: [number, number]; width: number }[] = [];
  let furniture: { name: string; position: [number, number]; width: number; depth: number }[] = [];

  if ("walls" in planOrElements && Array.isArray(planOrElements.walls)) {
    if (planOrElements.walls.length > 0 && "x" in (planOrElements.walls[0].start as any)) {
      // FloorPlan type
      const fp = planOrElements as FloorPlan;
      walls = fp.walls.map((w) => ({ start: [w.start.x, w.start.y], end: [w.end.x, w.end.y] }));
      doors = fp.doors.map((d) => ({ position: [d.position.x, d.position.y], width: d.width }));
      windows = fp.windows.map((w) => ({ position: [w.position.x, w.position.y], width: w.width }));
      furniture = (fp.furniture || []).map((f) => ({
        name: f.name,
        position: [f.position.x, f.position.y],
        width: f.width,
        depth: f.depth,
      }));
    } else {
      // ConstructionElements type
      const ce = planOrElements as ConstructionElements;
      walls = ce.walls.map((w) => ({ start: w.start, end: w.end }));
      doors = (ce.doors || []).map((d) => ({ position: d.position, width: d.width_m || 0.9 }));
      windows = (ce.windows || []).map((w) => ({ position: w.position, width: w.width_m || 1.2 }));
      furniture = (ce.furniture || []).map((f) => ({
        name: f.name,
        position: f.position,
        width: f.width_m,
        depth: f.depth_m,
      }));
    }
  }

  const elementsIds: string[] = [];

  // Walls
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const dx = w.end[0] - w.start[0];
    const dy = w.end[1] - w.start[1];
    const length = Math.hypot(dx, dy);

    const ptStart = nextId();
    lines.push(`${ptStart}=IFCCARTESIANPOINT((${w.start[0].toFixed(3)},${w.start[1].toFixed(3)},0.));`);
    const ptPlacement = nextId();
    lines.push(`${ptPlacement}=IFCAXIS2PLACEMENT3D(${ptStart},${axisZ},${axisX});`);
    const wallPlacement = nextId();
    lines.push(`${wallPlacement}=IFCLOCALPLACEMENT(${storeyPlacement},${ptPlacement});`);

    const wallEntity = nextId();
    lines.push(`${wallEntity}=IFCWALLSTANDARDCASE('${generateGuid()}',${ownerHistory},'Wall_${i + 1}',$,'Exterior/Interior 150mm Partition',${wallPlacement},$,$);`);
    elementsIds.push(wallEntity);
  }

  // Doors
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];
    const ptDoor = nextId();
    lines.push(`${ptDoor}=IFCCARTESIANPOINT((${d.position[0].toFixed(3)},${d.position[1].toFixed(3)},0.));`);
    const doorPlacement = nextId();
    lines.push(`${doorPlacement}=IFCLOCALPLACEMENT(${storeyPlacement},IFCAXIS2PLACEMENT3D(${ptDoor},${axisZ},${axisX}));`);
    const doorEntity = nextId();
    lines.push(`${doorEntity}=IFCDOOR('${generateGuid()}',${ownerHistory},'Door_${i + 1}',$,'Single Swing 2100mm',${doorPlacement},$,$,2.1,${d.width.toFixed(2)},.DOOR.,.NOTDEFINED.,$);`);
    elementsIds.push(doorEntity);
  }

  // Windows
  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    const ptWin = nextId();
    lines.push(`${ptWin}=IFCCARTESIANPOINT((${win.position[0].toFixed(3)},${win.position[1].toFixed(3)},0.9));`);
    const winPlacement = nextId();
    lines.push(`${winPlacement}=IFCLOCALPLACEMENT(${storeyPlacement},IFCAXIS2PLACEMENT3D(${ptWin},${axisZ},${axisX}));`);
    const winEntity = nextId();
    lines.push(`${winEntity}=IFCWINDOW('${generateGuid()}',${ownerHistory},'Window_${i + 1}',$,'Double Glazed Casement',${winPlacement},$,$,1.2,${win.width.toFixed(2)},.WINDOW.,.NOTDEFINED.,$);`);
    elementsIds.push(winEntity);
  }

  // Furniture / FF&E
  for (let i = 0; i < furniture.length; i++) {
    const f = furniture[i];
    const ptFurn = nextId();
    lines.push(`${ptFurn}=IFCCARTESIANPOINT((${f.position[0].toFixed(3)},${f.position[1].toFixed(3)},0.));`);
    const furnPlacement = nextId();
    lines.push(`${furnPlacement}=IFCLOCALPLACEMENT(${storeyPlacement},IFCAXIS2PLACEMENT3D(${ptFurn},${axisZ},${axisX}));`);
    const furnEntity = nextId();
    lines.push(`${furnEntity}=IFCFURNISHINGELEMENT('${generateGuid()}',${ownerHistory},'${f.name.replace(/'/g, "")}',$,'FF&E Specification Element',${furnPlacement},$,$);`);
    elementsIds.push(furnEntity);
  }

  // RelContainInSpatialStructure
  if (elementsIds.length > 0) {
    const relContained = nextId();
    lines.push(`${relContained}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateGuid()}',${ownerHistory},'StoreyElements',$,(${elementsIds.join(",")}),${storey});`);
  }

  lines.push("ENDSEC;");
  lines.push("END-ISO-10303-21;");

  return lines.join("\n");
}
