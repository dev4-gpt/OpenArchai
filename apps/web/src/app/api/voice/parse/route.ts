import { NextRequest, NextResponse } from "next/server";
import { parseDesignCommand } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute
    const ip = req.headers.get('x-forwarded-for') || 'default';
    if (!checkRateLimit(ip, 30, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { transcript, projectContext } = body;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const command = await parseDesignCommand(transcript, projectContext);
    
    return NextResponse.json({ command });
  } catch (error) {
    console.error("Error parsing voice command route:", error);
    return NextResponse.json(
      { error: "Failed to parse command" }, 
      { status: 500 }
    );
  }
}
