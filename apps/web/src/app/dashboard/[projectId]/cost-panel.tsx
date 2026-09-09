"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calculateProjectCost,
  type BOQItem,
  type ProjectCostEstimate,
} from "@/lib/cost-calculator";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import { Button } from "@/components/ui/button";

export function CostPanel({
  elements,
  region = "india",
  projectName,
}: {
  elements?: ConstructionElements | null;
  region?: "india" | "us";
  projectName?: string;
}) {
  const [tier, setTier] = useState<"budget" | "mid" | "premium">("mid");
  const [customRegion, setCustomRegion] = useState<"india" | "us">(region);

  const estimate: ProjectCostEstimate = calculateProjectCost(elements, customRegion);

  const grandTotal = estimate.grandTotal[tier];
  const ratePerSqFt = Math.round(grandTotal / Math.max(1, estimate.floorAreaSqFt));

  function exportCsv() {
    const headers = ["Category", "Description", "Quantity", "Unit", "Unit Rate", "Total"];
    const rows = estimate.items.map((it) => {
      const rate = tier === "budget" ? it.rateBudget : tier === "mid" ? it.rateMid : it.ratePremium;
      return [
        `"${it.category}"`,
        `"${it.description}"`,
        it.quantity,
        `"${it.unit}"`,
        rate,
        it.quantity * rate,
      ];
    });

    // Contingency row
    const cont = estimate.contingency[tier];
    rows.push(["Contingency (10%)", "Unforeseen site variations & buffer", 1, "sum", cont, cont]);

    // Grand total row
    rows.push(["GRAND TOTAL", `Project Specification (${tier.toUpperCase()})`, 1, "lump-sum", grandTotal, grandTotal]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BOQ-${projectName || "Project"}-${tier}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-xs">
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
            Automated takeoffs from floor plan geometry. Calculated across Budget, Standard, and Premium finishes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Region Switch */}
          <div className="flex items-center rounded border border-border bg-[#faf8f4] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCustomRegion("india")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                customRegion === "india" ? "bg-accent text-accent-foreground" : "text-muted"
              }`}
            >
              ₹ INR
            </button>
            <button
              type="button"
              onClick={() => setCustomRegion("us")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                customRegion === "us" ? "bg-accent text-accent-foreground" : "text-muted"
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
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                  tier === t
                    ? "bg-surface text-accent font-semibold shadow-xs border border-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={exportCsv} className="text-xs">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-[#faf8f4] p-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Carpet Area</span>
          <p className="text-base font-bold text-foreground">
            {estimate.floorAreaSqFt.toLocaleString()} <span className="text-xs font-normal text-muted">sqft</span>
          </p>
          <span className="text-[10px] text-muted">({estimate.floorAreaSqM} m²)</span>
        </div>

        <div className="rounded-lg border border-border bg-[#faf8f4] p-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Wall Surface</span>
          <p className="text-base font-bold text-foreground">
            {estimate.wallAreaSqFt.toLocaleString()} <span className="text-xs font-normal text-muted">sqft</span>
          </p>
          <span className="text-[10px] text-muted">({estimate.doorCount} doors, {estimate.windowCount} windows)</span>
        </div>

        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">Unit Rate</span>
          <p className="text-base font-bold text-accent">
            {estimate.symbol}{ratePerSqFt.toLocaleString()}
            <span className="text-xs font-normal"> / sqft</span>
          </p>
          <span className="text-[10px] text-muted capitalize">{tier} tier</span>
        </div>

        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">Total Estimate</span>
          <p className="text-base font-bold text-accent">
            {estimate.symbol}{grandTotal.toLocaleString()}
          </p>
          <span className="text-[10px] text-muted">incl. 10% contingency</span>
        </div>
      </div>

      {/* Itemized BOQ Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#faf8f4] border-b border-border text-[11px] font-semibold text-muted">
            <tr>
              <th className="py-2.5 px-3">Trade / Category</th>
              <th className="py-2.5 px-3">Scope & Specification</th>
              <th className="py-2.5 px-3 text-right">Quantity</th>
              <th className="py-2.5 px-3 text-right">Unit Rate ({estimate.symbol})</th>
              <th className="py-2.5 px-3 text-right">Subtotal ({estimate.symbol})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {estimate.items.map((it) => {
              const rate = tier === "budget" ? it.rateBudget : tier === "mid" ? it.rateMid : it.ratePremium;
              const subtotal = it.quantity * rate;
              return (
                <tr key={it.id} className="hover:bg-surface/50">
                  <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap">
                    {it.category}
                  </td>
                  <td className="py-2 px-3 text-muted">{it.description}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {it.quantity.toLocaleString()} {it.unit}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {rate.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                    {subtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}

            {/* Contingency Line */}
            <tr className="bg-[#faf8f4]/60">
              <td className="py-2 px-3 font-medium text-muted">Contingency</td>
              <td className="py-2 px-3 text-muted italic">10% allowance for site variations & rate fluctuations</td>
              <td className="py-2 px-3 text-right font-mono">10%</td>
              <td className="py-2 px-3 text-right font-mono">-</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-muted">
                {estimate.contingency[tier].toLocaleString()}
              </td>
            </tr>

            {/* Total Row */}
            <tr className="border-t-2 border-border bg-[#faf8f4]">
              <td colSpan={2} className="py-2.5 px-3 text-sm font-bold text-foreground">
                Grand Total ({tier.toUpperCase()} Finishes)
              </td>
              <td colSpan={2} className="py-2.5 px-3 text-right text-xs text-muted">
                Est. Completion Cost:
              </td>
              <td className="py-2.5 px-3 text-right text-sm font-bold text-accent font-mono">
                {estimate.symbol}{grandTotal.toLocaleString()}
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
