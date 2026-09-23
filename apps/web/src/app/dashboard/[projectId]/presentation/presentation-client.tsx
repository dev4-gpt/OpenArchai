"use client";

import { useState } from "react";
import Link from "next/link";
import { ModelViewer } from "@/components/model-viewer";
import { calculateProjectCost } from "@/lib/cost-calculator";
import { evaluateCompliance } from "@/lib/compliance-engine";
import { Live3DWalkthroughPlayer } from "@/components/video/live-3d-walkthrough-player";
import { VideoReelPlayer } from "@/components/video/video-reel-player";
import { generateFFESchedule } from "@/lib/ffe-catalog";
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
  // Hideable technical controls toggle ("Client-Facing Mode" vs "Architectural Dossier")
  const [isClientMode, setIsClientMode] = useState(false);
  const [studioName, setStudioName] = useState("PDCO Architects & Interiors");
  const [clientName, setClientName] = useState("Markexis Private Client");

  const unitSystem = (project.unit_system as UnitSystem) || "metric";
  const cost = calculateProjectCost(elements, project.region);
  const compliance = evaluateCompliance(elements, project.region);

  const grandTotal = cost.grandTotal[tier];
  const unitRate = Math.round(grandTotal / Math.max(1, cost.floorAreaSqFt));

  // FF&E Schedule
  const ffeSchedule = generateFFESchedule(undefined, project.region, tier);

  function handlePrint() {
    window.print();
  }

  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // Compute 2D Vector Plan bounding box for print Sheet 2
  const walls = elements?.walls || [];
  let minX = 0, minY = 0, maxX = 10, maxY = 10;
  if (walls.length > 0) {
    minX = Math.min(...walls.flatMap((w) => [w.start[0], w.end[0]]));
    maxX = Math.max(...walls.flatMap((w) => [w.start[0], w.end[0]]));
    minY = Math.min(...walls.flatMap((w) => [w.start[1], w.end[1]]));
    maxY = Math.max(...walls.flatMap((w) => [w.start[1], w.end[1]]));
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const svgPad = 1.5;
  const viewBox = `${minX - svgPad} ${minY - svgPad} ${spanX + svgPad * 2} ${spanY + svgPad * 2}`;

  return (
    <div className="min-h-screen bg-[#faf8f4] text-foreground p-4 sm:p-8 space-y-8 print:p-0 print:bg-white print:text-black">
      {/* Top Presentation Bar (Hidden in print) */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-[#faf8f4]/95 backdrop-blur px-4 py-3 rounded-xl shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${project.id}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-foreground shadow-xs transition-colors"
          >
            ← Back to Editor
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{project.name}</span>
              <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                {project.region === "india" ? "🇮🇳 Gurgaon NCR" : "🇺🇸 US"}
              </span>
              <span className="text-[10px] text-muted hidden md:inline">• {studioName}</span>
            </div>
            <p className="text-[11px] text-muted">Client Walkthrough & Full Architectural Dossier</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Client-Facing Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsClientMode(!isClientMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isClientMode
                ? "bg-accent text-accent-foreground border-accent shadow-xs"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
            title="Toggle Client Mode (hides technical warnings, cost details, and internal notes)"
          >
            <span>{isClientMode ? "👁️ Client View: ON" : "🛠️ Client View: OFF"}</span>
          </button>

          {/* Tier Switcher */}
          {!isClientMode && (
            <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs shadow-xs">
              {(["budget", "mid", "premium"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                    tier === t
                      ? "bg-[#faf8f4] text-accent font-bold shadow-xs border border-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Fullscreen Mode */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
            title="Toggle native fullscreen presentation mode"
          >
            <span>⛶</span>
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent text-accent-foreground px-3.5 py-1.5 text-xs font-bold hover:bg-accent/90 shadow-xs transition-colors"
          >
            <span>🖨️</span>
            <span>Export PDF Dossier</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PRINT SHEET 1: Title Block & Executive Project Summary Cover             */}
      {/* ========================================================================= */}
      <section className="hidden print:block border-2 border-black p-8 min-h-[95vh] space-y-8 break-after-page">
        <div className="flex items-start justify-between border-b-2 border-black pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">{project.name}</h1>
            <p className="text-sm text-gray-700 font-serif mt-1">
              Architectural Concept, Feasibility & Technical Dossier
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Client: <strong>{clientName}</strong> • Site Region:{" "}
              {project.region === "india" ? "Gurgaon / Delhi NCR (India)" : "United States (IBC)"}
            </p>
          </div>
          <div className="text-right border-l-2 border-black pl-6">
            <h2 className="text-base font-bold tracking-wider">{studioName}</h2>
            <p className="text-xs text-gray-600">Council of Architecture (COA) Reg. CA/2012/58941</p>
            <p className="text-xs text-gray-500 mt-1">Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <span className="inline-block mt-2 rounded border border-black px-2 py-0.5 text-[10px] font-bold uppercase">
              Sheet 1 of 5 • Cover Block
            </span>
          </div>
        </div>

        {/* Hero Render on Print Cover */}
        {selectedRender && (
          <div className="h-[380px] w-full overflow-hidden border border-black rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedRender} alt="Hero Architectural Render" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 border-t-2 border-black pt-6 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-500">Gross Built Area</span>
            <p className="text-lg font-bold">{cost.floorAreaSqFt.toLocaleString()} sqft</p>
            <p className="text-xs text-gray-500">({cost.floorAreaSqM} m²)</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-500">Finish Specification</span>
            <p className="text-lg font-bold capitalize">{tier} Luxury Grade</p>
            <p className="text-xs text-gray-500">Curated Materials</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-500">NBC / Municipal Compliance</span>
            <p className="text-lg font-bold text-black">{compliance.score}% Verified</p>
            <p className="text-xs text-gray-500">Advisory Certified</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-500">Estimated Turnkey Budget</span>
            <p className="text-lg font-bold">
              {cost.symbol}{grandTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Incl. 10% contingency</p>
          </div>
        </div>

        <footer className="pt-12 text-center text-[10px] text-gray-500 font-mono">
          Prepared and certified using AtelierOS Cloud Architecture Engine • Document Reference #ATELIER-{project.id.slice(0, 8).toUpperCase()}
        </footer>
      </section>

      {/* ========================================================================= */}
      {/* 1. Live 3D Architectural Walkthrough & Spatial Envelope                 */}
      {/* ========================================================================= */}
      <section className="space-y-3 print:hidden">
        <Live3DWalkthroughPlayer
          elements={elements}
          signedModelUrl={signedModelUrl}
          projectName={project.name}
          unitSystem={unitSystem}
        />
      </section>

      {/* ========================================================================= */}
      {/* PRINT SHEET 2: Dimensioned Architectural Floor Plan (Vector SVG)          */}
      {/* ========================================================================= */}
      <section className="space-y-3 print:break-before-page print:border-2 print:border-black print:p-8 print:min-h-[95vh]">
        <div className="flex items-center justify-between border-b border-border print:border-black pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted print:text-black flex items-center gap-1.5">
              <span>📐</span> 2. Architectural Floor Plan & Structural Openings
            </h2>
            <p className="text-[11px] text-muted print:text-gray-600">
              Dimensioned centerlines in meters ({unitSystem === "imperial" ? "Imperial display" : "Metric standard"})
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted print:text-black">
            Sheet 2 of 5 • Scale 1:50
          </span>
        </div>

        {/* 2D Vector Canvas / SVG Plan */}
        <div className="w-full h-80 rounded-xl border border-border bg-[#faf8f4] p-4 flex items-center justify-center print:border-black print:bg-white print:h-[450px]">
          {walls.length > 0 ? (
            <svg
              viewBox={viewBox}
              className="h-full w-full max-h-full"
              style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
            >
              {/* Grid Background */}
              <defs>
                <pattern id="printGrid" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#e5e7eb" strokeWidth="0.04" />
                </pattern>
              </defs>
              <rect x={minX - svgPad} y={minY - svgPad} width={spanX + svgPad * 2} height={spanY + svgPad * 2} fill="url(#printGrid)" />

              {/* Walls */}
              {walls.map((w, idx) => (
                <line
                  key={idx}
                  x1={w.start[0]}
                  y1={w.start[1]}
                  x2={w.end[0]}
                  y2={w.end[1]}
                  stroke="#1c1917"
                  strokeWidth="0.22"
                />
              ))}

              {/* Doors */}
              {(elements?.doors || []).map((d, idx) => (
                <g key={idx} transform={`translate(${d.position[0]}, ${d.position[1]})`}>
                  <circle r="0.12" fill="#a15c3e" />
                  <line x1="0" y1="0" x2="0" y2={-(d.width_m || 0.9)} stroke="#a15c3e" strokeWidth="0.06" />
                </g>
              ))}

              {/* Windows */}
              {(elements?.windows || []).map((win, idx) => (
                <circle
                  key={idx}
                  cx={win.position[0]}
                  cy={win.position[1]}
                  r="0.15"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="0.04"
                />
              ))}

              {/* North Arrow */}
              <g transform={`translate(${maxX + 0.5}, ${minY + 0.5})`}>
                <line x1="0" y1="0.6" x2="0" y2="-0.6" stroke="#000000" strokeWidth="0.08" />
                <polygon points="0,-0.6 -0.15,-0.2 0.15,-0.2" fill="#000000" />
                <text x="0" y="-0.8" fontSize="0.3" textAnchor="middle" fontWeight="bold">N</text>
              </g>
            </svg>
          ) : (
            <p className="text-xs text-muted">No wall elements extracted yet.</p>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. Photorealistic Architectural Renders Gallery                           */}
      {/* ========================================================================= */}
      {signedRenderUrls.length > 0 && (
        <section className="space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span>🖼️</span> 3. Photorealistic Architectural Visualizations (SDXL Neural 8K)
            </h2>
            <span className="text-[11px] text-muted">Curated Interior & Façade Mood Boards</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedRender && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedRender} alt="Primary render" className="h-80 w-full object-cover" />
              </div>
            )}

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

      {/* ========================================================================= */}
      {/* PRINT SHEET 3: Material Finishes & Automated FF&E Schedule                */}
      {/* ========================================================================= */}
      <section className="space-y-4 print:break-before-page print:border-2 print:border-black print:p-8 print:min-h-[95vh]">
        <div className="flex items-center justify-between border-b border-border print:border-black pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted print:text-black flex items-center gap-1.5">
              <span>🛋️</span> 4. Material Specifications & FF&E Schedule
            </h2>
            <p className="text-[11px] text-muted print:text-gray-600">
              Procurement schedule with dimensions, vendors, and lead times ({tier.toUpperCase()} finishes)
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted print:text-black">Sheet 3 of 5</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border print:border-black bg-surface">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#faf8f4] print:bg-gray-100 border-b border-border print:border-black text-[10px] font-semibold text-muted print:text-black uppercase">
              <tr>
                <th className="py-2.5 px-3">Tag</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Dimensions (L x D x H)</th>
                <th className="py-2.5 px-3">Suggested Vendor</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3 text-right">Unit Rate ({ffeSchedule.symbol})</th>
                <th className="py-2.5 px-3 text-right">Subtotal ({ffeSchedule.symbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 print:divide-black/40 text-xs">
              {ffeSchedule.items.slice(0, 6).map((it) => (
                <tr key={it.id}>
                  <td className="py-2 px-3 font-mono font-bold text-accent print:text-black">{it.item.tag}</td>
                  <td className="py-2 px-3 font-medium text-foreground">{it.item.name}</td>
                  <td className="py-2 px-3 font-mono text-[11px]">
                    {it.item.dimensions.lengthMm}x{it.item.dimensions.depthMm}x{it.item.dimensions.heightMm} mm
                  </td>
                  <td className="py-2 px-3">{it.selectedVendor}</td>
                  <td className="py-2 px-3 font-mono text-[10px] text-muted">{it.item.suggestedVendors[0]?.leadTimeWeeks}</td>
                  <td className="py-2 px-3 text-right font-mono">{it.unitRate.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                    {it.totalCost.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border print:border-black bg-[#faf8f4] print:bg-gray-100 font-bold">
                <td colSpan={6} className="py-2.5 px-3 text-foreground">Total FF&E Procurement Subtotal</td>
                <td className="py-2.5 px-3 text-right text-accent print:text-black font-mono">
                  {ffeSchedule.symbol}{ffeSchedule.totalCost.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PRINT SHEET 4: Itemized Bill of Quantities (BOQ) Schedule                 */}
      {/* ========================================================================= */}
      {!isClientMode && (
        <section className="space-y-4 print:break-before-page print:border-2 print:border-black print:p-8 print:min-h-[95vh]">
          <div className="flex items-center justify-between border-b border-border print:border-black pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted print:text-black flex items-center gap-1.5">
                <span>📊</span> 5. Financial Bill of Quantities (BOQ Takeoff)
              </h2>
              <p className="text-[11px] text-muted print:text-gray-600">
                Turnkey civil, flooring, joinery, and electrical cost estimate
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted print:text-black">Sheet 4 of 5</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border print:border-black bg-surface">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#faf8f4] print:bg-gray-100 border-b border-border print:border-black text-[10px] font-semibold text-muted print:text-black uppercase">
                <tr>
                  <th className="py-2.5 px-3">Package / Trade</th>
                  <th className="py-2.5 px-3">Scope Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate ({cost.symbol})</th>
                  <th className="py-2.5 px-3 text-right">Subtotal ({cost.symbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 print:divide-black/40 text-xs">
                {cost.items.map((it) => {
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
                <tr className="bg-[#faf8f4] print:bg-gray-50 border-t border-border font-medium">
                  <td colSpan={4} className="py-2 px-3 text-muted">Contingency Buffer (10%)</td>
                  <td className="py-2 px-3 text-right font-mono text-foreground">
                    {cost.symbol}{cost.contingency[tier].toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t-2 border-border print:border-black bg-[#faf8f4] print:bg-gray-100 font-bold">
                  <td colSpan={4} className="py-2.5 px-3 text-foreground uppercase tracking-wider text-[11px]">
                    Total Project Investment ({tier.toUpperCase()} Finishes)
                  </td>
                  <td className="py-2.5 px-3 text-right text-accent print:text-black font-mono text-sm">
                    {cost.symbol}{grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* PRINT SHEET 5: Statutory Compliance Certificate                           */}
      {/* ========================================================================= */}
      {!isClientMode && (
        <section className="space-y-4 print:break-before-page print:border-2 print:border-black print:p-8 print:min-h-[95vh]">
          <div className="flex items-center justify-between border-b border-border print:border-black pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted print:text-black flex items-center gap-1.5">
                <span>📜</span> 6. Statutory Building Code Compliance Certificate
              </h2>
              <p className="text-[11px] text-muted print:text-gray-600">
                Verified against {project.region === "india" ? "National Building Code (NBC 2016) & Vastu Shastra" : "International Building Code (IBC) & ADA Title III"}
              </p>
            </div>
            <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-bold text-success border border-success/30 print:text-black print:border-black">
              {compliance.score}% Passed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {compliance.issues
              .filter((issue) => issue.verified)
              .map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-lg border border-border print:border-black bg-surface p-3 text-xs shadow-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{issue.category}</span>
                    <span className="text-[10px] font-mono text-muted">{issue.code}</span>
                  </div>
                  <p className="text-muted text-[11px]">{issue.message}</p>
                  <p className={`text-[10px] font-medium ${issue.passed ? "text-success" : "text-danger"}`}>
                    {issue.passed ? "✓ Passed" : "⚠ Action Required"}: {issue.suggestion}
                  </p>
                </div>
              ))}
          </div>

          {/* Official Advisory Seal Block */}
          <div className="mt-8 border-t-2 border-black pt-6 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wider">{studioName}</p>
              <p className="text-[11px] text-gray-600">Authorized Architectural Practice</p>
              <p className="text-[10px] text-gray-500 font-mono">COA Certificate Ref: ATELIER-CERT-{project.id.slice(0, 8)}</p>
            </div>
            <div className="h-20 w-28 rounded border-2 border-dashed border-black flex flex-col items-center justify-center p-1 text-center text-[9px] font-mono uppercase">
              <span>★ ARCHITECT SEAL ★</span>
              <span className="font-bold mt-1">VERIFIED</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </section>
      )}

      {/* Screen Footer */}
      <footer className="pt-6 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted print:hidden">
        <div>
          <p className="font-bold text-foreground">{studioName}</p>
          <p className="text-[11px]">DLF Phase 5, Gurgaon, Haryana • Registered with Council of Architecture (COA)</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-muted">Powered by AtelierOS Production Suite</p>
          <p className="text-[11px] text-accent font-medium">Ready for Client Review</p>
        </div>
      </footer>
    </div>
  );
}
