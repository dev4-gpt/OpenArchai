"use client";

import { useState } from "react";
import type { AgentMessage, AgentRole, ProjectContext } from "@/lib/agents-orchestrator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AgentTeamModal({
  projectName,
  region = "india",
  floorAreaSqFt,
  estimatedCost,
  complianceScore,
}: {
  projectName: string;
  region?: "india" | "us";
  floorAreaSqFt?: number;
  estimatedCost?: number;
  complianceScore?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<AgentRole[]>([
    "chief_architect",
    "code_specialist",
    "interior_designer",
    "cost_estimator",
  ]);

  const quickPrompts = [
    "Review this floor plan for spatial flow & circulation",
    "Value-engineer this design to reduce budget by 15%",
    "Audit for Vastu Shastra & NBC 2016 compliance",
    "Recommend a contemporary Indian luxury material palette",
  ];

  async function handleConsult(queryToRun?: string) {
    const q = queryToRun || prompt;
    if (!q.trim()) return;

    setLoading(true);
    try {
      const context: ProjectContext = {
        projectName,
        region,
        floorAreaSqFt,
        estimatedCost,
        complianceScore,
        currency: region === "india" ? "₹" : "$",
      };

      const res = await fetch("/api/agents/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          context,
          roles: selectedRoles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...data.messages, ...prev]);
        setPrompt("");
      }
    } catch (err) {
      console.error("Agent team error:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(role: AgentRole) {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  }

  return (
    <>
      {/* Trigger Button in Dashboard */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground shadow-xs"
      >
        <span>👥</span>
        <span>Consult AI Design Team</span>
      </button>

      {/* Modal / Slide-over */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-[#faf8f4] px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🏛️</span>
                  <h2 className="text-sm font-bold text-foreground">
                    PDCO AI Architectural Studio Team
                  </h2>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
                    4 Specialists Active
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Collaborative multi-agent review for {projectName} (Gurgaon NCR practice).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Specialist Selector Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-5 py-2 text-xs">
              <span className="text-muted text-[11px] font-medium">Consulting:</span>
              {(
                [
                  { id: "chief_architect", label: "Lead Architect", icon: "📐" },
                  { id: "code_specialist", label: "Code & Vastu", icon: "📜" },
                  { id: "interior_designer", label: "Interiors & Finishes", icon: "🎨" },
                  { id: "cost_estimator", label: "Cost & QS", icon: "📊" },
                ] as const
              ).map((r) => {
                const active = selectedRoles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-colors border ${
                      active
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conversation / Consultation Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-2xl">
                    👥
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h3 className="text-sm font-semibold text-foreground">
                      Ask your specialist architectural team
                    </h3>
                    <p className="text-xs text-muted">
                      Your team of Lead Architect, Code/Vastu Consultant, Interior Designer, and Quantity Surveyor will review your floor plan together.
                    </p>
                  </div>

                  {/* Quick Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => handleConsult(qp)}
                        disabled={loading}
                        className="rounded-lg border border-border bg-[#faf8f4] p-2 text-left text-xs text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50"
                      >
                        💡 {qp}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="flex gap-3 rounded-lg border border-border bg-[#faf8f4] p-4 text-xs shadow-xs"
                  >
                    <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center text-base shrink-0 shadow-xs">
                      {m.avatar}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{m.name}</span>
                          <span className="text-[10px] text-accent font-medium rounded bg-accent/10 px-1.5 py-0.5">
                            {m.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted">{m.timestamp}</span>
                      </div>
                      <div className="text-muted leading-relaxed whitespace-pre-wrap pt-1 text-[11px]">
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted">
                  <span className="animate-spin text-accent">⏳</span>
                  <span>Specialist agents are reviewing your project…</span>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="border-t border-border bg-surface p-3 flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConsult();
                  }
                }}
                placeholder="Ask the team (e.g., 'How can we maximize Vastu alignment while maintaining contemporary aesthetics?')"
                disabled={loading}
                className="text-xs"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={loading || !prompt.trim()}
                onClick={() => handleConsult()}
              >
                {loading ? "Thinking…" : "Consult"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
