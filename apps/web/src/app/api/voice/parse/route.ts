import { NextRequest, NextResponse } from "next/server";
import { parseDesignCommand } from "@/lib/gemini";

// Simple memory store for rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute
    const ip = req.headers.get('x-forwarded-for') || 'default';
    const now = Date.now();
    const rateLimitData = rateLimitMap.get(ip);
    
    if (rateLimitData && rateLimitData.resetTime > now) {
      if (rateLimitData.count >= 30) {
        return NextResponse.json(
          { error: "Too many requests" }, 
          { status: 429 }
        );
      }
      rateLimitData.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
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
