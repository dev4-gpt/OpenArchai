"use client";

import { useState } from "react";
import { submitLayerMapping, retryConstructionJob } from "./cad-actions";
import { Button } from "@/components/ui/button";
import { RetryButton } from "@/components/ui/retry-button";
import { ConstructionReview } from "./construction-review";
import type { UnitSystem } from "@/lib/units";

type ElementType = "wall" | "door" | "window" | "ignore";

const OPTIONS: { value: ElementType; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  { value: "wall", label: "Wall" },
  { value: "door", label: "Door" },
  { value: "window", label: "Window" },
];

type Point = [number, number];
type Elements = {
  walls: { start: Point; end: Point }[];
  doors: { position: Point; width_m: number | null }[];
  windows: { position: Point; width_m: number | null }[];
  floor_bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
};

export function ConstructionModelStatus({
  constructionModelId,
  projectId,
  uploadStoragePath,
  status,
  detectedLayers,
  elements,
  errorMessage,
  unitSystem,
  reviewStatus,
  ifcStoragePath,
}: {
  constructionModelId: string;
  projectId: string;
  uploadStoragePath: string;
  status: string;
  detectedLayers: string[] | null;
  elements: Elements | null;
  errorMessage: string | null;
  unitSystem: UnitSystem;
  reviewStatus: string;
  ifcStoragePath: string | null;
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

  // Once approved, "processing"/"error" mean the IFC export step, not the
  // original DXF-read step -- same status values, different phase of the
  // pipeline, so message them distinctly rather than reusing "Reading CAD
  // file…" for a job that's actually building an IFC file.
  if (reviewStatus === "approved" && status === "processing") {
    return <p className="text-xs text-muted">Building IFC export…</p>;
  }
  if (reviewStatus === "approved" && status === "error") {
    return (
      <div className="space-y-1">
        <p className="text-xs text-danger">{errorMessage}</p>
        <RetryButton onRetry={() => retryConstructionJob(constructionModelId, projectId)} />
      </div>
    );
  }

  if (status === "pending" || status === "processing") {
    return <p className="text-xs text-muted">Reading CAD file…</p>;
  }

  if (status === "error") {
    return (
      <div className="space-y-1">
        <p className="text-xs text-danger">{errorMessage}</p>
        <RetryButton onRetry={() => retryConstructionJob(constructionModelId, projectId)} />
      </div>
    );
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

  if ((status === "extracted" || status === "done") && elements) {
    return (
      <ConstructionReview
        constructionModelId={constructionModelId}
        projectId={projectId}
        unitSystem={unitSystem}
        initialElements={elements}
        reviewStatus={reviewStatus}
        ifcStoragePath={ifcStoragePath}
      />
    );
  }

  return null;
}
