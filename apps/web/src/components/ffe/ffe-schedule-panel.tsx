"use client";

import { useState } from "react";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import {
  generateFFESchedule,
  exportFFEScheduleCsv,
  FFE_CATALOG,
  type FFESpecItem,
} from "@/lib/ffe-catalog";

interface FFESchedulePanelProps {
  elements?: ConstructionElements | null;
  region?: "india" | "us";
  projectName?: string;
}

export function FFESchedulePanel({
  elements,
  region = "india",
  projectName = "Residence",
}: FFESchedulePanelProps) {
  const [tier, setTier] = useState<"budget" | "mid" | "premium">("mid");
  const [filterRoom, setFilterRoom] = useState<string>("all");

  // If elements has furniture placed, extract their ffeIds; otherwise use a standard curated residential pack
  const placedIds: string[] =
    elements?.furniture && elements.furniture.length > 0
      ? elements.furniture
          .map((f) => f.ffeId || FFE_CATALOG.find((cat) => cat.name.toLowerCase().includes(f.type))?.id || "ffe_sectional_sofa")
          .filter(Boolean)
      : ["ffe_sectional_sofa", "ffe_coffee_table", "ffe_dining_table", "ffe_king_bed", "ffe_wall_hung_wc", "ffe_vanity_basin", "ffe_eames_lounge"];

  const schedule = generateFFESchedule(placedIds, region, tier);

  const filteredItems = schedule.items.filter((it) => {
    if (filterRoom === "all") return true;
    return it.item.roomType === filterRoom;
  });

  function handleDownloadCsv() {
    const csv = exportFFEScheduleCsv(schedule);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, "_")}_ffe_schedule.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🛋️</span> Furniture, Fixtures & Equipment (FF&E) Schedule
            </h2>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
              Real-World Spec Sheet
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Architectural procurement schedule with dimensions, suggested vendors, lead times, and finishes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tier Selector */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs">
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

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent/40 shadow-xs transition-colors"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-3 text-center">
          <span className="text-[10px] font-semibold text-muted uppercase">FF&E Line Items</span>
          <p className="text-lg font-bold text-foreground">{schedule.items.length} Elements</p>
          <span className="text-[10px] text-muted">Architectural specs</span>
        </div>

        <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-3 text-center">
          <span className="text-[10px] font-semibold text-muted uppercase">Vendor Partners</span>
          <p className="text-lg font-bold text-foreground">{schedule.vendorCount} Brands</p>
          <span className="text-[10px] text-muted">Herman Miller, Jaquar, etc.</span>
        </div>

        <div className="rounded-lg border border-border bg-[#faf8f4]/60 p-3 text-center">
          <span className="text-[10px] font-semibold text-muted uppercase">Avg. Lead Time</span>
          <p className="text-lg font-bold text-foreground">3 - 5 Wks</p>
          <span className="text-[10px] text-muted">Procurement buffer</span>
        </div>

        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-center">
          <span className="text-[10px] font-bold text-accent uppercase">Total FF&E Budget</span>
          <p className="text-lg font-bold text-accent">
            {schedule.symbol}
            {schedule.totalCost.toLocaleString()}
          </p>
          <span className="text-[10px] text-muted capitalize">{tier} grade finishes</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2 text-xs">
        {[
          { id: "all", label: "All Items" },
          { id: "living", label: "Living Room" },
          { id: "dining", label: "Dining" },
          { id: "bedroom", label: "Bedroom" },
          { id: "bathroom", label: "Sanitary / Bath" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterRoom(tab.id)}
            className={`px-3 py-1 rounded-md transition-colors ${
              filterRoom === tab.id
                ? "bg-accent/15 text-accent font-semibold"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spec Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#faf8f4] border-b border-border text-[10px] font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Tag</th>
              <th className="py-2.5 px-3">Item & Description</th>
              <th className="py-2.5 px-3">Dimensions (L x D x H)</th>
              <th className="py-2.5 px-3">Suggested Vendor</th>
              <th className="py-2.5 px-3">Materials & Finish</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit ({schedule.symbol})</th>
              <th className="py-2.5 px-3 text-right">Total ({schedule.symbol})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {filteredItems.map((row) => (
              <tr key={row.id} className="hover:bg-[#faf8f4]/40 transition-colors">
                <td className="py-2 px-3 font-mono font-bold text-accent">{row.item.tag}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.item.thumbnailUrl}
                      alt={row.item.name}
                      className="h-9 w-9 rounded object-cover border border-border shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{row.item.name}</p>
                      <p className="text-[10px] text-muted line-clamp-1">{row.item.notes}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                  <p>
                    {row.item.dimensions.lengthMm} × {row.item.dimensions.depthMm} × {row.item.dimensions.heightMm} mm
                  </p>
                  <p className="text-[10px] text-muted">
                    ({row.item.dimensions.lengthIn}&quot; × {row.item.dimensions.depthIn}&quot; × {row.item.dimensions.heightIn}&quot;)
                  </p>
                </td>
                <td className="py-2 px-3">
                  <p className="font-medium text-foreground">{row.selectedVendor}</p>
                  <span className="text-[10px] text-muted font-mono">{row.item.suggestedVendors[0]?.leadTimeWeeks}</span>
                </td>
                <td className="py-2 px-3 text-[11px] text-muted">
                  <p className="font-medium text-foreground truncate max-w-[140px]">{row.item.finish}</p>
                  <p className="text-[10px] truncate max-w-[140px]">{row.item.materials.join(", ")}</p>
                </td>
                <td className="py-2 px-3 text-center font-mono font-semibold">{row.quantity}</td>
                <td className="py-2 px-3 text-right font-mono">{row.unitRate.toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                  {row.totalCost.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-[#faf8f4] font-bold">
              <td colSpan={7} className="py-3 px-3 text-foreground uppercase tracking-wider text-[11px]">
                Total FF&E Procurement Budget ({tier.toUpperCase()} Finishes)
              </td>
              <td className="py-3 px-3 text-right text-accent font-mono text-sm">
                {schedule.symbol}
                {schedule.totalCost.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
