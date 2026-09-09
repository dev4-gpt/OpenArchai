import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export interface BOQItem {
  id: string;
  category: "Civil" | "Flooring" | "Painting" | "Ceiling" | "Openings" | "Plumbing & Electrical";
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
  doorCount: number;
  windowCount: number;
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

  const isIndia = region === "india";
  const currency = isIndia ? "INR" : "USD";
  const symbol = isIndia ? "₹" : "$";

  // Build realistic Line Items according to regional standards
  const items: BOQItem[] = isIndia
    ? [
        {
          id: "civil_masonry",
          category: "Civil",
          description: "Brickwork / AAC Block masonry, cement plaster (1:4) & curing",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 140,
          rateMid: 210,
          ratePremium: 320,
        },
        {
          id: "flooring_stone",
          category: "Flooring",
          description: "Floor tiles / Kota stone / Makrana marble with leveling mortar & polishing",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 95,
          rateMid: 180,
          ratePremium: 450,
        },
        {
          id: "skirting",
          category: "Flooring",
          description: "100mm matching skirting along walls",
          quantity: Math.round(wallPerimeterM * 3.28084),
          unit: "rft",
          rateBudget: 45,
          rateMid: 75,
          ratePremium: 140,
        },
        {
          id: "wall_painting",
          category: "Painting",
          description: "Wall putty (2 coats), primer & Asian Paints Royale luxury emulsion (2 coats)",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 18,
          rateMid: 32,
          ratePremium: 58,
        },
        {
          id: "false_ceiling",
          category: "Ceiling",
          description: "Gypsum board false ceiling with cove lighting troughs",
          quantity: Math.round(floorAreaSqFt * 0.7),
          unit: "sqft",
          rateBudget: 85,
          rateMid: 125,
          ratePremium: 195,
        },
        {
          id: "doors_joinery",
          category: "Openings",
          description: "Flush doors with hardwood frame, brass mortise handles & accessories",
          quantity: Math.max(1, doorCount),
          unit: "doors",
          rateBudget: 8500,
          rateMid: 14500,
          ratePremium: 28000,
        },
        {
          id: "windows_glazing",
          category: "Openings",
          description: "uPVC / Anodized aluminum 3-track sliding windows with mosquito mesh",
          quantity: Math.max(1, windowCount),
          unit: "windows",
          rateBudget: 6500,
          rateMid: 11000,
          ratePremium: 19500,
        },
        {
          id: "mep_rough_in",
          category: "Plumbing & Electrical",
          description: "Concealed conduit wiring (Finolex/Polycab), switches (Schneider) & plumbing fixtures",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 110,
          rateMid: 180,
          ratePremium: 290,
        },
      ]
    : [
        {
          id: "framing_drywall",
          category: "Civil",
          description: "Light gauge steel / wood stud framing with 5/8in gypsum drywall & Level 4 finish",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 4.5,
          rateMid: 7.5,
          ratePremium: 14.0,
        },
        {
          id: "flooring_us",
          category: "Flooring",
          description: "Luxury Vinyl Plank / Porcelain Tile / Engineered White Oak hardwood",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 5.5,
          rateMid: 11.0,
          ratePremium: 22.0,
        },
        {
          id: "painting_us",
          category: "Painting",
          description: "Interior drywall priming & 2 coats low-VOC eggshell paint (Benjamin Moore)",
          quantity: Math.round(wallAreaSqFt),
          unit: "sqft",
          rateBudget: 1.8,
          rateMid: 2.8,
          ratePremium: 5.5,
        },
        {
          id: "doors_us",
          category: "Openings",
          description: "Pre-hung interior doors with Schlage hardware and painted trim",
          quantity: Math.max(1, doorCount),
          unit: "doors",
          rateBudget: 180,
          rateMid: 380,
          ratePremium: 750,
        },
        {
          id: "windows_us",
          category: "Openings",
          description: "Double-pane Low-E vinyl / aluminum-clad casement windows",
          quantity: Math.max(1, windowCount),
          unit: "windows",
          rateBudget: 350,
          rateMid: 650,
          ratePremium: 1200,
        },
        {
          id: "mep_us",
          category: "Plumbing & Electrical",
          description: "Romex wiring, recessed LED pot lights, GFCI outlets & plumbing rough-in",
          quantity: Math.round(floorAreaSqFt),
          unit: "sqft",
          rateBudget: 8.5,
          rateMid: 15.0,
          ratePremium: 28.0,
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
    doorCount,
    windowCount,
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
