"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MATERIALS_CATALOG,
  getMaterialsByCategory,
  type MaterialCategory,
  type MaterialItem,
} from "@/lib/materials-db";
import { Input } from "@/components/ui/input";

export default function MaterialsPage() {
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | "all">("all");
  const [selectedRegion, setSelectedRegion] = useState<"india" | "us" | "all">("india");
  const [tier, setTier] = useState<"budget" | "mid" | "premium">("mid");
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);

  const filteredMaterials = MATERIALS_CATALOG.filter((item) => {
    const matchCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchReg = selectedRegion === "all" || item.region === selectedRegion || item.region === "global";
    const matchSearch =
      search.trim() === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    return matchCat && matchReg && matchSearch;
  });

  function formatPrice(item: MaterialItem): string {
    const rate =
      tier === "budget" ? item.rateBudget : tier === "mid" ? item.rateMid : item.ratePremium;
    const symbol = item.region === "us" ? "$" : "₹";
    return `${symbol}${rate.toLocaleString()} / ${item.priceUnit}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
            ← Back to Projects
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Architectural Finishes & Materials Library
          </h1>
          <p className="text-xs text-muted">
            Curated architectural materials for Indian and US residential construction. Real market rates for Gurgaon NCR & US metro regions.
          </p>
        </div>

        {/* Global Tier & Region Switches */}
        <div className="flex items-center gap-3">
          {/* Region Filter */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRegion("india")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedRegion === "india" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              🇮🇳 India
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegion("us")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedRegion === "us" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              🇺🇸 US
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegion("all")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                selectedRegion === "all" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              All
            </button>
          </div>

          {/* Pricing Tier */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs">
            {(["budget", "mid", "premium"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-2 py-1 rounded capitalize font-medium transition-colors ${
                  tier === t ? "bg-surface border border-border shadow-xs text-accent font-semibold" : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "all", label: "All Categories" },
              { id: "flooring", label: "Flooring & Stone" },
              { id: "walls", label: "Walls & Paint" },
              { id: "countertops", label: "Countertops" },
              { id: "fittings", label: "Fittings & Bath" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                selectedCategory === c.id
                  ? "border-accent bg-accent/10 text-accent font-medium"
                  : "border-border text-foreground hover:border-accent/40"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="w-64">
          <Input
            type="text"
            placeholder="Search finishes, brands, stones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMaterials.map((mat) => (
          <div
            key={mat.id}
            onClick={() => setSelectedMaterial(mat)}
            className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-surface shadow-xs transition-all hover:border-accent/50 hover:shadow-sm"
          >
            {/* Swatch Image / Photo */}
            <div className="relative h-40 w-full overflow-hidden bg-muted/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mat.thumbnailUrl}
                alt={mat.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 left-2 flex gap-1.5">
                <span className="rounded bg-surface/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-foreground border border-border">
                  {mat.subcategory}
                </span>
                {mat.brand && (
                  <span className="rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {mat.brand}
                  </span>
                )}
              </div>
              <span className="absolute bottom-2 right-2 rounded bg-surface/90 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-accent border border-border">
                {formatPrice(mat)}
              </span>
            </div>

            {/* Info */}
            <div className="p-3 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                {mat.name}
              </h3>
              <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                {mat.description}
              </p>

              {/* Specs Pills */}
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/60">
                {Object.entries(mat.specs).slice(0, 2).map(([k, v]) => (
                  <span key={k} className="text-[10px] text-muted">
                    <strong className="font-medium text-foreground">{k}:</strong> {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted">
          No materials match your filter criteria.
        </div>
      )}

      {/* Modal Detail View */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-accent uppercase">
                  {selectedMaterial.category} • {selectedMaterial.subcategory}
                </span>
                <h2 className="text-lg font-bold text-foreground">{selectedMaterial.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="rounded p-1 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="h-48 w-full overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedMaterial.thumbnailUrl}
                alt={selectedMaterial.name}
                className="h-full w-full object-cover"
              />
            </div>

            <p className="text-xs text-muted leading-relaxed">{selectedMaterial.description}</p>

            {/* Tier Breakdown */}
            <div className="rounded-lg border border-border bg-[#faf8f4] p-3 space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground">Estimated Supply & Install Rate</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-surface p-2 border border-border text-center">
                  <span className="text-[10px] text-muted uppercase">Budget</span>
                  <p className="font-semibold text-foreground">
                    {selectedMaterial.region === "us" ? "$" : "₹"}
                    {selectedMaterial.rateBudget.toLocaleString()} / {selectedMaterial.priceUnit}
                  </p>
                </div>
                <div className="rounded bg-surface p-2 border border-accent/40 text-center">
                  <span className="text-[10px] text-accent uppercase font-bold">Standard</span>
                  <p className="font-bold text-accent">
                    {selectedMaterial.region === "us" ? "$" : "₹"}
                    {selectedMaterial.rateMid.toLocaleString()} / {selectedMaterial.priceUnit}
                  </p>
                </div>
                <div className="rounded bg-surface p-2 border border-border text-center">
                  <span className="text-[10px] text-muted uppercase">Premium</span>
                  <p className="font-semibold text-foreground">
                    {selectedMaterial.region === "us" ? "$" : "₹"}
                    {selectedMaterial.ratePremium.toLocaleString()} / {selectedMaterial.priceUnit}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Specs */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-foreground">Technical Specifications</h4>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(selectedMaterial.specs).map(([k, v]) => (
                  <div key={k} className="rounded border border-border/60 p-1.5">
                    <dt className="text-[10px] text-muted">{k}</dt>
                    <dd className="font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
