"use client";

import { useState } from "react";
import { submitLayerMapping } from "./cad-actions";
import { Button } from "@/components/ui/button";

type ElementType = "wall" | "door" | "window" | "ignore";

const OPTIONS: { value: ElementType; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  { value: "wall", label: "Wall" },
  { value: "door", label: "Door" },
  { value: "window", label: "Window" },
];

type Elements = { walls: unknown[]; doors: unknown[]; windows: unknown[] };

export function ConstructionModelStatus({
  constructionModelId,
  projectId,
  uploadStoragePath,
  status,
  detectedLayers,
  elements,
  errorMessage,
}: {
  constructionModelId: string;
  projectId: string;
  uploadStoragePath: string;
  status: string;
  detectedLayers: string[] | null;
  elements: Elements | null;
  errorMessage: string | null;
}) {
  const [mapping, setMapping] = useState<Record<string, ElementType>>(() =>
    Object.fromEntries((detectedLayers ?? []).map((l) => [l, "ignore" as ElementType])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      await submitLayerMapping(constructionModelId, projectId, uploadStoragePath, mapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit layer mapping");
    } finally {
      setPending(false);
    }
  }

  if (status === "pending" || status === "processing") {
    return <p className="text-xs text-muted">Reading CAD file…</p>;
  }

  if (status === "error") {
    return <p className="text-xs text-danger">{errorMessage}</p>;
  }

  if (status === "awaiting_layer_mapping") {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <p className="text-xs font-medium">Map each layer to what it represents</p>
        <div className="space-y-1.5">
          {(detectedLayers ?? []).map((layer) => (
            <div key={layer} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{layer}</span>
              <select
                value={mapping[layer] ?? "ignore"}
                onChange={(e) => setMapping((m) => ({ ...m, [layer]: e.target.value as ElementType }))}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
              >
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <Button type="button" variant="primary" size="sm" onClick={handleSubmit} disabled={pending}>
          {pending ? "Extracting…" : "Extract with this mapping"}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  if (status === "extracted" || status === "done") {
    return (
      <p className="text-xs text-muted">
        Extracted {elements?.walls.length ?? 0} wall segments, {elements?.doors.length ?? 0} door
        {elements?.doors.length === 1 ? "" : "s"}, {elements?.windows.length ?? 0} window
        {elements?.windows.length === 1 ? "" : "s"}. Review/approval step is the next piece to build.
      </p>
    );
  }

  return null;
}
