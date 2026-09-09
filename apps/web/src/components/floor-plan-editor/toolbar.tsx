"use client";

import { useState } from "react";
import { floorPlanStore, useFloorPlanStore } from "./state/floor-plan-store";
import { ROOM_PRESETS, DOOR_WIDTHS, WINDOW_WIDTHS, type EditorTool } from "./types";
import { floorPlanToDxf } from "./export/to-dxf";
import { floorPlanToElements } from "./export/to-elements";
import { Button } from "@/components/ui/button";

export function EditorToolbar({
  onSaveToProject,
  saving = false,
}: {
  onSaveToProject?: (elements: ReturnType<typeof floorPlanToElements>) => void;
  saving?: boolean;
}) {
  const state = useFloorPlanStore();
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [presetRegion, setPresetRegion] = useState<"india" | "us">("india");

  const tools: { id: EditorTool; label: string; icon: string }[] = [
    { id: "select", label: "Select", icon: "↖" },
    { id: "wall", label: "Wall", icon: "🧱" },
    { id: "door", label: "Door", icon: "🚪" },
    { id: "window", label: "Window", icon: "🪟" },
    { id: "eraser", label: "Delete", icon: "✕" },
  ];

  function handleAddPreset(name: string) {
    const presets = ROOM_PRESETS[presetRegion];
    const room = presets[name as keyof typeof presets];
    if (!room) return;

    floorPlanStore.addPresetRoom(name, room.width, room.height, {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
    });
    setSelectedPreset("");
  }

  function handleExportDxf() {
    const dxf = floorPlanToDxf(state.floorPlan);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `floorplan-${Date.now()}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface p-2 text-xs">
      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === "eraser") {
                floorPlanStore.deleteSelected();
              } else {
                floorPlanStore.setTool(t.id);
              }
            }}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              state.tool === t.id
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground hover:border-accent/40"
            }`}
            title={t.label}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => floorPlanStore.undo()}
          disabled={state.undoStack.length === 0}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40 disabled:opacity-40"
          title="Undo"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          onClick={() => floorPlanStore.redo()}
          disabled={state.redoStack.length === 0}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40 disabled:opacity-40"
          title="Redo"
        >
          ↷ Redo
        </button>
      </div>

      {/* Middle: Room Presets */}
      <div className="flex items-center gap-1.5">
        <select
          value={presetRegion}
          onChange={(e) => setPresetRegion(e.target.value as "india" | "us")}
          className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-foreground"
        >
          <option value="india">🇮🇳 Indian Presets</option>
          <option value="us">🇺🇸 US Presets</option>
        </select>

        <select
          value={selectedPreset}
          onChange={(e) => {
            if (e.target.value) handleAddPreset(e.target.value);
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
        >
          <option value="">+ Add Room Preset</option>
          {Object.entries(ROOM_PRESETS[presetRegion]).map(([name, dim]) => (
            <option key={name} value={name}>
              {name} ({dim.width}m × {dim.height}m)
            </option>
          ))}
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => floorPlanStore.setZoom(state.floorPlan.zoom * 1.2)}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => floorPlanStore.setZoom(state.floorPlan.zoom / 1.2)}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => {
            floorPlanStore.setZoom(35);
            floorPlanStore.setPanOffset({ x: 300, y: 250 });
          }}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40"
          title="Reset View"
        >
          Reset
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={handleExportDxf}
          disabled={state.floorPlan.walls.length === 0}
          className="rounded border border-border px-2.5 py-1 text-xs text-foreground hover:border-accent/40 disabled:opacity-40"
          title="Download AutoCAD DXF file"
        >
          Export DXF
        </button>

        {onSaveToProject && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || state.floorPlan.walls.length === 0}
            onClick={() => onSaveToProject(floorPlanToElements(state.floorPlan))}
          >
            {saving ? "Saving…" : "Save to Project"}
          </Button>
        )}
      </div>
    </div>
  );
}
