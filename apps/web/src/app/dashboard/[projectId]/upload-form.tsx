"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordUpload } from "./actions";

export function UploadForm({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("floorplans")
        .upload(path, file);
      if (uploadError) throw uploadError;

      await recordUpload(projectId, path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Upload floorplan</label>
      <input
        type="file"
        accept="image/*"
        disabled={pending}
        onChange={handleChange}
        className="text-sm"
      />
      {pending && <p className="text-sm text-gray-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
