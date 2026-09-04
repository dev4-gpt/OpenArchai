import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";
import { RealtimeStatus } from "./realtime-status";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, storage_path, created_at")
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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-lg font-semibold">{project.name}</h1>

      <UploadForm projectId={project.id} />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Floorplans</h2>
        <ul className="divide-y rounded border">
          {uploads?.length ? (
            uploads.map((upload) => (
              <li key={upload.id} className="px-4 py-3 text-sm">
                {upload.storage_path.split("/").pop()}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-gray-500">
              No floorplans uploaded yet.
            </li>
          )}
        </ul>
      </div>

      <RealtimeStatus
        projectId={project.id}
        initialModels={models ?? []}
        initialRenders={renders ?? []}
      />
    </div>
  );
}
