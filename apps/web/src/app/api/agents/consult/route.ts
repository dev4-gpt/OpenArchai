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

    const { prompt, context, roles } = parsed.data;

    const projectContext: ProjectContext = context
      ? (context as ProjectContext)
      : { projectName: "Project", region: "india" };

    const messages = await consultAgentTeam(
      prompt,
      projectContext,
      roles as AgentRole[] | undefined,
    );

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Agent team consultation failed:", err);
    // Do not leak internal error messages to the client
    return NextResponse.json({ error: "Consultation failed" }, { status: 500 });
  }
}
