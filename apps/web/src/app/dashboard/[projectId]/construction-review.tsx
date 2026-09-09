"use client";

import { useEffect, useState } from "react";
import { updateConstructionElements, approveConstructionModel } from "./cad-actions";
import { getIfcSignedUrl } from "./model-actions";
import { Button } from "@/components/ui/button";
import { metersToUnit, unitToMeters, unitLabel, type UnitSystem } from "@/lib/units";

type Point = [number, number];
type Wall = { start: Point; end: Point };
type Opening = { position: Point; width_m: number | null };
type Elements = {
  walls: Wall[];
  doors: Opening[];
  windows: Opening[];
  floor_bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
};

const fieldClass =
  "w-16 rounded border border-border bg-surface px-1 py-0.5 text-xs disabled:opacity-50";

export function ConstructionReview({
  constructionModelId,
  projectId,
  unitSystem,
  initialElements,
  reviewStatus,
  ifcStoragePath,
}: {
  constructionModelId: string;
  projectId: string;
  unitSystem: UnitSystem;
  initialElements: Elements;
  reviewStatus: string;
  ifcStoragePath: string | null;
}) {
  const [elements, setElements] = useState<Elements>(initialElements);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ifcUrl, setIfcUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ifcStoragePath) return;
    let cancelled = false;
    getIfcSignedUrl(ifcStoragePath).then((url) => {
      if (!cancelled) setIfcUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [ifcStoragePath]);

  const unit = unitLabel(unitSystem);
  const isApproved = reviewStatus === "approved";

  function updateWallCoord(idx: number, key: "start" | "end", axis: 0 | 1, displayValue: string) {
    const meters = unitToMeters(parseFloat(displayValue) || 0, unitSystem);
    setElements((prev) => {
      const walls = prev.walls.slice();
      const point = [...walls[idx][key]] as Point;
      point[axis] = meters;
      walls[idx] = { ...walls[idx], [key]: point };
      return { ...prev, walls };
    });
    setSaved(false);
  }

  function updateOpening(kind: "doors" | "windows", idx: number, field: "x" | "y" | "width", displayValue: string) {
    const meters = unitToMeters(parseFloat(displayValue) || 0, unitSystem);
    setElements((prev) => {
      const list = prev[kind].slice();
      const item = { ...list[idx] };
      if (field === "width") {
        item.width_m = meters;
      } else {
        const pos = [...item.position] as Point;
        pos[field === "x" ? 0 : 1] = meters;
        item.position = pos;
      }
      list[idx] = item;
      return { ...prev, [kind]: list };
    });
    setSaved(false);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      await updateConstructionElements(constructionModelId, projectId, elements);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save corrections");
    } finally {
      setPending(false);
    }
  }

  async function handleApprove() {
    setPending(true);
    setError(null);
    try {
      await approveConstructionModel(constructionModelId, projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Review extracted elements</p>
        <span className={isApproved ? "text-xs text-success" : "text-xs text-muted"}>
          {isApproved ? "Approved — construction accurate" : "Unreviewed"}
        </span>
      </div>
      <p className="text-xs text-muted">
        Correct any dimensions the extraction got wrong, then approve. Nothing here is treated as
        construction-accurate until you approve it.
      </p>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">Walls (start → end, {unit})</p>
        {elements.walls.map((wall, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted">#{i + 1}</span>
            <input
              type="number"
              step="0.01"
              disabled={isApproved}
              value={metersToUnit(wall.start[0], unitSystem).toFixed(2)}
              onChange={(e) => updateWallCoord(i, "start", 0, e.target.value)}
              className={fieldClass}
            />
            <input
              type="number"
              step="0.01"
              disabled={isApproved}
              value={metersToUnit(wall.start[1], unitSystem).toFixed(2)}
              onChange={(e) => updateWallCoord(i, "start", 1, e.target.value)}
              className={fieldClass}
            />
            <span className="text-muted">→</span>
            <input
              type="number"
              step="0.01"
              disabled={isApproved}
              value={metersToUnit(wall.end[0], unitSystem).toFixed(2)}
              onChange={(e) => updateWallCoord(i, "end", 0, e.target.value)}
              className={fieldClass}
            />
            <input
              type="number"
              step="0.01"
              disabled={isApproved}
              value={metersToUnit(wall.end[1], unitSystem).toFixed(2)}
              onChange={(e) => updateWallCoord(i, "end", 1, e.target.value)}
              className={fieldClass}
            />
          </div>
        ))}
      </div>

      {(["doors", "windows"] as const).map((kind) =>
        elements[kind].length > 0 ? (
          <div key={kind} className="space-y-1.5">
            <p className="text-xs font-medium text-muted capitalize">
              {kind} (position, width — {unit})
            </p>
            {elements[kind].map((item, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted">#{i + 1}</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={isApproved}
                  value={metersToUnit(item.position[0], unitSystem).toFixed(2)}
                  onChange={(e) => updateOpening(kind, i, "x", e.target.value)}
                  className={fieldClass}
                />
                <input
                  type="number"
                  step="0.01"
                  disabled={isApproved}
                  value={metersToUnit(item.position[1], unitSystem).toFixed(2)}
                  onChange={(e) => updateOpening(kind, i, "y", e.target.value)}
                  className={fieldClass}
                />
                <span className="text-muted">width</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={isApproved}
                  value={item.width_m != null ? metersToUnit(item.width_m, unitSystem).toFixed(2) : ""}
                  onChange={(e) => updateOpening(kind, i, "width", e.target.value)}
                  className={fieldClass}
                />
              </div>
            ))}
          </div>
        ) : null,
      )}

      {!isApproved && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save corrections"}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleApprove} disabled={pending}>
            {pending ? "Approving…" : "Approve as construction-accurate"}
          </Button>
        </div>
      )}
      {isApproved && (
        <p className="text-xs">
          {ifcUrl ? (
            <a
              href={ifcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline underline-offset-2"
            >
              Download IFC file
            </a>
          ) : (
            <span className="text-muted">Building IFC export…</span>
          )}
        </p>
      )}
      {saved && <p className="text-xs text-success">Corrections saved.</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
