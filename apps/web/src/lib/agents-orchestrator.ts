import { generateEgressProof } from "./calculators/nbc-egress";
import { generateNTGProof, generateCapexProof } from "./calculators/pe-boq";

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

const AGENT_MODEL_ROUTES: Record<AgentRole, Array<{ provider: string; model: string }>> = {
  chief_architect: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "github", model: "gpt-4o" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  code_specialist: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "github", model: "gpt-4o" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
  interior_designer: [
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "github", model: "gpt-4o" },
  ],
  cost_estimator: [
    { provider: "openrouter", model: "google/gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "mistral", model: "mistral-large-latest" },
    { provider: "github", model: "gpt-4o" },
    { provider: "cerebras", model: "llama-3.3-70b" },
  ],
};

async function callOpenAICompatible(
  endpointUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1800,
  extraHeaders: Record<string, string> = {},
  temperature = 0.7,
): Promise<string> {
  const controller = new AbortController();
  // Raised from 8 000 ms → 45 000 ms so institutional-grade answers have time to land
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
        temperature,
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

  // ── Material spec reminder → interior_designer ───────────────────────────
  if (role === "interior_designer") {
    sections.push(`Material & Acoustic Specification Recall
=========================================
Timber (IS 287):        Kiln-dried 8-12% EMC; mount on BWP 710 marine plywood or WPC backer board
                        with 2mm expansion reveals and ventilated 10mm rear cavity.
Tile Adhesive (IS 15477): C2TE S1 polymer-modified adhesive; 2-3mm joints; flexible anti-fungal epoxy grout.
Acoustic Partition:     STC 56 tested — double-stud 90mm frame, 25mm air cavity, 50mm Rockwool (60kg/m³),
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

      // Arithmetic/compliance agents use lower temperature to avoid invented numbers
      const temperature = LOW_TEMPERATURE_ROLES.has(role) ? 0.1 : 0.7;

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

      // Inject deterministic calculator outputs — LLMs must cite these exact numbers
      const calcInjection = buildCalculatorInjection(role, context);
      const systemPromptWithCalcs = calcInjection
        ? `${systemPrompt}${calcInjection}`
        : systemPrompt;

      let responseText = "";
      let modelUsed = "";
      const t0 = Date.now();

      for (const route of routes) {
        if (route.provider === "cerebras" && cerebrasKey) {
          responseText = await callOpenAICompatible(
            "https://api.cerebras.ai/v1/chat/completions",
            cerebrasKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            1800,
            {},
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via cerebras`; break; }
        }

        if (route.provider === "groq" && groqKey) {
          responseText = await callOpenAICompatible(
            "https://api.groq.com/openai/v1/chat/completions",
            groqKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            1800,
            {},
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via groq`; break; }
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
            1800,
            {},
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via github`; break; }
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
            1800,
            {},
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via mistral`; break; }
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
            1800,
            {
              "HTTP-Referer": "https://atelieros-cloud.vercel.app",
              "X-Title": "AtelierOS Architectural Studio",
            },
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via openrouter`; break; }
        }

        if (route.provider === "nvidia" && nvidiaKey) {
          responseText = await callOpenAICompatible(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            nvidiaKey,
            route.model,
            [
              { role: "system", content: systemPromptWithCalcs },
              { role: "user", content: prompt },
            ],
            1800,
            {},
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via nvidia`; break; }
        }

        if (route.provider === "gemini" && geminiKey) {
          responseText = await callGeminiDirect(
            geminiKey,
            route.model,
            `${systemPromptWithCalcs}\n\nUser Question/Brief:\n"${prompt}"`,
            1800,
            temperature,
          );
          if (responseText) { modelUsed = `${route.model} via gemini-direct`; break; }
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
          1800,
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
