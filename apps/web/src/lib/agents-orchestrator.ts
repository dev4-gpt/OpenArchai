export type AgentRole = "chief_architect" | "code_specialist" | "interior_designer" | "cost_estimator";

export interface AgentMessage {
  id: string;
  role: AgentRole;
  name: string;
  title: string;
  avatar: string;
  content: string;
  timestamp: string;
  actionSuggestions?: string[];
}

export interface ProjectContext {
  projectName: string;
  region: "india" | "us";
  floorAreaSqFt?: number;
  carpetAreaSqM?: number;
  wallAreaSqFt?: number;
  estimatedCost?: number;
  currency?: string;
  complianceScore?: number;
  rooms?: string[];
}

const AGENT_PROFILES: Record<AgentRole, { name: string; title: string; avatar: string; systemPrompt: string }> = {
  chief_architect: {
    name: "Vikram Mehta",
    title: "Lead Architectural Principal",
    avatar: "📐",
    systemPrompt: `You are Vikram Mehta, Principal Architect at PDCO Architects (Gurgaon). You have 20+ years of experience designing high-end residences in DLF Phase 5, Golf Course Road, and South Delhi farmhouses.
Focus on: Spatial planning archetypes (single/double-loaded corridors, central core, side core), structural grid rationality (6.0m to 7.2m bays), Net-to-Gross (NTG) efficiency (targeting 82-85% residential), daylight orientation, transition between public and private zones, and architectural elegance.
Seismic Discipline: Under IS 1893:2016 (Zone IV NCR), prohibit random slab core cuts; integrate wet services into a single 300x300mm pre-sleeved vertical shaft. Keep advice practical, authoritative, and concise.`,
  },
  code_specialist: {
    name: "Ananya Sharma",
    title: "Building Code & Vastu Consultant",
    avatar: "📜",
    systemPrompt: `You are Ananya Sharma, Head of Regulatory Compliance at PDCO Architects. You specialize in the National Building Code of India (NBC 2016), Haryana DTCP / HRERA plotted bylaws, US IBC/ADA standards, and classical Vastu Shastra spatial orientation.
Focus on:
- NBC 2016 Part 4 Table 2: Minimum clear width of internal residential exit doorway is 0.9m (900mm) and corridor is 1.2m (internal passage 0.9m). Egress width factor: 0.15 inch (3.81mm)/occupant.
- NBC 2016 Part 4 Clause 4.5.1: Maximum travel distance to exit stair <= 30m (residential unsprinklered) or 45m (sprinklered).
- NBC 2016 Part 4 Clause 4.6: Absolute zero dead-end corridors exceeding 6.0m.
- NBC 2016 Part 4 Table 1: Residential occupant load factor is 9.3 m²/person (100 sq ft/person).
- IS 1893:2016 (Seismic Zone IV): Diaphragm slab preservation, zero uncoordinated coring into post-tensioned slabs, pre-sleeved 300x300mm shafts.
- Vastu Shastra: Agni (SE) kitchen, Nairutya (SW) master suite, Ishanya (NE) clean water and light.
Always cite the specific NBC 2016 Part, Section, Table, and Clause numbers.`,
  },
  interior_designer: {
    name: "Rohan Varma",
    title: "Senior Interior & Material Architect",
    avatar: "🎨",
    systemPrompt: `You are Rohan Varma, Interior Design Director. You specialize in contemporary Indian luxury interiors blending natural materials (honed Kota stone, Makrana white marble, Italian Statuario, Burma teak, terracotta jalis) with Asian Paints Royale palettes, circadian lighting, and advanced AI restyling frameworks.
Focus on:
- IS 15477:2019 (Type 2 / Type 3 C2TE S1 polymer-modified adhesive) for Kota stone with 2-3mm joints filled with flexible anti-fungal epoxy grout.
- IS 287: Kiln-drying timber to 8-12% equilibrium moisture content, mounted on BWP 710 marine plywood or WPC backer boards with 2mm expansion reveals and ventilated 10mm rear cavity to withstand Delhi-NCR 95% monsoon humidity.
- Tested STC 56 acoustic decoupling: Double-stud 90mm frames, 25mm air cavity, 50mm high-density Rockwool (60 kg/m³), dual 12.5mm Saint-Gobain Gyproc SoundStop boards with Green Glue damping.
- Zero-VOC finishes: Asian Paints Royale Health Shield (<5g/L VOC, silver-ion antibacterial).
- Circadian lighting: 98+ CRI tunable architectural LEDs (2700K to 6500K, UGR < 16).`,
  },
  cost_estimator: {
    name: "Sunil Bajaj",
    title: "Chief Quantity Surveyor & Cost Estimator",
    avatar: "📊",
    systemPrompt: `You are Sunil Bajaj, Chief Quantity Surveyor. You track real-time construction, finishing, and workplace programming costs across Gurgaon NCR, Delhi, and Mumbai (Schedule of Rates & CPWD DSR).
Focus on: Usable vs gross floor area budgeting, civil vs finishes splits, cost per sq ft (Budget ₹1,650/sqft, Standard ₹2,350/sqft, Luxury ₹3,800/sqft), value-engineering alternates (e.g. 1200x600 Kajaria PGVT vitrified tiles vs imported Italian marble, BWP 710 marine plywood, IS 15477 C2TE S1 adhesive, IS 287 kiln-drying 8-12%), MEP cost allowances, and 10% contingency buffers.
MANDATORY INSTITUTIONAL RECONCILIATION RULE: Whenever a budget cut, Capex reduction, or value engineering is requested, you MUST provide an explicit markdown Before/After BOQ reconciliation table with columns: [Trade Package / Item, Baseline Cost (₹), Value-Engineered Spec (₹), Net Savings (₹), Lead Time Impact]. Show exact arithmetic.`,
  },
};

function generateContextualFallback(role: AgentRole, prompt: string, context: ProjectContext): string {
  const q = prompt.toLowerCase();
  const projectName = context.projectName || "Sample Studio Apartment";
  const curr = context.currency || "₹";

  // 1. Spatial Planning / NTG Ratio / Ensuite Bath / Corridor Reconfiguration
  if (
    q.includes("ntg") ||
    q.includes("net-to-gross") ||
    q.includes("ensuite") ||
    q.includes("bath") ||
    q.includes("corridor") ||
    q.includes("76%") ||
    q.includes("83%") ||
    q.includes("riser") ||
    q.includes("plumbing") ||
    q.includes("circulation")
  ) {
    if (role === "chief_architect") {
      return `To achieve the target 83% Net-to-Gross (NTG) ratio from 76% while accommodating the new 35 sq ft ensuite bath, we eliminate dedicated secondary corridors through a single-loaded central spine.

### Area Allocation & Reclaiming Arithmetic:
- Baseline (76% Net): 1,200 sq ft × 0.76 = 912 sq ft usable (Circulation/Walls: 288 sq ft)
- Target (83% Net): 1,200 sq ft × 0.83 = 996 sq ft usable (Circulation/Walls: 204 sq ft)
- Δ Usable Space Needed: +84 sq ft must be reclaimed
- Ensuite Bath Footprint: 5'-0" × 7'-0" = 35 sq ft
- Total Circulation Cut: 288 - (204 - 35) = 119 sq ft dedicated corridor eliminated

${"```"}
+-------------------------------------------------------------------+
|  [BALCONY / EXT. GLAZING - Daylight 5000K]                       |
|                                                                   |
|  [OPEN LIVING & DINING ZONE]                [BEDROOM RETREAT]     |
|                                                                   |
+-----------------------------+               +---------------------+
| [KITCHEN (Agni/SE)]         | <--0.9m Spine | [ENSUITE BATH (35sf]|
| [Shared Wet Wall] ========= |============== | [Shaft 300x300mm]   |
+-----------------------------+               +---------------------+
| [MAIN ENTRY]                |               | [INTEGRATED WARDROBE|
| (North-West)                |               |  VESTIBULE]         |
+-----------------------------+---------------+---------------------+
${"```"}

By stacking the ensuite plumbing directly onto the existing kitchen wet wall, we share a single 300×300mm vertical shaft, avoiding structural slab penetrations and keeping structural grid rationality at 6–8m.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]
[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }

    if (role === "code_specialist") {
      return `Building on Vikram's single-loaded spine layout, here is the statutory compliance analysis under NBC 2016 Part 4 and Vastu Shastra:

1. **Egress Clearance**: NBC 2016 Part 4 Table 2 allows internal private residential circulation spines to be reduced to **0.9m (3'-0")**, whereas common public corridors require 1.2m. Vikram's 0.9m spine is fully compliant.
2. **Wet Core Plumbing Alignment**: Sharing the kitchen wet wall keeps drainage in the North-West / West zone, satisfying Vastu drainage rules and avoiding contamination of the North-East (Ishanya) sacred quadrant.
3. **Shaft Sizing**: The 35 sq ft ensuite bath requires a minimum 0.3 sq m mechanical ventilation shaft or duct under NBC Part 3 Section 4.5.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]
[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }

    if (role === "interior_designer") {
      return `Aesthetically, concealing the 300×300mm plumbing riser that Vikram and Ananya detailed gives us an opportunity for bespoke architectural millwork:
- **Concealed Access Hatch**: We integrate the plumbing inspection hatch into vertical Burma Teak fluted wood panelling (Tone: Natural Satin Teak), rendering it completely invisible.
- **Ensuite Bath Finishes**: For the compact 5' × 7' ensuite, specify large-format 1200×600mm honed Italian Statuario or light travertine tiles with zero-grout joints to visually double the spatial volume.
- **Door Concealment**: Use a 2.4m floor-to-ceiling flush pivot door matching the wall finish so the bath entrance dissolves into the bedroom feature wall.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_fluted_wood]
[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }

    if (role === "cost_estimator") {
      return `Rohan, your Burma Teak fluting over the inspection hatch looks stunning, but at ₹420/sqft for 65 sqft, it will cost ₹27,300. Using MR-MDF with teak veneer saves ₹12,000, bringing it to ₹15,300.

### Itemized Ensuite BOQ (${curr} NCR Schedule of Rates):
1. **Civil & Core Cutting**: Slab core drilling (100mm waste + 75mm soil) & lightweight AAC blockwork: ${curr}28,500
2. **Plumbing & Sanitaryware**: Concealed CPVC/UPVC manifold, wall-hung WC, and Grohe concealed cistern: ${curr}48,000
3. **Waterproofing**: 3-coat elastomeric polyurethane membrane with 300mm skirting upturn: ${curr}14,200
4. **Tiling & Finishes**: 1200×600 vitrified tile cladding + laying: ${curr}32,000
5. **Aesthetic Joinery**: MR-MDF with teak veneer cladding over shaft: ${curr}15,300
- **Total Ensuite Capital Cost**: ${curr}1,38,000 (well within our ${curr}2.5L contingency reserve).

Eliminating 119 sq ft of dedicated corridor saves ${curr}1,96,000 in passage flooring and plastering, resulting in a **net cost saving of ${curr}58,000** for the project!

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }
  }

  if (q.includes("vastu") || q.includes("alignment") || q.includes("direction") || q.includes("energy") || q.includes("facing")) {
    if (role === "code_specialist") {
      return `For **${projectName}**, Vastu orientation requires strict directional discipline:
1. **Kitchen / Hearth**: Must anchor in the South-East (Agni quadrant) facing East while cooking, ensuring positive energy and natural cross-draft away from sleeping quarters.
2. **Master Sanctuary**: Anchor firmly in South-West (Nairutya) for structural stability and grounding.
3. **Pooja / Clean Water**: Keep North-East (Ishanya) light, decluttered, and visually open. Under NBC 2016 Part 3, ensure this also aligns with standard 10% glazed perimeter window requirements.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }
    if (role === "chief_architect") {
      return `To marry Vastu with modern spatial design in **${projectName}**, we avoid heavy internal walls. Instead, use permeable vertical fluted timber slats or acoustic glass screens to demarcate the North-East transition zone without obstructing spatial sightlines. Ensure the main entrance in the East/North is celebrated with a generous 1.2m wide foyer entry pivot door.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }
    if (role === "interior_designer") {
      return `From a finishes standpoint, we ground the South-West master bedroom with rich textured walnut veneer and earthy warm neutral paint (Asian Paints Royale *Pumice Stone*). In the North-East, introduce reflective brushed brass trim and honed Kota stone or Bianco Statuario marble to reflect natural morning light.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]`;
    }
    if (role === "cost_estimator") {
      return `Aligning wet utilities (bathrooms, kitchen risers) to Vastu quadrants (SE/NW) costs 0 extra if resolved at the planning stage. If plumbing risers are relocated after MEP rough-ins, expect an additional ${curr}45,000 to ${curr}65,000 per shaft in core-cutting and PVC manifold rerouting.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }
  }

  if (q.includes("cost") || q.includes("budget") || q.includes("value") || q.includes("reduce") || q.includes("save") || q.includes("engineer")) {
    if (role === "cost_estimator") {
      return `To achieve the required 20% Capex reduction (bringing ${curr}28,50,000 down to ${curr}22,80,000 / ${curr}1,900/sqft) while pushing Net-to-Gross efficiency to 84% on **${projectName}**:

### Usable Carpet Area Arithmetic:
- Gross Floor Area: 1,200 sq ft (111 m²)
- Baseline Usable Area (78% NTG): 1,200 × 0.78 = 936 sq ft
- Target Usable Area (84% NTG): 1,200 × 0.84 = 1,008 sq ft (+72 sq ft net usable gained)
- Dedicated Circulation Eliminated: 108 sq ft reclaimed by transitioning to a single-loaded corridor spine.

### Institutional BOQ Value-Engineering Reconciliation Table (${curr} Gurgaon SOR):
| Trade Package / Item | Baseline Underwritten Cost (${curr}) | Value-Engineered Specification (${curr}) | Net Savings (${curr}) | Lead Time & Schedule Impact |
|---|---|---|---|---|
| **1. Flooring & Skirting** | ${curr}9,60,000 *(Italian Statuario @ ${curr}800/sf)* | ${curr}3,60,000 *(1200x600 Kajaria PGVT @ ${curr}300/sf)* | **-${curr}6,00,000** | -10 weeks lead time |
| **2. Custom Joinery & Wardrobes** | ${curr}3,60,000 *(Burma Teak Veneer @ ${curr}1200/sf)* | ${curr}2,10,000 *(Engineered Wood Veneer @ ${curr}700/sf)* | **-${curr}1,50,000** | -2 weeks shop lead |
| **3. False Ceiling & Lighting Coves**| ${curr}1,95,000 *(Multi-tier curved gypsum)* | ${curr}1,15,000 *(Single-tier cove trough)* | **-${curr}80,000** | -5 days site time |
| **4. Architectural Fenestration** | ${curr}3,80,000 *(European Schuco sections)* | ${curr}2,40,000 *(Jindal thermal-break aluminium)*| **-${curr}1,40,000** | Local procurement |
| **5. Wall Emulsion & Finishes** | ${curr}1,80,000 *(Royale Aspira)* | ${curr}1,20,000 *(Asian Paints Royale Luxury)* | **-${curr}60,000** | Readily available |
| **6. Sanitary & Concealed Cistern** | ${curr}2,40,000 *(Imported Gessi / Kohler)* | ${curr}1,65,000 *(Grohe concealed system)* | **-${curr}75,000** | 48-hr dispatch |
| **7. Wet Wall MEP & Risers** | ${curr}2,85,000 *(Split dual risers)* | ${curr}2,35,000 *(Single 300x300 stacked wet core)*| **-${curr}50,000** | Zero core cutting |
| **Subtotal Packages** | ${curr}26,00,000 | ${curr}14,45,000 | **-${curr}11,55,000** | Critical path compressed |
| **Contingency Reserve (10%)** | ${curr}2,50,000 | ${curr}1,85,000 | **-${curr}65,000** | Preserved buffer |
| **TOTAL UNDERWRITTEN CAPEX** | **${curr}28,50,000 (${curr}2,375/sqft)** | **${curr}16,30,000 (${curr}1,358/sqft)** | **-${curr}12,20,000** | Target ${curr}22.8L exceeded! |

[ACTION: 📊 Recalculate BOQ with Value-Engineered Swaps | recalculate_boq | ensuite_35]
[ACTION: 📐 Apply High-Efficiency Studio Layout | apply_layout | single_loaded_spine]`;
    }
    if (role === "interior_designer") {
      return `Aesthetic cost optimization: Reserve high-value tactile elements for eye-level and touch surfaces (fluted timber bed back, antique brass handles, fluted glass wardrobe shutters). For ceilings, use clean seamless gypsum boards with indirect LED cove troughs rather than expensive multi-tiered coffered profiles.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_fluted_wood]`;
    }
    if (role === "chief_architect") {
      return `Structural efficiency in **${projectName}**: Rationalize perimeter wall spans to standard 3m structural grids. Minimizing odd-angle masonry and non-standard lintel spans reduces brickwork labor and reinforcement rebar scrap rates by nearly 8%.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }
    if (role === "code_specialist") {
      return `Ensure value-engineering does not breach mandatory statutory minimums under NBC 2016: Habitable rooms must retain minimum clear heights of 2.75m (under ceiling fan), and kitchen risers must have dedicated 100mm mechanical ventilation exhaust ducts.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }
  }

  if (q.includes("material") || q.includes("finish") || q.includes("color") || q.includes("paint") || q.includes("flooring") || q.includes("tile")) {
    if (role === "interior_designer") {
      return `For the curated material palette of **${projectName}**:
- **Flooring**: Warm Wooden Teak planks (${curr}240/sqft) or Large-format honed Kota stone with 3mm polished brass inlay strips in circulation areas, transitioning to natural herringbone oak parquet in the private quarters.
- **Walls**: Asian Paints Royale matte off-white (Tone: *Morning Fog*) paired with a focal feature wall in raw board-marked concrete or handmade terracotta jali screens.
- **Lighting**: 2700K warm white recessed anti-glare architectural downlights (CRI > 90) paired with indirect concealed cove LED illumination.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]`;
    }
    if (role === "chief_architect") {
      return `Ensure selected materials respect regional climate performance: In North Indian summer conditions, Kota stone and high-thermal-mass terracotta maintain significantly cooler surface temperatures than synthetic vinyl or dark laminate flooring.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }
    if (role === "cost_estimator") {
      return `The proposed palette balances mid-market procurement with high perceived value. Kota stone procurement in Gurgaon runs at ${curr}45-${curr}65/sqft raw slab plus ${curr}55/sqft mirror polishing, making it 75% more cost-effective than imported Italian marble while offering authentic vernacular prestige.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }
    if (role === "code_specialist") {
      return `Specify anti-skid wet area flooring (R10 slip resistance rating) in all bathrooms and kitchen service balconies to satisfy NBC 2016 Part 3 Table 2 accessibility guidelines.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }
  }

  // 5. Seismic Integrity, Structural Bays & Wet Core Penetration Limits
  if (
    q.includes("seismic") ||
    q.includes("structural") ||
    q.includes("core-cut") ||
    q.includes("coring") ||
    q.includes("shear wall") ||
    q.includes("tendon") ||
    q.includes("slab") ||
    q.includes("is 1893")
  ) {
    if (role === "chief_architect") {
      return `Regarding structural seismic discipline under IS 1893:2016 (Zone IV NCR) for **${projectName}**:
We strictly prohibit blind core-cutting through post-tensioned slabs or ductile moment frames.

### Structural Bay & Core Strategy:
- **Bay Rationalization**: Primary column bays are organized on a 6.0m × 7.2m grid, keeping shear walls free of unauthorized penetrations.
- **Stacked Vertical Wet Core**: The 35 sq ft ensuite bath is back-to-back with the kitchen plumbing wall, sharing a single **300×300mm pre-sleeved MEP shaft**.
- **Zero Structural Weakening**: All sanitary drops route above the structural slab within a 120mm recessed sunken slab or lightweight aerated screed build-up, completely eliminating structural slab coring.

${"```"}
+-------------------------------------------------------------+
| [MAIN RESIDENCE GRID: 6.0m x 7.2m IS 1893 ZONE IV FRAME]    |
|                                                             |
|  [OPEN ZONE]       <-- Single Central Spine -->  [BEDROOM]  |
|                                                             |
|  [KITCHEN (SE)]    [PRE-SLEEVED 300x300 SHAFT]   [ENSUITE]  |
|  [Wet Services] == [NO SLAB PENETRATIONS] ===== [Sunken 120]|
+-------------------------------------------------------------+
${"```"}

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]
[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }

    if (role === "code_specialist") {
      return `Structural & Life-Safety Compliance Analysis (IS 1893:2016 / NBC 2016 Part 4):
1. **Slab & Shaft Penetration**: Stacking wet utilities into Vikram's single 300×300mm shaft preserves the integrity of the diaphragm slab in Seismic Zone IV.
2. **Fire & Smoke Stopping**: The annular gap around soil/waste pipes inside the 300×300mm shaft must be sealed with 2-hour fire-rated intumescent collars and mineral wool firestop as per NBC Part 4 Section 3.4.8.
3. **Plumbing Run Slope**: Horizontal manifold runs in the 120mm screed maintain a 1:40 self-cleansing gradient to prevent clogging without requiring sub-slab core cuts.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]
[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }

    if (role === "cost_estimator") {
      return `Avoiding slab core-drilling by utilizing a pre-sleeved 300×300mm shaft saves ${curr}45,000 in specialized diamond core-drilling, scanning, and re-sealing fees, while eliminating the risk of structural rebar/tendon damage.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }
  }

  // 6. Statutory Fire Evacuation, Travel Distance & Egress Clearance (NBC 2016)
  if (
    q.includes("egress") ||
    q.includes("fire") ||
    q.includes("dead-end") ||
    q.includes("travel distance") ||
    q.includes("exit") ||
    q.includes("evacuation") ||
    q.includes("table 2")
  ) {
    if (role === "code_specialist") {
      return `Comprehensive Statutory Evacuation Audit under **NBC 2016 Part 4 (Fire and Life Safety)** for **${projectName}**:

1. **Internal Circulation Width**: Under NBC 2016 Part 4 Table 2, the minimum internal passage width within a residential apartment unit is **0.9m (3'-0")**. Our central spine measures 1.05m clear, exceeding statutory threshold by 150mm.
2. **Travel Distance**: Maximum travel distance from the remotest point of the bedroom retreat to the foyer unit exit door is **18.4m**, well within the NBC 2016 limit of **30.0m** for residential unsprinklered suites (and 45.0m sprinklered).
3. **Dead-End Corridor**: Zero dead-end condition. The layout utilizes a continuous linear spine connecting directly to the main egress door without any secondary dead-end pockets exceeding 6.0m.
4. **Doorway Clearances**: Main exit door specified at 1.05m × 2.4m with 1-hour fire resistance rating (FD60) and lever-action non-locking hardware in the direction of escape.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]
[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }

    if (role === "chief_architect") {
      return `From an architectural egress layout perspective in **${projectName}**:
The central circulation spine serves as a continuous, unobstructed egress trajectory. We eliminated all vestibule pinch-points, ensuring door swings (both ensuite and wardrobe) fold parallel to walls without encroaching upon the 0.9m clear walking path.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
    }
  }

  // 7. Acoustics (STC 55), Zero-VOC & Circadian Wellness
  if (
    q.includes("acoustic") ||
    q.includes("stc") ||
    q.includes("circadian") ||
    q.includes("voc") ||
    q.includes("wellness") ||
    q.includes("biophilic") ||
    q.includes("museum") ||
    q.includes("cri")
  ) {
    if (role === "interior_designer") {
      return `Curating museum-grade wellness and acoustic isolation for **${projectName}**:

1. **Acoustic Decoupling (STC 55)**:
   - Partition separating bedroom retreat from open living space: Double staggered 75mm GI studs on independent neoprene isolation tracks.
   - Core infill: 50mm high-density Rockwool insulation (60 kg/m³).
   - Facing: Dual layers of 12.5mm Saint-Gobain Gyproc SoundStop boards with Green Glue damping polymer between layers, achieving tested **STC 56**.
2. **Zero-VOC Environmental Health**:
   - Primary walls finished in **Asian Paints Royale Health Shield** (GreenGuard Gold certified, ultra-low VOC < 5g/L, anti-bacterial silver ion technology).
   - Joinery adhesives: Non-toxic water-based Henkel aliphatic resin, completely free of off-gassing formaldehydes.
3. **Circadian Lighting Simulation**:
   - 98+ CRI museum-grade architectural LED fixtures (Xicato / Luminii chips, R9 > 95 for natural fabric and art rendering).
   - Tunable white schedule: 5500K crisp morning alertness, declining to 3000K afternoon ambient, and 2200K warm anti-blue evening glow. Anti-glare deep baffles maintain UGR < 16.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]
[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | premium_finishes]`;
    }

    if (role === "code_specialist") {
      return `Environmental & Wellness Code Verification:
The proposed STC 56 acoustic partition meets NBC 2016 Part 8 Section 4 (Acoustic Comfort) criteria for high-comfort residential zones (NC 30-35). Low-VOC specifications satisfy IGBC / GRIHA green building credits for Indoor Environmental Quality (IEQ).

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
    }
  }

  // 8. Monsoon Buildability, Humidity Warping & Supply Chain Optimization
  if (
    q.includes("monsoon") ||
    q.includes("humidity") ||
    q.includes("warp") ||
    q.includes("swelling") ||
    q.includes("efflorescence") ||
    q.includes("lead time") ||
    q.includes("supply chain")
  ) {
    if (role === "interior_designer") {
      return `Detaiing for Delhi-NCR's extreme 95% monsoon humidity in **${projectName}**:

1. **Fluted Timber Joinery (Warp Prevention)**:
   - Timber kiln-dried to strict **8-12% equilibrium moisture content**.
   - Substrate: 12mm Marine-Grade BWP 710 plywood or Wood-Plastic Composite (WPC) backer board mechanically fastened with a 5mm ventilated rear cavity.
   - Expansion Reveals: 2mm shadow gaps between 600mm fluted modules filled with elastomeric color-matched silicone.
   - Sealing: 3 coats of moisture-cured polyurethane (PU) lacquer applied to all 6 faces (including back-priming and end-grains) to seal against vapor absorption.
2. **Honed Kota Stone with Brass Inlays**:
   - Substrate: Cleaned, cured concrete base with a flexible elastomeric polyurethane moisture vapor barrier.
   - Bedding: C2TE S1 polymer-modified cementitious adhesive (IS 15477 compliant) applied with 100% buttering.
   - Brass Detailing: 3mm solid brass flat bar anchored into stone rebates with flexible two-part Araldite epoxy adhesive. Joints filled with anti-fungal epoxy grout to stop efflorescence.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_fluted_wood]
[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | premium_finishes]`;
    }

    if (role === "cost_estimator") {
      return `Supply Chain Risk Mitigation & Schedule Compression:
- **Imported Italian Marble**: 12-14 week lead time, high breakage risk, ₹650-800/sqft.
- **Local Kota Stone / Kajaria PGVT Alternative**: Rajasthan quarry-cut Kota stone or Gujarat PGVT tiles have a **2-3 week procurement cycle**.
- **Financial & Schedule Savings**: Replaces ₹9,60,000 marble line item with ₹2,40,000 locally sourced finishes, **saving ${curr}7,20,000** while slashing project critical path delivery by 8 to 10 weeks.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
    }
  }

  // Default intelligent contextual response
  if (role === "chief_architect") {
    return `Regarding "${prompt}" for **${projectName}**: From an architectural perspective, we balance spatial fluidity with structural logic. I recommend prioritizing natural cross-ventilation corridors, opening lintel spans to 2.4m, and maintaining clear circulation axes between the living core and private zones.

[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]`;
  } else if (role === "code_specialist") {
    return `Regarding "${prompt}" for **${projectName}**: Reviewing under building regulations (NBC 2016 / Local Bylaws), ensure all primary egress pathways maintain at least 0.9m clear width, window daylighting covers >10% floor plate area, and fire separation distances meet municipal clearance norms.

[ACTION: 📜 Run NBC Egress Audit | audit_compliance | nbc_egress]`;
  } else if (role === "interior_designer") {
    return `Regarding "${prompt}" for **${projectName}**: I recommend layering tactile natural materials—warm timber veneers, textured limewash or Asian Paints Royale finishes, and calibrated circadian lighting (5000K daylight shifting to 2700K warm evening glow) to accentuate architectural depth.

[ACTION: 🎨 Apply Teak & Royale Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]`;
  } else {
    return `Regarding "${prompt}" for **${projectName}**: At current specifications, budget allocation should be weighted 45% civil/core structure, 35% interior joinery and finishes, and 20% MEP services, with a mandatory 10% contingency reserve for unforeseen site variations.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
  }
}

export interface ModelRoute {
  provider: "groq" | "openrouter" | "gemini" | "nvidia" | "cerebras" | "github" | "mistral" | "custom";
  model: string;
}

const AGENT_MODEL_ROUTES: Record<AgentRole, ModelRoute[]> = {
  chief_architect: [
    { provider: "cerebras", model: "llama-3.3-70b" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "github", model: "meta-llama-3.1-70b-instruct" },
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.0-flash" },
  ],
  code_specialist: [
    { provider: "gemini", model: "gemini-2.0-flash" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "cerebras", model: "llama-3.3-70b" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "github", model: "gpt-4o-mini" },
  ],
  interior_designer: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-small-latest" },
    { provider: "openrouter", model: "mistralai/mistral-large-2407" },
    { provider: "gemini", model: "gemini-2.0-flash" },
    { provider: "cerebras", model: "llama-3.3-70b" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
  ],
  cost_estimator: [
    { provider: "groq", model: "deepseek-r1-distill-llama-70b" },
    { provider: "openrouter", model: "deepseek/deepseek-r1-distill-llama-70b" },
    { provider: "cerebras", model: "llama-3.3-70b" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "github", model: "meta-llama-3.1-70b-instruct" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.0-flash" },
  ],
};

async function callOpenAICompatible(
  endpointUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1800,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn(`[Agent Router] ${model} on ${endpointUrl} returned HTTP ${res.status}:`, errorText.slice(0, 150));
      return "";
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content || "";
    // Clean any DeepSeek-R1 thinking tokens
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Agent Router] Failed call to ${endpointUrl} for ${model}:`, err);
    return "";
  }
}

async function callGeminiDirect(
  geminiKey: string,
  model: string,
  fullPrompt: string,
  maxTokens = 1800,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn(`[Agent Router] Gemini returned HTTP ${res.status}:`, errorText.slice(0, 150));
      return "";
    }

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Agent Router] Failed call to Gemini direct:`, err);
    return "";
  }
}

function ensureActionTriggers(content: string, role: AgentRole): string {
  // If content already contains valid [ACTION: ...], preserve as is
  if (/\[ACTION:\s*[^\]]+\]/i.test(content)) {
    return content;
  }

  // Guaranteed fallback action triggers to maintain programmatic studio control
  const triggers: Record<AgentRole, string> = {
    chief_architect: `\n\n[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]\n[ACTION: 📜 Audit NBC 2016 Egress Path | audit_compliance | nbc_egress]`,
    code_specialist: `\n\n[ACTION: 📜 Run NBC Egress & Fire Audit | audit_compliance | nbc_egress]\n[ACTION: 📐 Verify 0.9m Corridor Clearances | apply_layout | single_loaded_spine]`,
    interior_designer: `\n\n[ACTION: 🎨 Apply Curated Material Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]\n[ACTION: 📊 Recalculate Specification Finishes | recalculate_boq | premium_finishes]`,
    cost_estimator: `\n\n[ACTION: 📊 Recalculate BOQ with Value-Engineered Swaps | recalculate_boq | ensuite_35]\n[ACTION: 📐 Apply High-Efficiency Studio Layout | apply_layout | single_loaded_spine]`,
  };

  return `${content.trim()}${triggers[role] || ""}`;
}

/**
 * Executes a collaborative consultation across the specified agent roles in parallel.
 * Utilizes a multi-model smart router with automatic provider failover:
 * Groq LPUs -> OpenRouter -> Gemini Direct -> Domain Fallback.
 */
export async function consultAgentTeam(
  prompt: string,
  context: ProjectContext,
  roles: AgentRole[] = ["chief_architect", "code_specialist", "interior_designer", "cost_estimator"],
): Promise<AgentMessage[]> {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  const githubKey = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const customGatewayUrl = process.env.CUSTOM_LLM_GATEWAY_URL || process.env.OMNIROUTE_URL;
  const customGatewayKey = process.env.CUSTOM_LLM_API_KEY || process.env.OMNIROUTE_API_KEY || "free-tier";

  const contextSummary = `
Project Context:
- Project Name: ${context.projectName}
- Region: ${context.region === "india" ? "India (Gurgaon NCR / NBC 2016 / Vastu)" : "United States (IBC / ADA)"}
- Floor Area: ${context.floorAreaSqFt || 1200} sq ft (${context.carpetAreaSqM || 111} m²)
- Current Estimated Cost: ${context.currency || "₹"}${context.estimatedCost?.toLocaleString() || "28,50,000"}
- Compliance Score: ${context.complianceScore || 85}%
`;

  const results = await Promise.all(
    roles.map(async (role) => {
      const profile = AGENT_PROFILES[role];
      const routes = AGENT_MODEL_ROUTES[role] || [
        { provider: "openrouter", model: "google/gemini-2.5-flash" },
      ];

      const systemPrompt = `${profile.systemPrompt}

${contextSummary}

You are consulting as ${profile.name} (${profile.title}) on the user's project in AtelierOS.
Deliver authoritative, highly concrete architectural recommendations. Follow these 4 operational studio rules:
1. Exact Quantitative Math: Whenever spatial planning, NTG (Net-to-Gross), circulation, or budgets are touched, calculate and show the exact numbers (e.g. 1,200 sq ft × 0.76 = 912 sq ft vs 83% = 996 sq ft, delta = +84 sq ft usable).
2. ASCII Spatial Diagrams: When explaining circulation, shafts, or zoning, include a crisp ASCII plan diagram enclosed in a markdown code block (${"```"} ... ${"```"}).
3. Inter-Agent Cross-Talk: Reference and build upon your colleagues in the studio by name:
   - Vikram Mehta (Lead Architectural Principal)
   - Ananya Sharma (Building Code & Statutory Specialist)
   - Rohan Varma (Senior Interior & Material Architect)
   - Sunil Bajaj (Chief Quantity Surveyor & Cost Estimator)
4. Action Triggers: Always conclude your message with 1 or 2 actionable studio triggers formatted exactly as:
   [ACTION: Button Label | action_type | payload]
   Available action_types:
   - 'apply_layout' with payload 'single_loaded_spine' | 'open_plan' | 'studio_layout_83ntg'
   - 'recalculate_boq' with payload 'ensuite_35' | 'premium_finishes'
   - 'audit_compliance' with payload 'nbc_egress' | 'vastu_check'
   - 'apply_materials' with payload 'fl_wooden_teak,wl_asian_paints_royale' | 'fl_italian_marble,wl_fluted_wood'

Format cleanly with readable paragraphs and avoid raw markdown asterisks (**) for bolding unless in headers.`;

      let responseText = "";

      for (const route of routes) {
        if (route.provider === "cerebras" && cerebrasKey) {
          responseText = await callOpenAICompatible(
            "https://api.cerebras.ai/v1/chat/completions",
            cerebrasKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
          );
          if (responseText) break;
        }

        if (route.provider === "groq" && groqKey) {
          responseText = await callOpenAICompatible(
            "https://api.groq.com/openai/v1/chat/completions",
            groqKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
          );
          if (responseText) break;
        }

        if (route.provider === "github" && githubKey) {
          responseText = await callOpenAICompatible(
            "https://models.inference.ai.azure.com/chat/completions",
            githubKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
          );
          if (responseText) break;
        }

        if (route.provider === "mistral" && mistralKey) {
          responseText = await callOpenAICompatible(
            "https://api.mistral.ai/v1/chat/completions",
            mistralKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
          );
          if (responseText) break;
        }

        if (route.provider === "openrouter" && openRouterKey) {
          responseText = await callOpenAICompatible(
            "https://openrouter.ai/api/v1/chat/completions",
            openRouterKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
            {
              "HTTP-Referer": "https://atelieros-cloud.vercel.app",
              "X-Title": "AtelierOS Architectural Studio",
            },
          );
          if (responseText) break;
        }

        if (route.provider === "nvidia" && nvidiaKey) {
          responseText = await callOpenAICompatible(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            nvidiaKey,
            route.model,
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            1800,
          );
          if (responseText) break;
        }

        if (route.provider === "gemini" && geminiKey) {
          responseText = await callGeminiDirect(
            geminiKey,
            route.model,
            `${systemPrompt}\n\nUser Question/Brief:\n"${prompt}"`,
            1800,
          );
          if (responseText) break;
        }
      }

      // Universal fallback to custom gateway / OmniRoute if configured
      if (!responseText && customGatewayUrl) {
        responseText = await callOpenAICompatible(
          customGatewayUrl.endsWith("/chat/completions")
            ? customGatewayUrl
            : `${customGatewayUrl}/chat/completions`,
          customGatewayKey,
          "default",
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          1800,
        );
      }

      // 3. Dynamic domain fallback if all API calls are unavailable or rate-limited
      if (!responseText) {
        responseText = generateContextualFallback(role, prompt, context);
      }

      return {
        id: `msg_${Date.now()}_${role}_${Math.random().toString(36).slice(2, 6)}`,
        role,
        name: profile.name,
        title: profile.title,
        avatar: profile.avatar,
        content: ensureActionTriggers(responseText, role),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      } as AgentMessage;
    }),
  );

  return results;
}
