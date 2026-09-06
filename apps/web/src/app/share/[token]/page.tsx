import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModelViewer } from "@/components/model-viewer";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("share_token", token)
    .maybeSingle();

  if (!project) notFound();

  const { data: models } = await supabase
    .from("models")
    .select("id, gltf_storage_path, created_at")
    .eq("project_id", project.id)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  const { data: renders } = await supabase
    .from("renders")
    .select("id, model_id, image_storage_path, prompt_style, created_at")
    .eq("project_id", project.id)
    .eq("status", "done")
    .order("created_at", { ascending: false });

  // Signed URLs are minted here with the service-role client -- this route
  // has no user session, and storage RLS has no anon-read policy, so this
  // is the one place in the app that needs the admin client for this.
  const modelsWithUrls = await Promise.all(
    (models ?? []).map(async (model) => {
      if (!model.gltf_storage_path) return { ...model, signedUrl: null as string | null };
      const { data } = await supabase.storage.from("models").createSignedUrl(model.gltf_storage_path, 60);
      return { ...model, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const rendersWithUrls = await Promise.all(
    (renders ?? []).map(async (render) => {
      if (!render.image_storage_path) return { ...render, signedUrl: null as string | null };
      const { data } = await supabase.storage.from("renders").createSignedUrl(render.image_storage_path, 60);
      return { ...render, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <span className="text-sm font-semibold tracking-tight">OpenArchai</span>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted">Shared read-only view</p>
        </div>

        {modelsWithUrls.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            Nothing to show yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {modelsWithUrls.map((model) => (
              <li key={model.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                {model.signedUrl && <ModelViewer url={model.signedUrl} />}

                {rendersWithUrls
                  .filter((render) => render.model_id === model.id)
                  .map((render) => (
                    <div key={render.id} className="mt-3 space-y-1">
                      <p className="text-xs text-foreground">{render.prompt_style ?? "render"}</p>
                      {render.signedUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- signed URL expires in 60s
                        <img
                          src={render.signedUrl}
                          alt="Styled render"
                          className="max-h-64 rounded-md border border-border"
                        />
                      )}
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
