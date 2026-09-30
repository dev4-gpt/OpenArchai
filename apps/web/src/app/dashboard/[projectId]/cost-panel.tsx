"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  calculateProjectCost,
  type ProjectCostEstimate,
} from "@/lib/cost-calculator";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import { Button } from "@/components/ui/button";
import {
  VE_BENCHMARK,
  calculateVEDelta,
  getSubstitutionsForPackage,
  getAllSubstitutions,
  type ValueEngineeringSubstitution,
} from "@/lib/value-engineering-registry";
import {
  calculatePEUnderwriting,
  generateCPWDTenderCsv,
} from "@/lib/calculators/pe-underwriting";

export function CostPanel({
  elements,
  region = "india",
  projectName,
}: {
  elements?: ConstructionElements | null;
  region?: "india" | "us";
  projectName?: string;
}) {
  const [tier, setTier] = useState<"budget" | "mid" | "premium">("premium");
  const [customRegion, setCustomRegion] = useState<"india" | "us">(region);
  const [approvedVEIds, setApprovedVEIds] = useState<Set<string>>(new Set());

  const estimate: ProjectCostEstimate = useMemo(
    () => calculateProjectCost(elements, customRegion),
    [elements, customRegion],
  );

  const hasCADData = Boolean(elements?.walls && elements.walls.length > 0);

  // Available substitutions for current region
  const availableSubstitutions = useMemo(
    () => getAllSubstitutions(customRegion),
    [customRegion],
  );

  // Baseline calculations for current tier
  const baselineGrandTotal = estimate.grandTotal[tier];
  const baselineRatePerSqFt = Math.round(
    baselineGrandTotal / Math.max(1, estimate.floorAreaSqFt),
  );

  // Reference budget for capex percentage reduction calculation
  // For India benchmark: ₹28.5L budget (VE_BENCHMARK.PROJECT_BUDGET_INR)
  const referenceBudget =
    customRegion === "india" && Math.abs(estimate.floorAreaSqFt - 1200) < 50
      ? VE_BENCHMARK.PROJECT_BUDGET_INR
      : baselineGrandTotal;

  // Live item transformation when VE substitutions are approved
  const liveItems = useMemo(() => {
    return estimate.items.map((item) => {
      const pkgSubs = getSubstitutionsForPackage(item.id, customRegion);
      const activeSub = pkgSubs.find((s) => approvedVEIds.has(s.id));

      if (activeSub) {
        const liveRate =
          tier === "budget"
            ? Math.min(item.rateBudget, activeSub.proposedRate)
            : tier === "mid"
            ? Math.min(item.rateMid, activeSub.proposedRate)
            : activeSub.proposedRate;

        return {
          ...item,
          isVEApproved: true,
          activeSub,
          liveRate,
          liveSubtotal: item.quantity * liveRate,
          baselineRate:
            tier === "budget"
              ? item.rateBudget
              : tier === "mid"
              ? item.rateMid
              : item.ratePremium,
        };
      }

      const baselineRate =
        tier === "budget"
          ? item.rateBudget
          : tier === "mid"
          ? item.rateMid
          : item.ratePremium;

      return {
        ...item,
        isVEApproved: false,
        activeSub: undefined,
        liveRate: baselineRate,
        liveSubtotal: item.quantity * baselineRate,
        baselineRate,
      };
    });
  }, [estimate.items, customRegion, approvedVEIds, tier]);

  // Live totals and metrics (instant 60fps recalculation in React memory)
  const liveSubtotal = useMemo(() => {
    return liveItems.reduce((acc, it) => acc + it.liveSubtotal, 0);
  }, [liveItems]);

  const liveContingency = Math.round(liveSubtotal * 0.1);
  const liveGrandTotal = liveSubtotal + liveContingency;
  const liveRatePerSqFt = Math.round(
    liveGrandTotal / Math.max(1, estimate.floorAreaSqFt),
  );

  // Total savings across all approved substitutions
  const totalSavedAmount = Math.max(0, baselineGrandTotal - liveGrandTotal);
  const totalLeadTimeWeeksSaved = useMemo(() => {
    return availableSubstitutions
      .filter((s) => approvedVEIds.has(s.id))
      .reduce((acc, s) => acc + s.leadTimeSavingsWeeks, 0);
  }, [availableSubstitutions, approvedVEIds]);

  // Pillar 1: Institutional Private Equity Underwriting & CPWD Tender Model
  const peUnderwriting = useMemo(() => {
    const carpet = Math.max(1, estimate.floorAreaSqFt);
    const gfa = Math.round(carpet / 0.85);
    return calculatePEUnderwriting({
      carpetAreaSqFt: carpet,
      grossFloorAreaSqFt: gfa,
      totalCapexINR: liveGrandTotal,
    });
  }, [estimate.floorAreaSqFt, liveGrandTotal]);

  const handleExportCPWDTender = useCallback(() => {
    const csvData = generateCPWDTenderCsv(peUnderwriting.cpwdTenderSchedule);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CPWD-DSR-2024-Tender-Schedule-${projectName || "Project"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [peUnderwriting.cpwdTenderSchedule, projectName]);

  // Toggle single substitution approval
  const toggleApproval = useCallback((subId: string) => {
    setApprovedVEIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      return next;
    });
  }, []);

  // Approve all available substitutions
  const handleApproveAll = useCallback(() => {
    setApprovedVEIds(new Set(availableSubstitutions.map((s) => s.id)));
  }, [availableSubstitutions]);

  // Revert all
  const handleRevertAll = useCallback(() => {
    setApprovedVEIds(new Set());
  }, []);

  // Listen for atelier-recalculate-boq from AI Agent consultations
  useEffect(() => {
    const handleRecalculateBoq = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const payload = typeof detail === "string" ? detail.toLowerCase() : "";

      setApprovedVEIds((prev) => {
        const next = new Set(prev);
        if (payload.includes("wall") || payload.includes("royale")) {
          next.add("ve_wall_royale_zerovoc");
        } else {
          // Default to flooring substitution as primary showcase
          next.add("ve_flooring_kajaria_kota");
        }
        return next;
      });
    };

    window.addEventListener("atelier-recalculate-boq", handleRecalculateBoq);
    return () => {
      window.removeEventListener("atelier-recalculate-boq", handleRecalculateBoq);
    };
  }, []);

  // Dispatch atelier-boq-updated and atelier-apply-materials when state changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("atelier-boq-updated", {
        detail: {
          approvedVEIds: Array.from(approvedVEIds),
          grandTotal: liveGrandTotal,
          ratePerSqFt: liveRatePerSqFt,
          totalSavings: totalSavedAmount,
          currency: estimate.currency,
          tier,
          timestamp: Date.now(),
        },
      }),
    );

    // Sync materials with 3D scene & demo sandbox
    for (const sub of availableSubstitutions) {
      if (approvedVEIds.has(sub.id)) {
        if (sub.materialMap) {
          window.dispatchEvent(
            new CustomEvent("atelier-apply-materials", {
              detail: sub.materialMap,
            }),
          );
        } else if (sub.materialId) {
          window.dispatchEvent(
            new CustomEvent("atelier-apply-materials", {
              detail: { flooring: sub.materialId },
            }),
          );
        }
      }
    }
  }, [
    approvedVEIds,
    liveGrandTotal,
    liveRatePerSqFt,
    totalSavedAmount,
    estimate.currency,
    tier,
    availableSubstitutions,
  ]);

  function exportCsv() {
    const headers = [
      "Category",
      "Description",
      "Quantity",
      "Unit",
      "Unit Rate",
      "Total",
      "VE Status",
    ];
    const rows = liveItems.map((it) => {
      const desc =
        it.isVEApproved && it.activeSub
          ? `"${it.activeSub.proposedSpec} (Value Engineered from ${it.activeSub.baselineSpec})"`
          : `"${it.description}"`;
      const veStatus = it.isVEApproved ? '"Approved Alternate"' : '"Baseline"';
      return [
        `"${it.category}"`,
        desc,
        it.quantity,
        `"${it.unit}"`,
        it.liveRate,
        it.liveSubtotal,
        veStatus,
      ];
    });

    // Contingency row
    rows.push([
      "Contingency (10%)",
      "Unforeseen site variations & buffer",
      1,
      "sum",
      liveContingency,
      liveContingency,
      '""',
    ]);

    // Grand total row
    rows.push([
      "GRAND TOTAL",
      `Project Specification (${tier.toUpperCase()}${
        approvedVEIds.size > 0 ? " - VE Active" : ""
      })`,
      1,
      "lump-sum",
      liveGrandTotal,
      liveGrandTotal,
      `"Savings: ${estimate.symbol}${totalSavedAmount.toLocaleString()}"`,
    ]);

    const metadataRows = [
      `# AtelierOS Schedule of Rates - Bill of Quantities Takeoff`,
      `# Project: ${projectName || "Project"} | Region: ${customRegion.toUpperCase()} | Tier: ${tier.toUpperCase()}`,
      `# Value Engineering: ${approvedVEIds.size} substitutions approved (Total Capex Savings: ${estimate.symbol}${totalSavedAmount.toLocaleString()})`,
    ];

    const csvContent = [
      ...metadataRows,
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BOQ-${projectName || "Project"}-${tier}${
      approvedVEIds.size > 0 ? "-VE" : ""
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-xs">
      {/* Informative banner if fallback benchmark flat is displayed */}
      {!hasCADData && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📐</span>
            <span>
              <strong>Standard Benchmark Mode:</strong> Displaying 1,200 sqft
              (111.5 m²) residential flat takeoff with ₹28.5L capex budget.
            </span>
          </div>
          <span className="text-[11px] opacity-80">
            Upload CAD floor plan above to customize takeoffs
          </span>
        </div>
      )}

      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Bill of Quantities (BOQ) & Cost Estimation
            </h2>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
              {customRegion === "india" ? "🇮🇳 Gurgaon SOR" : "🇺🇸 US SOR"}
            </span>
          </div>
          <p className="text-xs text-muted">
            Automated takeoffs from floor plan geometry. Calculated across
            Budget, Standard, and Premium finishes.
          </p>
          <p className="text-[11px] text-muted italic mt-0.5">
            Parametric Schedule of Rates (SOR) with live Value Engineering
            approvals.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Region Switch */}
          <div className="flex items-center rounded border border-border bg-[#faf8f4] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCustomRegion("india")}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                customRegion === "india"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              ₹ INR
            </button>
            <button
              type="button"
              onClick={() => setCustomRegion("us")}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                customRegion === "us"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Tier Toggle */}
          <div className="flex items-center rounded border border-border bg-[#faf8f4] p-0.5 text-xs">
            {(["budget", "mid", "premium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors cursor-pointer ${
                  tier === t
                    ? "bg-surface text-accent font-semibold shadow-xs border border-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={exportCsv}
              className="text-xs cursor-pointer"
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const { exportBOQPDF } = await import("@/lib/export-pdf");
                await exportBOQPDF(estimate, projectName || "Architectural Project", tier);
              }}
              className="text-xs cursor-pointer flex items-center gap-1"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12.5h10M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5" />
              </svg>
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Value Engineering Summary Banner */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent text-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Value Engineering Schedule of Rates (SOR)
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                {approvedVEIds.size > 0
                  ? `${approvedVEIds.size} Substitution${
                      approvedVEIds.size > 1 ? "s" : ""
                    } Active`
                  : `${availableSubstitutions.length} Opportunities Available`}
              </span>
            </div>
            <p className="text-[11px] text-muted">
              {approvedVEIds.size > 0
                ? `Total Project Capex Reduced by ${
                    estimate.symbol
                  }${totalSavedAmount.toLocaleString()} (${totalLeadTimeWeeksSaved} weeks saved in procurement lead time).`
                : `Swap high-lead-time imported finishes with local architectural alternates for up to -₹8,55,000 (-30% capex) & -14 weeks lead time.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {approvedVEIds.size < availableSubstitutions.length ? (
            <Button
              type="button"
              size="sm"
              onClick={handleApproveAll}
              className="text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer shadow-xs"
            >
              ⚡ 1-Click Approve All ({availableSubstitutions.length})
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRevertAll}
              className="text-xs font-medium cursor-pointer"
            >
              Revert All Substitutions
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="flex flex-col justify-between rounded-lg border border-border bg-[#faf8f4] p-3.5 text-center min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Carpet Area
          </span>
          <p className="text-base font-bold text-foreground my-1">
            {estimate.floorAreaSqFt.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted">sqft</span>
          </p>
          <span className="text-[11px] text-muted">
            ({estimate.floorAreaSqM} m²)
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-border bg-[#faf8f4] p-3.5 text-center min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Wall Surface
          </span>
          <p className="text-base font-bold text-foreground my-1">
            {estimate.wallAreaSqFt.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted">sqft</span>
          </p>
          <span className="block text-[11px] text-muted leading-tight">
            {estimate.linearWallMeters}m wall run · {estimate.doorCount} doors,{" "}
            {estimate.windowCount} windows
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-accent/40 bg-accent/5 p-3.5 text-center min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Unit Rate
          </span>
          <p className="text-base font-bold text-accent my-1">
            {approvedVEIds.size > 0 && (
              <span className="line-through text-muted/60 mr-1.5 text-xs font-normal">
                {estimate.symbol}
                {baselineRatePerSqFt.toLocaleString()}
              </span>
            )}
            {estimate.symbol}
            {liveRatePerSqFt.toLocaleString()}
            <span className="text-xs font-normal"> / sqft</span>
          </p>
          <span className="text-[11px] text-muted capitalize">
            {approvedVEIds.size > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                -{estimate.symbol}
                {(baselineRatePerSqFt - liveRatePerSqFt).toLocaleString()}/sqft
                VE cut
              </span>
            ) : (
              `${tier} tier`
            )}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-accent/40 bg-accent/5 p-3.5 text-center min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Total Estimate
          </span>
          <p className="text-base font-bold text-accent my-1">
            {approvedVEIds.size > 0 && (
              <span className="line-through text-muted/60 mr-1.5 text-xs font-normal">
                {estimate.symbol}
                {baselineGrandTotal.toLocaleString()}
              </span>
            )}
            {estimate.symbol}
            {liveGrandTotal.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted">
            {approvedVEIds.size > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Saved -{estimate.symbol}
                {totalSavedAmount.toLocaleString()} (-
                {Math.round((totalSavedAmount / baselineGrandTotal) * 100)}%)
              </span>
            ) : (
              "incl. 10% contingency"
            )}
          </span>
        </div>
      </div>

      {/* Pillar 1: Institutional PE Financial Underwriting & Statutory FAR Monetization */}
      <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Institutional PE Real Estate Underwriting & Pro-Forma
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                    peUnderwriting.isInstitutionalGrade
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {peUnderwriting.isInstitutionalGrade
                    ? "INSTITUTIONAL GRADE ✓"
                    : "SUB-OPTIMAL YIELD ⚠️"}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Gurugram DLF Phase 5 Grade A Micro-Market | ₹125/sqft/mo | 15% OPEX | Exit Cap 8.0%
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportCPWDTender}
            className="text-xs font-semibold bg-sky-900/60 border border-sky-500/40 text-sky-200 hover:bg-sky-800/80 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>📋</span>
            <span>Download CPWD DSR 2024 Tender Schedule (CSV)</span>
          </Button>
        </div>

        {/* 4 Core Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Yield-on-Cost (YoC) */}
          <div className="rounded-lg border border-sky-500/30 bg-surface/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Yield-on-Cost (YoC)
            </span>
            <p className="text-lg font-bold text-foreground my-1">
              {peUnderwriting.yieldOnCostFormatted}
            </p>
            <span className="text-[10px] text-muted block">
              {peUnderwriting.yieldOnCostPercent >= 8.5
                ? "≥ 8.5% Hurdle [PASS]"
                : "< 8.5% Hurdle [WARN]"}
            </span>
          </div>

          {/* Net Operating Income (NOI) */}
          <div className="rounded-lg border border-sky-500/30 bg-surface/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Net Operating Income (NOI)
            </span>
            <p className="text-lg font-bold text-foreground my-1">
              ₹{(peUnderwriting.netOperatingIncomeINR / 100000).toFixed(2)}L
              <span className="text-xs font-normal text-muted"> / yr</span>
            </p>
            <span className="text-[10px] text-muted block">
              ₹{peUnderwriting.netOperatingIncomeINR.toLocaleString()} annualized
            </span>
          </div>

          {/* 10-Yr Unlevered IRR */}
          <div className="rounded-lg border border-sky-500/30 bg-surface/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              10-Yr Pro-Forma IRR
            </span>
            <p className="text-lg font-bold text-foreground my-1">
              {peUnderwriting.estimated10YrIRRPercent.toFixed(1)}%
            </p>
            <span className="text-[10px] text-muted block">
              5% rent growth · 8% exit cap
            </span>
          </div>

          {/* Capital Payback Period */}
          <div className="rounded-lg border border-sky-500/30 bg-surface/80 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Capital Payback
            </span>
            <p className="text-lg font-bold text-foreground my-1">
              {peUnderwriting.paybackPeriodYears.toFixed(1)}
              <span className="text-xs font-normal text-muted"> yrs</span>
            </p>
            <span className="text-[10px] text-muted block">
              Total Capex recovery cycle
            </span>
          </div>
        </div>

        {/* Haryana DTCP Statutory FAR & NTG Summary Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sky-500/20 text-[11px] font-mono text-muted">
          <div className="flex items-center gap-3">
            <span>
              🏛️ Base FAR:{" "}
              <strong className="text-foreground">
                {peUnderwriting.baseAllowableGFA.toLocaleString()} sqft
              </strong>{" "}
              (1.75)
            </span>
            <span>+</span>
            <span>
              Purchasable FAR:{" "}
              <strong className="text-foreground">
                {peUnderwriting.purchasableGFA.toLocaleString()} sqft
              </strong>{" "}
              (0.89)
            </span>
            <span>=</span>
            <span>
              Max Permissible:{" "}
              <strong className="text-sky-300">
                {peUnderwriting.totalPermissibleGFA.toLocaleString()} sqft
              </strong>{" "}
              (2.64)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Carpet Efficiency (NTG):</span>
            <strong
              className={
                peUnderwriting.meetsNTGThreshold
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {peUnderwriting.carpetToSaleablePercentFormatted} (≥ 84% Hurdle)
            </strong>
          </div>
        </div>
      </div>

      {/* Itemized BOQ Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-[#faf8f4] border-b border-border text-[11px] font-semibold text-muted">
            <tr>
              <th className="py-2.5 px-3">Trade / Category</th>
              <th className="py-2.5 px-3">Scope & Specification</th>
              <th className="py-2.5 px-3 text-right">Quantity</th>
              <th className="py-2.5 px-3 text-right">
                Unit Rate ({estimate.symbol})
              </th>
              <th className="py-2.5 px-3 text-right">
                Subtotal ({estimate.symbol})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {liveItems.map((it) => {
              const pkgSubs = getSubstitutionsForPackage(
                it.id,
                customRegion,
              );

              return (
                <tr key={it.id} className="hover:bg-surface/50">
                  <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap align-top">
                    <div className="flex items-center gap-1.5">
                      <span>{it.category}</span>
                      {it.isVEApproved && (
                        <span className="inline-flex items-center rounded-xs bg-emerald-500/15 px-1 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          VE ACTIVE
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-3 text-muted align-top">
                    <div>
                      {it.isVEApproved && it.activeSub ? (
                        <div>
                          <span className="font-semibold text-foreground">
                            {it.activeSub.proposedSpec}
                          </span>
                          <span className="block text-[11px] text-muted-foreground italic mt-0.5">
                            Substituted from: {it.activeSub.baselineSpec} (Code:{" "}
                            {it.activeSub.codeStandardCitation})
                          </span>
                        </div>
                      ) : (
                        <span>{it.description}</span>
                      )}

                      {/* Render Parametric Value Engineering Delta Chips & 1-Click Approval */}
                      {pkgSubs.map((sub: ValueEngineeringSubstitution) => {
                        const delta = calculateVEDelta(
                          sub,
                          it.quantity,
                          referenceBudget,
                          estimate.symbol,
                        );
                        const isApproved = approvedVEIds.has(sub.id);

                        return (
                          <div
                            key={sub.id}
                            className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-[#faf8f4] dark:bg-muted/10 p-2 text-xs"
                          >
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <span className="text-accent font-semibold">
                                VE Alternate:
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                {sub.proposedSpec}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                              {/* Financial Savings Chip: -₹8,55,000 / -30% */}
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs"
                                title={`Savings: ${delta.savingsFormatted} (${delta.percentageFormatted} against project capex)`}
                              >
                                <span className="text-[10px]">↓</span>
                                <span>{delta.compositeDeltaChipText}</span>
                              </span>

                              {/* Procurement Lead Time Impact Chip: -14 WEEKS LEAD TIME */}
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-tight text-amber-800 dark:text-amber-300 shadow-2xs"
                                title={`${sub.leadTimeBaselineWeeks} wks baseline import → ${sub.leadTimeProposedWeeks} wks regional supply`}
                              >
                                <span>⏱️</span>
                                <span>{delta.leadTimeImpact}</span>
                              </span>

                              {/* 1-Click Interactive Approval Button */}
                              {isApproved ? (
                                <div className="inline-flex items-center gap-1.5 ml-1">
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                    <span>✓</span>
                                    <span>Approved</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleApproval(sub.id)}
                                    className="text-[10px] text-muted hover:text-foreground underline transition-colors cursor-pointer"
                                  >
                                    Revert
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleApproval(sub.id)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 shadow-2xs cursor-pointer ml-1"
                                >
                                  <span>⚡</span>
                                  <span>Approve Value Engineering</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-2 px-3 text-right font-mono align-top">
                    {it.quantity.toLocaleString()} {it.unit}
                  </td>

                  <td className="py-2 px-3 text-right font-mono align-top">
                    {it.isVEApproved ? (
                      <div>
                        <span className="line-through text-muted/60 mr-1.5 font-normal text-[11px]">
                          {it.baselineRate.toLocaleString()}
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {it.liveRate.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span>{it.liveRate.toLocaleString()}</span>
                    )}
                  </td>

                  <td className="py-2 px-3 text-right font-mono font-semibold text-foreground align-top">
                    {it.isVEApproved ? (
                      <div>
                        <span className="line-through text-muted/60 mr-1.5 font-normal text-[11px]">
                          {(it.quantity * it.baselineRate).toLocaleString()}
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {it.liveSubtotal.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span>{it.liveSubtotal.toLocaleString()}</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Contingency Line */}
            <tr className="bg-[#faf8f4]/60">
              <td className="py-2 px-3 font-medium text-muted">Contingency</td>
              <td className="py-2 px-3 text-muted italic">
                10% allowance for site variations & rate fluctuations
              </td>
              <td className="py-2 px-3 text-right font-mono">10%</td>
              <td className="py-2 px-3 text-right font-mono">-</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-muted">
                {liveContingency.toLocaleString()}
              </td>
            </tr>

            {/* Total Row */}
            <tr className="border-t-2 border-border bg-[#faf8f4]">
              <td
                colSpan={2}
                className="py-2.5 px-3 text-sm font-bold text-foreground"
              >
                <div className="flex items-center gap-2">
                  <span>Grand Total ({tier.toUpperCase()} Finishes)</span>
                  {approvedVEIds.size > 0 && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 font-bold">
                      VE Slashed: -{estimate.symbol}
                      {totalSavedAmount.toLocaleString()}
                    </span>
                  )}
                </div>
              </td>
              <td colSpan={2} className="py-2.5 px-3 text-right text-xs text-muted">
                Est. Completion Cost:
              </td>
              <td className="py-2.5 px-3 text-right text-sm font-bold text-accent font-mono">
                {estimate.symbol}
                {liveGrandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer link to materials library */}
      <div className="flex items-center justify-between pt-1 text-xs text-muted">
        <span>Need specific stone, tile, or paint specifications?</span>
        <Link
          href="/materials"
          className="font-medium text-accent underline underline-offset-2 hover:text-accent/80"
        >
          Browse Architectural Materials Library →
        </Link>
      </div>
    </div>
  );
}
