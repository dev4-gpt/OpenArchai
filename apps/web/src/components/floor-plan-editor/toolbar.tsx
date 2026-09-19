"use client";

import { useState, useRef } from "react";
import { floorPlanStore, useFloorPlanStore } from "./state/floor-plan-store";
import { ROOM_PRESETS, DOOR_WIDTHS, WINDOW_WIDTHS, type EditorTool } from "./types";
import { floorPlanToDxf } from "./export/to-dxf";
import { floorPlanToElements } from "./export/to-elements";
import { exportFloorPlanToIfc } from "@/lib/ifc-export";
import { parseDxfContent } from "@/lib/dxf-import";
import { FFE_CATALOG } from "@/lib/ffe-catalog";
import { Button } from "@/components/ui/button";

export function EditorToolbar({
  onSaveToProject,
  saving = false,
}: {
  onSaveToProject?: (elements: ReturnType<typeof floorPlanToElements>) => void;
  saving?: boolean;
}) {
  const state = useFloorPlanStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [presetRegion, setPresetRegion] = useState<"india" | "us">("india");
  const [selectedFurniture, setSelectedFurniture] = useState<string>("");

  const hasSelected = state.selectedIds.length > 0;
  const selectedFurnitureItem = (state.floorPlan.furniture || []).find(
    (f) => state.selectedIds.includes(f.id),
  );

  const tools: { id: EditorTool; label: string; icon: string }[] = [
    { id: "select", label: "Select", icon: "↖" },
    { id: "wall", label: "Wall", icon: "🧱" },
    { id: "door", label: "Door", icon: "🚪" },
    { id: "window", label: "Window", icon: "🪟" },
    { id: "eraser", label: hasSelected ? `Delete (${state.selectedIds.length})` : "Delete", icon: "✕" },
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

  function handleAddFurniture(ffeId: string) {
    const item = FFE_CATALOG.find((x) => x.id === ffeId);
    if (!item) return;

    floorPlanStore.addFurniture({
      ffeId: item.id,
      name: item.name,
      type: item.category === "beds" ? "bed" : item.category === "seating" ? "sofa" : item.category === "tables" ? "table" : item.category === "storage" ? "credenza" : item.category === "lighting" ? "lamp" : item.category === "sanitaryware" ? "sanitaryware" : "custom",
      position: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      },
      width: item.dimensions.lengthMm / 1000,
      depth: item.dimensions.depthMm / 1000,
      rotation: 0,
      tag: item.tag,
    });
    setSelectedFurniture("");
  }

  function handleImportDxf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parsed = parseDxfContent(text);
        if (parsed.walls.length === 0) {
          alert("No line geometry found in this DXF file.");
          return;
        }
        floorPlanStore.loadPlan({
          walls: parsed.walls,
          doors: [],
          windows: [],
          rooms: [],
          furniture: [],
          gridSize: 0.5,
          panOffset: { x: 300, y: 250 },
          zoom: 35,
        });
      } catch (err) {
        alert("Failed to parse DXF file: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

  function handleExportIfc() {
    const ifc = exportFloorPlanToIfc(state.floorPlan);
    const blob = new Blob([ifc], { type: "application/x-step" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bim-model-${Date.now()}.ifc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface p-2 text-xs">
      {/* Hidden file input for DXF import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportDxf}
        accept=".dxf"
        className="hidden"
      />

      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === "eraser") {
                if (state.selectedIds.length > 0) {
                  floorPlanStore.deleteSelected();
                }
                floorPlanStore.setTool("eraser");
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

        {selectedFurnitureItem && (
          <button
            type="button"
            onClick={() => floorPlanStore.rotateFurniture(selectedFurnitureItem.id)}
            className="rounded border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
            title="Rotate furniture 90 degrees"
          >
            🔄 Rotate 90°
          </button>
        )}
      </div>

      {/* Middle: Presets & Furniture */}
      <div className="flex flex-wrap items-center gap-1.5">
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

        {/* FF&E Furniture Placement */}
        <select
          value={selectedFurniture}
          onChange={(e) => {
            if (e.target.value) handleAddFurniture(e.target.value);
          }}
          className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
        >
          <option value="">🛋️ + Place FF&E Item</option>
          {FFE_CATALOG.map((f) => (
            <option key={f.id} value={f.id}>
              {f.tag}: {f.name} ({f.dimensions.lengthIn}&quot;x{f.dimensions.depthIn}&quot;)
            </option>
          ))}
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-wrap items-center gap-1.5">
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
          onClick={() => floorPlanStore.resetView()}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-accent/40"
          title="Reset zoom and center view"
        >
          Reset View
        </button>
        <button
          type="button"
          onClick={() => {
            const hasElements =
              state.floorPlan.walls.length > 0 ||
              state.floorPlan.doors.length > 0 ||
              state.floorPlan.windows.length > 0 ||
              state.floorPlan.rooms.length > 0 ||
              (state.floorPlan.furniture || []).length > 0;
            if (!hasElements) return;
            if (window.confirm("Clear all elements from the floor plan? You can undo this action with Undo.")) {
              floorPlanStore.clearPlan();
            }
          }}
          disabled={
            state.floorPlan.walls.length === 0 &&
            state.floorPlan.doors.length === 0 &&
            state.floorPlan.windows.length === 0 &&
            state.floorPlan.rooms.length === 0 &&
            (state.floorPlan.furniture || []).length === 0
          }
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:border-danger/50 hover:text-danger disabled:opacity-40 transition-colors"
          title="Clear all drawn walls, doors, windows, and rooms"
        >
          Clear Canvas
        </button>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* CAD/BIM Sync Actions */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-accent/40 transition-colors"
          title="Import AutoCAD DXF drawing file"
        >
          📥 Import DXF
        </button>

        <button
          type="button"
          onClick={handleExportDxf}
          disabled={state.floorPlan.walls.length === 0}
          className="rounded border border-border px-2.5 py-1 text-xs text-foreground hover:border-accent/40 disabled:opacity-40"
          title="Download AutoCAD DXF file"
        >
          Export DXF
        </button>

        <button
          type="button"
          onClick={handleExportIfc}
          disabled={state.floorPlan.walls.length === 0}
          className="rounded border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40 transition-colors"
          title="Export Industry Foundation Classes (IFC4) BIM model for Revit/ArchiCAD"
        >
          🏗️ Export IFC
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
