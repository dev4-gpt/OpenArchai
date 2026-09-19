// Real-world Furniture, Fixtures & Equipment (FF&E) Specification Catalog
// Provides production-ready spec sheets with dimensions, suggested vendors, lead times, and pricing.

export type FFECategory =
  | "seating"
  | "tables"
  | "beds"
  | "storage"
  | "lighting"
  | "sanitaryware"
  | "accessories";

export interface FFESpecItem {
  id: string;
  tag: string; // e.g. "FF-01", "LGT-01", "SAN-01"
  name: string;
  category: FFECategory;
  roomType: "living" | "dining" | "bedroom" | "bathroom" | "office" | "universal";
  dimensions: {
    lengthMm: number;
    depthMm: number;
    heightMm: number;
    lengthIn: number;
    depthIn: number;
    heightIn: number;
  };
  suggestedVendors: {
    name: string;
    website?: string;
    leadTimeWeeks: string;
    modelSku?: string;
  }[];
  materials: string[];
  finish: string;
  rateINR: {
    budget: number;
    mid: number;
    premium: number;
  };
  rateUSD: {
    budget: number;
    mid: number;
    premium: number;
  };
  thumbnailUrl: string;
  notes: string;
}

export const FFE_CATALOG: FFESpecItem[] = [
  // --- SEATING ---
  {
    id: "ffe_eames_lounge",
    tag: "FF-01",
    name: "Architectural Lounge Chair & Ottoman",
    category: "seating",
    roomType: "living",
    dimensions: {
      lengthMm: 840,
      depthMm: 850,
      heightMm: 840,
      lengthIn: 33,
      depthIn: 33.5,
      heightIn: 33,
    },
    suggestedVendors: [
      { name: "Herman Miller", leadTimeWeeks: "4-6 weeks", modelSku: "HM-ES670" },
      { name: "West Elm Contract", leadTimeWeeks: "2-3 weeks", modelSku: "WE-LC-44" },
      { name: "Local Bespoke Craftsman (Delhi NCR / Mumbai)", leadTimeWeeks: "3-4 weeks", modelSku: "BS-01" },
    ],
    materials: ["Molded Walnut Veneer", "Top-grain Aniline Leather", "Die-cast Aluminum Base"],
    finish: "Oiled Walnut / Obsidian Black Leather",
    rateINR: { budget: 45000, mid: 95000, premium: 320000 },
    rateUSD: { budget: 650, mid: 1400, premium: 4800 },
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    notes: "Iconic mid-century silhouette. Provides high visual weight and signature architectural grounding in living room corners.",
  },
  {
    id: "ffe_sectional_sofa",
    tag: "FF-02",
    name: "3-Seater Low-Profile Sectional Sofa",
    category: "seating",
    roomType: "living",
    dimensions: {
      lengthMm: 2400,
      depthMm: 1000,
      heightMm: 720,
      lengthIn: 94.5,
      depthIn: 39.4,
      heightIn: 28.3,
    },
    suggestedVendors: [
      { name: "BoConcept", leadTimeWeeks: "6-8 weeks", modelSku: "BC-CARMO" },
      { name: "D'Decor / Stanley Lifestyles", leadTimeWeeks: "4 weeks", modelSku: "SL-SECT-03" },
      { name: "Urban Ladder / Pepperfry Commercial", leadTimeWeeks: "1-2 weeks", modelSku: "UL-SOFA-24" },
    ],
    materials: ["Kiln-dried Hardwood Frame", "High-resilience PU Foam", "Textured Belgian Linen"],
    finish: "Oatmeal Warm Sand / Stain-resistant coating",
    rateINR: { budget: 65000, mid: 125000, premium: 280000 },
    rateUSD: { budget: 900, mid: 1900, premium: 4200 },
    thumbnailUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    notes: "Feather-blend wrapped seat cushions for lived-in comfort. Modular chaise allows left or right orientation.",
  },

  // --- TABLES ---
  {
    id: "ffe_dining_table",
    tag: "FF-03",
    name: "6-Seater Solid Oak Dining Table",
    category: "tables",
    roomType: "dining",
    dimensions: {
      lengthMm: 2000,
      depthMm: 950,
      heightMm: 750,
      lengthIn: 78.7,
      depthIn: 37.4,
      heightIn: 29.5,
    },
    suggestedVendors: [
      { name: "Ethnicraft", leadTimeWeeks: "4-6 weeks", modelSku: "EC-OAK-BOK" },
      { name: "Crate & Barrel Contract", leadTimeWeeks: "3-5 weeks", modelSku: "CB-YUKON" },
      { name: "Jodhpur Woodcrafts (Direct Mill)", leadTimeWeeks: "3 weeks", modelSku: "JW-DT-06" },
    ],
    materials: ["FSC-Certified White Oak", "Concealed Steel Reinforcement Rods"],
    finish: "Matte Hardwax Oil / Natural White Oak",
    rateINR: { budget: 42000, mid: 88000, premium: 195000 },
    rateUSD: { budget: 600, mid: 1300, premium: 2900 },
    thumbnailUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=400&q=80",
    notes: "Tapered chamfered edge profile with rounded organic corners. Resists water rings and daily wear.",
  },
  {
    id: "ffe_coffee_table",
    tag: "FF-04",
    name: "Sculptural Low Coffee Table (Travertine & Teak)",
    category: "tables",
    roomType: "living",
    dimensions: {
      lengthMm: 1200,
      depthMm: 700,
      heightMm: 380,
      lengthIn: 47.2,
      depthIn: 27.5,
      heightIn: 15.0,
    },
    suggestedVendors: [
      { name: "West Elm Studio", leadTimeWeeks: "2-3 weeks", modelSku: "WE-VOL-CT" },
      { name: "Jaipur Stonecraft Artisans", leadTimeWeeks: "3-4 weeks", modelSku: "JSA-TR-01" },
    ],
    materials: ["Filled Roman Travertine", "Smoked Oak Solid Base"],
    finish: "Honed Matte Stone / Brushed Oak",
    rateINR: { budget: 22000, mid: 45000, premium: 98000 },
    rateUSD: { budget: 350, mid: 700, premium: 1500 },
    thumbnailUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80",
    notes: "Floating visual look. Low 380mm height complements deep lounge seating without blocking conversational eyelines.",
  },

  // --- BEDS ---
  {
    id: "ffe_king_bed",
    tag: "FF-05",
    name: "King Platform Bed with Upholstered Fluted Headboard",
    category: "beds",
    roomType: "bedroom",
    dimensions: {
      lengthMm: 2150,
      depthMm: 1950,
      heightMm: 1100,
      lengthIn: 84.6,
      depthIn: 76.8,
      heightIn: 43.3,
    },
    suggestedVendors: [
      { name: "West Elm Contract", leadTimeWeeks: "3-4 weeks", modelSku: "WE-ANDES-KING" },
      { name: "Custom Millwork (Local Gurgaon / Mumbai)", leadTimeWeeks: "3 weeks", modelSku: "CST-KB-01" },
      { name: "Wakefit Commercial", leadTimeWeeks: "1-2 weeks", modelSku: "WK-PLAT-01" },
    ],
    materials: ["Solid Sheesham / Oak Frame", "High-density Acoustic Foam", "Boucle / Chenille Upholstery"],
    finish: "Warm Ivory Bouclé with Brushed Brass Plinth",
    rateINR: { budget: 55000, mid: 110000, premium: 240000 },
    rateUSD: { budget: 800, mid: 1700, premium: 3600 },
    thumbnailUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80",
    notes: "Accommodates 1800x2000mm standard king mattress. Integrated cable pass-throughs for bedside sconces.",
  },

  // --- STORAGE ---
  {
    id: "ffe_media_credenza",
    tag: "FF-06",
    name: "Fluted Oak Media Console / Credenza",
    category: "storage",
    roomType: "living",
    dimensions: {
      lengthMm: 1800,
      depthMm: 450,
      heightMm: 550,
      lengthIn: 70.8,
      depthIn: 17.7,
      heightIn: 21.6,
    },
    suggestedVendors: [
      { name: "Crate & Barrel", leadTimeWeeks: "4-6 weeks", modelSku: "CB-LINEA" },
      { name: "Local Studio Joinery", leadTimeWeeks: "2-3 weeks", modelSku: "LOC-MC-18" },
    ],
    materials: ["Engineered Oak Veneer", "Solid Timber Slats", "Soft-close Blum Hinges"],
    finish: "Natural Matte Oak / Black Powder-coated Steel Legs",
    rateINR: { budget: 35000, mid: 68000, premium: 145000 },
    rateUSD: { budget: 500, mid: 1050, premium: 2200 },
    thumbnailUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80",
    notes: "Features rear cable raceways, concealed ventilation slats for AV receivers, and push-to-open doors.",
  },

  // --- LIGHTING ---
  {
    id: "ffe_arc_lamp",
    tag: "LGT-01",
    name: "Architectural Cantilever Arc Floor Lamp",
    category: "lighting",
    roomType: "living",
    dimensions: {
      lengthMm: 1600,
      depthMm: 400,
      heightMm: 2150,
      lengthIn: 63,
      depthIn: 15.7,
      heightIn: 84.6,
    },
    suggestedVendors: [
      { name: "Flos", leadTimeWeeks: "4-6 weeks", modelSku: "FLOS-ARCO" },
      { name: "Artemide", leadTimeWeeks: "3-5 weeks", modelSku: "ART-TOLOMEO" },
      { name: "Tisva / Philips Architectural Lighting", leadTimeWeeks: "1-2 weeks", modelSku: "TSV-ARC-01" },
    ],
    materials: ["Solid Carrara Marble Base", "Satin Stainless Steel Telescopic Stem", "Spun Aluminum Shade"],
    finish: "Brushed Satin Steel / White Carrara Base",
    rateINR: { budget: 18000, mid: 38000, premium: 165000 },
    rateUSD: { budget: 280, mid: 600, premium: 2600 },
    thumbnailUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80",
    notes: "Provides overhead illumination over coffee table without requiring ceiling electrical drops.",
  },

  // --- SANITARYWARE ---
  {
    id: "ffe_wall_hung_wc",
    tag: "SAN-01",
    name: "Rimless Wall-Hung WC with Concealed Cistern",
    category: "sanitaryware",
    roomType: "bathroom",
    dimensions: {
      lengthMm: 360,
      depthMm: 540,
      heightMm: 350,
      lengthIn: 14.2,
      depthIn: 21.2,
      heightIn: 13.8,
    },
    suggestedVendors: [
      { name: "Jaquar (Kubix Prime)", leadTimeWeeks: "In Stock (3-5 days)", modelSku: "KPS-WHT-7951" },
      { name: "Kohler (Veil / Veil Intelligent)", leadTimeWeeks: "1-2 weeks", modelSku: "K-5401IN" },
      { name: "Geberit Concealed Cistern Frame", leadTimeWeeks: "1 week", modelSku: "GEB-SIGMA-111" },
    ],
    materials: ["Vitreous China with GlazeGuard", "Soft-close UF Seat Cover", "Concealed Steel In-wall Frame"],
    finish: "Glossy Alpine White or Matte Graphite",
    rateINR: { budget: 16000, mid: 32000, premium: 85000 },
    rateUSD: { budget: 250, mid: 500, premium: 1300 },
    thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
    notes: "Dual flush (3L/4.5L) water efficiency. Easy under-pan mopping access.",
  },
  {
    id: "ffe_vanity_basin",
    tag: "SAN-02",
    name: "Floating Wall-Hung Quartz Vanity Basin",
    category: "sanitaryware",
    roomType: "bathroom",
    dimensions: {
      lengthMm: 900,
      depthMm: 480,
      heightMm: 450,
      lengthIn: 35.4,
      depthIn: 18.9,
      heightIn: 17.7,
    },
    suggestedVendors: [
      { name: "Jaquar Bath Suites", leadTimeWeeks: "1-2 weeks", modelSku: "JQR-VNT-90" },
      { name: "Kohler Forefront", leadTimeWeeks: "2 weeks", modelSku: "KHL-FF-900" },
      { name: "Local Marine Ply & KalingaQuartz Fabricator", leadTimeWeeks: "2-3 weeks", modelSku: "KQ-VAN-01" },
    ],
    materials: ["Boiling Water Proof (BWP) Marine Ply", "Kalinga Engineered Quartz Top", "Ceramic Basin"],
    finish: "Warm Walnut Veneer / White Quartz Counter",
    rateINR: { budget: 24000, mid: 48000, premium: 110000 },
    rateUSD: { budget: 380, mid: 750, premium: 1700 },
    thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
    notes: "Includes concealed bottom push-drawer for toiletries and towel shelf underneath.",
  },
];

export interface ScheduledFFELineItem {
  id: string;
  item: FFESpecItem;
  quantity: number;
  selectedVendor: string;
  unitRate: number;
  totalCost: number;
  currency: string;
}

/**
 * Generates an automated FF&E schedule from placed items or room presets.
 */
export function generateFFESchedule(
  placedItemIds: string[] = ["ffe_sectional_sofa", "ffe_coffee_table", "ffe_dining_table", "ffe_king_bed", "ffe_wall_hung_wc"],
  region: "india" | "us" = "india",
  tier: "budget" | "mid" | "premium" = "mid",
): {
  items: ScheduledFFELineItem[];
  totalCost: number;
  currency: string;
  symbol: string;
  vendorCount: number;
} {
  const currency = region === "india" ? "INR" : "USD";
  const symbol = region === "india" ? "₹" : "$";

  // Map IDs to specs or default selection
  const catalogMap = new Map(FFE_CATALOG.map((item) => [item.id, item]));
  const counts: Record<string, number> = {};

  for (const id of placedItemIds) {
    counts[id] = (counts[id] || 0) + 1;
  }

  const items: ScheduledFFELineItem[] = [];
  const vendors = new Set<string>();

  for (const [id, count] of Object.entries(counts)) {
    const spec = catalogMap.get(id);
    if (!spec) continue;

    const rate = region === "india" ? spec.rateINR[tier] : spec.rateUSD[tier];
    const vendor = spec.suggestedVendors[0]?.name || "Specialist Studio Vendor";
    vendors.add(vendor);

    items.push({
      id: `${id}_${Date.now()}`,
      item: spec,
      quantity: count,
      selectedVendor: vendor,
      unitRate: rate,
      totalCost: rate * count,
      currency,
    });
  }

  const totalCost = items.reduce((sum, it) => sum + it.totalCost, 0);

  return {
    items,
    totalCost,
    currency,
    symbol,
    vendorCount: vendors.size,
  };
}

/**
 * Generates CSV string for FF&E schedule export.
 */
export function exportFFEScheduleCsv(schedule: ReturnType<typeof generateFFESchedule>): string {
  const headers = [
    "Tag",
    "Item Description",
    "Category",
    "Dimensions (L x D x H mm)",
    "Dimensions (L x D x H in)",
    "Suggested Vendor",
    "Lead Time",
    "Finish / Materials",
    "Quantity",
    `Unit Rate (${schedule.symbol})`,
    `Total (${schedule.symbol})`,
    "Notes",
  ];

  const rows = schedule.items.map((row) => [
    `"${row.item.tag}"`,
    `"${row.item.name}"`,
    `"${row.item.category}"`,
    `"${row.item.dimensions.lengthMm} x ${row.item.dimensions.depthMm} x ${row.item.dimensions.heightMm}"`,
    `"${row.item.dimensions.lengthIn} x ${row.item.dimensions.depthIn} x ${row.item.dimensions.heightIn}"`,
    `"${row.selectedVendor}"`,
    `"${row.item.suggestedVendors[0]?.leadTimeWeeks || "3-4 weeks"}"`,
    `"${row.item.finish}"`,
    row.quantity,
    row.unitRate,
    row.totalCost,
    `"${row.item.notes}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
