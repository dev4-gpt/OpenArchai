"use client";

import { useRef, useState } from "react";
import { getFloorplanSignedUrl } from "./model-actions";
import { setUploadScale, setProjectUnitSystem, triggerReconstruction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { feetInchesToMeters, type UnitSystem } from "@/lib/units";

type Point = { x: number; y: number }; // displayed/client pixel space, relative to the image element

export function ScaleCalibration({
  uploadId,
  projectId,
  storagePath,
  unitSystem,
  hasExistingCalibration,
}: {
  uploadId: string;
  projectId: string;
  storagePath: string;
  unitSystem: UnitSystem;
  hasExistingCalibration: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  const [distanceMeters, setDistanceMeters] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [heightMeters, setHeightMeters] = useState("2.7");
  const [heightFeet, setHeightFeet] = useState("8");
  const [heightInches, setHeightInches] = useState("10");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleExpand() {
    setExpanded(true);
    if (imageUrl) return;
    try {
      const url = await getFloorplanSignedUrl(storagePath);
      setImageUrl(url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to load floorplan image");
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPoints((prev) => (prev.length >= 2 ? [point] : [...prev, point]));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    if (points.length !== 2) {
      setError("Click two points on the floorplan first");
      return;
    }
    const img = imgRef.current;
    if (!img) return;

    const realDistanceM =
      unitSystem === "metric"
        ? parseFloat(distanceMeters)
        : feetInchesToMeters(parseFloat(feet) || 0, parseFloat(inches) || 0);
    if (!realDistanceM || realDistanceM <= 0) {
      setError("Enter the real-world distance between the two points");
      return;
    }

    const wallHeightM =
      unitSystem === "metric"
        ? parseFloat(heightMeters)
        : feetInchesToMeters(parseFloat(heightFeet) || 0, parseFloat(heightInches) || 0);
    if (!wallHeightM || wallHeightM <= 0) {
      setError("Enter a valid ceiling height");
      return;
    }

    // Convert clicked (displayed) pixel coordinates to the ORIGINAL image's
    // natural pixel space -- the ML pipeline letterboxes/resizes internally
    // and needs calibration expressed against the source image's own
    // resolution, not whatever size the browser happened to render it at.
    const scaleToNatural = img.naturalWidth / img.clientWidth;
    const [p1, p2] = points;
    const dxNatural = (p2.x - p1.x) * scaleToNatural;
    const dyNatural = (p2.y - p1.y) * scaleToNatural;
    const pixelDistanceNatural = Math.sqrt(dxNatural * dxNatural + dyNatural * dyNatural);
    const pixelsPerMeter = pixelDistanceNatural / realDistanceM;

    setPending(true);
    try {
      await setUploadScale(uploadId, projectId, pixelsPerMeter, wallHeightM);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calibration");
    } finally {
      setPending(false);
    }
  }

  async function handleRebuild() {
    setPending(true);
    setError(null);
    try {
      await triggerReconstruction(uploadId, projectId, storagePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start rebuild");
    } finally {
      setPending(false);
    }
  }

  async function handleUnitToggle(next: UnitSystem) {
    if (next === unitSystem) return;
    await setProjectUnitSystem(projectId, next);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="text-xs font-medium text-accent underline underline-offset-2"
      >
        {hasExistingCalibration ? "Edit scale calibration" : "Calibrate real-world scale"}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Scale calibration</p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => handleUnitToggle("metric")}
            className={unitSystem === "metric" ? "font-semibold text-accent" : "text-muted"}
          >
            Metric
          </button>
          <span className="text-muted">/</span>
          <button
            type="button"
            onClick={() => handleUnitToggle("imperial")}
            className={unitSystem === "imperial" ? "font-semibold text-accent" : "text-muted"}
          >
            Imperial
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Click two points on the floorplan (e.g. either end of a known wall or door), then enter the
        real-world distance between them. Optional — reconstruction uses a default assumption if
        skipped.
      </p>

      {imageError && <p className="text-xs text-danger">{imageError}</p>}
      {imageUrl && (
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL expires in 5min, not worth next/image's caching; also needs a direct DOM ref for naturalWidth */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Floorplan"
            onClick={handleImageClick}
            className="max-h-80 max-w-full cursor-crosshair rounded-md border border-border"
          />
          {points.map((p, i) => (
            <span
              key={i}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent-foreground"
              style={{ left: p.x, top: p.y }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium">Real-world distance between points</p>
        {unitSystem === "metric" ? (
          <Input
            type="number"
            step="0.01"
            value={distanceMeters}
            onChange={(e) => setDistanceMeters(e.target.value)}
            placeholder="meters"
            className="max-w-[10rem] text-xs"
          />
        ) : (
          <div className="flex gap-2">
            <Input
              type="number"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
              placeholder="feet"
              className="max-w-[6rem] text-xs"
            />
            <Input
              type="number"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
              placeholder="inches"
              className="max-w-[6rem] text-xs"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Ceiling height (optional override)</p>
        {unitSystem === "metric" ? (
          <Input
            type="number"
            step="0.01"
            value={heightMeters}
            onChange={(e) => setHeightMeters(e.target.value)}
            className="max-w-[10rem] text-xs"
          />
        ) : (
          <div className="flex gap-2">
            <Input
              type="number"
              value={heightFeet}
              onChange={(e) => setHeightFeet(e.target.value)}
              className="max-w-[6rem] text-xs"
            />
            <Input
              type="number"
              value={heightInches}
              onChange={(e) => setHeightInches(e.target.value)}
              className="max-w-[6rem] text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save calibration"}
        </Button>
        {saved && (
          <Button type="button" variant="secondary" size="sm" onClick={handleRebuild} disabled={pending}>
            {pending ? "Starting…" : "Rebuild with this calibration"}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
