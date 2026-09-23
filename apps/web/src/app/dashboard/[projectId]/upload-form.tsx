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

      // Sanitize filename: strip special chars and cap at 80 chars to avoid storage path limits
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
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

  async function handleLoadSample(sampleUrl: string, sampleFilename: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(sampleUrl);
      if (!response.ok) throw new Error("Failed to load sample image");
      const blob = await response.blob();
      const file = new File([blob], sampleFilename, { type: blob.type || "image/jpeg" });

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
      setError(err instanceof Error ? err.message : "Failed to load sample");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Upload floorplan</label>
      <label
        className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {pending ? "Uploading & Processing…" : "Choose a JPEG, PNG, or WebP floorplan"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={handleChange}
          className="hidden"
        />
      </label>

      {/* Sample Designs Quick Selector */}
      <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-foreground">⚡ Or test with pre-built architectural designs:</p>
          <span className="text-[11px] text-muted">Instant 1-Click</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample("/samples/2bhk-luxury-apartment-plan.jpg", "2bhk-luxury-apartment-plan.jpg")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            🏢 2BHK Luxury Apartment Plan (JPG)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("/samples/cad-working-drawing-thinlines.jpg", "cad-working-drawing-thinlines.jpg")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/60 hover:text-accent transition-colors disabled:opacity-50"
          >
            📐 CAD Working Drawing (Thin-line JPG)
          </button>
          <a
            href="/samples/2bhk-luxury-apartment-plan.jpg"
            download="2bhk-luxury-apartment-plan.jpg"
            className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            ⬇️ Download 2BHK
          </a>
          <a
            href="/samples/cad-working-drawing-thinlines.jpg"
            download="cad-working-drawing-thinlines.jpg"
            className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            ⬇️ Download CAD JPG
          </a>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
