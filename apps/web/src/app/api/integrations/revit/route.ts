import { NextResponse } from "next/server";
import { z } from "zod";
import {
  convertRevitToConstructionElements,
  convertRevitCamerasToHiggsfieldWaypoints,
  type RevitBIMPayload,
} from "@/lib/revit/revit-bridge";
import { buildHiggsfieldArchitecturalPrompt } from "@/lib/higgsfield-api";

const RevitRoomSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().default("Room"),
  number: z.string().default("0"),
  areaSqM: z.number().nonnegative().default(0),
  perimeterM: z.number().nonnegative().default(0),
  unboundedHeightM: z.number().nonnegative().default(2.8),
  level: z.string().default("Ground"),
  boundaryPoints: z.array(z.tuple([z.number(), z.number()])).default([]),
  finishSchedule: z
    .object({
      floorFinish: z.string().optional(),
      wallFinish: z.string().optional(),
      ceilingFinish: z.string().optional(),
      baseFinish: z.string().optional(),
    })
    .optional(),
});

const RevitCameraSchema = z.object({
  viewName: z.string().default("3D View"),
  viewType: z.enum(["Perspective", "Walkthrough", "Axonometric"]).default("Perspective"),
  eyePosition: z.tuple([z.number(), z.number(), z.number()]),
  targetPosition: z.tuple([z.number(), z.number(), z.number()]),
  fieldOfViewDeg: z.number().positive().default(55),
  focalLengthMm: z.number().positive().optional().default(28),
});

const RevitPayloadSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  revitVersion: z.string().default("Revit 2024"),
  projectName: z.string().min(1).default("Revit Architectural Project"),
  projectNumber: z.string().optional(),
  clientName: z.string().optional(),
  units: z.enum(["metric", "imperial"]).default("metric"),
  levels: z.array(z.object({ name: z.string(), elevationM: z.number() })).default([]),
  rooms: z.array(RevitRoomSchema).default([]),
  cameras: z.array(RevitCameraSchema).default([]),
  materials: z.array(z.object({ name: z.string(), category: z.string(), colorHex: z.string().optional() })).optional(),
  exportedAt: z.string().default(() => new Date().toISOString()),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = RevitPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Revit BIM payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data as RevitBIMPayload;

    // 1. Convert Revit BIM rooms into 2D/3D ConstructionElements
    const elements = convertRevitToConstructionElements(payload);

    // 2. Convert Revit cameras into Higgsfield AI camera flight waypoints
    const waypoints = convertRevitCamerasToHiggsfieldWaypoints(payload.cameras);

    // 3. Synthesize Higgsfield architectural prompt from Revit schedule
    const totalAreaSqM = payload.rooms.reduce((acc, r) => acc + r.areaSqM, 0);
    const primaryFloorFinish = payload.rooms[0]?.finishSchedule?.floorFinish || "Italian Statuario Marble";
    const primaryWallFinish = payload.rooms[0]?.finishSchedule?.wallFinish || "Asian Paints Royale warm matte with fluted oak acoustic slats";

    const higgsfieldPrompt = buildHiggsfieldArchitecturalPrompt({
      projectName: payload.projectName,
      roomType: payload.rooms.map((r) => r.name).slice(0, 3).join(", ") || "Luxury Suite",
      dimensions: {
        width: Math.sqrt(totalAreaSqM) * 1.2 || 6.0,
        depth: Math.sqrt(totalAreaSqM) * 0.8 || 4.5,
        height: payload.rooms[0]?.unboundedHeightM || 2.8,
      },
      materialPalette: {
        flooring: primaryFloorFinish,
        walls: primaryWallFinish,
        lightingTemp: "2700K warm recessed architectural downlights with circadian daylight",
      },
      cameraMode: "interior_glide",
      resolution: "1080p",
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${payload.rooms.length} Revit rooms and ${payload.cameras.length} camera views.`,
      projectName: payload.projectName,
      elements,
      higgsfield: {
        prompt: higgsfieldPrompt,
        cameraWaypoints: waypoints,
        suggestedResolution: "1080p",
        fps: 60,
      },
      stats: {
        roomCount: payload.rooms.length,
        cameraCount: payload.cameras.length,
        totalAreaSqM: Math.round(totalAreaSqM * 100) / 100,
        revitVersion: payload.revitVersion,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error parsing Revit BIM";
    console.error("[Revit Integration Error]:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
