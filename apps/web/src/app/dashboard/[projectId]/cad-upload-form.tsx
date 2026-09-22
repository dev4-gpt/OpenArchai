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

      const res = await recordCadUpload(projectId, path);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg.includes("Minified React error") || msg.includes("Server Components render")) {
        setError("CAD file uploaded and queued. Please refresh to configure layer mapping.");
      } else {
        setError(msg);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleLoadSampleDxf(sampleUrl: string, sampleFilename: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(sampleUrl);
      if (!response.ok) throw new Error("Failed to load sample DXF");
      const text = await response.text();
      const file = new File([text], sampleFilename, { type: "application/dxf" });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("floorplans").upload(path, file);
      if (uploadError) throw uploadError;

      const res = await recordCadUpload(projectId, path);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample DXF");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Upload CAD file (construction-accurate)</label>
      <label
        className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {pending ? "Uploading & Extracting Layers…" : "Choose a .dxf file"}
        <input type="file" accept=".dxf" disabled={pending} onChange={handleChange} className="hidden" />
      </label>

      {/* Sample CAD Quick Selector */}
      <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-foreground">⚡ Or test with pre-built AutoCAD DXF:</p>
          <span className="text-[11px] text-muted">1-Click Layer Extraction</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSampleDxf("/samples/architectural-floorplan.dxf", "architectural-floorplan.dxf")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            📐 Standard Architectural DXF (12m x 9m)
          </button>
          <a
            href="/samples/architectural-floorplan.dxf"
            download="architectural-floorplan.dxf"
            className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            ⬇️ Download DXF
          </a>
        </div>
      </div>

      <p className="text-xs text-muted">
        Exact-scale wall/door/window extraction from real CAD geometry, with a review step before
        anything is treated as construction-accurate. If you only have a .dwg, save it as .dxf first.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
