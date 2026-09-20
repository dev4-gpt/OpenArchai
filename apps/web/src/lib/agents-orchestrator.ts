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
  const projectName = context.projectName || "Residence";
  const curr = context.currency || "₹";

  if (q.includes("vastu") || q.includes("alignment") || q.includes("direction") || q.includes("energy") || q.includes("facing")) {
    if (role === "code_specialist") {
      return `For **${projectName}**, Vastu orientation requires strict directional discipline:
1. **Kitchen / Hearth**: Must anchor in the South-East (Agni quadrant) facing East while cooking, ensuring positive energy and natural cross-draft away from sleeping quarters.
2. **Master Sanctuary**: Anchor firmly in South-West (Nairutya) for structural stability and grounding.
3. **Pooja / Clean Water**: Keep North-East (Ishanya) light, decluttered, and visually open. Under NBC 2016 Part 3, ensure this also aligns with standard 10% glazed perimeter window requirements.`;
    }
    if (role === "chief_architect") {
      return `To marry Vastu with modern spatial design in **${projectName}**, we avoid heavy internal walls. Instead, use permeable vertical fluted timber slats or acoustic glass screens to demarcate the North-East transition zone without obstructing spatial sightlines. Ensure the main entrance in the East/North is celebrated with a generous 1.2m wide foyer entry pivot door.`;
    }
    if (role === "interior_designer") {
      return `From a finishes standpoint, we ground the South-West master bedroom with rich textured walnut veneer and earthy warm neutral paint (Asian Paints Royale *Pumice Stone*). In the North-East, introduce reflective brushed brass trim and honed Kota stone or Bianco Statuario marble to reflect natural morning light.`;
    }
    if (role === "cost_estimator") {
      return `Aligning wet utilities (bathrooms, kitchen risers) to Vastu quadrants (SE/NW) costs 0 extra if resolved at the planning stage. If plumbing risers are relocated after MEP rough-ins, expect an additional ${curr}45,000 to ${curr}65,000 per shaft in core-cutting and PVC manifold rerouting.`;
    }
  }

  if (q.includes("cost") || q.includes("budget") || q.includes("value") || q.includes("reduce") || q.includes("save") || q.includes("engineer")) {
    if (role === "cost_estimator") {
      return `To value-engineer **${projectName}** by 12-15% without compromising luxury perception:
- **Flooring**: Swap imported Italian Statuario (₹350/sqft material + ₹120/sqft laying) with 1200x600 Kajaria polished glazed vitrified tiles (₹85/sqft + ₹55/sqft laying) — immediate savings of ~₹1,80,000.
- **Fenestration**: Specify powder-coated Jindal thermal-break aluminium profiles instead of imported European Schuco sections, saving ~₹450/sqft of glazed area.
- **Paint**: Apply Asian Paints Royale Luxury Emulsion on primary walls, reserving Royale Aspira exclusively for the double-height foyer and master suite.`;
    }
    if (role === "interior_designer") {
      return `Aesthetic cost optimization: Reserve high-value tactile elements for eye-level and touch surfaces (fluted timber bed back, antique brass handles, fluted glass wardrobe shutters). For ceilings, use clean seamless gypsum boards with indirect LED cove troughs rather than expensive multi-tiered coffered profiles.`;
    }
    if (role === "chief_architect") {
      return `Structural efficiency in **${projectName}**: Rationalize perimeter wall spans to standard 3m structural grids. Minimizing odd-angle masonry and non-standard lintel spans reduces brickwork labor and reinforcement rebar scrap rates by nearly 8%.`;
    }
    if (role === "code_specialist") {
      return `Ensure value-engineering does not breach mandatory statutory minimums under NBC 2016: Habitable rooms must retain minimum clear heights of 2.75m (under ceiling fan), and kitchen risers must have dedicated 100mm mechanical ventilation exhaust ducts.`;
    }
  }

  if (q.includes("material") || q.includes("finish") || q.includes("color") || q.includes("paint") || q.includes("flooring") || q.includes("tile")) {
    if (role === "interior_designer") {
      return `For the curated material palette of **${projectName}**:
- **Flooring**: Large-format honed Kota stone with 3mm polished brass inlay strips in circulation areas, transitioning to natural herringbone white oak parquet in the private quarters.
- **Walls**: Asian Paints Royale matte off-white (Tone: *Morning Fog*) paired with a focal feature wall in raw board-marked concrete or handmade terracotta jali screens.
- **Lighting**: 2700K warm white recessed anti-glare architectural downlights (CRI > 90) paired with indirect concealed cove LED illumination.`;
    }
    if (role === "chief_architect") {
      return `Ensure selected materials respect regional climate performance: In North Indian summer conditions, Kota stone and high-thermal-mass terracotta maintain significantly cooler surface temperatures than synthetic vinyl or dark laminate flooring.`;
    }
    if (role === "cost_estimator") {
      return `The proposed palette balances mid-market procurement with high perceived value. Kota stone procurement in Gurgaon runs at ₹45-₹65/sqft raw slab plus ₹55/sqft mirror polishing, making it 75% more cost-effective than imported Italian marble while offering authentic vernacular prestige.`;
    }
    if (role === "code_specialist") {
      return `Specify anti-skid wet area flooring (R10 slip resistance rating) in all bathrooms and kitchen service balconies to satisfy NBC 2016 Part 3 Table 2 accessibility guidelines.`;
    }
  }

  // Default intelligent contextual response
  if (role === "chief_architect") {
    return `Regarding "${prompt}" for **${projectName}**: From an architectural perspective, we need to balance spatial fluidity with structural logic. I recommend prioritizing natural cross-ventilation corridors, opening lintel spans to 2.4m, and maintaining clear circulation axes between the living core and private zones.`;
  } else if (role === "code_specialist") {
    return `Regarding "${prompt}" for **${projectName}**: Reviewing under building regulations (NBC 2016 / Local Bylaws), ensure all primary egress pathways maintain at least 0.9m clear width, window daylighting covers >10% floor plate area, and fire separation distances meet municipal clearance norms.`;
  } else if (role === "interior_designer") {
    return `Regarding "${prompt}" for **${projectName}**: I recommend layering tactile natural materials—warm timber veneers, textured limewash or Asian Paints Royale finishes, and calibrated circadian lighting (5000K daylight shifting to 2700K warm evening glow) to accentuate architectural depth.`;
  } else {
    return `Regarding "${prompt}" for **${projectName}**: At current specifications, budget allocation should be weighted 45% civil/core structure, 35% interior joinery and finishes, and 20% MEP services, with a mandatory 10% contingency reserve for unforeseen site variations.`;
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

      const systemPrompt = `${profile.systemPrompt}\n\n${contextSummary}\n\nYou are consulting as ${profile.name} (${profile.title}) on the user's project. Answer the user's question directly and authoritatively in 1-2 focused paragraphs with real architectural specifics and actionable guidance. Format with clean natural typography and avoid using raw markdown asterisks (**) for bolding.`;

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
