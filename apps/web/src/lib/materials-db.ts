// Materials and Finishes Catalog for OpenArchai
// Optimized for Indian residential architecture (Gurgaon / Delhi NCR standard)
// with US alternates and free CC0 PBR texture mapping (Poly Haven / ambientCG).

export type MaterialCategory =
  | "flooring"
  | "walls"
  | "countertops"
  | "fittings"
  | "furniture"
  | "ceiling";

export type PriceUnit = "sqft" | "sqm" | "piece" | "rft";

export interface MaterialItem {
  id: string;
  name: string;
  category: MaterialCategory;
  subcategory: string;
  brand?: string;
  region: "india" | "us" | "global";
  // Price in local currency (INR for india, USD for us)
  rateBudget: number;
  rateMid: number;
  ratePremium: number;
  priceUnit: PriceUnit;
  // CC0 Texture thumbnail or swatch
  thumbnailUrl: string;
  colorHex?: string;
  description: string;
  specs: Record<string, string>;
}

export const MATERIALS_CATALOG: MaterialItem[] = [
  // --- FLOORING (INDIAN STONE & MARBLE) ---
  {
    id: "fl_kota_stone",
    name: "Kota Stone (Honed Finish)",
    category: "flooring",
    subcategory: "Natural Stone",
    region: "india",
    rateBudget: 65,
    rateMid: 85,
    ratePremium: 110,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=400&q=80",
    colorHex: "#7a8a7c",
    description: "Fine-grained, non-porous blue-green limestone from Kota, Rajasthan. Highly durable, cool underfoot, ideal for high-traffic corridors and balconies.",
    specs: { Thickness: "20-25mm", Finish: "Honed / Semi-polished", Origin: "Rajasthan, India" },
  },
  {
    id: "fl_makrana_marble",
    name: "Makrana White Marble",
    category: "flooring",
    subcategory: "Indian Marble",
    region: "india",
    rateBudget: 180,
    rateMid: 280,
    ratePremium: 450,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
    colorHex: "#f0ede6",
    description: "Pure calcite marble from Makrana (used in the Taj Mahal). Does not absorb water or yellow over time, lustrous natural sheen.",
    specs: { Thickness: "18mm", Finish: "Mirror Polish", Origin: "Makrana, Rajasthan" },
  },
  {
    id: "fl_italian_statuario",
    name: "Italian Statuario Marble",
    category: "flooring",
    subcategory: "Imported Marble",
    region: "india",
    rateBudget: 550,
    rateMid: 850,
    ratePremium: 1400,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&q=80",
    colorHex: "#f8f7f5",
    description: "Ultra-luxury Carrara marble with distinctive grey-gold veining on bright white base. Benchmark for Gurgaon/Delhi luxury living rooms.",
    specs: { Thickness: "18-20mm", Finish: "Polished Bookmatch", Origin: "Carrara, Italy" },
  },
  {
    id: "fl_vitrified_kajaria",
    name: "Glazed Vitrified Tiles (GVT 1200x600)",
    category: "flooring",
    subcategory: "Tiles",
    brand: "Kajaria",
    region: "india",
    rateBudget: 55,
    rateMid: 85,
    ratePremium: 135,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80",
    colorHex: "#e3ded8",
    description: "Large-format vitrified floor tile with satin/matt finish. Stain resistant, easy maintenance, cost-effective elegance.",
    specs: { Size: "1200mm x 600mm", Finish: "Matt / Carving", WaterAbsorption: "< 0.05%" },
  },
  {
    id: "fl_wooden_teak",
    name: "Solid Burma Teak Wood Flooring",
    category: "flooring",
    subcategory: "Hardwood",
    region: "india",
    rateBudget: 280,
    rateMid: 420,
    ratePremium: 650,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
    colorHex: "#8f5b34",
    description: "Natural golden-brown Burmese teak planks with natural oils resistant to moisture and termites. Luxurious warm master bedrooms.",
    specs: { Thickness: "15mm", PlankWidth: "100mm", Finish: "Matt PU Coated" },
  },

  // --- WALL FINISHES & PAINT ---
  {
    id: "wl_asian_paints_royale",
    name: "Royale Luxury Emulsion (Smooth Matt)",
    category: "walls",
    subcategory: "Interior Paint",
    brand: "Asian Paints",
    region: "india",
    rateBudget: 22,
    rateMid: 32,
    ratePremium: 48,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80",
    colorHex: "#f5f0eb",
    description: "Teflon surface protector with anti-bacterial shield. Soft sheen finish, washable, durable against Indian monsoon conditions.",
    specs: { Sheen: "Soft Sheen", VOC: "< 25g/L", Coverage: "120-140 sqft/L (2 coats)" },
  },
  {
    id: "wl_exposed_brick",
    name: "Wire-Cut Exposed Brick Cladding",
    category: "walls",
    subcategory: "Wall Cladding",
    region: "india",
    rateBudget: 95,
    rateMid: 140,
    ratePremium: 195,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
    colorHex: "#9b4e38",
    description: "Terracotta brick tiles pointing in charcoal or buff mortar. Classic South Delhi farmhouse / industrial contemporary accent wall.",
    specs: { Thickness: "12-15mm", Material: "Natural Fired Clay", Sealant: "Silicone Water Repellent" },
  },
  {
    id: "wl_jali_terracotta",
    name: "Perforated Terracotta Jali Screen",
    category: "walls",
    subcategory: "Partitions & Screens",
    region: "india",
    rateBudget: 160,
    rateMid: 240,
    ratePremium: 350,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=400&q=80",
    colorHex: "#b85c38",
    description: "Traditional Indian geometric pierced screen allowing passive cross-ventilation and diffused daylight. Ideal for verandahs, balconies, and room dividers.",
    specs: { BlockSize: "200x200x65mm", Pattern: "Floral / Geometric", Assembly: "Steel rod reinforced" },
  },
  {
    id: "wl_italian_lime_plaster",
    name: "Venetian / Lime Stucco Plaster",
    category: "walls",
    subcategory: "Textured Plaster",
    region: "global",
    rateBudget: 85,
    rateMid: 135,
    ratePremium: 220,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=400&q=80",
    colorHex: "#dfdbd4",
    description: "Slaked lime, marble dust, and natural pigments applied in multiple micro-layers. Breathable, mold-resistant, tactile earthy depth.",
    specs: { Layers: "3 coats", Finish: "Burnished wax", Material: "Mineral Lime Stucco" },
  },

  // --- COUNTERTOPS & STONES ---
  {
    id: "ct_black_galaxy_granite",
    name: "Black Galaxy Granite (Chamrajnagar)",
    category: "countertops",
    subcategory: "Granite",
    region: "india",
    rateBudget: 160,
    rateMid: 230,
    ratePremium: 320,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb1866571?w=400&q=80",
    colorHex: "#1c1c1e",
    description: "Dense black granite with natural golden bronzite specks. Heat proof, scratch proof, standard gold benchmark for Indian kitchens.",
    specs: { Thickness: "18-20mm", Edge: "Full Bullnose / Chamfer", HeatResistance: "Up to 300°C" },
  },
  {
    id: "ct_kalinga_quartz",
    name: "Engineered Quartz Countertop",
    category: "countertops",
    subcategory: "Quartz",
    brand: "KalingaStone",
    region: "india",
    rateBudget: 280,
    rateMid: 420,
    ratePremium: 600,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80",
    colorHex: "#f0eee9",
    description: "93% natural quartz blended with resin pigments. Zero porosity, immune to turmeric or lime juice stains, flawless contemporary look.",
    specs: { Thickness: "20mm", Composition: "93% Quartz + 7% Resin", StainResistance: "High" },
  },

  // --- FITTINGS & FIXTURES ---
  {
    id: "ft_jaquar_bath_suite",
    name: "Concealed Diverter Bath Suite",
    category: "fittings",
    subcategory: "Sanitaryware",
    brand: "Jaquar / Hindware",
    region: "india",
    rateBudget: 14000,
    rateMid: 24000,
    ratePremium: 42000,
    priceUnit: "piece",
    thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
    colorHex: "#c0c0c0",
    description: "Complete bathroom fixture set including thermostatic shower diverter, rain showerhead, wall-hung WC, and brass basin mixer.",
    specs: { Finish: "Chrome / Matt Black", Material: "Forged Brass", Cartridge: "Ceramic Disc 35mm" },
  },

  // --- US ALTERNATE FINISHES ---
  {
    id: "us_white_oak_hardwood",
    name: "Engineered White Oak (Wirebrushed)",
    category: "flooring",
    subcategory: "Hardwood",
    region: "us",
    rateBudget: 6,
    rateMid: 11,
    ratePremium: 18,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
    colorHex: "#c8b293",
    description: "Wide plank wirebrushed American white oak with low-gloss matte polyurethane finish.",
    specs: { Thickness: "1/2 inch", Width: "7.5 inch", WearLayer: "3mm Oak" },
  },
  {
    id: "us_porcelain_carrara",
    name: "Carrara Porcelain Tile 24x48",
    category: "flooring",
    subcategory: "Tiles",
    region: "us",
    rateBudget: 4.5,
    rateMid: 8.5,
    ratePremium: 15,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
    colorHex: "#eae8e3",
    description: "High-definition Italian ink-jet glazed porcelain mimicking marble without periodic sealing needs.",
    specs: { Dimensions: "24in x 48in", SlipResistance: "DCOF >= 0.42", PEIRating: "IV" },
  },
  {
    id: "us_benjamin_moore_paint",
    name: "Regal Select Interior Eggshell",
    category: "walls",
    subcategory: "Interior Paint",
    brand: "Benjamin Moore",
    region: "us",
    rateBudget: 1.8,
    rateMid: 2.6,
    ratePremium: 4.2,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80",
    colorHex: "#f3ede4",
    description: "Premium 100% acrylic paint with stain release technology and smooth eggshell sheen.",
    specs: { VOC: "< 50g/L", Coverage: "400-450 sqft/gal", DryTime: "1-2 hrs" },
  },
];

export function getMaterialsByCategory(category?: MaterialCategory, region?: "india" | "us"): MaterialItem[] {
  return MATERIALS_CATALOG.filter((item) => {
    const matchCat = category ? item.category === category : true;
    const matchReg = region ? item.region === region || item.region === "global" : true;
    return matchCat && matchReg;
  });
}

export function getMaterialById(id: string): MaterialItem | undefined {
  return MATERIALS_CATALOG.find((m) => m.id === id);
}
