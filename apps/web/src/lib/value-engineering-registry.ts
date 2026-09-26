/**
/**
 * Value Engineering (VE) Registry for AtelierOS
 * 
 * Defines architectural trade package substitutions, Schedule of Rates (SOR) delta
 * formulas, procurement lead time impact, and statutory code citations.
 * Supports 1-click approvals with zero full-page reload.
 */

export interface ValueEngineeringSubstitution {
  id: string;
  tradePackageId: string;
  region: "india" | "us";
  title: string;
  baselineSpec: string;
  proposedSpec: string;
  baselineRate: number;
  proposedRate: number;
  leadTimeBaselineWeeks: number;
  leadTimeProposedWeeks: number;
  leadTimeSavingsWeeks: number;
  leadTimeImpact: string; // e.g. "-14 WEEKS LEAD TIME"
  rationale: string;
  codeStandardCitation: string;
  materialId?: string; // Links to materials-db.ts
  materialMap?: { flooring?: string; wall?: string };
}

/**
 * Interface contract matching PROJECT.md interface specifications
 */
export interface ValueEngineeringItem {
  id: string;
  tradePackage: string;
  baselineName: string;
  proposedName: string;
  baselineRate: number;
  proposedRate: number;
  savingsFormatted: string; // e.g. "-₹8,55,000"
  percentageSavings: number; // e.g. -30
  leadTimeImpact: string; // e.g. "-14 WEEKS LEAD TIME"
  description: string;
}

export interface VEApprovalState {
  approvedIds: string[];
  totalSavingsINR: number;
  weeksReduced: number;
}

export interface ParametricDeltaResult {
  savingsAmount: number;
  savingsFormatted: string;
  percentageSavings: number;
  percentageFormatted: string;
  leadTimeSavingsWeeks: number;
  leadTimeImpact: string;
  compositeDeltaChipText: string; // e.g. "-₹8,55,000 / -30%"
}

/**
 * Benchmark constants for reference & fallback
 * Benchmark 1,200 sqft (111.5 sqm) flat with ₹28.5L baseline budget.
 */
export const VE_BENCHMARK = {
  FLOOR_AREA_SQFT: 1200,
  WALL_AREA_SQFT: 1938,
  PROJECT_BUDGET_INR: 2850000,
};

/**
 * Master catalog of pre-engineered Value Engineering substitutions
 */
export const VALUE_ENGINEERING_CATALOG: ValueEngineeringSubstitution[] = [
  {
    id: "ve_flooring_kajaria_kota",
    tradePackageId: "flooring_stone",
    region: "india",
    title: "Vitrified PGVT / Kota Stone Flooring",
    baselineSpec: "Imported Italian Statuario Marble (mirror-polished, bookmatched)",
    proposedSpec: "Kajaria PGVT 1200×600 / Honed Kota Stone (IS 15477 C2TE S1)",
    baselineRate: 840, // ₹840/sqft baseline in premium tier
    proposedRate: 127.5, // ₹127.50/sqft proposed blended rate
    leadTimeBaselineWeeks: 16, // 16-week international import from Carrara
    leadTimeProposedWeeks: 2, // 2-week domestic Rajasthan quarry delivery
    leadTimeSavingsWeeks: 14,
    leadTimeImpact: "-14 WEEKS LEAD TIME",
    rationale:
      "Replaces imported Italian marble with large-format Kajaria vitrified porcelain tile or honed Kota limestone, eliminating 14 weeks of shipping & customs delays and slashing capex by 30% against standard residential budgets.",
    codeStandardCitation: "IS 15477:2019 Type 2 / C2TE S1 | IS 13753",
    materialId: "fl_vitrified_kajaria",
    materialMap: { flooring: "fl_vitrified_kajaria" },
  },
  {
    id: "ve_wall_royale_zerovoc",
    tradePackageId: "wall_finishes",
    region: "india",
    title: "Royale Health Shield Zero-VOC Luxury Emulsion",
    baselineSpec: "Imported Venetian Lime Stucco / Microcement Plaster",
    proposedSpec: "Asian Paints Royale Health Shield Zero-VOC Luxury Emulsion (<5g/L VOC)",
    baselineRate: 165,
    proposedRate: 36,
    leadTimeBaselineWeeks: 6,
    leadTimeProposedWeeks: 1,
    leadTimeSavingsWeeks: 5,
    leadTimeImpact: "-5 WEEKS LEAD TIME",
    rationale:
      "Substitutes artisanal imported stucco with silver-ion antibacterial Zero-VOC emulsion, achieving fast application, GreenGuard Gold certification, and substantial cost reduction.",
    codeStandardCitation: "GreenGuard Gold | VOC < 5g/L | IS 15489",
    materialId: "wl_asian_paints_royale",
    materialMap: { wall: "wl_asian_paints_royale" },
  },
  {
    id: "ve_doors_bwp_marine",
    tradePackageId: "door_suites",
    region: "india",
    title: "BWP 710 Marine Core with Kiln-Dried Teak Veneer",
    baselineSpec: "Custom Solid Burma Teak & Imported Hafele Architectural Mortise Hardware",
    proposedSpec: "BWP 710 Marine Plywood Core with IS 287 Kiln-Dried Teak Veneer (8-12% EMC)",
    baselineRate: 28000,
    proposedRate: 16500,
    leadTimeBaselineWeeks: 10,
    leadTimeProposedWeeks: 3,
    leadTimeSavingsWeeks: 7,
    leadTimeImpact: "-7 WEEKS LEAD TIME",
    rationale:
      "Replaces monolithic solid timber prone to tropical warping with engineered BWP 710 marine plywood core and kiln-dried natural teak veneer, improving dimensional stability under seasonal humidity variations.",
    codeStandardCitation: "IS 287:1993 (8-12% EMC) | IS 710 BWP",
  },
  {
    id: "ve_civil_aac_blocks",
    tradePackageId: "civil_masonry",
    region: "india",
    title: "Lightweight AAC Blockwork & Thin-Bed Mortar",
    baselineSpec: "230mm Wire-Cut Clay Brick Masonry & Double-Coat Sand-Cement Plaster",
    proposedSpec: "150mm Autoclaved Aerated Concrete (AAC) Blocks with Polymer Thin-Bed Mortar",
    baselineRate: 340,
    proposedRate: 210,
    leadTimeBaselineWeeks: 4,
    leadTimeProposedWeeks: 1.5,
    leadTimeSavingsWeeks: 2.5,
    leadTimeImpact: "-2.5 WEEKS LEAD TIME",
    rationale:
      "Reduces dead load by 50% on structural RCC frames, lowers thermal conductivity, and accelerates masonry erection speed by 3x compared to conventional burnt clay bricks.",
    codeStandardCitation: "IS 2185 Part 3 | IS 1905 Section 4",
  },
  {
    id: "ve_flooring_us_porcelain",
    tradePackageId: "flooring_us",
    region: "us",
    title: "24×48 Glazed Porcelain Tile / Engineered White Oak",
    baselineSpec: "Imported Italian Carrara Marble Slab & Custom Mitered Baseboards",
    proposedSpec: "24×48 Large-Format Glazed Porcelain Tile / Engineered White Oak Planks",
    baselineRate: 38.0,
    proposedRate: 14.0,
    leadTimeBaselineWeeks: 12,
    leadTimeProposedWeeks: 1,
    leadTimeSavingsWeeks: 11,
    leadTimeImpact: "-11 WEEKS LEAD TIME",
    rationale:
      "Substitutes delicate, porous natural marble with frost-resistant, zero-absorption porcelain tile, cutting material supply cost and eliminating international ocean freight lead times.",
    codeStandardCitation: "ANSI A137.1 / TCNA 09 30 00",
  },
];

/**
 * Calculates parametric delta savings and lead time impact for a substitution.
 * If totalBudget is provided, calculates project-level capex percentage reduction.
 */
export function calculateVEDelta(
  substitution: ValueEngineeringSubstitution,
  quantity: number,
  totalBudget?: number,
  currencySymbol = "₹",
): ParametricDeltaResult {
  const rateDelta = substitution.baselineRate - substitution.proposedRate;
  const savingsAmount = Math.max(0, Math.round(quantity * rateDelta));

  // Determine percentage savings against project budget or package baseline
  let percentageSavings = 0;
  if (savingsAmount > 0) {
    if (totalBudget && totalBudget > 0) {
      percentageSavings = -Math.round((savingsAmount / totalBudget) * 100);
    } else {
      const packageBaseline = quantity * substitution.baselineRate;
      if (packageBaseline > 0) {
        percentageSavings = -Math.round((savingsAmount / packageBaseline) * 100);
      }
    }
  }
  if (percentageSavings === 0) {
    percentageSavings = 0;
  }

  // Format currency with Indian grouping for INR or standard for USD
  let formattedNumber = "";
  if (currencySymbol === "₹") {
    formattedNumber = savingsAmount.toLocaleString("en-IN");
  } else {
    formattedNumber = savingsAmount.toLocaleString("en-US");
  }

  const savingsFormatted = `-${currencySymbol}${formattedNumber}`;
  const percentageFormatted = `${percentageSavings}%`;
  const compositeDeltaChipText = `${savingsFormatted} / ${percentageFormatted}`;

  return {
    savingsAmount,
    savingsFormatted,
    percentageSavings,
    percentageFormatted,
    leadTimeSavingsWeeks: substitution.leadTimeSavingsWeeks,
    leadTimeImpact: substitution.leadTimeImpact,
    compositeDeltaChipText,
  };
}

/**
 * Returns substitutions applicable to a given trade package and region
 */
export function getSubstitutionsForPackage(
  packageId: string,
  region: "india" | "us" = "india",
): ValueEngineeringSubstitution[] {
  return VALUE_ENGINEERING_CATALOG.filter(
    (s) => s.tradePackageId === packageId && s.region === region,
  );
}

/**
 * Returns all substitutions for a given region
 */
export function getAllSubstitutions(
  region: "india" | "us" = "india",
): ValueEngineeringSubstitution[] {
  return VALUE_ENGINEERING_CATALOG.filter((s) => s.region === region);
}

/**
 * Converts a ValueEngineeringSubstitution into the ValueEngineeringItem interface
 */
export function toValueEngineeringItem(
  sub: ValueEngineeringSubstitution,
  quantity: number,
  totalBudget?: number,
  currencySymbol = "₹",
): ValueEngineeringItem {
  const delta = calculateVEDelta(sub, quantity, totalBudget, currencySymbol);
  return {
    id: sub.id,
    tradePackage: sub.tradePackageId,
    baselineName: sub.baselineSpec,
    proposedName: sub.proposedSpec,
    baselineRate: sub.baselineRate,
    proposedRate: sub.proposedRate,
    savingsFormatted: delta.savingsFormatted,
    percentageSavings: delta.percentageSavings,
    leadTimeImpact: sub.leadTimeImpact,
    description: sub.rationale,
  };
}
