import { NextRequest, NextResponse } from "next/server";
import { consultAgentTeam, type AgentRole, type ProjectContext } from "@/lib/agents-orchestrator";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Each consult fires up to one paid Gemini call per selected persona —
    // a tighter limit than voice-parse since this is the more expensive endpoint.
    const ip = req.headers.get("x-forwarded-for") || "default";
    if (!checkRateLimit(ip, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { prompt, context, roles } = body as {
      prompt: string;
      context: ProjectContext;
      roles?: AgentRole[];
    };

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const messages = await consultAgentTeam(
      prompt,
      context || { projectName: "Project", region: "india" },
      roles,
    );

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Agent team consultation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Consultation failed" },
      { status: 500 },
    );
  }
}
