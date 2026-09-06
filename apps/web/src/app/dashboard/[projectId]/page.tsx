import { notFound } from "next/navigation";
import Link from "next/link";
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
      <div className="space-y-1">
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          ← Projects
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <UploadForm projectId={project.id} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Floorplans</h2>
        {uploads?.length ? (
          <ul className="space-y-1.5">
            {uploads.map((upload) => (
              <li
                key={upload.id}
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
              >
                {upload.storage_path.split("/").pop()}
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
      />
    </div>
  );
}
