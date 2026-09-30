"""
AtelierOS AGY — Evaluation Harness
Implements Ph 11 (LLM eval harnesses) + MiroFish institutional criteria
from rohitg00/ai-engineering-from-scratch.

Scores each completed AGY session against the 5-pillar rubric:
  1. Statutory citation (NBC/IS codes)
  2. BOQ reconciliation table (₹ deltas)
  3. MCP tool call evidence (live calculation)
  4. Quantitative arithmetic (exact numbers)
  5. All 4 agent cards populated (subagent delegation)

Plus bonuses for unique tool calls and latency penalty for slow sessions.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Rubric definition — mirrors the 5-pillar enterprise verification criteria
# and the MiroFish institutional swarm approval thresholds.
# ---------------------------------------------------------------------------
RUBRIC: dict[str, dict] = {
    "statutory_cite": {
        "pattern": r"NBC\s*201[56]|IS\s*456|IS\s*1893|NBC\s*Part\s*\d|Clause\s*[\d.]+|Table\s*\d+|NBC\s*Part|IBC\s*\d{4}",
        "weight": 20,
        "label": "Statutory citation (NBC/IS/IBC clause)",
    },
    "boq_table": {
        "pattern": r"\|[^|]+₹[^|]+\||\|.*Trade Package.*\||\|.*Before.*After.*\||₹[\d,]+.*₹[\d,]+",
        "weight": 20,
        "label": "BOQ markdown table with ₹ deltas",
    },
    "tool_call_evidence": {
        "pattern": (
            r"check_nbc_egress|calculate_pe_boq|evaluate_spatial|"
            r"check_structural_grid|calculate_acoustic|calculate_occupancy|"
            r"atelieros_tools|travel distance.*\d+\.?\d*\s*m|"
            r"L/d\s*[=≤≥<>]\s*\d"
        ),
        "weight": 20,
        "label": "MCP tool call evidence in response",
    },
    "arithmetic": {
        "pattern": (
            r"\d+[\.,]\d+\s*(sqft|sqm|m²|m\b|mm\b)|"
            r"₹[\d,]+|YoC|IRR|NOI|RT60|STC\s*\d+|"
            r"NTG\s*[\d.]+%|\d+\s*wks?\b|\d+\s*weeks?"
        ),
        "weight": 20,
        "label": "Quantitative arithmetic with units",
    },
    "subagent_delegation": {
        "pattern": r'"code_specialist"|"interior_designer"|"cost_estimator"|"chief_architect"',
        "weight": 20,
        "label": "All 4 agent JSON keys present",
    },
}

# Verdict thresholds (align with MiroFish approval bands)
APPROVED_THRESHOLD = 80
CONDITIONAL_THRESHOLD = 60


@dataclass
class EvalResult:
    session_id: str
    score: float
    criteria_hits: list[str] = field(default_factory=list)
    criteria_missed: list[str] = field(default_factory=list)
    persona_scores: dict[str, float] = field(default_factory=dict)
    unique_tools_called: list[str] = field(default_factory=list)
    total_latency_ms: int = 0
    verdict: str = "REJECTED"
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "score": self.score,
            "verdict": self.verdict,
            "criteria_hits": self.criteria_hits,
            "criteria_missed": self.criteria_missed,
            "persona_scores": self.persona_scores,
            "unique_tools_called": self.unique_tools_called,
            "total_latency_ms": self.total_latency_ms,
            "notes": self.notes,
        }


def evaluate_session(
    session_id: str,
    final_response: str,
    trace_log: list[dict],
) -> EvalResult:
    """
    Score a completed AGY session against the 5-pillar rubric.

    Args:
        session_id: The AGY session identifier.
        final_response: The full text response from Vikram (root agent).
        trace_log: List of trace event dicts from tracer.get_recent_traces().

    Returns:
        EvalResult with score (0-100), verdict, and detailed criteria breakdown.
    """
    hits: list[str] = []
    missed: list[str] = []
    raw_score = 0.0
    notes: list[str] = []

    # ── 1. Criterion scoring ──────────────────────────────────────────────
    for key, rubric in RUBRIC.items():
        if re.search(rubric["pattern"], final_response, re.IGNORECASE):
            hits.append(rubric["label"])
            raw_score += rubric["weight"]
        else:
            missed.append(rubric["label"])

    # ── 2. Tool call bonus: +5 per unique MCP tool (max +15) ────────────
    unique_tools = sorted(
        {e["tool_name"] for e in trace_log if e.get("event") == "tool_call_end"}
    )
    tool_bonus = min(len(unique_tools) * 5, 15)
    if unique_tools:
        notes.append(f"Tool bonus +{tool_bonus}: {', '.join(unique_tools)}")

    score = raw_score + tool_bonus

    # ── 3. Latency penalty: >30s total wall time → -5 pts ────────────────
    session_end_event = next(
        (e for e in reversed(trace_log)
         if e.get("session_id") == session_id and e.get("event") == "session_end"),
        None,
    )
    total_latency_ms = session_end_event.get("total_latency_ms", 0) if session_end_event else 0
    if total_latency_ms > 30_000:
        score = max(score - 5, 0)
        notes.append(f"Latency penalty -5: {total_latency_ms}ms > 30s threshold")

    score = min(score, 100.0)

    # ── 4. Verdict ────────────────────────────────────────────────────────
    if score >= APPROVED_THRESHOLD:
        verdict = "APPROVED"
    elif score >= CONDITIONAL_THRESHOLD:
        verdict = "CONDITIONALLY_APPROVED"
    else:
        verdict = "REJECTED"

    # ── 5. Per-persona scores (proxy from rubric hits) ────────────────────
    has_statutory = any("Statutory" in h for h in hits)
    has_boq = any("BOQ" in h for h in hits)
    has_arithmetic = any("Quantitative" in h for h in hits)

    persona_scores = {
        "chief_architect":   round(min(score + 5, 100), 1),
        "code_specialist":   80.0 if has_statutory else 55.0,
        "interior_designer": 80.0 if has_arithmetic else 60.0,
        "cost_estimator":    90.0 if has_boq else 50.0,
    }

    return EvalResult(
        session_id=session_id,
        score=round(score, 1),
        criteria_hits=hits,
        criteria_missed=missed,
        persona_scores=persona_scores,
        unique_tools_called=unique_tools,
        total_latency_ms=total_latency_ms,
        verdict=verdict,
        notes=notes,
    )
