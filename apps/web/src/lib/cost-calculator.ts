import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export interface BOQItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  rateBudget: number;
  rateMid: number;
  ratePremium: number;
}

export interface ProjectCostEstimate {
  floorAreaSqM: number;
  floorAreaSqFt: number;
  wallAreaSqM: number;
  wallAreaSqFt: number;
  wallPerimeterM: number;
  linearWallMeters: number;
  doorCount: number;
  windowCount: number;
  bathroomsCount: number;
  currency: string;
  symbol: string;
  items: BOQItem[];
  totals: {
    budget: number;
    mid: number;
    premium: number;
  };
  contingency: {
    budget: number;
    mid: number;
    premium: number;
  };
  grandTotal: {
    budget: number;
    mid: number;
    premium: number;
  };
}

export function calculateProjectCost(
  elements: ConstructionElements | null | undefined,
  region: "india" | "us" = "india",
  defaultWallHeightM = 2.8,
): ProjectCostEstimate {
  // If elements is empty, default to a standard 1200 sqft (111 sqm) flat
  let floorAreaSqM = 111.5;
  let wallAreaSqM = 180.0;
  let wallPerimeterM = 65.0;
  let doorCount = 5;
  let windowCount = 4;

  if (elements && elements.walls && elements.walls.length > 0) {
    doorCount = elements.doors ? elements.doors.length : 0;
    windowCount = elements.windows ? elements.windows.length : 0;

    // Calculate total wall linear length
    let totalWallLengthM = 0;
    for (const w of elements.walls) {
      const dx = w.end[0] - w.start[0];
      const dy = w.end[1] - w.start[1];
      totalWallLengthM += Math.hypot(dx, dy);
    }
    wallPerimeterM = totalWallLengthM;

    // Gross wall area (both sides get plastered/painted, but partition is 2 surfaces)
    const grossWallArea = totalWallLengthM * defaultWallHeightM * 1.8;

    // Deduct openings approx
    const doorArea = doorCount * (0.9 * 2.1);
    const windowArea = windowCount * (1.2 * 1.2);
    wallAreaSqM = Math.max(20, grossWallArea - (doorArea + windowArea));

    // Floor area from bounding box or approx ratio
    const b = elements.floor_bounds;
    if (b && b.max_x > b.min_x && b.max_y > b.min_y) {
      floorAreaSqM = (b.max_x - b.min_x) * (b.max_y - b.min_y) * 0.75; // 75% efficiency
    } else {
      floorAreaSqM = totalWallLengthM * 1.6;
    }
  }

  const floorAreaSqFt = floorAreaSqM * 10.7639;
  const wallAreaSqFt = wallAreaSqM * 10.7639;
  const wallMasonrySqFt = (wallPerimeterM * defaultWallHeightM) * 10.7639;
  const bathroomsCount = Math.max(1, Math.round(floorAreaSqM / 45.0));

  const isIndia = region === "india";
  const currency = isIndia ? "INR" : "USD";
  const symbol = isIndia ? "₹" : "$";

  // Build architect-grade 7 per-element line items according to regional standards
  const items: BOQItem[] = isIndia
    ? [
        {
          id: "civil_masonry",
          category: "Civil & Structural Masonry",
          description: `AAC blockwork / 230mm brick masonry & double-coat sand plaster (${Math.round(wallPerimeterM * 10) / 10}m linear wall run)`,
          quantity: Math.round(wallMasonrySqFt),
          unit: "sqft",
          rateBudget: 135,
          rateMid: 210,
          ratePremium: 340,
        },
        {
          id: "flooring_stone",
          category: "Flooring & Perimeter Skirting",
          description: "Floor tiling / natural stone supply, mortar bed & 100mm perimeter skirting",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 95,
          rateMid: 195,
          ratePremium: 840,
        },
        {
          id: "wall_finishes",
          category: "Net Wall Finishes & Emulsion",
          description: "Surface putty, primer & luxury emulsion coats (net area deducting door/window voids)",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 18,
          rateMid: 36,
          ratePremium: 165,
        },
        {
          id: "door_suites",
          category: "Door Suites & Hardware",
          description: "Engineered doors with hardwood frames, architraves & architectural mortise hardware",
          quantity: Math.max(1, doorCount),
          unit: "doors",
          rateBudget: 8500,
          rateMid: 16500,
          ratePremium: 28000,
        },
        {
          id: "window_suites",
          category: "Window Suites & Glazing",
          description: "Acoustic & weather-sealed window suites with sub-frames & clear float glazing",
          quantity: Math.max(1, windowCount),
          unit: "windows",
          rateBudget: 7200,
          rateMid: 14500,
          ratePremium: 29500,
        },
        {
          id: "electrical_lighting",
          category: "Electrical & Circadian Lighting",
          description: "Concealed FRLS conduits, distribution board, modular switches & LED cove/downlights",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 110,
          rateMid: 185,
          ratePremium: 295,
        },
        {
          id: "plumbing_sanitary",
          category: "Plumbing, Wet Wall & Sanitaryware",
          description: "CPVC water supply, soil/waste stack connections & luxury sanitaryware suites",
          quantity: bathroomsCount,
          unit: "baths",
          rateBudget: 42000,
          rateMid: 82000,
          ratePremium: 165000,
        },
      ]
    : [
        {
          id: "civil_masonry_us",
          category: "Civil & Structural Masonry",
          description: `Light gauge steel / wood stud framing with 5/8in gypsum drywall & Level 4 finish (${Math.round(wallPerimeterM * 10) / 10}m linear run)`,
          quantity: Math.round(wallMasonrySqFt),
          unit: "sqft",
          rateBudget: 5.5,
          rateMid: 9.0,
          ratePremium: 16.0,
        },
        {
          id: "flooring_us",
          category: "Flooring & Perimeter Skirting",
          description: "Luxury Vinyl Plank / Porcelain Tile / Engineered White Oak hardwood & baseboards",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 6.5,
          rateMid: 14.0,
          ratePremium: 38.0,
        },
        {
          id: "wall_finishes_us",
          category: "Net Wall Finishes & Emulsion",
          description: "Interior drywall priming & 2 coats low-VOC eggshell paint (net surface deducting openings)",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 1.8,
          rateMid: 3.2,
          ratePremium: 12.0,
        },
        {
          id: "door_suites_us",
          category: "Door Suites & Hardware",
          description: "Pre-hung solid-core interior doors with Schlage hardware & painted casing",
          quantity: Math.max(1, doorCount),
          unit: "doors",
          rateBudget: 280,
          rateMid: 550,
          ratePremium: 1100,
        },
        {
          id: "window_suites_us",
          category: "Window Suites & Glazing",
          description: "Double-pane Low-E vinyl / aluminum-clad casement windows with thermal breaks",
          quantity: Math.max(1, windowCount),
          unit: "windows",
          rateBudget: 260,
          rateMid: 520,
          ratePremium: 1200,
        },
        {
          id: "electrical_lighting_us",
          category: "Electrical & Circadian Lighting",
          description: "Romex wiring, recessed LED pot lights, GFCI outlets & architectural fixture rough-in",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 8.5,
          rateMid: 16.0,
          ratePremium: 28.0,
        },
        {
          id: "plumbing_sanitary_us",
          category: "Plumbing, Wet Wall & Sanitaryware",
          description: "PEX water supply, DWV stack drops, Kohler fixtures & designer bathroom suites",
          quantity: bathroomsCount,
          unit: "baths",
          rateBudget: 1500,
          rateMid: 3200,
          ratePremium: 6800,
        },
      ];

  const totalBudget = items.reduce((s, it) => s + it.quantity * it.rateBudget, 0);
  const totalMid = items.reduce((s, it) => s + it.quantity * it.rateMid, 0);
  const totalPremium = items.reduce((s, it) => s + it.quantity * it.ratePremium, 0);

  const contingency = {
    budget: Math.round(totalBudget * 0.1),
    mid: Math.round(totalMid * 0.1),
    premium: Math.round(totalPremium * 0.1),
  };

  const grandTotal = {
    budget: Math.round(totalBudget + contingency.budget),
    mid: Math.round(totalMid + contingency.mid),
    premium: Math.round(totalPremium + contingency.premium),
  };

  return {
    floorAreaSqM: Math.round(floorAreaSqM * 10) / 10,
    floorAreaSqFt: Math.round(floorAreaSqFt),
    wallAreaSqM: Math.round(wallAreaSqM * 10) / 10,
    wallAreaSqFt: Math.round(wallAreaSqFt),
    wallPerimeterM: Math.round(wallPerimeterM * 10) / 10,
    linearWallMeters: Math.round(wallPerimeterM * 10) / 10,
    doorCount,
    windowCount,
    bathroomsCount,
    currency,
    symbol,
    items,
    totals: {
      budget: Math.round(totalBudget),
      mid: Math.round(totalMid),
      premium: Math.round(totalPremium),
    },
    contingency,
    grandTotal,
  };
}
