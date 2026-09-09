import { NextRequest, NextResponse } from "next/server";
import { consultAgentTeam, type AgentRole, type ProjectContext } from "@/lib/agents-orchestrator";

export async function POST(req: NextRequest) {
  try {
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
