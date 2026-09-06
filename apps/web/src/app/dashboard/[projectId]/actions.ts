"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postToModal } from "@/lib/modal";
import { validateImageBytes } from "@/lib/image-validation";

const ACTIVE_STATUSES = ["pending", "processing"];

export async function recordUpload(projectId: string, storagePath: string) {
  const supabase = await createClient();

  // The client already checked this file, but that check is only a UX
  // hint — anyone with a session can call this action directly with any
  // storage path. Re-validate the actual stored bytes before letting them
  // anywhere near an expensive reconstruction job, and remove the object
  // if it fails so it doesn't linger as unvalidated storage.
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("floorplans")
    .download(storagePath);

  if (downloadError || !fileBlob) {
    throw new Error(downloadError?.message ?? "Could not read uploaded file");
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const validation = validateImageBytes(bytes);
  if (!validation.ok) {
    await supabase.storage.from("floorplans").remove([storagePath]);
    throw new Error(validation.reason);
  }

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

  // Cheap duplicate-submission guard: don't queue a second job for an
  // upload that already has one in flight (e.g. a double-click).
  const { data: existing } = await supabase
    .from("models")
    .select("id")
    .eq("upload_id", uploadId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle();
  if (existing) return;

  // Read whatever calibration has been set on this upload so far (null on
  // first upload, before the user has had a chance to calibrate -- that's
  // fine, reconstruct.py falls back to its existing defaults).
  const { data: upload } = await supabase
    .from("uploads")
    .select("scale_pixels_per_meter, wall_height_m")
    .eq("id", uploadId)
    .maybeSingle();

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
    pixels_per_meter: upload?.scale_pixels_per_meter ?? null,
    wall_height_m: upload?.wall_height_m ?? null,
  });

  revalidatePath(`/dashboard/${projectId}`);
}

export async function retryReconstruction(modelId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: model, error: modelError } = await supabase
    .from("models")
    .select("id, project_id, status, uploads:upload_id(storage_path, scale_pixels_per_meter, wall_height_m)")
    .eq("id", modelId)
    .single();
  if (modelError || !model) throw new Error(modelError?.message ?? "Model not found");
  if (model.status !== "error") throw new Error("Only a failed reconstruction can be retried");

  const uploadRow = model.uploads as unknown as {
    storage_path: string;
    scale_pixels_per_meter: number | null;
    wall_height_m: number | null;
  } | null;
  const uploadStoragePath = uploadRow?.storage_path;
  if (!uploadStoragePath) throw new Error("Original upload is missing — re-upload the floorplan");

  const { error: updateError } = await supabase
    .from("models")
    .update({ status: "pending", error_message: null })
    .eq("id", modelId);
  if (updateError) throw new Error(updateError.message);

  await postToModal(process.env.MODAL_RECONSTRUCT_ENDPOINT_URL!, {
    model_id: modelId,
    project_id: model.project_id,
    user_id: user.id,
    upload_storage_path: uploadStoragePath,
    pixels_per_meter: uploadRow?.scale_pixels_per_meter ?? null,
    wall_height_m: uploadRow?.wall_height_m ?? null,
  });

  revalidatePath(`/dashboard/${model.project_id}`);
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

  const { data: existing } = await supabase
    .from("renders")
    .select("id")
    .eq("model_id", modelId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle();
  if (existing) return;

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

export async function retryRender(renderId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: render, error: renderError } = await supabase
    .from("renders")
    .select("id, project_id, model_id, status, prompt_style, models:model_id(gltf_storage_path)")
    .eq("id", renderId)
    .single();
  if (renderError || !render) throw new Error(renderError?.message ?? "Render not found");
  if (render.status !== "error") throw new Error("Only a failed render can be retried");

  const gltfStoragePath = (render.models as unknown as { gltf_storage_path: string } | null)?.gltf_storage_path;
  if (!gltfStoragePath) throw new Error("Source model is missing its glTF");

  const { error: updateError } = await supabase
    .from("renders")
    .update({ status: "pending", error_message: null })
    .eq("id", renderId);
  if (updateError) throw new Error(updateError.message);

  await postToModal(process.env.MODAL_RENDER_ENDPOINT_URL!, {
    render_id: renderId,
    project_id: render.project_id,
    model_id: render.model_id,
    user_id: user.id,
    gltf_storage_path: gltfStoragePath,
    prompt_style: render.prompt_style,
  });

  revalidatePath(`/dashboard/${render.project_id}`);
}

export async function generateShareLink(projectId: string): Promise<string> {
  const supabase = await createClient();
  const token = crypto.randomUUID();

  // RLS's existing projects_update_own policy already restricts this to
  // rows the caller owns -- no extra ownership check needed here.
  const { error } = await supabase.from("projects").update({ share_token: token }).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${projectId}`);
  return token;
}

export async function revokeShareLink(projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").update({ share_token: null }).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${projectId}`);
}

export async function setUploadScale(
  uploadId: string,
  projectId: string,
  pixelsPerMeter: number,
  wallHeightM: number,
) {
  const supabase = await createClient();

  // .select() forces the update to return the affected row so a
  // silently-zero-row RLS mismatch (no matching policy, wrong id) surfaces
  // as a real error instead of a false "success" -- this exact class of bug
  // just happened once already (uploads had no UPDATE policy at all).
  const { data, error } = await supabase
    .from("uploads")
    .update({ scale_pixels_per_meter: pixelsPerMeter, wall_height_m: wallHeightM })
    .eq("id", uploadId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Calibration was not saved — upload not found or not owned by you");

  revalidatePath(`/dashboard/${projectId}`);
}

export async function setProjectUnitSystem(projectId: string, unitSystem: "metric" | "imperial") {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").update({ unit_system: unitSystem }).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${projectId}`);
}
