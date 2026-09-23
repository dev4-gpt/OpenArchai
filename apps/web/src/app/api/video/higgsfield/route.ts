import { NextResponse } from "next/server";
import {
  buildHiggsfieldArchitecturalPrompt,
  type HiggsfieldGenerationParams,
  type HiggsfieldJobResponse,
} from "@/lib/higgsfield-api";
import { generateCameraPath } from "@/lib/video-walkthrough";

export async function POST(req: Request) {
  try {
    const body: HiggsfieldGenerationParams = await req.json();

    const projectName = body.projectName || "Sample Studio Apartment";
    const prompt = body.prompt || buildHiggsfieldArchitecturalPrompt(body);
    const cameraMode = body.cameraMode || "interior_glide";
    const resolution = body.resolution || "1080p";

    // 1. Generate exact camera flight waypoints matching the 3D model
    const waypoints = generateCameraPath(
      cameraMode === "interior_glide" ? "interior_glide" : "orbit_360",
    );

    // 2. Check for official Higgsfield AI API key
    const apiKey = process.env.HIGGSFIELD_API_KEY;

    if (apiKey) {
      try {
        // Upstream Higgsfield AI API call
        const hgRes = await fetch("https://api.higgsfield.ai/v1/video/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "open-higgsfield-cinema-pro",
            prompt,
            negative_prompt:
              "jitter, jerky camera, noise, blurry, low resolution, warped architecture, distorted walls, 3d artifacts",
            resolution: resolution === "4k" ? "3840x2160" : "1920x1080",
            fps: 60,
            duration: 12,
            camera_trajectory: waypoints.map((w) => ({
              time: w.timeSec,
              position: w.position,
              target: w.target,
              fov: w.fov,
            })),
            source_image: body.sourceImageUrl,
          }),
        });

        if (hgRes.ok) {
          const hgData = await hgRes.json();
          // If Higgsfield returns a real video URL, serve it directly.
          // If not (no video_url), fall through to client-capture — never serve a stock MP4.
          if (hgData.video_url) {
            const response: HiggsfieldJobResponse = {
              jobId: hgData.id || `hg_${Date.now()}`,
              status: "completed",
              progress: 100,
              videoUrl: hgData.video_url,
              thumbnailUrl: hgData.thumbnail_url || undefined,
              cameraPath: waypoints,
              prompt,
              motionConfig: {
                engine: "higgsfield_ai_v2",
                model: "open-higgsfield-cinema-pro",
                dopPreset: "28mm Architectural Steadicam",
                focalLength: "28mm",
                shutterSpeed: "1/120s (180° shutter)",
                fps: 60,
              },
              createdAt: new Date().toISOString(),
            };
            return NextResponse.json(response);
          }
          // No video_url from Higgsfield — fall through to client-capture below
        }
      } catch (err) {
        console.warn("Higgsfield upstream API call failed, falling back to conditioned pipeline:", err);
      }
    }

    // 3. Transparent High-Fidelity Synthesis matching CAD dimensions
    // When external cloud GPU key is absent, seamlessly hand off to browser-native
    // 60fps Steadicam recording of the user's actual 3D model geometry.
    const engine = body.engine || "direct_cad";

    const response: HiggsfieldJobResponse = {
      jobId: `cad_${Date.now().toString(36)}`,
      status: "completed",
      progress: 100,
      requiresClientCapture: true,
      message:
        "Direct CAD Steadicam recording active. Capturing 60fps WebGL canvas directly from 3D model geometry without AI hallucinations.",
      cameraPath: waypoints,
      prompt,
      motionConfig: {
        engine: "direct_cad_gpu_stream",
        model: "AtelierOS 60fps Steadicam WebGL Engine",
        dopPreset: "100% CAD Dimension Preservation (0% Hallucination)",
        focalLength: "28mm Cine Prime",
        shutterSpeed: "1/120s (180° shutter rule)",
        fps: 60,
      },
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Higgsfield video route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error generating video" },
      { status: 500 },
    );
  }
}
