"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordCadUpload } from "./cad-actions";

export function CadUploadForm({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".dxf")) {
      setError("Only .dxf files are supported");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("floorplans").upload(path, file);
      if (uploadError) throw uploadError;

      await recordCadUpload(projectId, path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Upload CAD file (construction-accurate)</label>
      <label
        className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {pending ? "Uploading…" : "Choose a .dxf file"}
        <input type="file" accept=".dxf" disabled={pending} onChange={handleChange} className="hidden" />
      </label>
      <p className="text-xs text-muted">
        Exact-scale wall/door/window extraction from real CAD geometry, with a review step before
        anything is treated as construction-accurate. If you only have a .dwg, save it as .dxf first.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
