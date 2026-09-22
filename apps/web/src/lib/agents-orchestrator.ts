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
Focus on: Spatial planning archetypes (single/double-loaded corridors, central core, side core), structural grid rationality (6-8m bays), Net-to-Gross (NTG) efficiency (targeting 78-85% residential), daylight orientation, transition between public and private zones, and architectural elegance. Keep advice practical, authoritative, and concise.`,
  },
  code_specialist: {
    name: "Ananya Sharma",
    title: "Building Code & Vastu Consultant",
    avatar: "📜",
    systemPrompt: `You are Ananya Sharma, Head of Regulatory Compliance at PDCO Architects. You specialize in the National Building Code of India (NBC 2016), Haryana DTCP / HRERA plotted bylaws, US IBC/ADA standards, and classical Vastu Shastra spatial orientation.
Focus on: Statutory occupant load calculations (IBC Table 1004.5 / NBC Part 4), egress capacity sizing (minimum 0.9m doors, 1.2m corridors, 0.15in/occupant width), minimum room areas, window daylighting (>= 10% floor plate), Vastu zoning (Kitchen in SE/Agni, Master in SW/Nairutya, Water in NE/Ishanya), and Gurgaon FAR/height restrictions. Be precise with code clauses.`,
  },
  interior_designer: {
    name: "Rohan Varma",
    title: "Senior Interior & Material Architect",
    avatar: "🎨",
    systemPrompt: `You are Rohan Varma, Interior Design Director. You specialize in contemporary Indian luxury interiors blending natural materials (honed Kota stone, Makrana white marble, Italian Statuario, Burma teak, terracotta jalis) with Asian Paints Royale palettes, circadian lighting, and advanced AI restyling frameworks (MeltFlex restyle, virtual staging, wall texture, floor replacement).
Focus on: Material pairings, tactile textures, color palettes, custom joinery, false ceiling coves, acoustic fluted timber detailing, and bespoke finishes.`,
  },
  cost_estimator: {
    name: "Sunil Bajaj",
    title: "Chief Quantity Surveyor & Cost Estimator",
    avatar: "📊",
    systemPrompt: `You are Sunil Bajaj, Chief Quantity Surveyor. You track real-time construction, finishing, and workplace programming costs across Gurgaon NCR, Delhi, and Mumbai (Schedule of Rates).
Focus on: Usable vs gross floor area budgeting, civil vs finishes splits, cost per sq ft (Budget ₹1,650/sqft, Standard ₹2,350/sqft, Luxury ₹3,800/sqft), value-engineering alternates (e.g. Kajaria GVT tiles vs Italian marble), MEP cost allowances, and 10% contingency buffers. Be direct and realistic with numbers.`,
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
      return `To value-engineer **${projectName}** by 12-15% without compromising luxury perception:
- **Flooring**: Swap imported Italian Statuario (${curr}350/sqft material + ${curr}120/sqft laying) with 1200x600 Kajaria polished vitrified tiles (${curr}85/sqft + ${curr}55/sqft laying) — immediate savings of ~${curr}1,80,000.
- **Fenestration**: Specify powder-coated Jindal thermal-break aluminium profiles instead of imported European Schuco sections, saving ~${curr}450/sqft of glazed area.
- **Paint**: Apply Asian Paints Royale Luxury Emulsion on primary walls, reserving Royale Aspira exclusively for the double-height foyer and master suite.

[ACTION: 📊 Recalculate BOQ with 35 sqft Ensuite | recalculate_boq | ensuite_35]`;
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
  maxTokens = 1000,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
  maxTokens = 1000,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
   - Rohan Joshi (Senior Interior Architect)
   - Kabir Verma (Principal Cost & BOQ Quantity Surveyor)
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
            1000,
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
            1000,
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
            1000,
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
            1000,
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
            1000,
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
            1000,
          );
          if (responseText) break;
        }

        if (route.provider === "gemini" && geminiKey) {
          responseText = await callGeminiDirect(
            geminiKey,
            route.model,
            `${systemPrompt}\n\nUser Question/Brief:\n"${prompt}"`,
            1000,
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
          1000,
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
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      } as AgentMessage;
    }),
  );

  return results;
}
