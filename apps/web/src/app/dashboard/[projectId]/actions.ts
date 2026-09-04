"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postToModal } from "@/lib/modal";

export async function recordUpload(projectId: string, storagePath: string) {
  const supabase = await createClient();

  const { data: upload, error } = await supabase
    .from("uploads")
    .insert({ project_id: projectId, storage_path: storagePath, kind: "floorplan" })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/${projectId}`);
  await triggerReconstruction(upload.id, projectId, storagePath);
}

export async function triggerReconstruction(
  uploadId: string,
  projectId: string,
  uploadStoragePath: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: model, error } = await supabase
    .from("models")
    .insert({ project_id: projectId, upload_id: uploadId, status: "pending" })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await postToModal(process.env.MODAL_RECONSTRUCT_ENDPOINT_URL!, {
    model_id: model.id,
    project_id: projectId,
    user_id: user.id,
    upload_storage_path: uploadStoragePath,
  });

  revalidatePath(`/dashboard/${projectId}`);
}

export async function triggerRender(modelId: string, projectId: string, promptStyle: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: model, error: modelError } = await supabase
    .from("models")
    .select("gltf_storage_path")
    .eq("id", modelId)
    .single();
  if (modelError || !model?.gltf_storage_path) {
    throw new Error(modelError?.message ?? "Model has no glTF yet");
  }

  const { data: render, error } = await supabase
    .from("renders")
    .insert({ project_id: projectId, model_id: modelId, prompt_style: promptStyle, status: "pending" })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await postToModal(process.env.MODAL_RENDER_ENDPOINT_URL!, {
    render_id: render.id,
    project_id: projectId,
    model_id: modelId,
    user_id: user.id,
    gltf_storage_path: model.gltf_storage_path,
    prompt_style: promptStyle,
  });

  revalidatePath(`/dashboard/${projectId}`);
}
