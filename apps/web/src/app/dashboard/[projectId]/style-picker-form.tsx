"use client";

import { useState } from "react";
import { triggerRender } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted">Generate a styled render</p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
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
      <Input
        type="text"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        disabled={isDisabled}
        placeholder="Or describe a custom style…"
        maxLength={300}
        className="text-xs"
      />
      <Button type="submit" variant="primary" size="sm" disabled={isDisabled || !promptStyle}>
        {pending ? "Starting…" : disabled ? "Render in progress…" : "Generate render"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
