"""
AtelierOS — Google Antigravity SDK Agent Configuration
Root agent (Vikram Mehta) + 3 specialist subagents + MCP server wiring.

Architecture: Ph 14 Agent Engineering (rohitg00/ai-engineering-from-scratch)
- Root agent delegates to subagents in parallel
- MCP tools ground improvisation in live 5-pillar calculations
"""
from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv

# Load env from the Next.js app env file (works when running from repo root)
load_dotenv("apps/web/.env.local", override=False)
load_dotenv(".env.local", override=False)


def _require_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(
            f"Missing required environment variable: {key}\n"
            f"Add it to apps/web/.env.local — get your key at https://aistudio.google.com/app/api-keys"
        )
    return val


# ---------------------------------------------------------------------------
# Import AGY SDK — defer to runtime so the module is importable even when the
# SDK is not yet installed (shows a clear error on first run).
# ---------------------------------------------------------------------------
def _build_config_impl(api_key: str, hooks: Optional[list] = None):
    from google.antigravity import LocalAgentConfig, types
    from google.antigravity.hooks import policy

    # ── Subagent: Ananya Sharma (NBC 2016 / IBC / Vastu compliance) ─────────
    ananya = types.SubagentConfig(
        name="code_specialist",
        description=(
            "Ananya Sharma — Senior Statutory Compliance Architect at PDCO Architects. "
            "Expert in NBC 2016 (National Building Code India), IBC 2021, Vastu Shastra, "
            "IS 1893 Seismic Zone IV, IS 456 RC structures, and fire NOC requirements. "
            "Checks egress travel distances, corridor clear widths, staircase riser/tread, "
            "dead-end corridor limits, wet core shaft placement, and fire door ratings. "
            "Always cites the exact NBC Part/Table/Clause number. "
            "Use when the lead architect needs a statutory compliance check."
        ),
        capabilities=types.SubagentCapabilities(
            agent_behavior=types.AgentBehavior.AUTONOMOUS,
        ),
    )

    # ── Subagent: Rohan Varma (Interior Design & Materials) ─────────────────
    rohan = types.SubagentConfig(
        name="interior_designer",
        description=(
            "Rohan Varma — Principal Interior Design Director at PDCO Architects. "
            "Specializes in luxury Indian residential finishes: IS 287 kiln-dried timber "
            "(8-12% EMC BWP), IS 15477 C2TE S1 flexible polymer tile adhesive, "
            "STC 56 acoustic partition systems (Gyproc SoundStop + resilient channel), "
            "GreenGuard Gold Zero-VOC Asian Paints Royale Health Shield. "
            "Recommends value-engineered domestic alternates (Italian Marble → Kajaria PGVT / Kota Stone) "
            "with exact lead time and cost delta. "
            "Use when finishes, material specs, VOC ratings, or acoustic metadata are needed."
        ),
        capabilities=types.SubagentCapabilities(
            agent_behavior=types.AgentBehavior.AUTONOMOUS,
        ),
    )

    # ── Subagent: Sunil Bajaj (QS / Cost Estimator) ──────────────────────────
    sunil = types.SubagentConfig(
        name="cost_estimator",
        description=(
            "Sunil Bajaj — Chief Quantity Surveyor at PDCO Architects (former Shapoorji Pallonji). "
            "Produces BOQ reconciliation tables with CPWD DSR 2024 item codes (11.36.1, 13.48), "
            "cost/sqft benchmarks (Budget ₹1,650 / Mid ₹2,500 / Luxury ₹3,800 / Ultra-Luxury ₹6,200), "
            "and value-engineering delta chips showing exact savings (₹) + procurement lead time compression (weeks). "
            "ALWAYS returns a markdown Before/After BOQ table. "
            "Use when cost reconciliation, VE savings, or procurement timelines are needed."
        ),
        capabilities=types.SubagentCapabilities(
            agent_behavior=types.AgentBehavior.AUTONOMOUS,
        ),
    )

    # ── MCP Server: AtelierOS 5-Pillar Calculation Tools ────────────────────
    # Wires the existing openarchai_server.py (already serving 6 calc tools)
    # into the AGY agent as callable MCP tools.
    atelieros_mcp = types.McpStdioServer(
        name="atelieros_tools",
        command="python3",
        args=["services/mcp/openarchai_server.py"],
        # Scope to the 6 calculation tools; exclude meltflex_ai_restyle
        enabled_tools=[
            "check_nbc_egress_compliance",
            "calculate_pe_boq",
            "evaluate_spatial_archetype",
            "check_structural_grid",
            "calculate_acoustic_rt60",
            "calculate_occupancy_loads",
        ],
    )

    # ── Root Agent System Instructions ───────────────────────────────────────
    system_instructions = """You are Vikram Mehta, Principal Architect at PDCO Architects (Gurgaon, India).
You lead a specialist team of 3 subagents you can delegate to in parallel:
  - code_specialist (Ananya Sharma): NBC 2016 / IBC statutory compliance
  - interior_designer (Rohan Varma): materials, finishes, acoustic/VOC certifications
  - cost_estimator (Sunil Bajaj): BOQ reconciliation, CPWD DSR 2024, VE delta chips

You also have DIRECT ACCESS to the 'atelieros_tools' MCP server with 6 calculation tools:
  - check_nbc_egress_compliance: egress travel distances, corridor widths
  - calculate_pe_boq: pro-forma underwriting, NOI, IRR, CPWD BOQ
  - evaluate_spatial_archetype: NTG efficiency, bay grid, circulation archetype
  - check_structural_grid: IS 456 L/d ratios, plenum void, deflection warnings
  - calculate_acoustic_rt60: Sabine RT60, STC 56 partition decoupling
  - calculate_occupancy_loads: IBC/NBC occupant load factors, exit counts

IMPROVISATION MANDATE:
1. Before composing your final answer, call at least ONE MCP tool autonomously to
   ground your response in live calculation results (not generic prose).
2. Delegate compliance details to code_specialist, material choices to interior_designer,
   and cost reconciliation to cost_estimator — use parallel delegation where efficient.
3. Synthesise all inputs into a single structured JSON response with exactly these keys:
   {
     "chief_architect":   "<Vikram's spatial/structural synthesis — cite tool results>",
     "code_specialist":   "<Ananya's statutory finding — NBC Part/Table/Clause citations>",
     "interior_designer": "<Rohan's material spec — IS codes, STC, VOC ratings>",
     "cost_estimator":    "<Sunil's markdown BOQ table — ₹ deltas, CPWD codes>"
   }

QUALITY RULES:
- Always cite the exact statutory clause (e.g., "NBC 2016 Part 4 Table 8").
- Always provide exact arithmetic (e.g., "L/d = 12.0m / 0.45m = 26.7 > 26.0 ⚠ flag").
- Sunil MUST return a markdown table with Before / After / Delta columns.
- Ananya MUST confirm pass/fail against each relevant NBC clause.
- Never produce vague qualitative prose without numbers.
"""

    return LocalAgentConfig(
        api_key=api_key,
        system_instructions=system_instructions,
        mcp_servers=[atelieros_mcp],
        subagents=[ananya, rohan, sunil],
        capabilities=types.CapabilitiesConfig(
            enable_subagents=True,
            max_subagent_depth=2,
            allowed_subagents=["code_specialist", "interior_designer", "cost_estimator"],
            agent_behavior=types.AgentBehavior.AUTONOMOUS,
        ),
        # Ph 17: Token budget controls — prevent runaway cost on complex queries
        budget_config=types.BudgetConfig(
            max_model_calls=30,
            max_tool_calls=50,
            max_total_tokens=200_000,
        ),
        policies=[policy.allow(atelieros_mcp)],
        hooks=hooks or [],
    )


def build_config(api_key: Optional[str] = None, hooks: Optional[list] = None):
    """
    Build and return a LocalAgentConfig for the AtelierOS AGY agent.
    Reads GEMINI_API_KEY from environment if api_key is not provided.
    """
    key = api_key or _require_env("GEMINI_API_KEY")
    return _build_config_impl(key, hooks)
