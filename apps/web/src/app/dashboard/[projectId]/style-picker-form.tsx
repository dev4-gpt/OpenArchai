"use client";

import { useState } from "react";
import { triggerRender } from "./actions";

const PRESETS = [
  "Scandinavian, light wood, soft neutral palette",
  "Industrial, exposed brick, black metal accents",
  "Contemporary, clean lines, warm neutral tones",
  "Warm minimalist, wood floors, natural light",
  "Japandi, low furniture, muted earth tones",
] as const;

export function StylePickerForm({
  modelId,
  projectId,
  disabled,
}: {
  modelId: string;
  projectId: string;
  disabled: boolean;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptStyle = customPrompt.trim() || selectedPreset;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptStyle) {
      setError("Pick a style or describe one");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await triggerRender(modelId, projectId, promptStyle);
      setCustomPrompt("");
      setSelectedPreset(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start render");
    } finally {
      setPending(false);
    }
  }

  const isDisabled = disabled || pending;

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium text-gray-700">Generate a styled render</p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={isDisabled}
            onClick={() => setSelectedPreset(preset)}
            className={`rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedPreset === preset ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300"
            }`}
          >
            {preset.split(",")[0]}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        disabled={isDisabled}
        placeholder="Or describe a custom style…"
        maxLength={300}
        className="w-full rounded border px-2 py-1 text-xs disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isDisabled || !promptStyle}
        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Starting…" : disabled ? "Render in progress…" : "Generate render"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
