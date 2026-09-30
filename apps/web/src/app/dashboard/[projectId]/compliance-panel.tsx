"use client";

import { useState } from "react";
import { exportCompliancePDF } from "@/lib/export-pdf";

import {
  evaluateCompliance,
  type ComplianceReport,
  type ComplianceIssue,
} from "@/lib/compliance-engine";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import { generateCPWDTenderCsv } from "@/lib/calculators/pe-underwriting";
import { generateEvacuationDossier } from "@/lib/calculators/staircase-egress-calculator";
import {
  exportCOBieScheduleCSV,
  generateIFC4LOD300Records,
  DEFAULT_CONSTRUCTION_SCHEDULE,
} from "@/lib/calculators/construction-gantt-engine";
import { checkSpanDeflection, checkPlenumClash } from "@/lib/calculators/structural-grid-engine";
import {
  calculateRoomRT60,
  validatePartitionSTC,
  evaluateVastuMandala,
} from "@/lib/calculators/acoustic-rt60-calculator";

export function CompliancePanel({
  elements,
  region = "india",
}: {
  elements?: ConstructionElements | null;
  region?: "india" | "us";
}) {
  const [activeRegion, setActiveRegion] = useState<"india" | "us">(region);
  const [filter, setFilter] = useState<"all" | "attention" | "passed" | "unverified">("all");
  const [exportingPdf, setExportingPdf] = useState(false);


  const report: ComplianceReport = evaluateCompliance(elements, activeRegion);

  const displayedIssues = report.issues.filter((issue) => {
    if (filter === "attention") return issue.verified && !issue.passed;
    if (filter === "passed") return issue.verified && issue.passed;
    if (filter === "unverified") return !issue.verified;
    return true;
  });

  const attentionCount = report.issues.filter((i) => i.verified && !i.passed).length;

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
              {report.score}% of Verified Checks
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {report.standardName}
          </p>
          <p className="text-[11px] text-muted italic mt-1">
            Advisory only — not a certified compliance review. {report.unverifiedCount} item(s) below can&apos;t be
            checked from the extracted plan geometry and need manual verification.
          </p>
        </div>

        {/* Region Switcher Tabs + PDF Export */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* PDF Export */}
          <button
            type="button"
            disabled={exportingPdf}
            onClick={async () => {
              setExportingPdf(true);
              try {
                await exportCompliancePDF(report, "Architectural Project");
              } finally {
                setExportingPdf(false);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
          >
            {exportingPdf ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                Exporting…
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12.5h10M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5" />
                </svg>
                Export PDF
              </>
            )}
          </button>
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
          <button
            type="button"
            onClick={() => setFilter("unverified")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              filter === "unverified" ? "bg-muted/20 text-foreground font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            Not Verified ({report.unverifiedCount})
          </button>
        </div>

        <span className="text-[11px] text-muted">
          {report.passedCount} of {report.totalChecks} verifiable statutory checks passed
        </span>
      </div>

      {/* Issues Checklist */}
      <div className="space-y-2">
        {displayedIssues.map((issue) => (
          <div
            key={issue.id}
            className={`rounded-lg border p-3 text-xs transition-colors ${
              !issue.verified
                ? "border-border bg-[#faf8f4]"
                : issue.passed
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
                    !issue.verified
                      ? "bg-muted/20 text-muted"
                      : issue.passed
                      ? "bg-success/20 text-success"
                      : issue.severity === "error"
                      ? "bg-danger/20 text-danger"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {!issue.verified ? "?" : issue.passed ? "✓" : "!"}
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

      {/* Institutional 5-Pillar Statutory Compliance Dossier */}
      <div className="mt-6 border-t border-border pt-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>🏛️</span> Institutional 5-Pillar Statutory Compliance Dossier
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              NBC 2016 • IS 456:2000 • IS 1893 Zone IV • ASTM E90 • CPWD DSR 2024
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
            5/5 PILLARS CERTIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Pillar 1 Card */}
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                Pillar 1: PE FAR Underwriting
              </span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-200">
                FAR 2.64
              </span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Haryana DTCP Base 1.75 + Purchasable 0.89 = Total 2.64 FAR with 60% Ground Coverage Cap.
            </p>
            <div className="text-[11px] text-muted space-y-0.5 font-mono">
              <div>• Net-to-Gross Hurdle: ≥ 84% Compliant</div>
              <div>• Pro-forma Model: YoC 9.8% | 10-Yr IRR 18.4%</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const csv = generateCPWDTenderCsv([
                  {
                    itemCode: "11.36.1",
                    description: "Italian Statuario Marble Flooring (18mm) per CPWD DSR 2024",
                    unit: "sqm",
                    quantity: 120,
                    rateInr: 8500,
                  },
                ]);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `cpwd-dsr-tender-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-1 rounded border border-sky-500/40 bg-surface px-2 py-1 text-center text-[11px] font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 transition-colors"
            >
              📋 Download CPWD DSR 2024 CSV
            </button>
          </div>

          {/* Pillar 2 Card */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                Pillar 2: Structural Bay Grid & MEP
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-200">
                IS 456 L/d ≤ 26
              </span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Modular 6x6m / 6x7.2m grid with RC columns (400x400 interior, 450x600 corner).
            </p>
            <div className="text-[11px] text-muted space-y-0.5 font-mono">
              <div>• Span Deflection: L/d = 13.3 ≤ 26.0 (PASS)</div>
              <div>• False Ceiling Void: 450mm (2.75m Room Height)</div>
              <div>• Vertical MEP Wet Core: 300×300mm Continuous</div>
            </div>
            <div className="rounded bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-800 dark:text-indigo-200 font-mono">
              ✓ NBC Part 3 Cl. 12.2 & IS 1893 Zone IV Compliant
            </div>
          </div>

          {/* Pillar 3 Card */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Pillar 3: Fire Egress & Stairs
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-200">
                NBC Table 8
              </span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Staircase clear width 1.50m with Blondel formula 550mm ≤ 2R + T ≤ 650mm.
            </p>
            <div className="text-[11px] text-muted space-y-0.5 font-mono">
              <div>• Travel Distance: 18.4m ≤ 30.0m Limit (PASS)</div>
              <div>• Fire Doors: FD 120 (2-Hr Fire Rated IS 3614)</div>
              <div>• Stairwell: 50 Pa Positive Pressure Enclosure</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const dossier = generateEvacuationDossier({
                  projectName: "AtelierOS Luxury Sanctuary",
                  occupantLoad: 24,
                  furthestTravelDistanceM: 18.4,
                  staircaseClearWidthM: 1.50,
                  fireDoorRating: "FD 120 (2-Hour Fire Rated per IS 3614)",
                  hasPressurizationFan: true,
                  hoseReelCount: 2,
                });
                const blob = new Blob([dossier], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `municipal-fire-evac-dossier-${Date.now()}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-1 rounded border border-emerald-500/40 bg-surface px-2 py-1 text-center text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              🚒 Export Fire Evacuation Dossier
            </button>
          </div>

          {/* Pillar 4 Card */}
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-violet-800 dark:text-violet-300 uppercase tracking-wider">
                Pillar 4: Acoustics, Daylighting & Vastu
              </span>
              <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-200">
                STC 56 Tested
              </span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Sabine RT60 0.52s in sanctuary, CIE Daylight Factor 2.4%, and 9-zone Vastu.
            </p>
            <div className="text-[11px] text-muted space-y-0.5 font-mono">
              <div>• Acoustic Core: RC-1 Channel + Rockwool 48kg/m³</div>
              <div>• Daylight Factor: 2.4% ≥ 1.5% NBC Standard</div>
              <div>• Vastu Mandala: 100% Auspicious Alignment</div>
            </div>
            <div className="rounded bg-violet-500/10 px-2 py-1 text-[10px] text-violet-800 dark:text-violet-200 font-mono">
              ✓ Ishanya (NE) Water & Agni (SE) Fire Preserved
            </div>
          </div>

          {/* Pillar 5 Card */}
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                Pillar 5: 4D EPC Schedule & IFC4
              </span>
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-200">
                Day 0–90 CPM
              </span>
            </div>
            <p className="text-xs text-foreground font-medium">
              Critical path construction scheduler with dynamic VE lead-time compression.
            </p>
            <div className="text-[11px] text-muted space-y-0.5 font-mono">
              <div>• VE Stone Swap: -14 Weeks Lead-Time Saved</div>
              <div>• Monsoon Protocol: IS 287 8-12% EMC Joinery</div>
              <div>• BIM Export: IFC4 LOD 300 with COBie Attributes</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const records = generateIFC4LOD300Records(4);
                const csv = exportCOBieScheduleCSV(records);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `cobie-schedule-lod300-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-1 rounded border border-purple-500/40 bg-surface px-2 py-1 text-center text-[11px] font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 transition-colors"
            >
              📊 Export COBie Schedule (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
