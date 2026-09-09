import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";
import { RealtimeStatus } from "./realtime-status";
import { ShareLink } from "./share-link";
import { ScaleCalibration } from "./scale-calibration";
import { ConstructionModelsList } from "./construction-models-list";
import { EditorTab } from "./editor-tab";
import { VoiceProvider } from "@/components/voice-assistant/voice-provider";
import { VoiceButton } from "@/components/voice-assistant/voice-button";
import { CommandHistory } from "@/components/voice-assistant/command-history";
import { CostPanel } from "./cost-panel";
import { CompliancePanel } from "./compliance-panel";
import { AgentTeamModal } from "./agent-team-modal";
import type { UnitSystem } from "@/lib/units";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, share_token, unit_system, region")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, storage_path, created_at, scale_pixels_per_meter, wall_height_m")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const { data: models } = await supabase
    .from("models")
    .select("id, status, gltf_storage_path, error_message, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const { data: renders } = await supabase
    .from("renders")
    .select("id, model_id, status, image_storage_path, prompt_style, error_message, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const { data: constructionModelsRaw } = await supabase
    .from("construction_models")
    .select(
      "id, status, detected_layers, elements, error_message, review_status, ifc_storage_path, uploads:upload_id(storage_path)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  type ConstructionElements = {
    walls: { start: [number, number]; end: [number, number] }[];
    doors: { position: [number, number]; width_m: number | null }[];
    windows: { position: [number, number]; width_m: number | null }[];
    floor_bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  };

  const constructionModels = (constructionModelsRaw ?? []).map((m) => ({
    id: m.id,
    status: m.status,
    detected_layers: m.detected_layers as string[] | null,
    elements: m.elements as ConstructionElements | null,
    error_message: m.error_message,
    review_status: m.review_status,
    ifc_storage_path: m.ifc_storage_path,
    upload_storage_path: (m.uploads as unknown as { storage_path: string } | null)?.storage_path ?? "",
  }));

  const unitSystem = (project.unit_system as UnitSystem) || "metric";
  const region = (project as any).region || "india";

  return (
    <VoiceProvider>
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
              ← Projects
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                {region === "india" ? "🇮🇳 India (NBC)" : "🇺🇸 US (IBC)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/${project.id}/presentation`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
            >
              <span>🖥️</span>
              <span>Presentation</span>
            </Link>

            <AgentTeamModal
              projectName={project.name}
              region={region}
            />
          </div>
        </div>

        {/* Interactive 2D Floor Plan Studio */}
        <div className="space-y-2">
          <EditorTab projectId={project.id} unitSystem={unitSystem} />
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-xs font-semibold text-muted uppercase tracking-wider">Upload Floor Plan / CAD Drawing</h2>
          <UploadForm projectId={project.id} />
        </div>

        <ShareLink projectId={project.id} initialShareToken={project.share_token} />

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted">Floorplans</h2>
          {uploads?.length ? (
            <ul className="space-y-1.5">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="space-y-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
                >
                  <span>{upload.storage_path.split("/").pop()}</span>
                  <ScaleCalibration
                    uploadId={upload.id}
                    projectId={project.id}
                    storagePath={upload.storage_path}
                    unitSystem={unitSystem}
                    hasExistingCalibration={upload.scale_pixels_per_meter != null}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted">
              No floorplans uploaded yet.
            </p>
          )}
        </div>

        <RealtimeStatus
          projectId={project.id}
          initialModels={models ?? []}
          initialRenders={renders ?? []}
          unitSystem={unitSystem}
        />

        <ConstructionModelsList
          projectId={project.id}
          initialModels={constructionModels}
          unitSystem={unitSystem}
        />

        {/* Building Code Compliance & Regulatory Checks */}
        <CompliancePanel
          elements={constructionModels[0]?.elements}
          region={region}
        />

        {/* Bill of Quantities & Cost Estimation */}
        <CostPanel
          elements={constructionModels[0]?.elements}
          region={region}
          projectName={project.name}
        />

        {/* Voice AI Floating Controls */}
        <VoiceButton />
        <CommandHistory />
      </div>
    </VoiceProvider>
  );
}

