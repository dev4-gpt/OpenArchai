import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consultAgentTeam, type AgentRole, type ProjectContext } from "@/lib/agents-orchestrator";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ConsultRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z
    .object({
      projectName: z.string().default("Project"),
      region: z.enum(["india", "us"]).default("india"),
      floorAreaSqFt: z.number().positive().optional(),
      carpetAreaSqM: z.number().positive().optional(),
      wallAreaSqFt: z.number().positive().optional(),
      estimatedCost: z.number().positive().optional(),
      currency: z.string().optional(),
      complianceScore: z.number().min(0).max(100).optional(),
      rooms: z.array(z.string()).optional(),
    })
    .optional(),
  roles: z
    .array(
      z.enum(["chief_architect", "code_specialist", "interior_designer", "cost_estimator"]),
    )
    .optional(),
  // AGY SDK optional fields — ignored when USE_AGY_SDK is off
  sessionId: z.string().optional(),
  useAgy: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Each consult fires up to one paid model call per selected persona —
    // a tighter limit than voice-parse since this is the more expensive endpoint.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "default";
    if (!checkRateLimit(ip, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = ConsultRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, context, roles, sessionId, useAgy } = parsed.data;

    const projectContext: ProjectContext = context
      ? (context as ProjectContext)
      : { projectName: "Project", region: "india" };

    // ── AGY SDK path ──────────────────────────────────────────────────────────
    // Activated when USE_AGY_SDK env var is "true" OR caller sends useAgy: true.
    // If the sidecar is unreachable, falls back to the legacy REST orchestrator.
    const agySdkEnabled = useAgy === true || process.env.USE_AGY_SDK === "true";

    if (agySdkEnabled) {
      const agySvcUrl = process.env.AGY_SERVICE_URL ?? "http://localhost:8765";
      let upstream: Response;
      try {
        upstream = await fetch(`${agySvcUrl}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId ?? `s_${Date.now()}`,
            prompt,
            project_context: projectContext,
          }),
        });
      } catch {
        // AGY sidecar unreachable — degrade gracefully to legacy path
        console.warn("[AGY] Sidecar unreachable — falling back to legacy orchestrator");
        return _legacyPath(prompt, projectContext, roles as AgentRole[] | undefined);
      }

      if (!upstream.ok) {
        console.warn(`[AGY] Sidecar returned HTTP ${upstream.status} — falling back`);
        return _legacyPath(prompt, projectContext, roles as AgentRole[] | undefined);
      }

      // Pass the SSE stream directly through to the browser
      return new Response(upstream.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-AGY-SDK": "1",
        },
      });
    }

    // ── Legacy path (default when USE_AGY_SDK is unset) ───────────────────────
    return _legacyPath(prompt, projectContext, roles as AgentRole[] | undefined);
  } catch (err) {
    console.error("Agent team consultation failed:", err);
    // Do not leak internal error messages to the client
    return NextResponse.json({ error: "Consultation failed" }, { status: 500 });
  }
}

async function _legacyPath(
  prompt: string,
  projectContext: ProjectContext,
  roles?: AgentRole[],
): Promise<NextResponse> {
  const messages = await consultAgentTeam(prompt, projectContext, roles);
  return NextResponse.json({ messages });
}
