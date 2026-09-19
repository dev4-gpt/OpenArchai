// Video Walkthrough & Camera Choreography Engine for AtelierOS
// Orchestrates 3D orbital flight paths and connects to Higgsfield AI & OpenMontage video generation pipelines.

export type CameraChoreographyMode = "orbit_360" | "interior_glide" | "hero_cinematic";

export interface CameraKeyframe {
  timeSec: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  description: string;
}

export interface VideoWalkthroughReel {
  id: string;
  projectId: string;
  title: string;
  mode: CameraChoreographyMode;
  durationSec: number;
  videoUrl: string;
  thumbnailUrl: string;
  keyframes: CameraKeyframe[];
  prompt: string;
  status: "ready" | "processing" | "failed";
  createdAt: string;
}

/**
 * Computes a smooth cinematic orbital or flythrough camera trajectory around the model.
 */
export function generateCameraPath(
  mode: CameraChoreographyMode = "orbit_360",
  center: [number, number, number] = [0, 1.2, 0],
  radius = 6.0,
): CameraKeyframe[] {
  const keyframes: CameraKeyframe[] = [];

  if (mode === "orbit_360") {
    // 360-degree continuous architectural turntable orbit at eye-level
    const steps = 8;
    const duration = 12; // 12-second smooth reel
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = center[0] + Math.cos(angle) * radius;
      const z = center[2] + Math.sin(angle) * radius;
      const y = center[1] + 1.8 + Math.sin(angle * 2) * 0.4;

      keyframes.push({
        timeSec: Number(((i / steps) * duration).toFixed(1)),
        position: [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))],
        target: center,
        fov: 42,
        description: `Orbit angle ${(i * 45) % 360}°`,
      });
    }
  } else if (mode === "interior_glide") {
    // Smooth dolly-in through entrance foyer into living and balcony
    keyframes.push(
      { timeSec: 0, position: [0, 1.6, radius + 2], target: center, fov: 48, description: "Entrance Foyer Approach" },
      { timeSec: 3, position: [0, 1.5, radius * 0.6], target: [0, 1.2, 0], fov: 45, description: "Living Room Core" },
      { timeSec: 6, position: [-1.5, 1.5, 0.5], target: [1.5, 1.2, -0.5], fov: 42, description: "Lounge & Marble Feature Wall" },
      { timeSec: 9, position: [0, 1.6, -1.8], target: [0, 1.4, -4], fov: 46, description: "Verandah & Balcony Vista" },
      { timeSec: 12, position: [2, 1.8, 2], target: center, fov: 45, description: "Wide Spatial Overview" },
    );
  } else {
    // Hero Cinematic: dramatic low-angle push-in with rising elevation
    keyframes.push(
      { timeSec: 0, position: [-radius * 0.8, 0.8, radius * 0.8], target: center, fov: 38, description: "Low Dramatic Corner" },
      { timeSec: 4, position: [0, 2.2, radius], target: center, fov: 44, description: "Mid-level Elevation Pan" },
      { timeSec: 8, position: [radius * 0.9, 3.5, radius * 0.5], target: center, fov: 40, description: "High Axonometric Sweep" },
      { timeSec: 12, position: [0, 1.5, radius * 0.8], target: center, fov: 42, description: "Hero Final Frame" },
    );
  }

  return keyframes;
}

/**
 * Builds a standardized Higgsfield AI / OpenMontage video generation specification payload.
 */
export function buildHiggsfieldGenerationPayload(params: {
  projectName: string;
  mode: CameraChoreographyMode;
  keyframes: CameraKeyframe[];
  stylePrompt: string;
  resolution?: "1080p" | "4k";
}): {
  engine: string;
  model: string;
  cameraChoreography: CameraKeyframe[];
  prompt: string;
  negativePrompt: string;
  durationSeconds: number;
} {
  return {
    engine: "higgsfield_openmontage_v2",
    model: "open-higgsfield-cinema-pro",
    cameraChoreography: params.keyframes,
    prompt: `Cinematic architectural walkthrough of ${params.projectName}. ${params.stylePrompt}. Ultra-smooth gimbal motion, hyperrealistic 8k lighting, photorealistic textures, architectural digest cinema reel, 60fps.`,
    negativePrompt: "jerky camera, lens distortion, glitches, blurry, oversaturated, people walking, noise",
    durationSeconds: 12,
  };
}

// Built-in curated demo cinematic video reels for high-impact instant client walkthroughs
export const SAMPLE_CINEMATIC_REELS: VideoWalkthroughReel[] = [
  {
    id: "reel_sample_studio_01",
    projectId: "demo",
    title: "Cinematic 3D Turntable Walkthrough",
    mode: "orbit_360",
    durationSec: 12,
    // CC0 / High-performance architectural MP4 loops
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-with-a-couch-41586-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
    keyframes: generateCameraPath("orbit_360"),
    prompt: "Modern minimalist studio apartment, warm natural afternoon sunlight, Italian marble and herringbone oak floors",
    status: "ready",
    createdAt: new Date().toISOString(),
  },
  {
    id: "reel_sample_studio_02",
    projectId: "demo",
    title: "Twilight Circadian Walkthrough (2700K Warm)",
    mode: "interior_glide",
    durationSec: 12,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-luxury-home-interior-with-warm-lighting-41588-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
    keyframes: generateCameraPath("interior_glide"),
    prompt: "Evening twilight living room walkthrough, warm recessed ceiling spotlights, fluted timber acoustic panels",
    status: "ready",
    createdAt: new Date().toISOString(),
  },
];
