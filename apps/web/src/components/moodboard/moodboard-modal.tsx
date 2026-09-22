"use client";

import { useState, useRef } from "react";
import type { MoodboardAnalysisResult } from "@/lib/gemini";
import { Button } from "@/components/ui/button";

interface MoodboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMaterials?: (flooringId: string, wallId: string) => void;
  onApplyPrompt?: (prompt: string) => void;
  onApplyLayout?: (result: MoodboardAnalysisResult, imageBase64: string) => void;
}

export function MoodboardTrigger({
  onApplyMaterials,
  onApplyPrompt,
  onApplyLayout,
  className,
}: {
  onApplyMaterials?: (flooringId: string, wallId: string) => void;
  onApplyPrompt?: (prompt: string) => void;
  onApplyLayout?: (result: MoodboardAnalysisResult, imageBase64: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
        }
      >
        <span>🪄</span>
        <span>Moodboard AI</span>
      </button>
      <MoodboardModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApplyMaterials={onApplyMaterials}
        onApplyPrompt={onApplyPrompt}
        onApplyLayout={onApplyLayout}
      />
    </>
  );
}

export function MoodboardModal({
  isOpen,
  onClose,
  onApplyMaterials,
  onApplyPrompt,
  onApplyLayout,
}: MoodboardModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MoodboardAnalysisResult | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [appliedFlooring, setAppliedFlooring] = useState(false);
  const [appliedWall, setAppliedWall] = useState(false);
  const [appliedAll, setAppliedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      analyzeImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage(base64: string, mimeType: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/moodboard/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze moodboard");
      }

      const data: MoodboardAnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze moodboard image. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  }

  function handleApply() {
    if (!result) return;
    if (onApplyMaterials) {
      onApplyMaterials(result.flooringMatch.id, result.wallMatch.id);
    }
    if (onApplyPrompt) {
      onApplyPrompt(result.suggestedPrompt);
    }
    if (onApplyLayout && imagePreview) {
      onApplyLayout(result, imagePreview);
    }
    setAppliedAll(true);
    setTimeout(() => {
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🪄</span> Moodboard-to-Room AI Transformation
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Upload a client&apos;s Pinterest board, Figma export, or material photo to extract materials and colors.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface/50 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Upload Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-8 cursor-pointer bg-[#faf8f4]/50 transition-colors"
          >
            <span className="text-3xl mb-2">🖼️</span>
            <p className="text-xs font-semibold text-foreground">Click to upload Client Moodboard or Inspiration Image</p>
            <p className="text-[11px] text-muted mt-1">Supports PNG, JPG, WEBP from Pinterest, Figma, or camera roll</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Moodboard preview"
                  className="h-16 w-24 object-cover rounded-lg border border-border shadow-xs"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Active Moodboard</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-accent hover:underline cursor-pointer"
                  >
                    Change Image
                  </button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-accent">
                  <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Extracting design palette…</span>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {result && (
              <div className="space-y-4 border-t border-border pt-4">
                {/* Aesthetic Badge & Summary */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent border border-accent/20">
                      {result.aesthetic}
                    </span>
                    <span className="text-[11px] text-muted">Hardware: {result.hardwareFinish}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{result.summary}</p>
                </div>

                {/* Extracted 5-Color Swatches */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Extracted Palette:
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {result.palette.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCopyHex(p.hex)}
                        className="group flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border hover:border-accent/40 bg-[#faf8f4]/60 transition-all text-center"
                        title={`Click to copy ${p.hex}`}
                      >
                        <span
                          className="h-7 w-7 rounded-full border border-black/15 shadow-2xs group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span className="text-[10px] font-bold text-foreground truncate w-full">
                          {p.name}
                        </span>
                        <span className="text-[9px] font-mono text-muted">
                          {copiedHex === p.hex ? "Copied!" : p.hex}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matched AtelierOS Materials with Active 1-Click Apply Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-[#faf8f4]/40 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Matched Flooring
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onApplyMaterials && result) {
                            onApplyMaterials(result.flooringMatch.id, result.wallMatch.id);
                            setAppliedFlooring(true);
                            setTimeout(() => setAppliedFlooring(false), 2500);
                          }
                        }}
                        className="rounded bg-accent/15 hover:bg-accent/25 text-accent px-2 py-0.5 text-[10px] font-bold border border-accent/30 transition-all cursor-pointer"
                      >
                        {appliedFlooring ? "Applied ✓" : "1-Click Apply"}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-foreground">{result.flooringMatch.name}</p>
                    <p className="text-[11px] text-muted">{result.flooringMatch.rationale}</p>
                  </div>

                  <div className="rounded-lg border border-border bg-[#faf8f4]/40 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Matched Wall Finish
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onApplyMaterials && result) {
                            onApplyMaterials(result.flooringMatch.id, result.wallMatch.id);
                            setAppliedWall(true);
                            setTimeout(() => setAppliedWall(false), 2500);
                          }
                        }}
                        className="rounded bg-accent/15 hover:bg-accent/25 text-accent px-2 py-0.5 text-[10px] font-bold border border-accent/30 transition-all cursor-pointer"
                      >
                        {appliedWall ? "Applied ✓" : "1-Click Apply"}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-foreground">{result.wallMatch.name}</p>
                    <p className="text-[11px] text-muted">{result.wallMatch.rationale}</p>
                  </div>
                </div>

                {/* Suggested SDXL Prompt */}
                <div className="rounded-lg border border-border bg-[#faf8f4]/40 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Photorealistic Neural Render Prompt:
                  </span>
                  <p className="text-[11px] text-foreground font-mono bg-surface p-2 rounded border border-border/80 leading-relaxed">
                    {result.suggestedPrompt}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {result && (
            <Button type="button" variant="primary" size="sm" onClick={handleApply}>
              {appliedAll ? "✨ Design Transformed! ✓" : "✨ Transform Room into this Design"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
