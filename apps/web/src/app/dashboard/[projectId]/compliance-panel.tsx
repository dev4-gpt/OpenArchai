"use client";

import { useState } from "react";
import {
  evaluateCompliance,
  type ComplianceReport,
  type ComplianceIssue,
} from "@/lib/compliance-engine";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export function CompliancePanel({
  elements,
  region = "india",
}: {
  elements?: ConstructionElements | null;
  region?: "india" | "us";
}) {
  const [activeRegion, setActiveRegion] = useState<"india" | "us">(region);
  const [filter, setFilter] = useState<"all" | "attention" | "passed">("all");

  const report: ComplianceReport = evaluateCompliance(elements, activeRegion);

  const displayedIssues = report.issues.filter((issue) => {
    if (filter === "attention") return !issue.passed;
    if (filter === "passed") return issue.passed;
    return true;
  });

  const attentionCount = report.issues.filter((i) => !i.passed).length;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Building Code Compliance & Regulatory Checks
            </h2>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                report.score >= 80
                  ? "bg-success/15 text-success border border-success/30"
                  : report.score >= 60
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-danger/15 text-danger border border-danger/30"
              }`}
            >
              {report.score}% Compliant
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {report.standardName}
          </p>
        </div>

        {/* Region Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-[#faf8f4] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveRegion("india")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeRegion === "india"
                  ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              🇮🇳 India (NBC / Vastu)
            </button>
            <button
              type="button"
              onClick={() => setActiveRegion("us")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeRegion === "us"
                  ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              🇺🇸 US (IBC / ADA)
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Counter */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              filter === "all" ? "bg-accent/10 text-accent font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            All ({report.totalChecks})
          </button>
          <button
            type="button"
            onClick={() => setFilter("attention")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              filter === "attention" ? "bg-danger/10 text-danger font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            Needs Attention ({attentionCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("passed")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              filter === "passed" ? "bg-success/10 text-success font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            Passed ({report.passedCount})
          </button>
        </div>

        <span className="text-[11px] text-muted">
          {report.passedCount} of {report.totalChecks} statutory checks passed
        </span>
      </div>

      {/* Issues Checklist */}
      <div className="space-y-2">
        {displayedIssues.map((issue) => (
          <div
            key={issue.id}
            className={`rounded-lg border p-3 text-xs transition-colors ${
              issue.passed
                ? "border-border bg-surface hover:border-success/40"
                : issue.severity === "error"
                ? "border-danger/40 bg-danger/5"
                : "border-accent/40 bg-accent/5"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${
                    issue.passed
                      ? "bg-success/20 text-success"
                      : issue.severity === "error"
                      ? "bg-danger/20 text-danger"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {issue.passed ? "✓" : "!"}
                </span>
                <span className="font-semibold text-foreground">{issue.message}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded bg-[#faf8f4] border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted">
                  {issue.code}
                </span>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted border border-border">
                  {issue.category}
                </span>
              </div>
            </div>

            {/* Recommendation suggestion box */}
            <div className="mt-2 rounded bg-surface/80 p-2 border border-border/60 text-[11px] text-muted">
              <strong className="text-foreground font-medium">Recommendation: </strong>
              {issue.suggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
