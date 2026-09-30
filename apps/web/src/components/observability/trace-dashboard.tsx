"use client";

import { useEffect, useState } from "react";

export interface TraceEvent {
  id?: string;
  session_id?: string;
  event: string;
  ts: number;
  latency_ms?: number;
  tool_name?: string;
  tool_args?: string;
  turn?: number;
  prompt_preview?: string;
  response_preview?: string;
  error_message?: string;
  total_turns?: number;
  total_tool_calls?: number;
  total_latency_ms?: number;
  [key: string]: unknown;
}

export interface EvalResult {
  session_id: string;
  score: number;
  verdict: "APPROVED" | "CONDITIONALLY_APPROVED" | "REJECTED" | string;
  criteria_hits: string[];
  criteria_missed: string[];
  persona_scores?: Record<string, number>;
  unique_tools_called?: string[];
  total_latency_ms?: number;
  notes?: string[];
}

export interface BudgetReport {
  session_id: string;
  model?: string;
  model_calls: number;
  tool_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
  stop_reason?: string | null;
  warnings?: string[];
}

interface TraceDashboardProps {
  sessionId?: string;
  evalResult?: EvalResult | null;
  budget?: BudgetReport | null;
  streamingTraces?: TraceEvent[];
  isStreaming?: boolean;
}

export function TraceDashboard({
  sessionId,
  evalResult,
  budget,
  streamingTraces = [],
  isStreaming = false,
}: TraceDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [polledTraces, setPolledTraces] = useState<TraceEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "timeline" | "raw">("summary");

  // Poll /api/traces if open and not actively streaming
  useEffect(() => {
    if (!isOpen) return;

    const fetchTraces = async () => {
      try {
        const res = await fetch("/api/traces?n=60");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.traces)) {
            setPolledTraces(data.traces);
          }
        }
      } catch {
        // Handled silently
      }
    };

    fetchTraces();
    const interval = setInterval(fetchTraces, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Combine streaming traces and polled traces, deduping by id or timestamp
  const displayTraces = streamingTraces.length > 0 ? streamingTraces : polledTraces;

  // Filter tool call events
  const toolCalls = displayTraces.filter((t) => t.event === "tool_call_end" || t.event === "tool_call_start");
  const toolCallCompletions = displayTraces.filter((t) => t.event === "tool_call_end");

  // Determine verdict colors
  const verdictBadge =
    evalResult?.verdict === "APPROVED"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : evalResult?.verdict === "CONDITIONALLY_APPROVED"
        ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
        : "bg-rose-500/15 text-rose-700 border-rose-500/30";

  const handleDownloadJsonl = () => {
    const lines = displayTraces.map((t) => JSON.stringify(t)).join("\n");
    const blob = new Blob([lines], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atelieros-traces-${sessionId || Date.now()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-border bg-[#faf8f5]/80 backdrop-blur-xs transition-all">
      {/* Collapsible toggle bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 text-xs cursor-pointer select-none hover:bg-black/[0.02]"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔭</span>
          <span className="font-semibold text-foreground tracking-tight">
            Pipeline Observability & Evals
          </span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 animate-pulse border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live AGY Trace
            </span>
          )}
          {evalResult && (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${verdictBadge}`}>
              Score: {evalResult.score}/100 • {evalResult.verdict}
            </span>
          )}
          {budget && (
            <span className="text-muted text-[11px]">
              Tokens: {(budget.total_input_tokens + budget.total_output_tokens).toLocaleString()} ($
              {budget.estimated_cost_usd.toFixed(4)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted text-[11px] font-mono">
            {displayTraces.length} events
          </span>
          <span className="text-muted text-xs">
            {isOpen ? "▲ Hide" : "▼ Expand"}
          </span>
        </div>
      </div>

      {/* Expanded Dashboard Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-xs border-t border-border/50">
          {/* Subnav Tabs */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "summary"
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                📊 Scorecard & Budget
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "timeline"
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ MCP Tool Timeline ({toolCallCompletions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "raw"
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                📜 Event Logs ({displayTraces.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadJsonl}
              disabled={displayTraces.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-surface hover:bg-muted/20 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>⬇</span> Download JSONL
            </button>
          </div>

          {/* TAB 1: Summary & Budget */}
          {activeTab === "summary" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Eval Card */}
              <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    5-Pillar Autonomous Eval Rubric
                  </span>
                  {evalResult ? (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${verdictBadge}`}>
                      {evalResult.score}/100 ({evalResult.verdict})
                    </span>
                  ) : (
                    <span className="text-muted text-[11px]">Awaiting run completion…</span>
                  )}
                </div>

                {evalResult ? (
                  <>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all duration-500"
                        style={{ width: `${Math.min(evalResult.score, 100)}%` }}
                      />
                    </div>

                    {/* Criteria Breakdown */}
                    <div className="space-y-1 pt-1">
                      <div className="text-[11px] font-semibold text-foreground">Verified Criteria:</div>
                      <div className="flex flex-wrap gap-1">
                        {evalResult.criteria_hits.map((hit, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]"
                          >
                            ✓ {hit}
                          </span>
                        ))}
                      </div>

                      {evalResult.criteria_missed.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {evalResult.criteria_missed.map((miss, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2 py-0.5 rounded text-[10px]"
                            >
                              ✕ {miss}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Persona Scores */}
                    {evalResult.persona_scores && (
                      <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-1.5 text-[11px]">
                        <div>Vikram (Arch): <strong className="text-foreground">{evalResult.persona_scores.chief_architect ?? 0}%</strong></div>
                        <div>Ananya (NBC): <strong className="text-foreground">{evalResult.persona_scores.code_specialist ?? 0}%</strong></div>
                        <div>Rohan (Design): <strong className="text-foreground">{evalResult.persona_scores.interior_designer ?? 0}%</strong></div>
                        <div>Sunil (BOQ): <strong className="text-foreground">{evalResult.persona_scores.cost_estimator ?? 0}%</strong></div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted text-[11px] italic">
                    When you run a consultation, the AGY evaluation harness will automatically grade statutory citations, arithmetic rigor, BOQ deltas, and MCP tool use.
                  </p>
                )}
              </div>

              {/* Token & Infra Budget Card */}
              <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Infrastructure & Token Meter
                  </span>
                  <span className="text-[10px] text-muted font-mono">Gemini 2.5 Flash</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="rounded border border-border/60 bg-muted/10 p-2">
                    <div className="text-[10px] text-muted uppercase">Input Tokens</div>
                    <div className="font-bold text-sm text-foreground">
                      {budget ? budget.total_input_tokens.toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="rounded border border-border/60 bg-muted/10 p-2">
                    <div className="text-[10px] text-muted uppercase">Output Tokens</div>
                    <div className="font-bold text-sm text-foreground">
                      {budget ? budget.total_output_tokens.toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="rounded border border-border/60 bg-muted/10 p-2">
                    <div className="text-[10px] text-muted uppercase">Estimated Cost</div>
                    <div className="font-bold text-sm text-accent">
                      {budget ? `$${budget.estimated_cost_usd.toFixed(4)}` : "$0.0000"}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-muted space-y-1 pt-1 border-t border-border/50">
                  <div className="flex justify-between">
                    <span>AGY Engine Transport:</span>
                    <strong className="text-foreground">Stdio / MCP JSON-RPC 2.0</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>OpenTelemetry Span Exporter:</span>
                    <strong className="text-foreground">In-Memory + JSONL Sink</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Session ID:</span>
                    <strong className="font-mono text-foreground truncate max-w-[160px]">
                      {sessionId || "default-session"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MCP Tool Timeline */}
          {activeTab === "timeline" && (
            <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Model Context Protocol (MCP) Tool Execution Spans
                </span>
                <span className="text-[11px] text-muted">
                  {toolCallCompletions.length} tools executed
                </span>
              </div>

              {toolCalls.length === 0 ? (
                <p className="text-muted text-[11px] italic py-2">
                  No MCP tools called yet in this session.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {toolCallCompletions.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded border border-border/60 bg-muted/5 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-accent font-mono text-[11px]">⚡ {tc.tool_name}</span>
                        {tc.tool_args && (
                          <span className="text-muted text-[10px] font-mono truncate max-w-[280px]">
                            {tc.tool_args}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                          {tc.latency_ms ?? 0} ms
                        </span>
                        <span className="text-[10px] text-emerald-600">✓ Done</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Raw Event Logs */}
          {activeTab === "raw" && (
            <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  OpenTelemetry Structured Span Stream
                </span>
                <span className="text-[10px] text-muted font-mono">services/agy/traces.jsonl</span>
              </div>

              {displayTraces.length === 0 ? (
                <p className="text-muted text-[11px] italic py-2">No trace events recorded.</p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto font-mono text-[10px] pr-1">
                  {displayTraces.map((t, idx) => (
                    <div
                      key={idx}
                      className="rounded bg-muted/10 border border-border/40 p-1.5 hover:bg-muted/20"
                    >
                      <div className="flex items-center justify-between text-muted pb-0.5">
                        <span className="font-bold text-accent uppercase">[{t.event}]</span>
                        <span>{new Date(t.ts * 1000).toLocaleTimeString()}</span>
                      </div>
                      <pre className="text-foreground text-[10px] whitespace-pre-wrap break-all">
                        {JSON.stringify(t, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
