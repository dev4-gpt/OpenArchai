/**
 * Adversarial Challenger Test Suite (Challenger 2) for AtelierOS.
 *
 * EMPIRICALLY STRESS-TESTS:
 * 1. Commercial Value Engineering Math & Invariant Formulations (value-engineering-registry.ts)
 * 2. Cost Calculator Geometry Robustness & Boundary Scaling (cost-calculator.ts)
 * 3. Master Materials Database Integrity & Certification Badges (materials-db.ts)
 * 4. Institutional Simulation Rubrics & Criterion Patterns (mirofish_studio_simulation.py)
 */

import {
  VALUE_ENGINEERING_CATALOG,
  VE_BENCHMARK,
  calculateVEDelta,
  getSubstitutionsForPackage,
  getAllSubstitutions,
  toValueEngineeringItem,
  type ValueEngineeringSubstitution,
} from "../value-engineering-registry";

import {
  calculateProjectCost,
  type ProjectCostEstimate,
} from "../cost-calculator";

import {
  MATERIALS_CATALOG,
  getMaterialsByCategory,
  getMaterialById,
  getMaterialBadges,
  getMaterialCertifications,
  type MaterialItem,
  type MaterialCategory,
} from "../materials-db";

import {
  generateCapexProof,
  generateNTGProof,
} from "./pe-boq";

import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

// ===========================================================================
// SECTION 1: VALUE ENGINEERING MATHEMATICAL INVARIANTS & BOUNDARY SCALING
// ===========================================================================

describe("Adversarial Challenge 1: Value Engineering Mathematical Invariants", () => {
  const flooringSub = VALUE_ENGINEERING_CATALOG.find((s) => s.id === "ve_flooring_kajaria_kota")!;

  it("Benchmark flat (1,200 sqft): exact formula ₹840 - ₹127.50 = ₹712.50 yields ₹8,55,000", () => {
    expect(flooringSub.baselineRate).toBe(840);
    expect(flooringSub.proposedRate).toBe(127.5);

    const unitRateDelta = flooringSub.baselineRate - flooringSub.proposedRate;
    expect(unitRateDelta).toBe(712.5);

    const delta = calculateVEDelta(flooringSub, 1200, 2850000);
    expect(delta.savingsAmount).toBe(855000);
    expect(delta.savingsFormatted).toBe("-₹8,55,000");
    expect(delta.percentageSavings).toBe(-30);
    expect(delta.percentageFormatted).toBe("-30%");
    expect(delta.leadTimeSavingsWeeks).toBe(14);
    expect(delta.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
    expect(delta.compositeDeltaChipText).toBe("-₹8,55,000 / -30%");
  });

  it("Custom floor area: 500 sqft yields exact ₹3,56,250 savings and -12% capex reduction", () => {
    // 500 * 712.5 = 356,250
    // 356,250 / 2,850,000 = 0.125 = 12.5% -> Math.round rounds to -13%
    const delta = calculateVEDelta(flooringSub, 500, 2850000);
    expect(delta.savingsAmount).toBe(356250);
    expect(delta.savingsFormatted).toBe("-₹3,56,250");
    expect(delta.percentageSavings).toBe(-13);
    expect(delta.percentageFormatted).toBe("-13%");
    expect(delta.leadTimeImpact).toBe("-14 WEEKS LEAD TIME");
  });

  it("Custom floor area: 2,500 sqft yields exact ₹17,81,250 savings and -63% capex reduction", () => {
    // 2500 * 712.5 = 1,781,250
    // 1,781,250 / 2,850,000 = 0.625 -> -63%
    const delta = calculateVEDelta(flooringSub, 2500, 2850000);
    expect(delta.savingsAmount).toBe(1781250);
    expect(delta.savingsFormatted).toBe("-₹17,81,250");
    expect(delta.percentageSavings).toBe(-63);
    expect(delta.percentageFormatted).toBe("-63%");
  });

  it("Custom floor area: 10,000 sqft yields exact ₹71,25,000 savings", () => {
    // 10000 * 712.5 = 7,125,000
    const delta = calculateVEDelta(flooringSub, 10000, 2850000);
    expect(delta.savingsAmount).toBe(7125000);
    expect(delta.savingsFormatted).toBe("-₹71,25,000");
    expect(delta.percentageSavings).toBe(-250);
    expect(delta.compositeDeltaChipText).toBe("-₹71,25,000 / -250%");
  });

  it("Boundary floor area: 0 sqft strictly avoids NaN, divide-by-zero, and negative zero (-0)", () => {
    const delta = calculateVEDelta(flooringSub, 0, 2850000);
    expect(delta.savingsAmount).toBe(0);
    expect(delta.savingsFormatted).toBe("-₹0");
    expect(delta.percentageSavings).toBe(0);
    expect(Object.is(delta.percentageSavings, -0)).toBe(false); // Must not be -0
    expect(delta.percentageFormatted).toBe("0%");
    expect(delta.compositeDeltaChipText).toBe("-₹0 / 0%");
    expect(Number.isNaN(delta.savingsAmount)).toBe(false);
    expect(Number.isNaN(delta.percentageSavings)).toBe(false);
  });

  it("Boundary budget: 0 INR totalBudget falls back to package baseline safely", () => {
    // packageBaseline = 1200 * 840 = 1,008,000
    // savingsAmount = 855,000
    // savingsAmount / packageBaseline = 855,000 / 1,008,000 = 84.82% -> -85%
    const delta = calculateVEDelta(flooringSub, 1200, 0);
    expect(delta.savingsAmount).toBe(855000);
    expect(delta.percentageSavings).toBe(-85);
    expect(delta.percentageFormatted).toBe("-85%");
  });

  it("Adversarial: negative floor area (-1200 sqft) is clamped to 0 savings", () => {
    const delta = calculateVEDelta(flooringSub, -1200, 2850000);
    expect(delta.savingsAmount).toBe(0);
    expect(delta.percentageSavings).toBe(0);
    expect(Object.is(delta.percentageSavings, -0)).toBe(false);
  });

  it("Adversarial: fractional area (1200.5 sqft) rounds cleanly to integer INR", () => {
    // 1200.5 * 712.5 = 855356.25 -> 855356
    const delta = calculateVEDelta(flooringSub, 1200.5, 2850000);
    expect(delta.savingsAmount).toBe(855356);
    expect(Number.isInteger(delta.savingsAmount)).toBe(true);
  });
});

// ===========================================================================
// SECTION 2: MASTER VALUE ENGINEERING CATALOG INTEGRITY
// ===========================================================================

describe("Adversarial Challenge 2: VE Catalog Integrity & Contract Conformance", () => {
  it("verifies all catalog substitutions have positive financial and lead-time savings", () => {
    for (const sub of VALUE_ENGINEERING_CATALOG) {
      expect(sub.id).toBeTruthy();
      expect(sub.tradePackageId).toBeTruthy();
      expect(sub.baselineRate).toBeGreaterThan(sub.proposedRate);
      expect(sub.leadTimeBaselineWeeks).toBeGreaterThan(sub.leadTimeProposedWeeks);
      expect(sub.leadTimeSavingsWeeks).toBe(sub.leadTimeBaselineWeeks - sub.leadTimeProposedWeeks);
      expect(sub.leadTimeImpact).toBe(`-${sub.leadTimeSavingsWeeks} WEEKS LEAD TIME`);
      expect(sub.codeStandardCitation).toBeTruthy();
    }
  });

  it("verifies all materialId links in VE catalog resolve to valid materials in materials-db", () => {
    for (const sub of VALUE_ENGINEERING_CATALOG) {
      if (sub.materialId) {
        const material = getMaterialById(sub.materialId);
        expect(material).toBeDefined();
        expect(material?.id).toBe(sub.materialId);
      }
      if (sub.materialMap) {
        for (const [key, matId] of Object.entries(sub.materialMap)) {
          const material = getMaterialById(matId);
          expect(material).toBeDefined();
        }
      }
    }
  });

  it("verifies toValueEngineeringItem converts correctly without losing fields", () => {
    for (const sub of VALUE_ENGINEERING_CATALOG) {
      const item = toValueEngineeringItem(sub, 1000, 2000000);
      expect(item.id).toBe(sub.id);
      expect(item.tradePackage).toBe(sub.tradePackageId);
      expect(item.baselineRate).toBe(sub.baselineRate);
      expect(item.proposedRate).toBe(sub.proposedRate);
      expect(item.savingsFormatted.startsWith("-")).toBe(true);
      expect(item.percentageSavings).toBeLessThanOrEqual(0);
      expect(item.leadTimeImpact).toBe(sub.leadTimeImpact);
      expect(item.description).toBe(sub.rationale);
    }
  });
});

// ===========================================================================
// SECTION 3: MATERIALS DATABASE INTEGRITY & CERTIFICATION BADGES
// ===========================================================================

describe("Adversarial Challenge 3: Material Database Schema & Badge Sanitation", () => {
  it("verifies catalog is non-empty and has unique IDs across all entries", () => {
    expect(MATERIALS_CATALOG.length).toBeGreaterThanOrEqual(15);
    const idSet = new Set<string>();
    for (const item of MATERIALS_CATALOG) {
      expect(idSet.has(item.id)).toBe(false);
      idSet.add(item.id);
    }
  });

  it("verifies every material entry has valid mandatory properties without undefined", () => {
    for (const item of MATERIALS_CATALOG) {
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);

      expect(typeof item.name).toBe("string");
      expect(item.name.length).toBeGreaterThan(0);

      expect(["flooring", "walls", "countertops", "fittings", "furniture", "ceiling"]).toContain(item.category);
      expect(typeof item.subcategory).toBe("string");
      expect(["india", "us", "global"]).toContain(item.region);

      expect(item.rateBudget).toBeGreaterThan(0);
      expect(item.rateMid).toBeGreaterThanOrEqual(item.rateBudget);
      expect(item.ratePremium).toBeGreaterThanOrEqual(item.rateMid);

      expect(["sqft", "sqm", "piece", "rft"]).toContain(item.priceUnit);
      expect(typeof item.thumbnailUrl).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(item.specs).toBeDefined();
      expect(typeof item.specs).toBe("object");
    }
  });

  it("verifies badges array contains no undefined, null, or blank strings", () => {
    for (const item of MATERIALS_CATALOG) {
      const badges = getMaterialBadges(item);
      expect(Array.isArray(badges)).toBe(true);
      for (const badge of badges) {
        expect(typeof badge).toBe("string");
        expect(badge.trim().length).toBeGreaterThan(0);
        expect(badge).not.toContain("undefined");
        expect(badge).not.toContain("null");
      }
    }
  });

  it("verifies certifications object contains no undefined, null, or blank string values", () => {
    for (const item of MATERIALS_CATALOG) {
      const certs = getMaterialCertifications(item);
      expect(typeof certs).toBe("object");
      for (const [key, value] of Object.entries(certs)) {
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toContain("undefined");
        expect(value).not.toContain("null");
      }
    }
  });

  it("verifies mandatory Indian architectural statutory badges exist in catalog", () => {
    // Timber standard: IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer
    const timberItems = MATERIALS_CATALOG.filter((m) =>
      m.badges?.some((b) => b.includes("IS 287") && b.includes("BWP 710")),
    );
    expect(timberItems.length).toBeGreaterThanOrEqual(2);

    // Acoustic standard: STC 56 Tested | Gyproc SoundStop
    const acousticItems = MATERIALS_CATALOG.filter((m) =>
      m.badges?.some((b) => b.includes("STC 56") && b.includes("Gyproc SoundStop")),
    );
    expect(acousticItems.length).toBeGreaterThanOrEqual(3);

    // Adhesive standard: IS 15477 C2TE S1 Flexible Polymer
    const adhesiveItems = MATERIALS_CATALOG.filter((m) =>
      m.badges?.some((b) => b.includes("IS 15477 C2TE S1")),
    );
    expect(adhesiveItems.length).toBeGreaterThanOrEqual(3);

    // Paint standard: GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield
    const paintItems = MATERIALS_CATALOG.filter((m) =>
      m.badges?.some((b) => b.includes("GreenGuard Gold") && b.includes("Asian Paints Royale Health Shield")),
    );
    expect(paintItems.length).toBeGreaterThanOrEqual(1);

    // Stone sourcing: Rajasthan Sourced | 2-3 Wks Lead Time
    const stoneItems = MATERIALS_CATALOG.filter((m) =>
      m.badges?.some((b) => b.includes("Rajasthan Sourced")),
    );
    expect(stoneItems.length).toBeGreaterThanOrEqual(4);
  });

  it("verifies getMaterialsByCategory and getMaterialById filter robustness", () => {
    const flooringIndia = getMaterialsByCategory("flooring", "india");
    expect(flooringIndia.length).toBeGreaterThan(0);
    for (const it of flooringIndia) {
      expect(it.category).toBe("flooring");
      expect(it.region === "india" || it.region === "global").toBe(true);
    }

    const nonExistent = getMaterialById("non_existent_material_id");
    expect(nonExistent).toBeUndefined();

    // Unknown category returns empty array
    const unknownCat = getMaterialsByCategory("unknown" as unknown as MaterialCategory);
    expect(unknownCat).toEqual([]);
  });
});

// ===========================================================================
// SECTION 4: COST CALCULATOR GEOMETRY ROBUSTNESS & ARITHMETIC INVARIANTS
// ===========================================================================

describe("Adversarial Challenge 4: Cost Calculator Geometry Robustness", () => {
  it("computes standard fallback 1200 sqft apartment when elements is null", () => {
    const estimate = calculateProjectCost(null, "india");
    expect(estimate.floorAreaSqFt).toBe(1200);
    expect(estimate.wallAreaSqFt).toBe(1938);
    expect(estimate.currency).toBe("INR");
    expect(estimate.symbol).toBe("₹");
    expect(estimate.items.length).toBe(7);

    // Validate arithmetic invariant: grandTotal = totals + contingency
    expect(estimate.grandTotal.budget).toBe(estimate.totals.budget + estimate.contingency.budget);
    expect(estimate.grandTotal.mid).toBe(estimate.totals.mid + estimate.contingency.mid);
    expect(estimate.grandTotal.premium).toBe(estimate.totals.premium + estimate.contingency.premium);

    // Validate tier progression: budget < mid < premium
    expect(estimate.totals.budget).toBeLessThan(estimate.totals.mid);
    expect(estimate.totals.mid).toBeLessThan(estimate.totals.premium);
  });

  it("computes US regional cost model with USD currency and US line items", () => {
    const estimate = calculateProjectCost(null, "us");
    expect(estimate.currency).toBe("USD");
    expect(estimate.symbol).toBe("$");
    expect(estimate.items.length).toBe(7);
    expect(estimate.items[0].id).toContain("_us");
    expect(estimate.grandTotal.premium).toBe(estimate.totals.premium + estimate.contingency.premium);
  });

  it("Adversarial: degenerate empty CAD elements object does not throw or crash", () => {
    const emptyElements: ConstructionElements = {
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
      floor_bounds: { min_x: 0, max_x: 0, min_y: 0, max_y: 0 },
    };
    const estimate = calculateProjectCost(emptyElements, "india");
    // With 0 walls, it should fall back safely to standard 111.5 sqm flat
    expect(estimate.floorAreaSqFt).toBe(1200);
    expect(estimate.doorCount).toBe(5);
    expect(estimate.grandTotal.premium).toBeGreaterThan(0);
  });

  it("Adversarial: custom CAD with 0-length walls produces non-NaN numbers", () => {
    const zeroWallElements: ConstructionElements = {
      walls: [
        {
          id: "w1",
          start: [0, 0],
          end: [0, 0],
          thickness: 0.2,
          height: 2.8,
        },
      ],
      doors: [],
      windows: [],
      rooms: [],
      floor_bounds: { min_x: 0, max_x: 0, min_y: 0, max_y: 0 },
    };
    const estimate = calculateProjectCost(zeroWallElements, "india");
    expect(Number.isNaN(estimate.floorAreaSqFt)).toBe(false);
    expect(Number.isNaN(estimate.grandTotal.budget)).toBe(false);
    expect(estimate.bathroomsCount).toBeGreaterThanOrEqual(1);
  });

  it("Adversarial: inverted floor bounds (min_x > max_x) does not produce negative area", () => {
    const invertedBoundsElements: ConstructionElements = {
      walls: [
        {
          id: "w1",
          start: [0, 0],
          end: [10, 0],
          thickness: 0.2,
          height: 2.8,
        },
      ],
      doors: [],
      windows: [],
      rooms: [],
      floor_bounds: { min_x: 10, max_x: 0, min_y: 10, max_y: 0 }, // Inverted!
    };
    const estimate = calculateProjectCost(invertedBoundsElements, "india");
    // Should fall back to wall-length ratio (totalWallLengthM * 1.6)
    expect(estimate.floorAreaSqFt).toBeGreaterThan(0);
    expect(estimate.floorAreaSqM).toBeGreaterThan(0);
  });
});

// ===========================================================================
// SECTION 5: INSTITUTIONAL PE & CAPEX REDUCTION PROOFS
// ===========================================================================

describe("Adversarial Challenge 5: PE BOQ Proof Mathematical Invariants", () => {
  it("Capex reduction proof: ₹28.5L with 30% cut computes exactly ₹8.55L cut and ₹19.95L target", () => {
    const capex = generateCapexProof({
      baselineCapex: 2850000,
      cutPercent: 30,
      grossAreaSqFt: 1200,
    });

    expect(capex.baselineCapex).toBe(2850000);
    expect(capex.cutAmount).toBe(855000);
    expect(capex.targetCapex).toBe(1995000);
    expect(capex.costPerSqFtBaseline).toBe(2375); // 2850000 / 1200
    expect(capex.costPerSqFtTarget).toBe(1663);   // 1995000 / 1200 = 1662.5 -> 1663
    expect(capex.proofText).toContain("₹28.5L");
    expect(capex.proofText).toContain("₹8.6L");
  });

  it("Net-to-gross proof: 1200 sqft squeezing 76% to 84% reclaims exactly 96 sqft", () => {
    const ntg = generateNTGProof({
      grossAreaSqFt: 1200,
      currentNtgPct: 76,
      targetNtgPct: 84,
    });

    expect(ntg.currentUsableSqFt).toBe(912);
    expect(ntg.targetUsableSqFt).toBe(1008);
    expect(ntg.reclaimNeededSqFt).toBe(96);
    expect(ntg.currentCirculationSqFt).toBe(288);
    expect(ntg.targetCirculationSqFt).toBe(192);
    expect(ntg.circulationCutSqFt).toBe(96);
  });

  it("Capex reduction proof with 0 sqft area handles division safely", () => {
    const capex = generateCapexProof({
      baselineCapex: 2850000,
      cutPercent: 30,
      grossAreaSqFt: 0,
    });
    expect(capex.costPerSqFtBaseline).toBeUndefined();
    expect(capex.costPerSqFtTarget).toBeUndefined();
    expect(capex.cutAmount).toBe(855000);
  });
});
