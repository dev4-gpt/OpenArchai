"use client";

import { useState } from "react";
import { FloorPlanEditor } from "@/components/floor-plan-editor/floor-plan-editor";
import { ModelViewer } from "@/components/model-viewer";
import { saveEditorFloorPlan } from "./cad-actions";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { UnitSystem } from "@/lib/units";

export function EditorTab({
  projectId,
  unitSystem,
}: {
  projectId: string;
  unitSystem: UnitSystem;
}) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "split" | "3d">("split");

  async function handleSave(elements: ConstructionElements) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const id = await saveEditorFloorPlan(projectId, elements);
      setSuccess(`Floor plan saved as Construction Model #${id.slice(0, 8)}. Ready for review below.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save floor plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Interactive Architectural Studio</h2>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              60fps Live Sync
            </span>
          </div>
          <p className="text-xs text-muted">
            Design in 2D with instant procedural 3D spatial alignment, daylighting studies, and PBR flooring swapper.
          </p>
        </div>

        {/* View Mode Toggle: 2D | Split | 3D */}
        <div className="flex items-center rounded-lg border border-border bg-surface p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "2d"
                ? "bg-accent text-accent-foreground font-bold shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span>📐</span>
            <span>2D Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "split"
                ? "bg-accent text-accent-foreground font-bold shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span>🌓</span>
            <span>Split 2D + 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "3d"
                ? "bg-accent text-accent-foreground font-bold shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span>🏢</span>
            <span>3D Model</span>
          </button>
        </div>
      </div>

      {success && <p className="rounded border border-success/30 bg-success/10 p-2.5 text-xs text-success animate-in fade-in duration-150">{success}</p>}
      {error && <p className="rounded border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger animate-in fade-in duration-150">{error}</p>}

      {viewMode === "2d" && (
        <FloorPlanEditor
          unitSystem={unitSystem}
          onSaveToProject={handleSave}
          saving={saving}
        />
      )}

      {viewMode === "split" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div className="w-full">
            <FloorPlanEditor
              unitSystem={unitSystem}
              onSaveToProject={handleSave}
              saving={saving}
            />
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span>🏢</span> Live Synchronized 3D Spatial Model
              </span>
              <span className="text-[10px] text-muted">Updates as you edit 2D walls & furniture</span>
            </div>
            <ModelViewer
              liveSync={true}
              unitSystem={unitSystem}
              className="h-[540px]"
            />
          </div>
        </div>
      )}

      {viewMode === "3d" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span>🏢</span> 3D Spatial Model (Synchronized with 2D Plan)
            </span>
            <span className="text-[10px] text-muted">Orbit, measure distances, swap flooring materials, and change sun angle</span>
          </div>
          <ModelViewer
            liveSync={true}
            unitSystem={unitSystem}
            className="h-[600px]"
          />
        </div>
      )}
    </div>
  );
}

