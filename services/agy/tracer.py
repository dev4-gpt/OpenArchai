"""
AtelierOS AGY — Observability & Tracing Layer
Implements Ph 14 (agent loop observability) + Ph 17 (production monitoring)
patterns from rohitg00/ai-engineering-from-scratch.

Every AGY lifecycle hook emits a structured trace event:
  - Written to services/agy/traces.jsonl (JSONL file sink)
  - Optionally pushed to Langfuse if credentials are configured
  - Held in memory for the /traces API endpoint

Hook chain:
  on_session_start → pre_turn → pre_tool_call_decide → post_tool_call
  → post_turn → on_tool_error → on_session_end
"""
from __future__ import annotations

import json
import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

TRACE_LOG = Path(__file__).parent / "traces.jsonl"

# In-memory ring buffer (last 500 events)
_SPAN_BUFFER: list[dict] = []
_BUFFER_MAX = 500


def _emit(record: dict) -> None:
    """Write one trace event to the JSONL file and in-memory buffer."""
    _SPAN_BUFFER.append(record)
    # Trim buffer
    if len(_SPAN_BUFFER) > _BUFFER_MAX:
        del _SPAN_BUFFER[: len(_SPAN_BUFFER) - _BUFFER_MAX]

    try:
        with open(TRACE_LOG, "a") as f:
            f.write(json.dumps(record) + "\n")
    except OSError:
        pass  # Never block the pipeline on a logging failure

    # Optional Langfuse push
    _try_langfuse(record)


def _try_langfuse(record: dict) -> None:
    """Push trace event to Langfuse cloud if credentials are present."""
    secret = os.environ.get("LANGFUSE_SECRET_KEY")
    public = os.environ.get("LANGFUSE_PUBLIC_KEY")
    if not secret or not public:
        return
    try:
        from langfuse import Langfuse  # type: ignore

        lf = Langfuse(
            secret_key=secret,
            public_key=public,
            host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        )
        lf.trace(
            name=record.get("event", "unknown"),
            session_id=record.get("session_id"),
            metadata=record,
        )
        lf.flush()
    except Exception:
        pass  # Langfuse is optional — never raise


def get_recent_traces(n: int = 50) -> list[dict]:
    """Return the last N trace events from the in-memory buffer."""
    return _SPAN_BUFFER[-n:]


def clear_traces() -> None:
    """Clear the in-memory buffer (used in tests)."""
    _SPAN_BUFFER.clear()


# ---------------------------------------------------------------------------
# Tracer class — attach to AGY hooks
# ---------------------------------------------------------------------------
class AtelierOSTracer:
    """
    Attach to a single AGY session and emit structured JSONL traces.
    Usage:
        tracer = AtelierOSTracer("session-abc123")
        config = build_config(api_key, hooks=tracer.get_hooks())
    """

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self._session_start: float = 0.0
        self._turn_start: float = 0.0
        self._tool_start: float = 0.0
        self.turn_count: int = 0
        self.tool_calls: list[dict] = []
        self.total_latency_ms: int = 0

    def _rec(self, event_type: str, **kwargs) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "session_id": self.session_id,
            "event": event_type,
            "ts": time.time(),
            **kwargs,
        }
        _emit(record)
        return record

    def get_hooks(self) -> list:
        """
        Build and return the list of AGY hook functions for this session.
        Hooks are registered via @hooks.* decorators and returned as callables.
        """
        try:
            from google.antigravity import types
            from google.antigravity.hooks import hooks
        except ImportError as e:
            raise ImportError(
                "google-antigravity is not installed. Run:\n"
                "  pip install google-antigravity\n"
                f"Original error: {e}"
            )

        tracer = self  # capture reference

        # ── Session Start ────────────────────────────────────────────────────
        @hooks.on_session_start
        async def on_start() -> None:
            tracer._session_start = time.time()
            tracer._rec("session_start")

        # ── Pre-Turn ─────────────────────────────────────────────────────────
        @hooks.pre_turn
        async def pre_turn(data: str) -> types.HookResult:
            tracer.turn_count += 1
            tracer._turn_start = time.time()
            tracer._rec(
                "turn_start",
                turn=tracer.turn_count,
                prompt_preview=data[:300],
                prompt_length=len(data),
            )
            return types.HookResult(allow=True)

        # ── Post-Turn ────────────────────────────────────────────────────────
        @hooks.post_turn
        async def post_turn(data: str) -> None:
            latency_ms = round((time.time() - tracer._turn_start) * 1000)
            tracer.total_latency_ms += latency_ms
            tracer._rec(
                "turn_end",
                turn=tracer.turn_count,
                latency_ms=latency_ms,
                response_preview=data[:400],
                response_length=len(data),
            )

        # ── Pre-Tool Call ────────────────────────────────────────────────────
        @hooks.pre_tool_call_decide
        async def pre_tool(data: types.ToolCall) -> types.HookResult:
            tracer._tool_start = time.time()
            tracer._rec(
                "tool_call_start",
                tool_name=data.name,
                tool_args=str(getattr(data, "arguments", ""))[:300],
                turn=tracer.turn_count,
            )
            return types.HookResult(allow=True)

        # ── Post-Tool Call ───────────────────────────────────────────────────
        @hooks.post_tool_call
        async def post_tool(data) -> None:
            latency_ms = round((time.time() - tracer._tool_start) * 1000)
            tool_name = getattr(data, "name", "unknown")
            tracer.tool_calls.append({"tool_name": tool_name, "latency_ms": latency_ms})
            tracer._rec(
                "tool_call_end",
                tool_name=tool_name,
                latency_ms=latency_ms,
                turn=tracer.turn_count,
            )

        # ── Tool Error ───────────────────────────────────────────────────────
        @hooks.on_tool_error
        async def on_error(data: Exception):
            tracer._rec(
                "tool_error",
                error_type=type(data).__name__,
                error_message=str(data)[:500],
                turn=tracer.turn_count,
            )
            return None  # Let the error propagate

        # ── Session End ──────────────────────────────────────────────────────
        @hooks.on_session_end
        async def on_end() -> None:
            wall_ms = round((time.time() - tracer._session_start) * 1000)
            tracer._rec(
                "session_end",
                total_turns=tracer.turn_count,
                total_tool_calls=len(tracer.tool_calls),
                tool_call_names=[t["tool_name"] for t in tracer.tool_calls],
                total_latency_ms=wall_ms,
            )

        return [on_start, pre_turn, post_turn, pre_tool, post_tool, on_error, on_end]
