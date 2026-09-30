"""
AtelierOS AGY — Token Budget & Cost Monitor
Implements Ph 17 (Infrastructure & Production) patterns from
rohitg00/ai-engineering-from-scratch — managed LLM platform cost tracking.

Tracks token consumption and estimates USD cost per session using
Gemini Flash pricing (default model of the AGY SDK).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Gemini model pricing (USD per 1M tokens, as of late 2025)
# Source: https://ai.google.dev/gemini-api/docs/pricing
# ---------------------------------------------------------------------------
PRICING: dict[str, dict[str, float]] = {
    "gemini-2.5-flash": {
        "input_per_1m":  0.075,
        "output_per_1m": 0.30,
    },
    "gemini-2.5-pro": {
        "input_per_1m":  1.25,
        "output_per_1m": 10.00,
    },
    "default": {
        "input_per_1m":  0.075,
        "output_per_1m": 0.30,
    },
}


@dataclass
class BudgetReport:
    session_id: str
    model: str = "default"
    model_calls: int = 0
    tool_calls: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    stop_reason: Optional[str] = None
    warnings: list[str] = field(default_factory=list)

    # Soft budget thresholds
    WARN_COST_USD = 0.10   # warn above $0.10 per session
    WARN_TOKENS   = 50_000 # warn above 50k total tokens

    def compute_cost(self) -> "BudgetReport":
        pricing = PRICING.get(self.model, PRICING["default"])
        self.estimated_cost_usd = round(
            self.total_input_tokens  / 1_000_000 * pricing["input_per_1m"]
            + self.total_output_tokens / 1_000_000 * pricing["output_per_1m"],
            6,
        )
        # Add warnings
        if self.estimated_cost_usd > self.WARN_COST_USD:
            self.warnings.append(
                f"Session cost ${self.estimated_cost_usd:.4f} exceeds ${self.WARN_COST_USD:.2f} threshold"
            )
        total_tokens = self.total_input_tokens + self.total_output_tokens
        if total_tokens > self.WARN_TOKENS:
            self.warnings.append(
                f"Total tokens {total_tokens:,} exceeds {self.WARN_TOKENS:,} threshold"
            )
        return self

    def record_model_call(
        self,
        input_tokens: int = 0,
        output_tokens: int = 0,
    ) -> None:
        self.model_calls += 1
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

    def record_tool_call(self) -> None:
        self.tool_calls += 1

    def to_dict(self) -> dict:
        self.compute_cost()
        return {
            "session_id": self.session_id,
            "model": self.model,
            "model_calls": self.model_calls,
            "tool_calls": self.tool_calls,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "estimated_cost_usd": self.estimated_cost_usd,
            "stop_reason": self.stop_reason,
            "warnings": self.warnings,
        }
