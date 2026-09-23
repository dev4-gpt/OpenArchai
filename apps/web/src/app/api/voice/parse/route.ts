import { NextRequest, NextResponse } from "next/server";
import { parseDesignCommand } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Auth guard — only authenticated users can consume Gemini API credits
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 30 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || 'default';
    if (!checkRateLimit(ip, 30, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let body: { transcript?: string; projectContext?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { transcript, projectContext } = body;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const command = await parseDesignCommand(transcript, projectContext as any);
    
    return NextResponse.json({ command });
  } catch (error) {
    console.error("Error parsing voice command route:", error);
    return NextResponse.json(
      { error: "Failed to parse command" }, 
      { status: 500 }
    );
  }
}
