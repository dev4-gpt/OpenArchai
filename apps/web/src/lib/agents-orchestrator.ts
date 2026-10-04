import { generateEgressProof } from "./calculators/nbc-egress";
import { generateNTGProof, generateCapexProof } from "./calculators/pe-boq";
import { checkSpanDeflection, checkPlenumClash } from "./calculators/structural-grid-engine";
import { calculateSabineRT60, verifySTCDecoupling, calculateDaylightFactor, evaluateVastuMandala } from "./calculators/acoustic-rt60-calculator";
import { calculateStaircaseCompliance } from "./calculators/staircase-egress-calculator";

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
  // Observability fields (added Phase 1 production overhaul)
  source?: "model" | "degraded";
  modelUsed?: string;   // e.g. "google/gemini-2.5-flash via openrouter"
  latencyMs?: number;
  actionInjected?: boolean; // true when ensureActionTriggers() appended synthetic triggers
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

// Roles where temperature should be low (arithmetic / compliance outputs)
const LOW_TEMPERATURE_ROLES: Set<AgentRole> = new Set(["cost_estimator", "code_specialist"]);

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const DEFAULT_CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
const DEFAULT_MISTRAL_MODEL = process.env.MISTRAL_MODEL || "codestral-latest";
const DEFAULT_SAMBANOVA_MODEL = process.env.SAMBANOVA_MODEL || "Meta-Llama-3.3-70B-Instruct";

// Universal Studio Tools Schema (OpenAI-compatible, native to Groq, Gemini, NVIDIA, GitHub Models)
export const ATELIER_STUDIO_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "audit_nbc_egress",
      description: "Audits floor plan travel distance, occupant load, and corridor clear width according to National Building Code of India (NBC 2016 Part 4 Table 2 & Clause 4.5.1/4.6).",
      parameters: {
        type: "object",
        properties: {
          carpetAreaSqM: { type: "number", description: "Carpet area in square meters (default 111)" },
          travelDistanceM: { type: "number", description: "Measured travel distance to nearest exit stair in meters (limit 30m unsprinklered, 45m sprinklered)" },
          corridorClearWidthM: { type: "number", description: "Corridor clear width in meters (minimum 0.9m internal, 1.2m common)" },
          deadEndM: { type: "number", description: "Dead end corridor length in meters (statutory limit 6.0m)" },
          sprinklered: { type: "boolean", description: "Whether the building has automatic fire sprinkler protection" },
        },
        required: ["carpetAreaSqM", "travelDistanceM"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_ntg_efficiency",
      description: "Calculates Net-to-Gross (NTG) spatial efficiency ratio and usable square footage reclaim for residential/commercial layouts.",
      parameters: {
        type: "object",
        properties: {
          grossAreaSqFt: { type: "number", description: "Gross floor area in square feet" },
          currentNtgPct: { type: "number", description: "Current NTG percentage (e.g. 76)" },
          targetNtgPct: { type: "number", description: "Target NTG percentage (e.g. 84)" },
        },
        required: ["grossAreaSqFt", "targetNtgPct"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_ve_swaps",
      description: "Calculates Value-Engineered Capex budget reduction, trade package savings, and lead-time acceleration (e.g. Italian marble to Rajasthan Kota stone or Kajaria PGVT).",
      parameters: {
        type: "object",
        properties: {
          baselineCapex: { type: "number", description: "Current baseline Capex budget in project currency" },
          cutPercent: { type: "number", description: "Target budget cut percentage (e.g. 20 for 20% reduction)" },
          currency: { type: "string", description: "Currency symbol (default ₹)" },
          grossAreaSqFt: { type: "number", description: "Gross floor area in square feet for cost/sqft calculation" },
        },
        required: ["baselineCapex", "cutPercent"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verify_structural_bay",
      description: "Validates modular structural grid spans (IS 456 L/d deflection limits, PT tendon triggers for >7.5m) and MEP ceiling plenum void clearance vs 2.75m habitable room height (NBC Part 3 Cl. 12.2).",
      parameters: {
        type: "object",
        properties: {
          spanM: { type: "number", description: "Clear beam/bay span in meters" },
          effectiveDepthM: { type: "number", description: "Beam effective depth in meters (default 0.45m)" },
          floorToFloorHeightM: { type: "number", description: "Floor-to-floor height in meters (default 3.35m)" },
          plenumVoidM: { type: "number", description: "False ceiling plenum void for ducted VRV HVAC & drainage drops in meters (default 0.45m)" },
        },
        required: ["spanM"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_acoustic_rt60",
      description: "Simulates reverberation time RT60 using the Sabine formula and verifies STC 56 acoustic decoupling for residential sanctuaries.",
      parameters: {
        type: "object",
        properties: {
          lengthM: { type: "number", description: "Room length in meters (default 5.0)" },
          widthM: { type: "number", description: "Room width in meters (default 5.0)" },
          heightM: { type: "number", description: "Room ceiling height in meters (default 3.0)" },
          roomType: { type: "string", description: "Room classification (e.g. master_bedroom, living)" },
        },
        required: ["lengthM", "widthM", "heightM"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_staircase_capacity",
      description: "Calculates NBC 2016 Part 4 Table 8 staircase compliance: riser/tread ergonomic formula (550mm <= 2R + T <= 650mm), minimum clear width >= 1.50m, and evacuation occupant capacity.",
      parameters: {
        type: "object",
        properties: {
          riserMm: { type: "number", description: "Riser height in millimeters (max 150mm for residential >15m)" },
          treadMm: { type: "number", description: "Tread depth in millimeters (min 300mm)" },
          flightWidthM: { type: "number", description: "Clear staircase flight width in meters (min 1.50m for residential >15m)" },
          totalRiseM: { type: "number", description: "Total floor-to-floor rise in meters (default 3.0)" },
          buildingHeightM: { type: "number", description: "Building total height in meters (default 24.0)" },
        },
        required: ["riserMm", "treadMm", "flightWidthM"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_daylight_factor",
      description: "Calculates CIE Overcast Sky Daylight Factor (DF %) and solar orientation quality per NBC 2016 Part 8 Sec 1 for Delhi-NCR.",
      parameters: {
        type: "object",
        properties: {
          roomFloorAreaM2: { type: "number", description: "Room floor area in square meters" },
          windowGlazingAreaM2: { type: "number", description: "Window glazing surface area in square meters" },
          windowHeadHeightM: { type: "number", description: "Window lintel/head height in meters (default 2.8)" },
          orientation: { type: "string", description: "Window orientation: N, S, E, W, NE, NW, SE, SW" },
          roomType: { type: "string", description: "Room type: living, bedroom, study, kitchen, bathroom" },
        },
        required: ["roomFloorAreaM2", "windowGlazingAreaM2"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "evaluate_vastu_mandala",
      description: "Evaluates 9-zone Vastu Shastra Paramasayika mandala quadrant alignments for Agni (SE), Nairutya (SW), Ishanya (NE), and Vayu (NW).",
      parameters: {
        type: "object",
        properties: {
          kitchenQuadrant: { type: "string", description: "Quadrant for kitchen (optimal: SE / Agni)" },
          masterBedroomQuadrant: { type: "string", description: "Quadrant for master bedroom (optimal: SW / Nairutya)" },
          livingQuadrant: { type: "string", description: "Quadrant for living area (optimal: NE / Ishanya or East)" },
          pujaQuadrant: { type: "string", description: "Quadrant for sacred/meditation space (optimal: NE / Ishanya)" },
        },
        required: ["kitchenQuadrant", "masterBedroomQuadrant"],
      },
    },
  },
];

/**
 * Universal Studio Tool Executor:
 * Invokes deterministic local TypeScript calculators to produce zero-hallucination verified results.
 */
export function executeStudioTool(name: string, args: Record<string, any>): { result: any; proofText: string } {
  switch (name) {
    case "audit_nbc_egress": {
      const carpetAreaSqM = Number(args.carpetAreaSqM) || 111;
      const travelDistanceM = Number(args.travelDistanceM) || 18.4;
      const corridorClearWidthM = Number(args.corridorClearWidthM) || 1.05;
      const deadEndM = args.deadEndM !== undefined ? Number(args.deadEndM) : 0;
      const sprinklered = Boolean(args.sprinklered);
      const proof = generateEgressProof({
        carpetAreaSqM,
        corridorClearWidthM,
        travelDistanceM,
        deadEndM,
        sprinklered,
      });
      return { result: proof, proofText: proof.proofText };
    }
    case "calculate_ntg_efficiency": {
      const grossAreaSqFt = Number(args.grossAreaSqFt) || 1200;
      const targetNtgPct = Number(args.targetNtgPct) || 84;
      const currentNtgPct = Number(args.currentNtgPct) || 76;
      const proof = generateNTGProof({ grossAreaSqFt, targetNtgPct, currentNtgPct });
      return { result: proof, proofText: proof.proofText };
    }
    case "calculate_ve_swaps": {
      const baselineCapex = Number(args.baselineCapex) || 2850000;
      const cutPercent = Number(args.cutPercent) || 20;
      const currency = String(args.currency || "₹");
      const grossAreaSqFt = Number(args.grossAreaSqFt) || 1200;
      const proof = generateCapexProof({ baselineCapex, cutPercent, currency, grossAreaSqFt });
      return { result: proof, proofText: proof.proofText };
    }
    case "verify_structural_bay": {
      const spanM = Number(args.spanM) || 6.0;
      const effectiveDepthM = Number(args.effectiveDepthM) || 0.45;
      const floorToFloorHeightM = Number(args.floorToFloorHeightM) || 3.35;
      const plenumVoidM = Number(args.plenumVoidM) || 0.45;
      const spanCheck = checkSpanDeflection(spanM, effectiveDepthM, "continuous");
      const plenumCheck = checkPlenumClash(floorToFloorHeightM, 0.15, plenumVoidM);
      const proofText = `Structural & MEP Plenum Coordination Check [IS 456 / IS 1893 / NBC Part 3]
=======================================================================
Bay Span:                ${spanM.toFixed(1)}m (Effective Depth: ${effectiveDepthM}m)
Span-to-Depth Ratio:     L/d = ${spanCheck.spanToDepthRatio} (Limit: ${spanCheck.maxSpanToDepthLimit.toFixed(1)}) — ${spanCheck.isCompliant ? "COMPLIANT" : "EXCEEDED"}
Deflection Status:       ${spanCheck.warning}
Floor-to-Floor Height:   ${floorToFloorHeightM.toFixed(2)}m
MEP Ceiling Plenum Void: ${plenumVoidM.toFixed(2)}m (VRV HVAC + drainage)
Clear Habitable Height:  ${plenumCheck.habitableRoomHeightM.toFixed(2)}m vs ${plenumCheck.minimumHabitableHeightM.toFixed(2)}m min [NBC Part 3 Cl. 12.2: ${plenumCheck.isClashFree ? "PASS" : "FAIL"}]`;
      return { result: { spanCheck, plenumCheck }, proofText };
    }
    case "calculate_acoustic_rt60": {
      const lengthM = Number(args.lengthM) || 5.0;
      const widthM = Number(args.widthM) || 5.0;
      const heightM = Number(args.heightM) || 3.0;
      const roomType = String(args.roomType || "master_bedroom");
      const rt60Result = calculateSabineRT60({
        lengthM,
        widthM,
        heightM,
        roomType,
      });
      const stcCheck = verifySTCDecoupling({
        partitionName: "Sanctuary Demising Wall",
        hasResilientChannels: true,
        rockwoolDensityKgM3: 60,
        gyprocSoundStopBoardsCount: 2,
        hasGreenGlueDamping: true,
        ceilingPlenumFlanking: false,
        doorAcousticSealPresent: true,
        backToBackElectricalBoxesStaggered: true,
      });
      const proofText = `Museum Acoustics & STC 56 Decoupling Simulation [Sabine & ASTM E90]
====================================================================
Room Dimensions:         ${lengthM}m × ${widthM}m × ${heightM}m (${(lengthM * widthM * heightM).toFixed(1)} m³)
Sabine RT60 @ 500Hz:     ${rt60Result.rt60Seconds}s (Target: ${rt60Result.targetRT60Range[0]}s - ${rt60Result.targetRT60Range[1]}s) — ${rt60Result.isCompliant ? "OPTIMAL ACOUSTICS" : "REVERBERANT"}
Partition STC Rating:    STC ${stcCheck.testedSTCRating} Tested (Target: ≥ 56) — ${stcCheck.isSTC56Compliant ? "CERTIFIED DECOUPLING" : "FLANKING RISK"}
Acoustic Assembly:       Double 90mm studs, 25mm air cavity, 50mm Rockwool (60 kg/m³), dual 12.5mm Gyproc SoundStop + Green Glue.`;
      return { result: { rt60Result, stcCheck }, proofText };
    }
    case "calculate_staircase_capacity": {
      const riserMm = Number(args.riserMm) || 150;
      const treadMm = Number(args.treadMm) || 300;
      const flightWidthM = Number(args.flightWidthM) || 1.50;
      const totalRiseM = Number(args.totalRiseM) || 3.0;
      const buildingHeightM = Number(args.buildingHeightM) || 24.0;
      const compliance = calculateStaircaseCompliance({
        riserHeightM: riserMm / 1000,
        treadDepthM: treadMm / 1000,
        flightWidthM,
        totalRiseM,
        buildingHeightM,
        occupancyType: "residential",
      });
      const proofText = `Statutory Staircase & Life Safety Compliance [NBC 2016 Part 4 Table 8]
========================================================================
Blondel Ergonomic Check: 2R + T = 2(${riserMm}) + ${treadMm} = ${2 * riserMm + treadMm} mm (550 - 650 mm limit) — ${compliance.isErgonomicCompliant ? "PASS" : "FAIL"}
Riser Dimension:         ${riserMm} mm (Max: 150 mm) — ${compliance.isRiserCompliant ? "PASS" : "FAIL"}
Tread Dimension:         ${treadMm} mm (Min: 300 mm) — ${compliance.isTreadCompliant ? "PASS" : "FAIL"}
Clear Flight Width:      ${flightWidthM.toFixed(2)} m (Min: ${compliance.requiredWidthM.toFixed(2)} m) — ${compliance.isWidthCompliant ? "PASS" : "FAIL"}
Overall Life Safety:     ${compliance.overallPass ? "NBC 2016 COMPLIANT" : "NON-COMPLIANT"}`;
      return { result: compliance, proofText };
    }
    case "calculate_daylight_factor": {
      const roomFloorAreaM2 = Number(args.roomFloorAreaM2) || 25;
      const windowGlazingAreaM2 = Number(args.windowGlazingAreaM2) || 4.5;
      const windowHeadHeightM = Number(args.windowHeadHeightM) || 2.8;
      const orientation = (args.orientation || "NE") as any;
      const roomType = (args.roomType || "living") as any;
      const dfResult = calculateDaylightFactor({
        roomName: "Habitable Room",
        roomFloorAreaM2,
        windowGlazingAreaM2,
        windowHeadHeightM,
        orientation,
        roomType,
      });
      const proofText = `CIE Daylight Factor (DF %) Simulation [NBC 2016 Part 8 Sec 1 / Delhi-NCR 28.45°N]
=================================================================================
Floor Area:              ${roomFloorAreaM2} m² (Glazing: ${windowGlazingAreaM2} m², Head: ${windowHeadHeightM}m)
Orientation:             ${orientation} Light Flow
Estimated Daylight:      ${dfResult.estimatedDaylightFactorPercent}% (NBC Min: ≥ ${dfResult.nbcMinRequiredDFPercent}%) — ${dfResult.isDaylightCompliant ? "COMPLIANT" : "INSUFFICIENT DAYLIGHT"}
Light Quality:           ${dfResult.naturalLightQuality.toUpperCase()}
Shading Requirement:     ${dfResult.shadingRequired ? "Solar shading louvers required to prevent glare/heat gain." : "No supplementary shading required."}`;
      return { result: dfResult, proofText };
    }
    case "evaluate_vastu_mandala": {
      const placements: Array<{
        roomName: string;
        roomType: 'master_bedroom' | 'kitchen' | 'living' | 'pooja_meditation' | 'toilet' | 'guest_bedroom' | 'dining' | 'staircase' | 'study';
        quadrant: 'NE' | 'SE' | 'SW' | 'NW' | 'CENTER' | 'E' | 'W' | 'N' | 'S';
      }> = [
        { roomName: "Kitchen", roomType: "kitchen", quadrant: (args.kitchenQuadrant || "SE") as any },
        { roomName: "Master Bedroom", roomType: "master_bedroom", quadrant: (args.masterBedroomQuadrant || "SW") as any },
        { roomName: "Living Room", roomType: "living", quadrant: (args.livingQuadrant || "NE") as any },
      ];
      if (args.pujaQuadrant) {
        placements.push({ roomName: "Puja Room", roomType: "pooja_meditation", quadrant: (args.pujaQuadrant || "NE") as any });
      }
      const evalResult = evaluateVastuMandala(placements);
      const proofText = `Vastu Shastra 9-Zone Mandala Evaluation [Paramasayika Mandala]
=============================================================
Overall Vastu Score:     ${evalResult.overallScorePercent}% (${evalResult.overallRating})
Brahmasthan Openness:    ${evalResult.brahmasthanClear ? "Clear & Light" : "Encroached"}
Key Alignments:
- Agni (SE) Culinary:    ${args.kitchenQuadrant || "SE"}
- Nairutya (SW) Master:  ${args.masterBedroomQuadrant || "SW"}
Priority Fixes:          ${evalResult.priorityFixes.length ? evalResult.priorityFixes.join("; ") : "Zero critical spatial defects."}`;
      return { result: evalResult, proofText };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` }, proofText: "" };
  }
}

// Router priority: Groq (14ms-500ms), Cerebras (328ms), Mistral (403ms), Gemini (800ms), SambaNova, NVIDIA, OpenRouter, GitHub
const AGENT_MODEL_ROUTES: Record<AgentRole, Array<{ provider: string; model: string }>> = {
  chief_architect: [
    { provider: "groq", model: DEFAULT_GROQ_MODEL },
    { provider: "cerebras", model: DEFAULT_CEREBRAS_MODEL },
    { provider: "mistral", model: DEFAULT_MISTRAL_MODEL },
    { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
    { provider: "sambanova", model: DEFAULT_SAMBANOVA_MODEL },
    { provider: "nvidia", model: process.env.NVIDIA_MODEL || "z-ai/glm-5.3" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "github", model: "gpt-4o" },
  ],
  code_specialist: [
    { provider: "groq", model: DEFAULT_GROQ_MODEL },
    { provider: "cerebras", model: DEFAULT_CEREBRAS_MODEL },
    { provider: "mistral", model: DEFAULT_MISTRAL_MODEL },
    { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
    { provider: "sambanova", model: DEFAULT_SAMBANOVA_MODEL },
    { provider: "nvidia", model: process.env.NVIDIA_MODEL || "z-ai/glm-5.3" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "github", model: "gpt-4o" },
  ],
  interior_designer: [
    { provider: "groq", model: DEFAULT_GROQ_MODEL },
    { provider: "cerebras", model: DEFAULT_CEREBRAS_MODEL },
    { provider: "mistral", model: DEFAULT_MISTRAL_MODEL },
    { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
    { provider: "sambanova", model: DEFAULT_SAMBANOVA_MODEL },
    { provider: "nvidia", model: process.env.NVIDIA_MODEL || "z-ai/glm-5.3" },
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct" },
    { provider: "github", model: "gpt-4o" },
  ],
  cost_estimator: [
    { provider: "groq", model: DEFAULT_GROQ_MODEL },
    { provider: "cerebras", model: DEFAULT_CEREBRAS_MODEL },
    { provider: "mistral", model: DEFAULT_MISTRAL_MODEL },
    { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
    { provider: "sambanova", model: DEFAULT_SAMBANOVA_MODEL },
    { provider: "nvidia", model: process.env.NVIDIA_MODEL || "z-ai/glm-5.3" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "github", model: "gpt-4o" },
  ],
};



const DEFAULT_MAX_TOKENS = 2500;

async function callOpenAICompatible(
  endpointUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }>,
  maxTokens = DEFAULT_MAX_TOKENS,
  extraHeaders: Record<string, string> = {},
  temperature = 0.7,
  tools?: any[],
): Promise<string> {
  const controller = new AbortController();
  // 25,000ms gives ample headroom for multi-step tool execution without locking serverless functions
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const requestBody: any = {
      model,
      messages,
      temperature,
      top_p: 1,
      max_tokens: maxTokens,
    };
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = "auto";
    }

    let res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    // If an upstream endpoint rejects the tools parameter with 400 Bad Request, retry cleanly without tools
    if (!res.ok && tools && tools.length > 0 && res.status === 400) {
      delete requestBody.tools;
      delete requestBody.tool_choice;
      res = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    }

    if (!res.ok) {
      clearTimeout(timeoutId);
      const errorText = await res.text().catch(() => "");
      console.warn(`[Agent Router] ${model} on ${endpointUrl} returned HTTP ${res.status}:`, errorText.slice(0, 150));
      return "";
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const msg = choice?.message;

    // Handle tool execution loop if model requested architectural tool calls
    if (msg?.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const toolMessages: any[] = [];
      const executedProofs: string[] = [];

      for (const tc of msg.tool_calls) {
        if (tc.type === "function" && tc.function?.name) {
          let args: Record<string, any> = {};
          try {
            args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {
            args = {};
          }
          const { result, proofText } = executeStudioTool(tc.function.name, args);
          if (proofText) executedProofs.push(proofText);
          toolMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      }

      if (toolMessages.length > 0) {
        try {
          const turn2Messages = [...messages, msg, ...toolMessages];
          const turn2Res = await fetch(endpointUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              ...extraHeaders,
            },
            body: JSON.stringify({
              model,
              messages: turn2Messages,
              temperature,
              top_p: 1,
              max_tokens: maxTokens,
            }),
            signal: controller.signal,
          });

          if (turn2Res.ok) {
            const turn2Json = await turn2Res.json();
            let turn2Content = turn2Json.choices?.[0]?.message?.content || turn2Json.choices?.[0]?.message?.reasoning_content || turn2Json.choices?.[0]?.message?.reasoning || "";
            turn2Content = turn2Content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            if (turn2Content) {
              clearTimeout(timeoutId);
              return turn2Content;
            }
          }
        } catch (turn2Err) {
          console.warn(`[Agent Router] Turn 2 tool synthesis failed for ${model}:`, turn2Err);
        }

        // If turn 2 failed, fallback to returning the verified deterministic proof directly
        if (executedProofs.length > 0) {
          clearTimeout(timeoutId);
          return `\n\n--- VERIFIED STUDIO CALCULATIONS ---\n${executedProofs.join("\n\n")}\n---`;
        }
      }
    }

    clearTimeout(timeoutId);
    let content = msg?.content || msg?.reasoning_content || msg?.reasoning || "";
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
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = 0.7,
): Promise<string> {
  const controller = new AbortController();
  // Raised from 8 000 ms → 45 000 ms
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
            temperature,
          },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn(`[Agent Router] Gemini (${model}) returned HTTP ${res.status}:`, errorText.slice(0, 150));
      // If primary model experiences high load (503/404), seamlessly retry with gemini-flash-lite-latest
      if (model !== "gemini-flash-lite-latest") {
        return callGeminiDirect(geminiKey, "gemini-flash-lite-latest", fullPrompt, maxTokens, temperature);
      }
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

/**
 * Appends guaranteed action triggers only when the LLM response contains none.
 * Returns the final text AND whether injection occurred (for MiroFish tagging).
 */
function ensureActionTriggers(content: string, role: AgentRole): { text: string; injected: boolean } {
  // If content already contains valid [ACTION: ...], preserve as-is — no injection
  if (/\[ACTION:\s*[^\]]+\]/i.test(content)) {
    return { text: content, injected: false };
  }

  // Fallback triggers appended only when the LLM omitted them entirely
  const triggers: Record<AgentRole, string> = {
    chief_architect: `\n\n[ACTION: 📐 Apply Single-Loaded Spine in 2D Plan | apply_layout | single_loaded_spine]\n[ACTION: 📜 Audit NBC 2016 Egress Path | audit_compliance | nbc_egress]`,
    code_specialist: `\n\n[ACTION: 📜 Run NBC Egress & Fire Audit | audit_compliance | nbc_egress]\n[ACTION: 📐 Verify 0.9m Corridor Clearances | apply_layout | single_loaded_spine]`,
    interior_designer: `\n\n[ACTION: 🎨 Apply Curated Material Palette | apply_materials | fl_wooden_teak,wl_asian_paints_royale]\n[ACTION: 📊 Recalculate Specification Finishes | recalculate_boq | premium_finishes]`,
    cost_estimator: `\n\n[ACTION: 📊 Recalculate BOQ with Value-Engineered Swaps | recalculate_boq | ensuite_35]\n[ACTION: 📐 Apply High-Efficiency Studio Layout | apply_layout | single_loaded_spine]`,
  };

  return { text: `${content.trim()}${triggers[role] || ""}`, injected: true };
}

/**
 * Runs deterministic calculators against the project context and returns
 * a verbatim proof block to inject into the agent's system prompt.
 *
 * Each role receives only the calculations relevant to its domain so the
 * LLM cites exact numbers rather than approximating them.
 *
 * Defaults mirror the MiroFish seed context (1,200 sq ft, 111 m², ₹28.5L)
 * so the injection is always meaningful even without detailed project data.
 */
function buildCalculatorInjection(role: AgentRole, context: ProjectContext): string {
  const sqFt = context.floorAreaSqFt || 1200;
  const sqM = context.carpetAreaSqM || 111;
  const cost = context.estimatedCost || 2850000;
  const currency = context.currency || "₹";

  const sections: string[] = [];

  // ── Egress proof → code_specialist and chief_architect ───────────────────
  if (role === "code_specialist" || role === "chief_architect") {
    try {
      const egress = generateEgressProof({
        carpetAreaSqM: sqM,
        corridorClearWidthM: 1.05,   // standard AtelierOS residential spine
        travelDistanceM: 18.4,        // worst-case path in typical 1,200 sq ft layout
        deadEndM: 0,
        sprinklered: false,
      });
      sections.push(egress.proofText);
    } catch {
      // Non-fatal: skip injection if inputs are invalid
    }
  }

  // ── NTG proof → chief_architect and cost_estimator ────────────────────────
  if (role === "chief_architect" || role === "cost_estimator") {
    try {
      const ntg = generateNTGProof({
        grossAreaSqFt: sqFt,
        currentNtgPct: 76,
        targetNtgPct: 84,
      });
      sections.push(ntg.proofText);
    } catch {
      // Non-fatal
    }
  }

  // ── Capex cut proof → cost_estimator and chief_architect ─────────────────
  if (role === "cost_estimator" || role === "chief_architect") {
    try {
      const capex = generateCapexProof({
        baselineCapex: cost,
        cutPercent: 20,
        currency,
        grossAreaSqFt: sqFt,
      });
      sections.push(capex.proofText);
    } catch {
      // Non-fatal
    }
  }

  // ── Structural & Seismic discipline → chief_architect and code_specialist ─
  if (role === "chief_architect" || role === "code_specialist") {
    sections.push(`Structural & Seismic Discipline (IS 1893:2016 Zone IV)
======================================================
Structural Bay Grid:    6.0m × 7.2m regular bay spans (or 6.0m × 6.0m).
Vertical Wet Core:      Single 300×300mm pre-sleeved MEP shaft consolidating all kitchen & bath lines.
Post-Tensioned Slabs:   Zero uncoordinated core drilling through diaphragm slabs; sunken slab screed.`);
  }

  // ── Material spec reminder → interior_designer and cost_estimator ────────
  if (role === "interior_designer" || role === "cost_estimator") {
    sections.push(`Material & Acoustic Specification Recall
=========================================
Timber (IS 287):        Kiln-dried 8-12% EMC; mount on BWP 710 marine plywood or WPC backer board
                        with 2mm expansion reveals and ventilated 10mm rear cavity.
Tile Adhesive (IS 15477): C2TE S1 polymer-modified adhesive; 2-3mm joints; flexible anti-fungal epoxy grout.
Acoustic Partition:     STC 55/56 tested — double-stud 90mm frame, 25mm air cavity, 50mm Rockwool (60kg/m³),
                        dual 12.5mm Gyproc SoundStop boards with Green Glue damping compound.
Finishes (Zero-VOC):    Asian Paints Royale Health Shield (<5g/L VOC, silver-ion antibacterial).
Kota Stone Lead Time:   2-3 weeks (local Rajasthan quarry) vs 14-week Italian marble import.
Circadian Lighting:     98+ CRI tunable LEDs, 2700K-6500K, UGR < 16.`);
  }

  if (sections.length === 0) return "";

  return `\n\n--- STUDIO PRE-CALCULATIONS (authoritative — cite these verbatim in your response) ---\n${sections.join("\n\n")}\n---`;
}

/**
 * Executes a collaborative consultation across the specified agent roles in parallel.
 * Utilizes a multi-model smart router with automatic provider failover:
 * OpenRouter → Groq LPUs → Gemini Direct → GitHub Models → Mistral → Cerebras → Custom Gateway.
 * If ALL providers fail, returns a degraded card (content: "") — no hardcoded fallback prose.
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
  const sambanovaKey = process.env.SAMBANOVA_API_KEY;
  const githubKey = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
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

      // Arithmetic/compliance agents use temperature 0.35 to prevent repetitive loops while staying disciplined
      const temperature = LOW_TEMPERATURE_ROLES.has(role) ? 0.35 : 0.7;

      const systemPrompt = `${profile.systemPrompt}

${contextSummary}

You are consulting as ${profile.name} (${profile.title}) on the user's project in AtelierOS.
Deliver authoritative, highly concrete architectural recommendations. Follow these 4 operational studio rules:
1. Exact Quantitative Math: Whenever spatial planning, NTG (Net-to-Gross), circulation, or budgets are touched, calculate and show the exact numbers (e.g. 1,200 sq ft × 0.76 = 912 sq ft vs 83% = 996 sq ft, delta = +84 sq ft usable).
2. ASCII Spatial Diagrams: When explaining circulation, shafts, or zoning, include a concise ASCII plan diagram (strictly under 15 lines) enclosed in a markdown code block (${"```"} ... ${"```"}). Do not generate repetitive blank lines.
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

Keep your response focused and authoritative (under 600 words) so you do not exceed token limits, and ensure your final [ACTION: ...] triggers are always generated at the end.
Format cleanly with readable paragraphs and avoid raw markdown asterisks (**) for bolding unless in headers.`;

      // Inject deterministic calculator outputs — LLMs must cite these exact numbers
      const calcInjection = buildCalculatorInjection(role, context);
      const systemPromptWithCalcs = calcInjection
        ? `${systemPrompt}${calcInjection}`
        : systemPrompt;

      let responseText = "";
      let modelUsed = "";
      const t0 = Date.now();

      for (const route of routes) {
        if (route.provider === "groq" && groqKey) {
          responseText = await callOpenAICompatible(
            "https://api.groq.com/openai/v1/chat/completions",
            groqKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via groq`; break; }
        }

        if (route.provider === "cerebras" && cerebrasKey) {
          responseText = await callOpenAICompatible(
            "https://api.cerebras.ai/v1/chat/completions",
            cerebrasKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via cerebras`; break; }
        }

        if (route.provider === "mistral" && mistralKey) {
          responseText = await callOpenAICompatible(
            "https://api.mistral.ai/v1/chat/completions",
            mistralKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via mistral`; break; }
        }

        if (route.provider === "gemini" && geminiKey) {
          // 1. Try Gemini OpenAI-compatible endpoint with universal tools
          responseText = await callOpenAICompatible(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            geminiKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via gemini-openai`; break; }

          // 2. Fallback to direct Gemini generateContent API
          responseText = await callGeminiDirect(
            geminiKey,
            route.model,
            `${systemPromptWithCalcs}\n\nUser Question/Brief:\n"${prompt}"`,
            DEFAULT_MAX_TOKENS,
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via gemini-direct`; break; }
        }

        if (route.provider === "sambanova" && sambanovaKey) {
          responseText = await callOpenAICompatible(
            "https://api.sambanova.ai/v1/chat/completions",
            sambanovaKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via sambanova`; break; }
        }

        if (route.provider === "nvidia" && nvidiaKey) {
          const nvidiaBase = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
          const endpoint = nvidiaBase.endsWith("/chat/completions") ? nvidiaBase : `${nvidiaBase}/chat/completions`;
          responseText = await callOpenAICompatible(
            endpoint,
            nvidiaKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via nvidia`; break; }
        }

        if (route.provider === "openrouter" && openRouterKey) {
          responseText = await callOpenAICompatible(
            "https://openrouter.ai/api/v1/chat/completions",
            openRouterKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {
              "HTTP-Referer": "https://atelieros-cloud.vercel.app",
              "X-Title": "AtelierOS Architectural Studio",
            },
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via openrouter`; break; }
        }

        if (route.provider === "github" && githubKey) {
          responseText = await callOpenAICompatible(
            "https://models.inference.ai.azure.com/chat/completions",
            githubKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via github`; break; }
        }

        if (route.provider === "cloudflare" && cloudflareToken && cloudflareAccountId) {
          responseText = await callOpenAICompatible(
            `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1/chat/completions`,
            cloudflareToken,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            DEFAULT_MAX_TOKENS,
            {},
            temperature,
            ATELIER_STUDIO_TOOLS,
          );
          if (responseText) { modelUsed = `${route.model} via cloudflare-workers-ai`; break; }
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
            { role: "system", content: systemPromptWithCalcs },
            { role: "user", content: prompt },
          ],
          DEFAULT_MAX_TOKENS,
          {},
          temperature,
        );
        if (responseText) modelUsed = "default via custom-gateway";
      }

      const latencyMs = Date.now() - t0;

      // If all providers failed → degraded card (no hardcoded fallback prose)
      if (!responseText) {
        return {
          id: `msg_${Date.now()}_${role}_${Math.random().toString(36).slice(2, 6)}`,
          role,
          name: profile.name,
          title: profile.title,
          avatar: profile.avatar,
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: "degraded" as const,
          modelUsed: "none",
          latencyMs,
          actionInjected: false,
        } as AgentMessage;
      }

      const { text: finalContent, injected } = ensureActionTriggers(responseText, role);

      return {
        id: `msg_${Date.now()}_${role}_${Math.random().toString(36).slice(2, 6)}`,
        role,
        name: profile.name,
        title: profile.title,
        avatar: profile.avatar,
        content: finalContent,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: "model" as const,
        modelUsed,
        latencyMs,
        actionInjected: injected,
      } as AgentMessage;
    }),
  );

  return results;
}
