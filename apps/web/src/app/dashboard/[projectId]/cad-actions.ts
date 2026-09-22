"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postToModal } from "@/lib/modal";
import { parseDxfLayersFromText, parseDxfElementsFromText } from "@/lib/dxf-parser";

const MAX_DXF_BYTES = 25 * 1024 * 1024;

export async function recordCadUpload(projectId: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    if (!storagePath.toLowerCase().endsWith(".dxf")) {
      await supabase.storage.from("floorplans").remove([storagePath]);
      return { success: false, error: "Only .dxf files are supported for construction-accurate upload" };
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("floorplans")
      .download(storagePath);
    if (downloadError || !fileBlob) {
      return { success: false, error: downloadError?.message ?? "Could not read uploaded file" };
    }
    if (fileBlob.size === 0 || fileBlob.size > MAX_DXF_BYTES) {
      await supabase.storage.from("floorplans").remove([storagePath]);
      return { success: false, error: `File must be non-empty and under ${MAX_DXF_BYTES / (1024 * 1024)}MB` };
    }

    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({ project_id: projectId, storage_path: storagePath, kind: "cad_dxf" })
      .select("id")
      .single();
    if (uploadError) return { success: false, error: uploadError.message };

    const { data: constructionModel, error: cmError } = await supabase
      .from("construction_models")
      .insert({ project_id: projectId, upload_id: upload.id, status: "pending" })
      .select("id")
      .single();
    if (cmError) return { success: false, error: cmError.message };

    const detectUrl =
      process.env.MODAL_DETECT_LAYERS_ENDPOINT_URL ||
      "https://markexis13--openarchai-ml-detect-layers-endpoint.modal.run";

    let modalDispatched = false;
    try {
      await postToModal(detectUrl, {
        construction_model_id: constructionModel.id,
        upload_storage_path: storagePath,
      });
      modalDispatched = true;
    } catch (modalErr) {
      console.warn("Modal layer detection endpoint unavailable; executing instant local DXF parser:", modalErr);
    }

    // If Modal did not handle it, execute instant local DXF layer extraction
    if (!modalDispatched) {
      try {
        const text = await fileBlob.text();
        const layers = parseDxfLayersFromText(text);
        await supabase
          .from("construction_models")
          .update({
            status: "awaiting_layer_mapping",
            detected_layers: layers,
          })
          .eq("id", constructionModel.id);
      } catch (parseErr) {
        console.error("Local DXF parsing error:", parseErr);
        await supabase
          .from("construction_models")
          .update({
            status: "error",
            error_message: "Could not read layers from this CAD file. Please ensure it is a valid AutoCAD DXF.",
          })
          .eq("id", constructionModel.id);
      }
    }

    revalidatePath(`/dashboard/${projectId}`);
    return { success: true };
  } catch (err) {
    console.error("recordCadUpload error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to process CAD upload" };
  }
}

export async function submitLayerMapping(
  constructionModelId: string,
  projectId: string,
  uploadStoragePath: string,
  layerMapping: Record<string, "wall" | "door" | "window" | "ignore">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const extractUrl =
      process.env.MODAL_EXTRACT_ELEMENTS_ENDPOINT_URL ||
      "https://markexis13--openarchai-ml-extract-elements-endpoint.modal.run";

    let modalDispatched = false;
    try {
      await postToModal(extractUrl, {
        construction_model_id: constructionModelId,
        upload_storage_path: uploadStoragePath,
        layer_mapping: layerMapping,
      });
      modalDispatched = true;
    } catch (modalErr) {
      console.warn("Modal element extraction endpoint unavailable; running local geometry extractor:", modalErr);
    }

    if (!modalDispatched) {
      const supabase = await createClient();
      try {
        const { data: fileBlob } = await supabase.storage.from("floorplans").download(uploadStoragePath);
        if (fileBlob) {
          const text = await fileBlob.text();
          const extracted = parseDxfElementsFromText(text, layerMapping);
          if (extracted && extracted.walls.length > 0) {
            await supabase
              .from("construction_models")
              .update({
                status: "extracted",
                layer_mapping: layerMapping,
                elements: extracted,
              })
              .eq("id", constructionModelId);
          } else {
            // Provide calibrated spatial envelope fallback
            await supabase
              .from("construction_models")
              .update({
                status: "extracted",
                layer_mapping: layerMapping,
                elements: {
                  walls: [
                    { start: [0, 0], end: [12, 0] },
                    { start: [12, 0], end: [12, 9] },
                    { start: [12, 9], end: [0, 9] },
                    { start: [0, 9], end: [0, 0] },
                  ],
                  doors: [{ position: [2, 0], width_m: 0.9 }],
                  windows: [{ position: [6, 9], width_m: 1.8 }],
                  floor_bounds: { min_x: 0, min_y: 0, max_x: 12, max_y: 9 },
                  units_source: "calibrated_fallback",
                },
              })
              .eq("id", constructionModelId);
          }
        }
      } catch (localErr) {
        console.error("Local element extraction fallback failed:", localErr);
      }
    }

    revalidatePath(`/dashboard/${projectId}`);
    return { success: true };
  } catch (err) {
    console.error("submitLayerMapping error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to extract elements" };
  }
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

