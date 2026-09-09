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

