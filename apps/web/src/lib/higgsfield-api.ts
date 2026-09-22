// Higgsfield AI Video Generation Engine for AtelierOS
// Connects to the Higgsfield AI Director-of-Photography (DoP) Video API
// and generates hyperrealistic 60fps architectural walkthrough reels conditioned
// on 3D CAD dimensions and camera flight trajectories.

export interface HiggsfieldCameraWaypoint {
  timeSec: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  description: string;
}

export interface HiggsfieldGenerationParams {
  projectName: string;
  prompt?: string;
  roomType?: string;
  dimensions?: { width: number; depth: number; height: number };
  stylePreset?: string;
  materialPalette?: {
    flooring: string;
    walls: string;
    lightingTemp: string;
  };
  cameraMode?: "interior_glide" | "orbit_360" | "hero_dolly";
  motionIntensity?: number; // 1 to 10
  resolution?: "720p" | "1080p" | "4k";
  sourceImageUrl?: string;
  engine?: "higgsfield_cloud" | "open_higgsfield" | "wan_2_1" | "skyreels_v2" | "direct_cad";
}

export interface HiggsfieldJobResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  requiresClientCapture?: boolean;
  message?: string;
  cameraPath?: HiggsfieldCameraWaypoint[];
  prompt: string;
  motionConfig: {
    engine: string;
    model: string;
    dopPreset: string;
    focalLength: string;
    shutterSpeed: string;
    fps: number;
  };
  createdAt: string;
}

/**
 * Builds an architecturally accurate prompt conditioned on the exact CAD design.
 */
export function buildHiggsfieldArchitecturalPrompt(params: HiggsfieldGenerationParams): string {
  const {
    projectName,
    roomType = "Studio Living Apartment",
    dimensions = { width: 5.0, depth: 3.0, height: 2.7 },
    stylePreset = "Contemporary Indian Luxury",
    materialPalette = {
      flooring: "Polished Italian Statuario Marble with subtle grey veining",
      walls: "Asian Paints Royale warm neutral matte with fluted oak acoustic slats",
      lightingTemp: "2700K warm recessed architectural downlights",
    },
    cameraMode = "interior_glide",
  } = params;

  return [
    `Cinematic hyperrealistic architectural walkthrough of ${projectName}, a ${dimensions.width.toFixed(1)}m x ${dimensions.depth.toFixed(1)}m ${roomType} (ceiling height ${dimensions.height.toFixed(1)}m).`,
    `Interior features ${materialPalette.flooring} on the floor, ${materialPalette.walls} on the walls, and ${materialPalette.lightingTemp}.`,
    `Furnished with a custom low-profile sectional sofa, Noguchi glass-top coffee table, King platform bed with layered linen bedding, and minimalist oak dining table.`,
    `Natural daylight streaming through the 1.2m perimeter window casting soft sunbeam patterns across the floor.`,
    `Camera execution: ${cameraMode === "interior_glide" ? "Smooth 1.65m human eye-level Steadicam glide entering through the front door" : "360-degree continuous architectural orbital camera"}, 28mm f/2.8 architectural cinema prime lens, zero motion jitter, 60fps, Architectural Digest photography, photorealistic 8K ray-traced lighting, ultra-crisp material textures.`,
  ].join(" ");
}

/**
 * Sends a generation request to the Higgsfield API.
 */
export async function createHiggsfieldWalkthroughJob(
  params: HiggsfieldGenerationParams,
): Promise<HiggsfieldJobResponse> {
  const prompt = buildHiggsfieldArchitecturalPrompt(params);

  // In Next.js client, call the internal API route
  const res = await fetch("/api/video/higgsfield", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Higgsfield generation failed (${res.status})`);
  }

  return res.json();
}
