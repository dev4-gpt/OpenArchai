import { createAdminClient } from "@/lib/supabase/admin";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

export interface DemoProjectData {
  project: {
    id: string;
    name: string;
    unit_system: "metric" | "imperial";
    region: "india" | "us";
  };
  modelUrl: string | null;
  renderUrl: string | null;
  renderStyle: string | null;
  initialFloorPlan: FloorPlan;
  constructionElements: ConstructionElements;
}

const DEFAULT_DEMO_FLOORPLAN: FloorPlan = {
  walls: [
    { id: "demo_wall_1", start: { x: 0, y: 0 }, end: { x: 5, y: 0 }, thickness: 0.15 },
    { id: "demo_wall_2", start: { x: 5, y: 0 }, end: { x: 5, y: 3 }, thickness: 0.15 },
    { id: "demo_wall_3", start: { x: 5, y: 3 }, end: { x: 0, y: 3 }, thickness: 0.15 },
    { id: "demo_wall_4", start: { x: 0, y: 3 }, end: { x: 0, y: 0 }, thickness: 0.15 },
  ],
  doors: [
    { id: "demo_door_1", position: { x: 2, y: 0 }, width: 0.9, wallId: "demo_wall_1" },
  ],
  windows: [
    { id: "demo_win_1", position: { x: 5, y: 1.5 }, width: 1.2, wallId: "demo_wall_2" },
  ],
  rooms: [
    {
      id: "demo_room_1",
      label: "Studio Living",
      vertices: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 3 },
        { x: 0, y: 3 },
      ],
      area: 15,
    },
  ],
  furniture: [
    { id: "f1", ffeId: "ffe_sectional_sofa", name: "Sectional Sofa", type: "sofa", position: { x: 1.5, y: 1.8 }, width: 2.4, depth: 1.0, rotation: 0 },
    { id: "f2", ffeId: "ffe_coffee_table", name: "Noguchi Coffee Table", type: "table", position: { x: 1.5, y: 0.9 }, width: 1.2, depth: 0.6, rotation: 0 },
    { id: "f3", ffeId: "ffe_king_bed", name: "King Platform Bed", type: "bed", position: { x: 3.8, y: 1.8 }, width: 1.9, depth: 2.1, rotation: 0 },
    { id: "f4", ffeId: "ffe_eames_lounge", name: "Eames Lounge Chair", type: "chair", position: { x: 2.9, y: 0.8 }, width: 0.85, depth: 0.85, rotation: 0 },
    { id: "f5", ffeId: "ffe_dining_table", name: "Oak Dining Table", type: "table", position: { x: 0.6, y: 0.6 }, width: 1.2, depth: 0.8, rotation: 90 },
  ],
  gridSize: 0.5,
  panOffset: { x: 160, y: 140 },
  zoom: 40,
};

const DEFAULT_DEMO_ELEMENTS: ConstructionElements = {
  walls: [
    { start: [0, 0] as [number, number], end: [5, 0] as [number, number] },
    { start: [5, 0] as [number, number], end: [5, 3] as [number, number] },
    { start: [5, 3] as [number, number], end: [0, 3] as [number, number] },
    { start: [0, 3] as [number, number], end: [0, 0] as [number, number] },
  ],
  doors: [
    { position: [2, 0] as [number, number], width_m: 0.9 },
  ],
  windows: [
    { position: [5, 1.5] as [number, number], width_m: 1.2 },
  ],
  furniture: [
    { id: "f1", ffeId: "ffe_sectional_sofa", name: "Sectional Sofa", type: "sofa", position: [1.5, 1.8], width_m: 2.4, depth_m: 1.0, rotation_deg: 0 },
    { id: "f2", ffeId: "ffe_coffee_table", name: "Noguchi Coffee Table", type: "table", position: [1.5, 0.9], width_m: 1.2, depth_m: 0.6, rotation_deg: 0 },
    { id: "f3", ffeId: "ffe_king_bed", name: "King Platform Bed", type: "bed", position: [3.8, 1.8], width_m: 1.9, depth_m: 2.1, rotation_deg: 0 },
    { id: "f4", ffeId: "ffe_eames_lounge", name: "Eames Lounge Chair", type: "chair", position: [2.9, 0.8], width_m: 0.85, depth_m: 0.85, rotation_deg: 0 },
    { id: "f5", ffeId: "ffe_dining_table", name: "Oak Dining Table", type: "table", position: [0.6, 0.6], width_m: 1.2, depth_m: 0.8, rotation_deg: 90 },
  ],
  floor_bounds: { min_x: 0, min_y: 0, max_x: 5, max_y: 3 },
};

export async function getDemoProjectData(): Promise<DemoProjectData> {
  const supabase = createAdminClient();

  // Try to find the sample project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, unit_system, region")
    .eq("name", "Sample Studio Apartment")
    .maybeSingle();

  let modelUrl: string | null = null;
  let renderUrl: string | null = null;
  let renderStyle: string | null = "modern minimalist studio apartment, warm lighting, wood floors";
  let constructionElements = DEFAULT_DEMO_ELEMENTS;

  if (project) {
    // 1. Fetch latest done model
    const { data: models } = await supabase
      .from("models")
      .select("gltf_storage_path")
      .eq("project_id", project.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1);

    if (models?.[0]?.gltf_storage_path) {
      const { data } = await supabase.storage
        .from("models")
        .createSignedUrl(models[0].gltf_storage_path, 3600);
      modelUrl = data?.signedUrl ?? null;
    }

    // 2. Fetch latest done render
    const { data: renders } = await supabase
      .from("renders")
      .select("image_storage_path, prompt_style")
      .eq("project_id", project.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1);

    if (renders?.[0]?.image_storage_path) {
      const { data } = await supabase.storage
        .from("renders")
        .createSignedUrl(renders[0].image_storage_path, 3600);
      renderUrl = data?.signedUrl ?? null;
      if (renders[0].prompt_style) renderStyle = renders[0].prompt_style;
    }

    // 3. Fetch construction model elements
    const { data: constructionModels } = await supabase
      .from("construction_models")
      .select("elements")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (constructionModels?.[0]?.elements) {
      constructionElements = constructionModels[0].elements as ConstructionElements;
    }
  }

  return {
    project: {
      id: project?.id || "demo",
      name: project?.name || "Sample Studio Apartment",
      unit_system: (project?.unit_system as "metric" | "imperial") || "metric",
      region: (project as any)?.region || "india",
    },
    modelUrl,
    renderUrl,
    renderStyle,
    initialFloorPlan: DEFAULT_DEMO_FLOORPLAN,
    constructionElements,
  };
}
