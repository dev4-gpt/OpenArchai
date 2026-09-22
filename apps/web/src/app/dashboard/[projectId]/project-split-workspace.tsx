"use client";

import { useState } from "react";
import Link from "next/link";
import { MoodboardTrigger } from "@/components/moodboard/moodboard-modal";
import { AgentTeamPanel } from "./agent-team-modal";

export function ProjectSplitWorkspace({
  projectName,
  region,
  presentationHref,
  floorAreaSqFt,
  estimatedCost,
  complianceScore,
  children,
}: {
  projectName: string;
  region: "india" | "us";
  presentationHref: string;
  floorAreaSqFt?: number;
  estimatedCost?: number;
  complianceScore?: number;
  children: React.ReactNode;
}) {
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(true);
  const [isChatMaximized, setIsChatMaximized] = useState(false);

  return (
    <div
      className={`mx-auto transition-all duration-300 ${
        isTeamChatOpen
          ? "w-full max-w-[1800px] px-3 lg:px-6"
          : "max-w-4xl px-4"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-4 mb-4 border-b border-border/60">
        <div className="space-y-1">
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground transition-colors">
            ← Projects
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{projectName}</h1>
            <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
              {region === "india" ? "🇮🇳 India (NBC)" : "🇺🇸 US (IBC)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={presentationHref}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
          >
            <span>🖥️</span>
            <span>Presentation</span>
          </Link>

          <MoodboardTrigger />

          {/* Toggle Button for Side-by-Side Chat */}
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

      {/* Main Workspace Layout */}
      <div
        className={`w-full transition-all duration-300 ${
          isTeamChatOpen
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            : "space-y-8"
        }`}
      >
        {/* Left Half: Project Section */}
        <div className="w-full space-y-8 min-w-0">
          {children}
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
              projectName={projectName}
              region={region}
              floorAreaSqFt={floorAreaSqFt}
              estimatedCost={estimatedCost}
              complianceScore={complianceScore}
              onClose={() => setIsTeamChatOpen(false)}
              onToggleExpand={() => setIsChatMaximized((prev) => !prev)}
              isExpanded={isChatMaximized}
            />
          </div>
        )}
      </div>
    </div>
  );
}
