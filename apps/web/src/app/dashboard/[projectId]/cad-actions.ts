"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postToModal } from "@/lib/modal";

const MAX_DXF_BYTES = 25 * 1024 * 1024;

export async function recordCadUpload(projectId: string, storagePath: string) {
  const supabase = await createClient();

  // Unlike images, there's no cheap client-side structural check for DXF --
  // ezdxf's recovery-mode reader (services/ml/reconstruct_cad.py) IS the
  // real validation, and it's fast (no GPU job to protect against a bad
  // file the way image uploads protect an expensive reconstruction), so a
  // size/extension check here is enough defense before that runs.
  if (!storagePath.toLowerCase().endsWith(".dxf")) {
    await supabase.storage.from("floorplans").remove([storagePath]);
    throw new Error("Only .dxf files are supported for construction-accurate upload");
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("floorplans")
    .download(storagePath);
  if (downloadError || !fileBlob) {
    throw new Error(downloadError?.message ?? "Could not read uploaded file");
  }
  if (fileBlob.size === 0 || fileBlob.size > MAX_DXF_BYTES) {
    await supabase.storage.from("floorplans").remove([storagePath]);
    throw new Error(`File must be non-empty and under ${MAX_DXF_BYTES / (1024 * 1024)}MB`);
  }

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({ project_id: projectId, storage_path: storagePath, kind: "cad_dxf" })
    .select("id")
    .single();
  if (uploadError) throw new Error(uploadError.message);

  const { data: constructionModel, error: cmError } = await supabase
    .from("construction_models")
    .insert({ project_id: projectId, upload_id: upload.id, status: "pending" })
    .select("id")
    .single();
  if (cmError) throw new Error(cmError.message);

  await postToModal(process.env.MODAL_DETECT_LAYERS_ENDPOINT_URL!, {
    construction_model_id: constructionModel.id,
    upload_storage_path: storagePath,
  });

  revalidatePath(`/dashboard/${projectId}`);
}

export async function submitLayerMapping(
  constructionModelId: string,
  projectId: string,
  uploadStoragePath: string,
  layerMapping: Record<string, "wall" | "door" | "window" | "ignore">,
) {
  await postToModal(process.env.MODAL_EXTRACT_ELEMENTS_ENDPOINT_URL!, {
    construction_model_id: constructionModelId,
    upload_storage_path: uploadStoragePath,
    layer_mapping: layerMapping,
  });

  revalidatePath(`/dashboard/${projectId}`);
}

export async function updateConstructionElements(
  constructionModelId: string,
  projectId: string,
  elements: unknown,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("construction_models")
    .update({ elements, review_status: "needs_correction" })
    .eq("id", constructionModelId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Could not save corrections — not found or not owned by you");
  }

  revalidatePath(`/dashboard/${projectId}`);
}

export async function approveConstructionModel(constructionModelId: string, projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("construction_models")
    .update({ review_status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", constructionModelId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Could not approve — not found or not owned by you");
  }

  revalidatePath(`/dashboard/${projectId}`);

  // Approval is the trigger for IFC export -- only an approved model is
  // ever exported, matching the plan's human-review gate.
  await postToModal(process.env.MODAL_BUILD_IFC_ENDPOINT_URL!, {
    construction_model_id: constructionModelId,
    project_id: projectId,
    user_id: user.id,
  });
}

// Mirrors retryReconstruction/retryRender in actions.ts, adapted for the CAD
// pipeline's extra pre-review steps. Layer mappings the user chose are never
// persisted (only held in the mapping form's local state), so a job that
// failed during extraction can't be silently re-run with the same mapping —
// instead this resets the row back to "awaiting_layer_mapping" so the user
// redoes the mapping form, which itself re-fires the extraction call.
export async function retryConstructionJob(constructionModelId: string, projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: row, error: rowError } = await supabase
    .from("construction_models")
    .select("id, project_id, status, review_status, detected_layers, uploads:upload_id(storage_path)")
    .eq("id", constructionModelId)
    .single();
  if (rowError || !row) throw new Error(rowError?.message ?? "Construction model not found");
  if (row.status !== "error") throw new Error("Only a failed job can be retried");

  const uploadStoragePath = (row.uploads as unknown as { storage_path: string } | null)?.storage_path;

  if (row.review_status === "approved") {
    // Failed during IFC export -- re-fire build_ifc with the same inputs.
    const { error: updateError } = await supabase
      .from("construction_models")
      .update({ status: "processing", error_message: null })
      .eq("id", constructionModelId);
    if (updateError) throw new Error(updateError.message);

    await postToModal(process.env.MODAL_BUILD_IFC_ENDPOINT_URL!, {
      construction_model_id: constructionModelId,
      project_id: projectId,
      user_id: user.id,
    });
  } else if (row.detected_layers) {
    // Failed during extraction, after a layer mapping was already submitted --
    // send the user back to the mapping form rather than guessing the mapping.
    const { error: updateError } = await supabase
      .from("construction_models")
      .update({ status: "awaiting_layer_mapping", error_message: null })
      .eq("id", constructionModelId);
    if (updateError) throw new Error(updateError.message);
  } else {
    // Failed during initial layer detection -- re-fire it from scratch.
    if (!uploadStoragePath) throw new Error("Original upload is missing — re-upload the DXF");

    const { error: updateError } = await supabase
      .from("construction_models")
      .update({ status: "pending", error_message: null })
      .eq("id", constructionModelId);
    if (updateError) throw new Error(updateError.message);

    await postToModal(process.env.MODAL_DETECT_LAYERS_ENDPOINT_URL!, {
      construction_model_id: constructionModelId,
      upload_storage_path: uploadStoragePath,
    });
  }

  revalidatePath(`/dashboard/${projectId}`);
}

export async function saveEditorFloorPlan(projectId: string, elements: unknown) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: constructionModel, error: cmError } = await supabase
    .from("construction_models")
    .insert({
      project_id: projectId,
      status: "extracted",
      review_status: "unreviewed",
      elements,
    })
    .select("id")
    .single();

  if (cmError) throw new Error(cmError.message);

  revalidatePath(`/dashboard/${projectId}`);
  return constructionModel.id;
}

