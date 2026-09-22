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

interface AgentSkillProfile {
  role: AgentRole;
  name: string;
  title: string;
  avatar: string;
  experience: string;
  coreSkills: string[];
  keyStandards: string[];
  sampleQuestion: string;
  sourceSkills: string[];
}

const AGENT_SKILLS_DIRECTORY: AgentSkillProfile[] = [
  {
    role: "chief_architect",
    name: "Vikram Mehta",
    title: "Lead Architectural Principal",
    avatar: "📐",
    experience: "20+ yrs • DLF Phase 5 & South Delhi Luxury Estates",
    coreSkills: [
      "Spatial Planning Archetypes (Single/Double Loaded, Central Core)",
      "Net-to-Gross (NTG) Efficiency Optimization (78–85%)",
      "6–8m Structural Bay Grids & Lintel Spans",
      "3D Massing & Zoning Envelopes",
      "Daylighting & Passive Solar Orientation (7.5m penetration)",
    ],
    keyStandards: ["Spatial Planning Archetypes", "NBC 2016 Part 3", "3D Zoning Envelopes"],
    sampleQuestion: "Review this layout for spatial circulation and optimize the core for 82% Net-to-Gross efficiency.",
    sourceSkills: ["arch-spatial-planning", "arch-zoning-envelope", "arch-daylighting-design"],
  },
  {
    role: "code_specialist",
    name: "Ananya Sharma",
    title: "Building Code & Vastu Consultant",
    avatar: "📜",
    experience: "15+ yrs • Regulatory Compliance, DTCP Haryana & Vastu Shastra",
    coreSkills: [
      "Statutory Occupant Load Sizing (IBC Table 1004.5 / NBC Part 4)",
      "Egress Sizing (0.15 in/occ, 0.9m barrier-free doors, 1.2m corridors)",
      "Classical Vastu 8-Quadrant Zoning (Agni SE, Nairutya SW, Ishanya NE)",
      "Gurgaon DTCP / HRERA FAR & Ground Coverage Bylaws",
      "Universal Accessibility (ADA Title III / NBC Barrier-Free)",
    ],
    keyStandards: ["NBC 2016 Part 4", "IBC 2021 / ADA Title III", "DTCP Haryana Bylaws", "Vastu Shastra"],
    sampleQuestion: "Audit our entrance and kitchen positions against Vastu Agni/Ishanya quadrants and verify 0.9m egress corridor compliance.",
    sourceSkills: ["arch-building-codes", "arch-occupancy-calculator", "arch-building-services"],
  },
  {
    role: "interior_designer",
    name: "Rohan Varma",
    title: "Senior Interior & Material Architect",
    avatar: "🎨",
    experience: "14+ yrs • Contemporary Indian Luxury & Bespoke Millwork",
    coreSkills: [
      "AI Space Restyling & Virtual Staging (MeltFlex AI Framework)",
      "Tactile Material Pairing (Honed Kota Stone, Makrana, Italian Statuario)",
      "Circadian Lighting Design (2700K Evening to 5000K Noon)",
      "Acoustic Fluted Timber Detailing & False Ceiling Coves",
      "2D Floorplan & Furniture to 3D GLB Model Synthesis",
    ],
    keyStandards: ["MeltFlex AI Engine", "Asian Paints Royale Palette", "IS 16655 Lighting"],
    sampleQuestion: "Recommend a luxury material palette combining honed Kota stone with fluted timber and 2700K recessed lighting.",
    sourceSkills: ["meltflex-design", "meltflex-3d", "meltflex-furniture", "arch-daylighting-design"],
  },
  {
    role: "cost_estimator",
    name: "Sunil Bajaj",
    title: "Chief Quantity Surveyor & Cost Estimator",
    avatar: "📊",
    experience: "18+ yrs • Quantity Surveying & Schedule of Rates (NCR / Mumbai)",
    coreSkills: [
      "Itemized Civil & Finishes Bill of Quantities (BOQ)",
      "3-Tier Cost Modeling (Budget / Standard / Premium)",
      "Value-Engineering Cost Alternates (Kajaria GVT vs Statuario)",
      "Workplace Programming (Usable vs Gross Area Budgeting)",
      "Contractor Site Constructability & 10% Contingency Buffers",
    ],
    keyStandards: ["Delhi Schedule of Rates (CPWD)", "NBC Part 2 Costing", "EPD Life-Cycle Specs"],
    sampleQuestion: "How can we value-engineer this specification to save ₹4,50,000 without compromising premium perception?",
    sourceSkills: ["architect-calculator", "services/cost", "workplace-programmer"],
  },
];

export const ALL_SPECIALIST_ROLES: {
  id: AgentRole;
  label: string;
  name: string;
  avatar: string;
  title: string;
}[] = [
  {
    id: "chief_architect",
    label: "Lead Architect",
    name: "Vikram Mehta",
    avatar: "📐",
    title: "Lead Architectural Principal",
  },
  {
    id: "code_specialist",
    label: "Code & Vastu",
    name: "Ananya Sharma",
    avatar: "📜",
    title: "Code & Statutory Specialist",
  },
  {
    id: "interior_designer",
    label: "Interiors & Finishes",
    name: "Rohan Varma",
    avatar: "🎨",
    title: "Senior Interior & Material Architect",
  },
  {
    id: "cost_estimator",
    label: "Cost & QS",
    name: "Sunil Bajaj",
    avatar: "📊",
    title: "Chief Quantity Surveyor & Cost Estimator",
  },
];

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
  const [showSkillsMatrix, setShowSkillsMatrix] = useState(false);
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

  async function handleConsult(queryToRun?: string, overrideRoles?: AgentRole[]) {
    const q = queryToRun || prompt;
    if (!q.trim() || loading) return;

    const rolesToUse = overrideRoles && overrideRoles.length > 0 ? overrideRoles : selectedRoles;
    if (rolesToUse.length === 0) {
      alert("Please select at least 1 specialist agent to consult.");
      return;
    }

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
          roles: rolesToUse,
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
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  }

  function selectSolo(role: AgentRole) {
    setSelectedRoles([role]);
  }

  function selectAll() {
    setSelectedRoles(["chief_architect", "code_specialist", "interior_designer", "cost_estimator"]);
  }

  function selectPair(r1: AgentRole, r2: AgentRole) {
    setSelectedRoles([r1, r2]);
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

            {/* Specialist Selector Bar & Skills Directory Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-5 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground text-[11px] font-bold flex items-center gap-1">
                  <span>👥</span> Responding:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ALL_SPECIALIST_ROLES.map((r) => {
                    const active = selectedRoles.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`inline-flex items-center rounded-lg border text-[11px] transition-all overflow-hidden ${
                          active
                            ? "border-accent bg-accent/10 shadow-2xs"
                            : "border-border bg-[#faf8f4] opacity-60 hover:opacity-100 hover:border-border/80"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRole(r.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
                            active
                              ? "text-accent font-bold"
                              : "text-muted hover:text-foreground"
                          }`}
                          title={active ? `Deselect ${r.name}` : `Select ${r.name}`}
                        >
                          <span className="font-mono text-xs">{active ? "☑" : "☐"}</span>
                          <span>{r.avatar}</span>
                          <span>{r.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => selectSolo(r.id)}
                          className={`border-l px-1.5 py-1 text-[9px] font-bold uppercase transition-colors ${
                            active
                              ? "border-accent/30 text-accent/70 hover:bg-accent/20 hover:text-accent"
                              : "border-border text-muted hover:bg-surface hover:text-foreground"
                          }`}
                          title={`Select ONLY ${r.name}`}
                        >
                          Solo
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Preset Buttons & Matrix Toggle */}
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center gap-1 border-r border-border pr-2 mr-1 text-[10px]">
                  <button
                    type="button"
                    onClick={selectAll}
                    className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                      selectedRoles.length === 4
                        ? "bg-accent/15 text-accent font-bold"
                        : "text-muted hover:text-foreground hover:bg-border/40"
                    }`}
                  >
                    All 4
                  </button>
                  <span className="text-muted/40">•</span>
                  <button
                    type="button"
                    onClick={() => selectPair("chief_architect", "interior_designer")}
                    className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                      selectedRoles.length === 2 && selectedRoles.includes("chief_architect") && selectedRoles.includes("interior_designer")
                        ? "bg-accent/15 text-accent font-bold"
                        : "text-muted hover:text-foreground hover:bg-border/40"
                    }`}
                  >
                    Design Pair
                  </button>
                  <span className="text-muted/40">•</span>
                  <button
                    type="button"
                    onClick={() => selectPair("code_specialist", "cost_estimator")}
                    className={`rounded px-1.5 py-0.5 font-semibold transition-colors ${
                      selectedRoles.length === 2 && selectedRoles.includes("code_specialist") && selectedRoles.includes("cost_estimator")
                        ? "bg-accent/15 text-accent font-bold"
                        : "text-muted hover:text-foreground hover:bg-border/40"
                    }`}
                  >
                    Code & Cost
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSkillsMatrix((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                    showSkillsMatrix
                      ? "border-accent bg-accent text-accent-foreground shadow-xs"
                      : "border-border bg-[#faf8f4] text-muted hover:text-foreground"
                  }`}
                >
                  <span>📋</span>
                  <span>{showSkillsMatrix ? "Close Matrix" : "Skills Matrix"}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Co-Worker Agent Skills Matrix */}
            {showSkillsMatrix && (
              <div className="border-b border-border bg-[#faf8f4] p-4 max-h-[45vh] overflow-y-auto animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>🏛️</span> Co-Worker Agent Skills Matrix (78+ Integrated Architectural Skills)
                    </h3>
                    <p className="text-[10px] text-muted">
                      Directly grounded in Abhinavbwj/Skills-Architects, AlpacaLabs, and MeltFlex engineering frameworks.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-accent font-bold">
                    {selectedRoles.length} of 4 Specialists Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AGENT_SKILLS_DIRECTORY.map((profile) => {
                    const isSelected = selectedRoles.includes(profile.role);
                    return (
                      <div
                        key={profile.role}
                        className={`rounded-xl border p-3 text-xs space-y-2 shadow-2xs transition-all ${
                          isSelected
                            ? "border-accent/60 bg-surface shadow-xs"
                            : "border-border bg-surface/70 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl p-1 rounded-lg bg-accent/10 border border-accent/20">
                              {profile.avatar}
                            </span>
                            <div>
                              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                <span>{profile.name}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  isSelected ? "bg-accent/15 text-accent font-bold" : "bg-border text-muted"
                                }`}>
                                  {isSelected ? "Active" : "Off"}
                                </span>
                              </h4>
                              <p className="text-[10px] text-accent font-medium">{profile.title}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-muted bg-[#faf8f4] border border-border px-1.5 py-0.5 rounded">
                            {profile.experience}
                          </span>
                        </div>

                        {/* Specific Skills */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted tracking-wider">Specific Skills:</span>
                          <ul className="space-y-0.5">
                            {profile.coreSkills.map((skill, sIdx) => (
                              <li key={sIdx} className="text-[10px] text-foreground flex items-start gap-1.5 leading-tight">
                                <span className="text-accent font-bold">•</span>
                                <span>{skill}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Standards */}
                        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border/60">
                          <span className="text-[9px] text-muted font-bold">Standards:</span>
                          {profile.keyStandards.map((std, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-[#f5f2ec] px-1.5 py-0.5 text-[9px] font-medium text-foreground border border-border/70"
                            >
                              {std}
                            </span>
                          ))}
                        </div>

                        {/* Selection Toggles & Sample Question */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleRole(profile.role)}
                              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all border ${
                                isSelected
                                  ? "border-accent bg-accent text-accent-foreground shadow-xs"
                                  : "border-border bg-[#faf8f4] text-muted hover:text-foreground"
                              }`}
                            >
                              <span>{isSelected ? "☑ Active" : "☐ Select"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => selectSolo(profile.role)}
                              className="rounded-md border border-border bg-[#faf8f4] px-1.5 py-1 text-[9px] font-medium text-muted hover:text-foreground hover:bg-surface"
                              title={`Select only ${profile.name}`}
                            >
                              Solo
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoles([profile.role]);
                              handleConsult(profile.sampleQuestion, [profile.role]);
                              setShowSkillsMatrix(false);
                            }}
                            className="rounded-md border border-accent/30 bg-accent/5 px-2 py-1 text-[10px] text-accent hover:bg-accent hover:text-accent-foreground transition-colors font-medium truncate max-w-[160px]"
                            title={`Run sample prompt: ${profile.sampleQuestion}`}
                          >
                            💡 Run Sample ➔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div className="text-center space-y-1 max-w-lg">
                    <div className="h-10 w-10 mx-auto rounded-full bg-accent/10 flex items-center justify-center text-xl mb-2">
                      👥
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      Co-Worker Architectural Studio Team
                    </h3>
                    <p className="text-xs text-muted">
                      Consult your 4 specialized AI principals backed by 78+ professional building design, compliance, and visualization skills.
                    </p>
                  </div>

                  {/* 4 Agent Skills Cards in Empty State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl w-full pt-1">
                    {AGENT_SKILLS_DIRECTORY.map((profile) => {
                      const isSelected = selectedRoles.includes(profile.role);
                      return (
                        <div
                          key={profile.role}
                          onClick={() => toggleRole(profile.role)}
                          className={`rounded-xl border p-3 text-left space-y-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-accent bg-accent/5 shadow-xs"
                              : "border-border bg-[#faf8f4] opacity-75 hover:opacity-100 hover:border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{profile.avatar}</span>
                              <div>
                                <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                                  <span>{profile.name}</span>
                                  <span
                                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                                      isSelected
                                        ? "bg-accent/20 text-accent font-bold"
                                        : "bg-border text-muted"
                                    }`}
                                  >
                                    {isSelected ? "☑ Active" : "☐ Off"}
                                  </span>
                                </p>
                                <p className="text-[10px] text-accent font-medium">{profile.title}</p>
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => selectSolo(profile.role)}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold border transition-colors ${
                                  selectedRoles.length === 1 && selectedRoles[0] === profile.role
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-surface text-muted hover:text-foreground"
                                }`}
                                title={`Consult only ${profile.name}`}
                              >
                                Solo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoles([profile.role]);
                                  handleConsult(profile.sampleQuestion, [profile.role]);
                                }}
                                className="rounded bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                Ask ➔
                              </button>
                            </div>
                          </div>
                          <div className="space-y-0.5 text-[10px] text-muted">
                            {profile.coreSkills.slice(0, 3).map((sk, idx) => (
                              <p key={idx} className="truncate">
                                • {sk}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full pt-2 border-t border-border">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => handleConsult(qp)}
                        disabled={loading || selectedRoles.length === 0}
                        className="rounded-lg border border-border bg-surface p-2 text-left text-xs text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <span>💡</span>
                        <span className="truncate">{qp}</span>
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

            {/* Active Specialist Bar directly above Input */}
            <div className="border-t border-border bg-[#faf8f4] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <span>💬</span> Responding Specialists:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ALL_SPECIALIST_ROLES.map((r) => {
                    const isSelected = selectedRoles.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRole(r.id)}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all border ${
                          isSelected
                            ? "border-accent bg-accent text-accent-foreground font-bold shadow-xs"
                            : "border-border/80 bg-surface text-muted hover:text-foreground"
                        }`}
                        title={isSelected ? `Click to deselect ${r.name}` : `Click to select ${r.name}`}
                      >
                        <span>{isSelected ? "☑" : "☐"}</span>
                        <span>{r.avatar}</span>
                        <span>{r.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {selectedRoles.length === 0 ? (
                  <span className="text-red-500 font-bold animate-pulse">
                    ⚠️ 0 agents selected! Pick at least 1 agent
                  </span>
                ) : (
                  <span className="text-muted font-medium">
                    {selectedRoles.length} of 4 selected
                  </span>
                )}
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-accent underline font-semibold hover:text-accent/80"
                >
                  Select All
                </button>
              </div>
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
                    if (selectedRoles.length > 0) {
                      handleConsult();
                    }
                  }
                }}
                placeholder={
                  selectedRoles.length === 0
                    ? "Please select at least 1 specialist agent above..."
                    : `Ask ${selectedRoles
                        .map((r) => ALL_SPECIALIST_ROLES.find((x) => x.id === r)?.name.split(" ")[0])
                        .join(", ")}...`
                }
                disabled={loading}
                className="text-xs"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={loading || !prompt.trim() || selectedRoles.length === 0}
                onClick={() => handleConsult()}
              >
                {loading
                  ? "Thinking…"
                  : selectedRoles.length === 0
                  ? "Select Agent"
                  : selectedRoles.length === 4
                  ? "Consult All (4)"
                  : `Consult (${selectedRoles.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
