"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ModelViewer } from "@/components/model-viewer";
import { calculateProjectCost } from "@/lib/cost-calculator";
import { evaluateCompliance } from "@/lib/compliance-engine";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { UnitSystem } from "@/lib/units";

interface PresentationClientProps {
  project: { id: string; name: string; region: "india" | "us"; unit_system: string };
  models: { id: string; gltf_storage_path: string | null }[];
  renders: { id: string; image_storage_path: string | null; prompt_style: string | null }[];
  elements?: ConstructionElements | null;
  signedModelUrl?: string | null;
  signedRenderUrls: { prompt: string; url: string }[];
}

export function PresentationClient({
  project,
  elements,
  signedModelUrl,
  signedRenderUrls,
}: PresentationClientProps) {
  const [tier, setTier] = useState<"budget" | "mid" | "premium">("mid");
  const [selectedRender, setSelectedRender] = useState<string | null>(
    signedRenderUrls[0]?.url || null,
  );

  const unitSystem = (project.unit_system as UnitSystem) || "metric";
  const cost = calculateProjectCost(elements, project.region);
  const compliance = evaluateCompliance(elements, project.region);

  const grandTotal = cost.grandTotal[tier];
  const unitRate = Math.round(grandTotal / Math.max(1, cost.floorAreaSqFt));

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] text-foreground p-6 sm:p-10 space-y-8 print:p-0 print:bg-white">
      {/* Top Presentation Bar (Hidden in print) */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${project.id}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-foreground shadow-xs transition-colors"
          >
            ← Exit Presentation
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{project.name}</span>
              <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
                {project.region === "india" ? "🇮🇳 Gurgaon NCR" : "🇺🇸 US"}
              </span>
            </div>
            <p className="text-[11px] text-muted">Client Walkthrough & Architectural Dossier</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Tier Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs shadow-xs">
            {(["budget", "mid", "premium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                  tier === t
                    ? "bg-[#faf8f4] text-accent font-bold shadow-xs border border-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
          >
            <span>🖨️</span>
            <span>Export PDF Dossier</span>
          </button>
        </div>
      </header>

      {/* Print Header (Visible only on print) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-xs text-gray-600">PDCO Architects • Architectural Design & Feasibility Dossier</p>
          </div>
          <div className="text-right text-xs">
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Standard: {project.region === "india" ? "NBC 2016 / Vastu Shastra" : "IBC / ADA"}</p>
          </div>
        </div>
      </div>

      {/* Hero Visual Section: 3D Model & Floor Plan Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            1. Spatial 3D Form & Volumetric Envelope
          </h2>
          <span className="text-[11px] text-muted">Interactive Orbit • Precision Real-world Scale</span>
        </div>

        {signedModelUrl ? (
          <div className="h-[480px] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm print:h-[350px]">
            <ModelViewer url={signedModelUrl} unitSystem={unitSystem} />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted">
            3D model rendering in progress…
          </div>
        )}
      </section>

      {/* Styled Renders Gallery Carousel */}
      {signedRenderUrls.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              2. Photorealistic Architectural Visualizations (SDXL 8K)
            </h2>
            <span className="text-[11px] text-muted">Curated Interior & Façade Mood Boards</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Featured Render */}
            {selectedRender && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedRender}
                  alt="Primary render"
                  className="h-80 w-full object-cover"
                />
              </div>
            )}

            {/* Thumbnails list */}
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {signedRenderUrls.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedRender(r.url)}
                  className={`cursor-pointer overflow-hidden rounded-lg border transition-all ${
                    selectedRender === r.url
                      ? "border-accent ring-2 ring-accent/20"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={r.prompt} className="h-28 w-full object-cover" />
                  <p className="p-1.5 text-[10px] text-muted truncate">{r.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Project Financials & Bill of Quantities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            3. Financial Takeoffs & Bill of Quantities ({tier.toUpperCase()} Finishes)
          </h2>
          <span className="text-[11px] text-muted">Gurgaon NCR Schedule of Rates (SOR)</span>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-surface p-3 text-center shadow-xs">
            <span className="text-[10px] font-semibold text-muted uppercase">Carpet Area</span>
            <p className="text-base font-bold text-foreground">
              {cost.floorAreaSqFt.toLocaleString()} sqft
            </p>
            <span className="text-[10px] text-muted">({cost.floorAreaSqM} m²)</span>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-center shadow-xs">
            <span className="text-[10px] font-semibold text-muted uppercase">Unit Rate</span>
            <p className="text-base font-bold text-foreground">
              {cost.symbol}{unitRate.toLocaleString()} / sqft
            </p>
            <span className="text-[10px] text-muted capitalize">{tier} finishes</span>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-center shadow-xs">
            <span className="text-[10px] font-semibold text-muted uppercase">Contingency (10%)</span>
            <p className="text-base font-bold text-foreground">
              {cost.symbol}{cost.contingency[tier].toLocaleString()}
            </p>
            <span className="text-[10px] text-muted">Price buffer</span>
          </div>

          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-center shadow-xs">
            <span className="text-[10px] font-bold text-accent uppercase">Total Investment</span>
            <p className="text-base font-bold text-accent">
              {cost.symbol}{grandTotal.toLocaleString()}
            </p>
            <span className="text-[10px] text-muted">Turnkey completion</span>
          </div>
        </div>

        {/* Itemized summary table */}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf8f4] border-b border-border text-[10px] font-semibold text-muted uppercase">
              <tr>
                <th className="py-2.5 px-3">Trade / Package</th>
                <th className="py-2.5 px-3">Scope Description</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Rate ({cost.symbol})</th>
                <th className="py-2.5 px-3 text-right">Subtotal ({cost.symbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {cost.items.slice(0, 5).map((it) => {
                const rate = tier === "budget" ? it.rateBudget : tier === "mid" ? it.rateMid : it.ratePremium;
                return (
                  <tr key={it.id}>
                    <td className="py-2 px-3 font-medium text-foreground">{it.category}</td>
                    <td className="py-2 px-3 text-muted">{it.description}</td>
                    <td className="py-2 px-3 text-right font-mono">{it.quantity.toLocaleString()} {it.unit}</td>
                    <td className="py-2 px-3 text-right font-mono">{rate.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                      {(it.quantity * rate).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-[#faf8f4] font-bold">
                <td colSpan={4} className="py-2.5 px-3 text-foreground">Total Turnkey Budget</td>
                <td className="py-2.5 px-3 text-right text-accent font-mono">
                  {cost.symbol}{grandTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Compliance & Approvals Dossier Stamp */}
      <section className="space-y-3 print:break-before-page">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            4. Statutory Building Code & Regulatory Verification
          </h2>
          <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-bold text-success border border-success/30">
            {compliance.score}% Statutory Compliance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {compliance.issues.slice(0, 4).map((issue) => (
            <div
              key={issue.id}
              className="rounded-lg border border-border bg-surface p-3 text-xs shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{issue.category}</span>
                <span className="text-[10px] font-mono text-muted">{issue.code}</span>
              </div>
              <p className="text-muted text-[11px]">{issue.message}</p>
              <p className="text-success text-[10px] font-medium">✓ {issue.suggestion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Stamp Footer */}
      <footer className="pt-6 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted">
        <div>
          <p className="font-bold text-foreground">PDCO Architects</p>
          <p className="text-[11px]">DLF Phase 5, Gurgaon, Haryana 122002 • Registered with Council of Architecture (COA)</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-muted">Generated by OpenArchai Platform</p>
          <p className="text-[11px] text-accent font-medium">Verified for Client Review</p>
        </div>
      </footer>
    </div>
  );
}
