"""
AtelierOS AGY — FastAPI Sidecar Server
Exposes the AGY multi-agent pipeline as an SSE endpoint for the Next.js app.

Endpoints:
  POST /chat       — run agent session, stream SSE events
  GET  /traces     — return recent trace events (consumed by trace-dashboard.tsx)
  GET  /health     — liveness probe

SSE event types streamed on POST /chat:
  { type: "chunk",  content: "<text>" }   — progressive response text
  { type: "eval",   eval: EvalResult }    — post-session quality score
  { type: "budget", budget: BudgetReport }— token / cost summary
  { type: "traces", traces: [...] }       — last 20 trace events
  { type: "error",  message: "..." }      — if the session fails
  "data: [DONE]"                          — stream sentinel
"""
from __future__ import annotations

import json
import os
import time
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from atelieros_agent import build_config
from budget_monitor import BudgetReport
from evaluator import evaluate_session
from tracer import AtelierOSTracer, get_recent_traces

app = FastAPI(
    title="AtelierOS AGY Sidecar",
    description="Google Antigravity SDK multi-agent service with observability",
    version="1.0.0",
)

# Allow Next.js dev server (localhost:3000) to call this sidecar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://atelieros-cloud.vercel.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request schema ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    prompt: str
    project_context: dict = {}


# ── POST /chat — SSE streaming agent session ─────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    api_key = os.environ.get("GEMINI_API_KEY")
    nvidia_key = os.environ.get("NVIDIA_API_KEY")

    if not api_key and not nvidia_key:
        raise HTTPException(
            status_code=503,
            detail="Neither GEMINI_API_KEY nor NVIDIA_API_KEY configured. Add one to apps/web/.env.local.",
        )

    async def generate() -> AsyncGenerator[str, None]:
        tracer = AtelierOSTracer(session_id=req.session_id)
        budget = BudgetReport(session_id=req.session_id)
        full_response = ""
        t_start = time.time()

        try:
            if api_key:
                from google.antigravity import Agent  # lazy import

                config = build_config(api_key=api_key, hooks=tracer.get_hooks())

                async with Agent(config) as agent:
                    prompt_with_context = (
                        f"Project context:\n{json.dumps(req.project_context, indent=2)}\n\n"
                        f"Design brief:\n{req.prompt}"
                    )
                    response = await agent.chat(prompt_with_context)

                    # Stream text chunks to the browser
                    async for chunk in response:
                        full_response += chunk
                        budget.model_calls += 1
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            elif nvidia_key:
                from openai import AsyncOpenAI

                base_url = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
                model = os.environ.get("NVIDIA_MODEL", "z-ai/glm-5.3")
                client = AsyncOpenAI(base_url=base_url, api_key=nvidia_key)

                system_prompt = (
                    "You are Vikram Mehta, Principal Architect at PDCO Architects (Gurgaon). "
                    "You lead a team of 3 specialists: code_specialist (Ananya Sharma), "
                    "interior_designer (Rohan Varma), and cost_estimator (Sunil Bajaj). "
                    "Analyze the project context and design brief across NBC 2016 statutory compliance, "
                    "IS 456 structural grid, STC 56 acoustic materials, and CPWD DSR BOQ tables. "
                    "Return a JSON object with keys: chief_architect, code_specialist, interior_designer, cost_estimator."
                )

                prompt_with_context = (
                    f"Project context:\n{json.dumps(req.project_context, indent=2)}\n\n"
                    f"Design brief:\n{req.prompt}"
                )

                stream = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_with_context},
                    ],
                    temperature=0.5,
                    top_p=1,
                    max_tokens=2500,
                    stream=True,
                )

                async for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    token = getattr(delta, "content", "") or getattr(delta, "reasoning_content", "") or ""
                    if token:
                        full_response += token
                        budget.model_calls += 1
                        yield f"data: {json.dumps({'type': 'chunk', 'content': token})}\n\n"

            # ── Post-session: evaluation ──────────────────────────────────
            traces = get_recent_traces(100)
            eval_result = evaluate_session(req.session_id, full_response, traces)
            budget_report = budget.to_dict()

            yield f"data: {json.dumps({'type': 'eval', 'eval': eval_result.to_dict()})}\n\n"
            yield f"data: {json.dumps({'type': 'budget', 'budget': budget_report})}\n\n"
            yield f"data: {json.dumps({'type': 'traces', 'traces': traces[-20:]})}\n\n"

        except ImportError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'google-antigravity not installed. Run: pip install google-antigravity'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)[:500]})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
        },
    )


# ── GET /traces — recent trace events for the observability panel ─────────────
@app.get("/traces")
async def get_traces(n: int = 50) -> dict:
    return {
        "traces": get_recent_traces(n),
        "total_buffered": len(get_recent_traces(500)),
    }


# ── GET /health — liveness probe ─────────────────────────────────────────────
@app.get("/health")
async def health() -> dict:
    api_ok = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok" if api_ok else "degraded",
        "service": "atelieros-agy",
        "gemini_api_key_configured": api_ok,
        "traces_in_buffer": len(get_recent_traces(500)),
    }


# ── Entrypoint ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AGY_PORT", "8765"))
    print(f"🚀 AtelierOS AGY sidecar starting on :{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
