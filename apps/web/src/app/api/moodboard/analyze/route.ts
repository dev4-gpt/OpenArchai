import { NextResponse } from "next/server";
import { analyzeMoodboardImage } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 },
      );
    }

    const analysis = await analyzeMoodboardImage(imageBase64, mimeType || "image/jpeg");
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("API /api/moodboard/analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
