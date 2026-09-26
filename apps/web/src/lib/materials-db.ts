// Materials and Finishes Catalog for AtelierOS
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

export interface MaterialBadge {
  type: "timber" | "acoustic" | "adhesive" | "voc" | "lead_time" | "general";
  code: string; // e.g. "IS 287" | "STC 56" | "IS 15477" | "Zero-VOC"
  label: string; // e.g. "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer"
}

export interface MaterialCertifications {
  acousticRating?: string;
  moistureStandard?: string;
  airQuality?: string;
  fireRating?: string;
  leadTime?: string;
  sourcingOrigin?: string;
  adhesiveStandard?: string;
}

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
  // R4 Enterprise Metadata
  badges?: string[];
  certifications?: MaterialCertifications;
  detailedBadges?: MaterialBadge[];
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
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 15477 C2TE S1 Flexible Polymer",
      "Zero-VOC Natural Stone",
    ],
    certifications: {
      acousticRating: "Impact Sound ΔLw 14dB",
      moistureStandard: "Non-Porous <0.4% Water Absorption",
      airQuality: "Zero-VOC Natural Mineral",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
      sourcingOrigin: "Kota District, Rajasthan",
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer",
    },
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
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 15477 C2TE S1 Flexible Polymer",
      "98% Pure Calcite Matrix",
    ],
    certifications: {
      acousticRating: "Impact Sound ΔLw 12dB",
      moistureStandard: "Zero Absorption Calcite Matrix",
      airQuality: "Zero-VOC Natural Calcite",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
      sourcingOrigin: "Makrana, Rajasthan",
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer",
    },
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
    badges: [
      "Carrara Sourced | 12-14 Wks Lead Time",
      "IS 15477 C2TE S2 High-Flex Polymer",
      "Zero-VOC Natural Stone",
    ],
    certifications: {
      moistureStandard: "Requires Penetrating Sealer",
      airQuality: "Zero-VOC Natural Stone",
      leadTime: "12-14 Wks Lead Time (Import)",
      sourcingOrigin: "Carrara, Italy",
      adhesiveStandard: "IS 15477 C2TE S2 High-Flex Polymer",
    },
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
    badges: [
      "IS 15622 Group B1a Fully Vitrified",
      "IS 15477 C2TE S1 Flexible Polymer",
      "Immediate Stock | <1 Wk Lead Time",
    ],
    certifications: {
      moistureStandard: "IS 15622 (< 0.05% Water Absorption)",
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer",
      airQuality: "Zero-VOC Inert Ceramic",
      leadTime: "Immediate Stock | <1 Wk Lead Time",
      sourcingOrigin: "Morbi / Sikandrabad Plant",
    },
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
    badges: [
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "FSC Certified Sustainable Teak",
      "Termite & Rot Resistant Natural Silica",
    ],
    certifications: {
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "Low-VOC PU Sealer",
      leadTime: "3-4 Wks Lead Time",
      sourcingOrigin: "Burma Teak / Indian Plantation",
    },
  },
  {
    id: "fl_herringbone_oak",
    name: "Herringbone Oak Wood Flooring",
    category: "flooring",
    subcategory: "Hardwood Parquet",
    region: "global",
    rateBudget: 320,
    rateMid: 480,
    ratePremium: 720,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
    colorHex: "#b58a5b",
    description: "Classic 90-degree zig-zag chevron parquet in European white oak. Timeless architectural elegance, warm satin polyurethane finish.",
    specs: { Pattern: "Herringbone 90°", Thickness: "14mm", Finish: "UV Matte Lacquer", Core: "Multi-ply birch" },
    badges: [
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "E1 Formaldehyde Compliant Birch Core",
      "UV Cured Ultra-Low VOC Lacquer",
    ],
    certifications: {
      acousticRating: "IIC 52 with Acoustic Underlayment",
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "E1 Standard & Low-VOC Lacquer",
      leadTime: "4-6 Wks Lead Time",
      sourcingOrigin: "European White Oak / Baltic Birch",
    },
  },
  {
    id: "adh_c2te_s1_polymer",
    name: "C2TE S1 Flexible Polymer Tile & Stone Adhesive",
    category: "flooring",
    subcategory: "Adhesives & Bedding",
    brand: "Laticrete / MYK",
    region: "india",
    rateBudget: 18,
    rateMid: 28,
    ratePremium: 42,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80",
    colorHex: "#8e8e93",
    description: "High-performance polymer-modified cementitious thin-bed mortar for large format vitrified tiles and heavy natural stones (Kota, marble, granite).",
    specs: { Standard: "IS 15477:2019 Type 2", Classification: "C2TE S1", PotLife: "3 Hours", OpenTime: "30 Mins" },
    badges: [
      "IS 15477 C2TE S1 Flexible Polymer",
      "High Deformability S1 for Large Format Tiles",
      "Zero-VOC Polymer Modified",
    ],
    certifications: {
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer",
      airQuality: "Zero-VOC Polymer Modified (SCAQMD Rule 1168)",
      moistureStandard: "High Moisture & Submerged Resistant (EN 12004)",
      leadTime: "Immediate Stock | <1 Wk Lead Time",
    },
  },

  // --- WALL FINISHES & PAINT ---
  {
    id: "wl_asian_paints_royale",
    name: "Royale Luxury Emulsion (Asian Paints Royale Health Shield)",
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
    badges: [
      "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      "Anti-Bacterial Silver Ion Technology",
      "IS 15489 Plastic Emulsion Tested",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC (<25g/L) | Asian Paints Royale Health Shield",
      moistureStandard: "Washable Teflon Surface Protector (ASTM D2486)",
      leadTime: "Immediate Stock | Ready Available",
      sourcingOrigin: "Asian Paints India",
    },
  },
  {
    id: "wl_raw_concrete",
    name: "Raw Architectural Concrete",
    category: "walls",
    subcategory: "Fair-Faced Concrete",
    region: "global",
    rateBudget: 75,
    rateMid: 120,
    ratePremium: 185,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400&q=80",
    colorHex: "#949699",
    description: "Exposed shuttered board-formed architectural concrete finish. Minimalist, brutalist, and modern tactile micro-cement aesthetic.",
    specs: { Thickness: "3-4mm microcement", Finish: "Matte Sealer", Texture: "Poured Board-form" },
    badges: [
      "GreenGuard Gold Zero-VOC | Microcement Sealer",
      "IS 456 Fair-Faced Structural Finish",
      "Class A1 Non-Combustible",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC (<5g/L)",
      fireRating: "Class A1 Non-Combustible (BS EN 13501-1)",
      moistureStandard: "Silane-Siloxane Hydrophobic Sealer",
      leadTime: "On-site Application",
    },
  },
  {
    id: "wl_fluted_wood",
    name: "Fluted Wood Acoustic Wall Panels",
    category: "walls",
    subcategory: "Timber Paneling",
    region: "global",
    rateBudget: 220,
    rateMid: 340,
    ratePremium: 520,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80",
    colorHex: "#7a5332",
    description: "Vertical acoustic fluted slats in warm American walnut or natural teak over black felt backing. Luxury feature wall finish.",
    specs: { SlatWidth: "27mm", Gap: "13mm", Backing: "9mm Recycled PET Felt", NRC: "0.85" },
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "NRC 0.85 Acoustic PET Felt",
    ],
    certifications: {
      acousticRating: "STC 56 Tested | Gyproc SoundStop | NRC 0.85",
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "Zero-Odor Recycled PET Acoustic Core",
      fireRating: "Class 1 / Class A Flame Spread ASTM E84",
      leadTime: "2-3 Wks Lead Time",
    },
  },
  {
    id: "wl_gyproc_soundstop",
    name: "Gyproc SoundStop Acoustic Partition System",
    category: "walls",
    subcategory: "Drywall Partitions",
    brand: "Saint-Gobain Gyproc",
    region: "india",
    rateBudget: 145,
    rateMid: 215,
    ratePremium: 320,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
    colorHex: "#d0d4dc",
    description: "High-performance acoustic drywall partition with 90mm double studs, 50mm Rockwool 60kg/m³ insulation, and dual 12.5mm Gyproc SoundStop boards.",
    specs: { STC: "56 dB", Thickness: "140mm Overall", Board: "Dual 12.5mm SoundStop", Cavity: "50mm Rockwool 60kg/m³" },
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "50mm Rockwool 60kg/m³ Acoustic Core",
      "IS 2095 Part 1 Gypsum Plasterboard",
      "120 Mins Fire Resistance (BS 476)",
    ],
    certifications: {
      acousticRating: "STC 56 Tested (ASTM E90 / ISO 10140)",
      fireRating: "120 Mins Fire Resistance (BS 476 Part 22)",
      airQuality: "GreenGuard Gold Low-Emission Certified",
      moistureStandard: "MR Moisture Resistant Gypsum Core",
      leadTime: "1 Wk Lead Time",
      sourcingOrigin: "Saint-Gobain Gyproc India",
    },
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
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 1077 Common Burnt Clay Standard",
      "Hydrophobic Siloxane Moisture Barrier",
    ],
    certifications: {
      sourcingOrigin: "Rajasthan / Haryana Kilns",
      moistureStandard: "Efflorescence Resistant (<15% absorption)",
      airQuality: "100% Natural Fired Clay (Zero-VOC)",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
    },
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
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "Natural Clay Passive Cooling Screen",
    ],
    certifications: {
      acousticRating: "Diffusive Sound Scattering Screen",
      sourcingOrigin: "Rajasthan Handcrafted Kilns",
      airQuality: "Zero-VOC Natural Terracotta",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
    },
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
    badges: [
      "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      "ASTM D3273 Mold & Mildew Resistant",
      "Slaked Mineral Lime & Marble Dust",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC (<5g/L)",
      moistureStandard: "Vapour Permeable Breathable Matrix",
      leadTime: "On-site Artisanal Application",
    },
  },
  {
    id: "gl_saint_gobain_acoustic",
    name: "Acoustic Silence Laminated Glass",
    category: "walls",
    subcategory: "Acoustic Glazing",
    brand: "Saint-Gobain",
    region: "india",
    rateBudget: 240,
    rateMid: 360,
    ratePremium: 540,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=400&q=80",
    colorHex: "#c5d5d8",
    description: "High-performance acoustic laminated glazing with specialized acoustic PVB interlayer. Ideal for conference rooms and master suite acoustic envelopes.",
    specs: { Thickness: "12.76mm (6+0.76PVB+6)", STC: "38 dB", Safety: "EN 12600 Class 1B1", LightTransmittance: "88%" },
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "IS 2553 Toughened Safety Glass Standard",
      "Acoustic PVB Noise Dampening Interlayer",
    ],
    certifications: {
      acousticRating: "STC 38 Tested (Acoustic Silence PVB)",
      fireRating: "Impact Safety Class 1 (EN 12600)",
      moistureStandard: "Hermetically Sealed Dual Glaze",
      leadTime: "1-2 Wks Lead Time",
      sourcingOrigin: "Saint-Gobain India (Sriperumbudur / Jhagadia)",
    },
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
    badges: [
      "Rajasthan Sourced | 2-3 Wks Lead Time",
      "IS 3316 Structural Granite Tested",
      "Heat Resistant up to 300°C",
    ],
    certifications: {
      sourcingOrigin: "Chamrajnagar Quarry / Rajasthan Cutting",
      fireRating: "Heat Resistant up to 300°C",
      airQuality: "Zero-VOC Natural Plutonic Granite",
      leadTime: "Rajasthan Sourced | 2-3 Wks Lead Time",
    },
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
    badges: [
      "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      "NSF/ANSI 51 Food Zone Certified",
      "Non-Porous Stain Resistant Class 5",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Low Chemical Emissions",
      moistureStandard: "Zero Porosity (<0.02% absorption)",
      leadTime: "1-2 Wks Lead Time",
      sourcingOrigin: "KalingaStone India",
    },
  },

  // --- CEILINGS ---
  {
    id: "cl_armstrong_acoustic",
    name: "Armstrong Mineral Fiber Acoustic Ceiling Tiles",
    category: "ceiling",
    subcategory: "Acoustic Ceilings",
    brand: "Armstrong",
    region: "india",
    rateBudget: 75,
    rateMid: 110,
    ratePremium: 165,
    priceUnit: "sqft",
    thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
    colorHex: "#f7f7f9",
    description: "Fine-fissured mineral fiber acoustic lay-in ceiling tiles providing excellent room noise absorption and sound attenuation for modern luxury spaces.",
    specs: { Thickness: "15mm", Grid: "24mm Exposed T-Grid", NRC: "0.70", CAC: "35 dB" },
    badges: [
      "STC 56 Tested | Gyproc SoundStop",
      "NRC 0.70 / CAC 35 High Acoustic Attenuation",
      "GreenGuard Gold Zero-VOC Certified",
    ],
    certifications: {
      acousticRating: "STC 56 Tested | Gyproc SoundStop | NRC 0.70",
      airQuality: "GreenGuard Gold Zero-VOC Certified",
      fireRating: "Class A Non-Combustible (BS 476 Part 6/7)",
      leadTime: "Immediate Stock | <1 Wk Lead Time",
      sourcingOrigin: "Armstrong World Industries India",
    },
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
    badges: [
      "IS 8931 Water Fittings Standard",
      "Lead-Free DZR Forged Brass",
      "IGBC / GRIHA 3-Star Water Saving",
    ],
    certifications: {
      moistureStandard: "10 Bar Hydrostatic Pressure Tested",
      leadTime: "Immediate Stock Dispatch",
      sourcingOrigin: "Jaquar India (Manesar Plant)",
    },
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
    badges: [
      "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      "NWFA Certified American White Oak",
      "FloorScore Certified Low-VOC",
    ],
    certifications: {
      moistureStandard: "IS 287 Kiln-Dried 8-12% EMC | BWP 710 Backer",
      airQuality: "FloorScore Certified Low-VOC",
      leadTime: "2-3 Wks Lead Time",
      sourcingOrigin: "Appalachian Hardwoods, USA",
    },
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
    badges: [
      "IS 15477 C2TE S1 Flexible Polymer",
      "ANSI A137.1 Porcelain Certified",
      "DCOF >= 0.42 Dynamic Friction",
    ],
    certifications: {
      adhesiveStandard: "IS 15477 C2TE S1 Flexible Polymer / ANSI A118.15",
      moistureStandard: "Impervious Water Absorption <0.5%",
      leadTime: "1-2 Wks Lead Time",
    },
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
    badges: [
      "GreenGuard Gold Zero-VOC | Asian Paints Royale Health Shield",
      "MPI #44 Certified Architectural Coating",
      "Zero-VOC Gennex Colorant",
    ],
    certifications: {
      airQuality: "GreenGuard Gold Zero-VOC (<50g/L) | Asian Paints Royale Health Shield",
      leadTime: "Ready Stock (Immediate)",
    },
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

export function getMaterialBadges(item: MaterialItem): string[] {
  return item.badges || [];
}

export function getMaterialCertifications(item: MaterialItem): MaterialCertifications {
  return item.certifications || {};
}
