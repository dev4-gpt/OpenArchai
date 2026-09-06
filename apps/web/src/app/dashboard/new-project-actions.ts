"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("projects").insert({ name, user_id: user.id });

  revalidatePath("/dashboard");
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  // Storage objects must be read before the delete, since the DB cascade
  // (projects -> uploads/models/renders) removes the rows that hold their
  // paths. RLS already scopes every select/delete below to the caller's own
  // rows, so an unowned projectId just resolves to empty reads and a 0-row
  // delete rather than needing an explicit ownership check here.
  const [{ data: uploads }, { data: models }, { data: renders }] = await Promise.all([
    supabase.from("uploads").select("storage_path").eq("project_id", projectId),
    supabase.from("models").select("gltf_storage_path").eq("project_id", projectId),
    supabase.from("renders").select("image_storage_path").eq("project_id", projectId),
  ]);

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);

  const floorplanPaths = (uploads ?? []).map((u) => u.storage_path).filter(Boolean);
  const modelPaths = (models ?? []).map((m) => m.gltf_storage_path).filter((p): p is string => !!p);
  const renderPaths = (renders ?? []).map((r) => r.image_storage_path).filter((p): p is string => !!p);

  // Best-effort: the DB rows are already gone at this point (the source of
  // truth for what exists), so a storage removal failure here is logged,
  // not surfaced to the user or retried.
  await Promise.all([
    floorplanPaths.length ? supabase.storage.from("floorplans").remove(floorplanPaths) : null,
    modelPaths.length ? supabase.storage.from("models").remove(modelPaths) : null,
    renderPaths.length ? supabase.storage.from("renders").remove(renderPaths) : null,
  ]).catch((err) => console.error("Storage cleanup after project delete failed:", err));

  revalidatePath("/dashboard");
}
