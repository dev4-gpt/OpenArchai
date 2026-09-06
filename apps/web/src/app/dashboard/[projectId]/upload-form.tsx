"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordUpload } from "./actions";
import { validateImageBytes } from "@/lib/image-validation";

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
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validation = validateImageBytes(bytes);
      if (!validation.ok) {
        setError(validation.reason);
        return;
      }

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
      <label
        className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {pending ? "Uploading…" : "Choose a JPEG, PNG, or WebP floorplan"}
        <input
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={handleChange}
          className="hidden"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
