"use server";

import { createClient } from "@/lib/supabase/server";

export async function getModelSignedUrl(gltfStoragePath: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("models")
    .createSignedUrl(gltfStoragePath, 60);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not sign model URL");
  }

  return data.signedUrl;
}
