"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentMessage, AgentRole, ProjectContext } from "@/lib/agents-orchestrator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseInlineFormatting(text: string, isUser = false): React.ReactNode[] {
  // Matches **bold text** and *italic text*
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index).replace(/\*\*/g, "").replace(/\*/g, ""));
    }
    if (match[2]) {
      parts.push(
        <strong
          key={`${match.index}-b`}
          className={isUser ? "font-bold text-inherit" : "font-semibold text-foreground"}
        >
          {match[2]}
        </strong>,
      );
    } else if (match[4]) {
      parts.push(
        <em key={`${match.index}-i`} className="italic">
          {match[4]}
        </em>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).replace(/\*\*/g, "").replace(/\*/g, "");
    parts.push(remaining);
  }

  return parts;
}

function FormattedMessage({ text, isUser = false }: { text: string; isUser?: boolean }) {
  const lines = text.split("\n");

  return (
    <div className={`space-y-1.5 leading-relaxed text-[11px] ${isUser ? "text-inherit" : "text-foreground"}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Header: ## or ###
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const headerText = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "");
          return (
            <h4
              key={lineIdx}
              className={`font-bold pt-1 text-xs ${isUser ? "text-inherit" : "text-foreground"}`}
            >
              {headerText}
            </h4>
          );
        }

        // Bullet point: * or -
        const isBullet = /^[*-]\s+/.test(trimmed);
        // Numbered list item: 1. or 2.
        const isNumbered = /^\d+\.\s+/.test(trimmed);

        const content = isBullet
          ? trimmed.replace(/^[*-]\s+/, "")
          : isNumbered
          ? trimmed.replace(/^\d+\.\s+/, "")
          : trimmed;

        const parts = parseInlineFormatting(content, isUser);

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-2">
              <span className={`font-bold select-none ${isUser ? "text-inherit opacity-80" : "text-accent"}`}>•</span>
              <span className="flex-1">{parts}</span>
            </div>
          );
        }

        if (isNumbered) {
          const num = trimmed.match(/^(\d+)\./)?.[1] || "•";
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-2">
              <span
                className={`font-bold select-none min-w-[14px] ${
                  isUser ? "text-inherit opacity-80" : "text-accent"
                }`}
              >
                {num}.
              </span>
              <span className="flex-1">{parts}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{parts}</p>;
      })}
    </div>
  );
}

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const quickPrompts = [
    "Review this floor plan for spatial flow & circulation",
    "Value-engineer this design to reduce budget by 15%",
    "Audit for Vastu Shastra & NBC 2016 compliance",
    "Recommend a contemporary Indian luxury material palette",
  ];

  async function handleConsult(queryToRun?: string) {
    const q = queryToRun || prompt;
    if (!q.trim() || loading) return;

    // 1. Add User's Question directly to conversation
    const userMsg: AgentMessage = {
      id: `user_${Date.now()}`,
      role: "user" as any,
      name: "You",
      title: "Project Architect",
      avatar: "👤",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
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
        if (data.messages && Array.isArray(data.messages)) {
          setMessages((prev) => [...prev, ...data.messages]);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "chief_architect",
            name: "Team Notice",
            title: "System",
            avatar: "⚠️",
            content:
              errData.error ||
              "The design team was unable to process your request. Please try again or rephrase your question.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      console.error("Agent team error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "chief_architect",
          name: "Team Notice",
          title: "System",
          avatar: "⚠️",
          content: "Network error communicating with the agent team. Please check your connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
          <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-[#faf8f4] px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🏛️</span>
                  <h2 className="text-sm font-bold text-foreground">
                    PDCO AI Architectural Studio Team
                  </h2>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
                    {selectedRoles.length} Specialists Active
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Collaborative multi-agent review for {projectName} ({region === "india" ? "Gurgaon NCR / NBC 2016" : "US / IBC & ADA"}).
                </p>
              </div>
              <div className="flex items-center gap-3">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="text-[11px] text-muted hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Reset Chat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted hover:text-foreground text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Specialist Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-5 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted text-[11px] font-medium mr-1">Consulting:</span>
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
                          : "border-border text-muted hover:text-foreground opacity-60"
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-muted hidden sm:inline">Click to toggle agents</span>
            </div>

            {/* Conversation Thread */}
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
                      Your team of Lead Architect, Code/Vastu Consultant, Interior Designer, and Quantity Surveyor will review your project together.
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
                        className="rounded-lg border border-border bg-[#faf8f4] p-2.5 text-left text-xs text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50"
                      >
                        💡 {qp}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  if ((m.role as string) === "user") {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-xl rounded-2xl rounded-tr-xs bg-accent text-accent-foreground px-4 py-2.5 text-xs shadow-xs space-y-1">
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 border-b border-black/10 pb-1">
                            <span className="font-bold">You (Project Architect)</span>
                            <span>{m.timestamp}</span>
                          </div>
                          <div className="pt-0.5">
                            <FormattedMessage text={m.content} isUser={true} />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className="flex gap-3 rounded-xl border border-border bg-[#faf8f4] p-4 text-xs shadow-xs animate-in fade-in duration-150"
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
                        <div className="pt-1">
                          <FormattedMessage text={m.content} isUser={false} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-accent">
                  <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Specialist agents are reviewing your question…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
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
