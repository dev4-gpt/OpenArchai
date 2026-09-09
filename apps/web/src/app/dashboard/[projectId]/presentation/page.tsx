import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PresentationClient } from "./presentation-client";
import { getModelSignedUrl, getRenderSignedUrl } from "../model-actions";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, region, unit_system")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: models } = await supabase
    .from("models")
    .select("id, status, gltf_storage_path")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  const { data: renders } = await supabase
    .from("renders")
    .select("id, status, image_storage_path, prompt_style")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  const { data: constructionModels } = await supabase
    .from("construction_models")
    .select("id, elements")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  let signedModelUrl: string | null = null;
  if (models && models.length > 0 && models[0].gltf_storage_path) {
    try {
      signedModelUrl = await getModelSignedUrl(models[0].gltf_storage_path);
    } catch (e) {
      console.error("Could not sign model URL for presentation:", e);
    }
  }

  const signedRenderUrls: { prompt: string; url: string }[] = [];
  if (renders) {
    for (const r of renders) {
      if (r.image_storage_path) {
        try {
          const url = await getRenderSignedUrl(r.image_storage_path);
          signedRenderUrls.push({ prompt: r.prompt_style || "Render", url });
        } catch {
          // ignore failed sign
        }
      }
    }
  }

  const elements = (constructionModels?.[0]?.elements as ConstructionElements) || null;

  return (
    <PresentationClient
      project={{
        id: project.id,
        name: project.name,
        region: ((project as any).region as "india" | "us") || "india",
        unit_system: project.unit_system || "metric",
      }}
      models={models ?? []}
      renders={renders ?? []}
      elements={elements}
      signedModelUrl={signedModelUrl}
      signedRenderUrls={signedRenderUrls}
    />
  );
}
