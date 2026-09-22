"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FloorPlanEditor } from "@/components/floor-plan-editor/floor-plan-editor";
import { floorPlanStore } from "@/components/floor-plan-editor/state/floor-plan-store";
import { ModelViewer } from "@/components/model-viewer";
import { CompliancePanel } from "@/app/dashboard/[projectId]/compliance-panel";
import { CostPanel } from "@/app/dashboard/[projectId]/cost-panel";
import { AgentTeamPanel } from "@/app/dashboard/[projectId]/agent-team-modal";
import { VoiceProvider } from "@/components/voice-assistant/voice-provider";
import { VoiceButton } from "@/components/voice-assistant/voice-button";
import { CommandHistory } from "@/components/voice-assistant/command-history";
import { Button } from "@/components/ui/button";
import { FFESchedulePanel } from "@/components/ffe/ffe-schedule-panel";
import { MoodboardTrigger } from "@/components/moodboard/moodboard-modal";
import type { DemoProjectData } from "@/lib/demo-data";

export function DemoSandbox({ demoData }: { demoData: DemoProjectData }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Save Your Work");
  const [authModalDesc, setAuthModalDesc] = useState(
    "Sign in or create a free account to save this floor plan, export IFC BIM models, and generate custom AI renders."
  );

  const [selectedStyle, setSelectedStyle] = useState<string>(
    "Gurgaon luxury apartment, Italian marble floors, warm LED recessed lighting"
  );

  const [isTeamChatOpen, setIsTeamChatOpen] = useState(true);
  const [isChatMaximized, setIsChatMaximized] = useState(false);

  // Initialize the 2D floor plan editor with the demo studio apartment
  useEffect(() => {
    if (demoData.initialFloorPlan) {
      floorPlanStore.loadPlan(demoData.initialFloorPlan);
    }
  }, [demoData.initialFloorPlan]);

  function handlePromptSave(action: string) {
    if (action === "render") {
      setAuthModalTitle("Run AI Neural Render");
      setAuthModalDesc(
        "Sign in or create a free account to generate photorealistic AI architectural renders with GPU acceleration."
      );
    } else if (action === "upload") {
      setAuthModalTitle("Upload Floor Plan");
      setAuthModalDesc(
        "Sign in or create a free account to upload CAD drawings, images, and reconstruct 3D BIM models."
      );
    } else {
      setAuthModalTitle("Save to Your Workspace");
      setAuthModalDesc(
        "Sign in or create a free account to save this floor plan, generate 3D models, and collaborate with your team."
      );
    }
    setShowAuthModal(true);
  }

  return (
    <VoiceProvider>
      <div className="min-h-screen bg-background pb-16">
        {/* Sticky Guest Sandbox Banner */}
        <header className="sticky top-0 z-30 border-b border-accent/20 bg-surface/95 backdrop-blur px-4 py-2.5 shadow-xs">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Public Sandbox
              </span>
              <p className="text-xs text-foreground">
                Previewing the interactive <strong>Sample Studio Apartment</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/login"
                className="rounded px-2.5 py-1 font-medium text-foreground hover:bg-surface hover:text-accent transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="rounded bg-accent px-3 py-1 font-medium text-accent-foreground hover:bg-accent/90 shadow-xs transition-colors"
              >
                Sign Up to Save
              </Link>
            </div>
          </div>
        </header>

        <main
          className={`mx-auto transition-all duration-300 pt-6 px-4 ${
            isTeamChatOpen
              ? "w-full max-w-[1800px] lg:px-6"
              : "max-w-4xl"
          }`}
        >
          {/* Project Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">{demoData.project.name}</h1>
                <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  {demoData.project.region === "india" ? "🇮🇳 India (NBC)" : "🇺🇸 US (IBC)"}
                </span>
                <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  Interactive Demo
                </span>
              </div>
              <p className="text-xs text-muted">
                Explore the 2D CAD studio, 3D model, AI rendering styles, cost BOQ, and building code compliance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/demo/presentation"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
              >
                <span>🖥️</span>
                <span>Presentation</span>
              </Link>

              <MoodboardTrigger
                onApplyPrompt={(prompt) => setSelectedStyle(prompt)}
              />

              {/* Side-by-Side Team Studio Toggle Button */}
              <button
                type="button"
                onClick={() => setIsTeamChatOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-xs ${
                  isTeamChatOpen
                    ? "border border-accent bg-accent text-accent-foreground font-bold ring-2 ring-accent/20"
                    : "border border-accent/40 bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground"
                }`}
                title={isTeamChatOpen ? "Close side-by-side team chat" : "Open side-by-side team chat extension"}
              >
                <span>{isTeamChatOpen ? "✕" : "👥"}</span>
                <span>{isTeamChatOpen ? "Close Team Studio" : "Consult AI Team (Side-by-Side)"}</span>
              </button>
            </div>
          </div>

          <div
            className={`w-full transition-all duration-300 ${
              isTeamChatOpen
                ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
                : "space-y-8"
            }`}
          >
            {/* Left Half: Project Section */}
            <div className="w-full space-y-8 min-w-0">

          {/* Section 1: 2D Floor Plan Studio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">2D Floor Plan Editor</h2>
                <p className="text-xs text-muted">
                  Draw walls, place doors & windows, or add standard room presets. Export to DXF anytime.
                </p>
              </div>
            </div>
            <FloorPlanEditor
              unitSystem={demoData.project.unit_system}
              onSaveToProject={() => handlePromptSave("save")}
            />
          </div>

          {/* Section 2: 3D Model Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">3D Spatial Model</h2>
                <p className="text-xs text-muted">
                  Interactive 3D reconstruction. Measure distances, switch camera views, or take screenshots.
                </p>
              </div>
            </div>
            {demoData.modelUrl ? (
              <div className="space-y-1.5">
                <ModelViewer url={demoData.modelUrl} unitSystem={demoData.project.unit_system} />
                <a
                  href={demoData.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-medium text-accent underline underline-offset-2"
                >
                  Download raw model (.glb)
                </a>
              </div>
            ) : (
              <div className="h-64 rounded-lg border border-dashed border-border bg-surface flex items-center justify-center text-xs text-muted">
                3D Model loading…
              </div>
            )}
          </div>

          {/* Section 3: AI Styled Renders */}
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">AI Architectural Render</h2>
                <p className="text-xs text-muted">Neural SDXL + ControlNet-Depth styling</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePromptSave("render")}
              >
                + Generate Render
              </Button>
            </div>

            {demoData.renderUrl && (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border border-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={demoData.renderUrl}
                    alt="Styled Render"
                    className="w-full max-h-96 object-cover"
                  />
                </div>
                <p className="text-xs text-muted italic">
                  Prompt: &quot;{demoData.renderStyle}&quot;
                </p>
              </div>
            )}

            {/* Quick Style Presets Preview */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Explore Style Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Gurgaon luxury apartment",
                  "South Delhi farmhouse",
                  "Mumbai sea-facing flat",
                  "Kerala traditional",
                  "Scandinavian minimal",
                  "Japandi natural wood",
                ].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedStyle(style)}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      selectedStyle === style
                        ? "bg-accent text-accent-foreground font-medium"
                        : "border border-border text-foreground hover:border-accent/40"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Building Code Compliance */}
          <CompliancePanel
            elements={demoData.constructionElements}
            region={demoData.project.region}
          />

          {/* Section 5: BOQ & Cost Estimation */}
          <CostPanel
            elements={demoData.constructionElements}
            region={demoData.project.region}
            projectName={demoData.project.name}
          />

          {/* Section 6: Automated FF&E Procurement Schedule */}
          <FFESchedulePanel
            elements={demoData.constructionElements}
            region={demoData.project.region}
            projectName={demoData.project.name}
          />

          {/* Section 7: Upload Floor Plan CTA */}
          <div className="rounded-lg border border-border bg-surface p-5 text-center space-y-3">
            <h3 className="text-sm font-semibold">Have your own floor plan drawing?</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Upload PDF or PNG floor plans to reconstruct interactive 3D models, run automated code audits, and generate cost estimates.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => handlePromptSave("upload")}
              >
                Upload Floor Plan
              </Button>
              <Link href="/login">
                <Button variant="secondary">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Half: AI Architectural Studio Team Chat (Docked Side-by-Side) */}
        {isTeamChatOpen && (
          <div
            className={`w-full min-w-0 transition-all duration-300 ${
              isChatMaximized
                ? "fixed inset-4 z-50 rounded-2xl shadow-2xl bg-surface border border-border flex flex-col"
                : "lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] flex flex-col rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-200"
            }`}
          >
            <AgentTeamPanel
              projectName={demoData.project.name}
              region={demoData.project.region}
              onClose={() => setIsTeamChatOpen(false)}
              onToggleExpand={() => setIsChatMaximized((prev) => !prev)}
              isExpanded={isChatMaximized}
            />
          </div>
        )}
      </div>
    </main>

        {/* Floating Voice AI Controls */}
        <VoiceButton />
        <CommandHistory />

        {/* Auth Prompt Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{authModalTitle}</h3>
                <p className="text-xs text-muted leading-relaxed">{authModalDesc}</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" className="w-full">
                  <Button variant="primary" className="w-full">
                    Sign In to Continue
                  </Button>
                </Link>
                <Link href="/login" className="w-full">
                  <Button variant="secondary" className="w-full">
                    Create Free Account
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuthModal(false)}
                  className="mt-1"
                >
                  Continue in Sandbox
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </VoiceProvider>
  );
}
