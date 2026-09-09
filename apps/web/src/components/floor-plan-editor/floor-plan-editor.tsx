"use client";

import { EditorToolbar } from "./toolbar";
import { EditorCanvas } from "./editor-canvas";
import type { ConstructionElements } from "./export/to-elements";
import type { UnitSystem } from "@/lib/units";

export function FloorPlanEditor({
  unitSystem = "metric",
  onSaveToProject,
  saving = false,
}: {
  unitSystem?: UnitSystem;
  onSaveToProject?: (elements: ConstructionElements) => void;
  saving?: boolean;
}) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <EditorToolbar onSaveToProject={onSaveToProject} saving={saving} />
      <EditorCanvas unitSystem={unitSystem} />
    </div>
  );
}
