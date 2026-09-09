"use client";

import { useState, useRef } from "react";
import { triggerRender } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STYLE_CATEGORIES = {
  indian: {
    label: "Indian",
    presets: [
      "Gurgaon luxury apartment, Italian marble floors, warm LED recessed lighting, gold accents, contemporary Indian",
      "South Delhi farmhouse, exposed brick walls, ornate jali screens, antique brass fixtures, indoor plants",
      "Mumbai sea-facing flat, coastal minimalist, white stone surfaces, teal and sand accents, large windows",
      "Kerala traditional, carved wood ceiling, laterite accent walls, rattan and cane furniture, tropical greenery",
      "Rajasthani haveli inspired, carved sandstone arches, mirror mosaic work, jewel-toned textiles, brass lamps",
      "Modern Vastu home, natural wood and stone, east-facing entrance, open plan, earthy neutral palette",
    ],
  },
  international: {
    label: "International",
    presets: [
      "Scandinavian, light wood, soft neutral palette, minimal furniture",
      "Industrial, exposed brick, black metal accents, concrete floors",
      "Contemporary, clean lines, warm neutral tones, minimal decoration",
      "Japandi, low furniture, muted earth tones, natural materials",
      "Art Deco, geometric patterns, gold and brass accents, rich velvet",
      "Mediterranean, terracotta tiles, arched doorways, wrought iron, olive and cream",
      "Mid-Century Modern, walnut wood, organic curves, statement lighting",
      "Bohemian, layered textiles, warm colors, eclectic furniture, plants",
    ],
  },
} as const;

type StyleCategory = keyof typeof STYLE_CATEGORIES;

export function StylePickerForm({
  modelId,
  projectId,
  disabled,
}: {
  modelId: string;
  projectId: string;
  disabled: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<StyleCategory>("indian");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference image state
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptStyle = customPrompt.trim() || selectedPreset;

  function handleReferenceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    // Generate a preview URL
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  }

  function clearReference() {
    setReferenceFile(null);
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptStyle) {
      setError("Pick a style or describe one");
      return;
    }

    setPending(true);
    setError(null);
    try {
      // Append reference image note to the prompt style if a file was selected.
      // Actual IP-Adapter integration comes in render_v2; for now the filename
      // is passed as a hint so the backend can log / store it.
      const finalPrompt = referenceFile
        ? `${promptStyle} [ref_image: ${referenceFile.name}]`
        : promptStyle;

      await triggerRender(modelId, projectId, finalPrompt);
      setCustomPrompt("");
      setSelectedPreset(null);
      clearReference();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start render");
    } finally {
      setPending(false);
    }
  }

  const isDisabled = disabled || pending;
  const presets = STYLE_CATEGORIES[activeCategory].presets;

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted">Generate a styled render</p>

      {/* Category tabs — mirrors the Metric / Imperial toggle in scale-calibration */}
      <div className="flex gap-1 text-xs">
        {(Object.keys(STYLE_CATEGORIES) as StyleCategory[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCategory(key)}
            className={activeCategory === key ? "font-semibold text-accent" : "text-muted"}
          >
            {STYLE_CATEGORIES[key].label}
          </button>
        ))}
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={isDisabled}
            onClick={() => setSelectedPreset(preset)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedPreset === preset
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-foreground hover:border-accent/40"
            }`}
          >
            {preset.split(",")[0]}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <Input
        type="text"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        disabled={isDisabled}
        placeholder="Or describe a custom style…"
        maxLength={300}
        className="text-xs"
      />

      {/* Reference image upload */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted">Or upload a mood board / reference image</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isDisabled}
          onChange={handleReferenceChange}
          className="block w-full text-xs text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-xs file:font-medium file:text-foreground file:transition-colors hover:file:border-accent/40 disabled:opacity-50"
        />
        {referencePreview && (
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not cacheable by next/image */}
            <img
              src={referencePreview}
              alt="Reference preview"
              className="h-16 w-16 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={clearReference}
              disabled={isDisabled}
              className="text-xs text-muted hover:text-danger disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={isDisabled || !promptStyle}>
        {pending ? "Starting…" : disabled ? "Render in progress…" : "Generate render"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
