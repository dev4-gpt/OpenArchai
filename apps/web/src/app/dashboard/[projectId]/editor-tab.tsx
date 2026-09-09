"use client";

import { useState } from "react";
import { FloorPlanEditor } from "@/components/floor-plan-editor/floor-plan-editor";
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">2D Floor Plan Editor</h2>
          <p className="text-xs text-muted">
            Draw walls, place doors & windows, or add standard room presets. Export to DXF or save directly to your project.
          </p>
        </div>
      </div>

      {success && <p className="rounded border border-success/30 bg-success/10 p-2 text-xs text-success">{success}</p>}
      {error && <p className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{error}</p>}

      <FloorPlanEditor
        unitSystem={unitSystem}
        onSaveToProject={handleSave}
        saving={saving}
      />
    </div>
  );
}
