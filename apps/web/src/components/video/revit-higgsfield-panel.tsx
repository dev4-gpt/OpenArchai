"use client";

import { useState } from "react";
import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";
import type { HiggsfieldCameraWaypoint, HiggsfieldJobResponse } from "@/lib/higgsfield-api";
import { createHiggsfieldWalkthroughJob } from "@/lib/higgsfield-api";

interface RevitHiggsfieldPanelProps {
  projectName?: string;
  onElementsImported?: (elements: ConstructionElements) => void;
  onWaypointsImported?: (waypoints: HiggsfieldCameraWaypoint[]) => void;
}

export function RevitHiggsfieldPanel({
  projectName = "Luxury Architectural Villa",
  onElementsImported,
  onWaypointsImported,
}: RevitHiggsfieldPanelProps) {
  const [activeTab, setActiveTab] = useState<"script" | "sample" | "dop_director">("sample");
  const [lensMm, setLensMm] = useState<number>(28);
  const [cameraStyle, setCameraStyle] = useState<"interior_glide" | "orbit_360" | "hero_dolly">("interior_glide");
  const [lightingMood, setLightingMood] = useState<"golden_hour" | "circadian_noon" | "twilight_recessed">("golden_hour");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<HiggsfieldJobResponse | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>(
    "Cinematic hyperrealistic 60fps architectural walkthrough of Luxury Architectural Villa, 28mm f/2.8 cine prime lens, 1.65m human eye-level Steadicam tracking shot. Polished Italian Statuario marble floors with subtle natural reflections, fluted oak wall slats, 2700K warm architectural recessed downlights, streaming golden hour sunlight casting soft shadow patterns. Zero geometric distortion, Architectural Digest 8K ray-traced lighting.",
  );

  async function handleLoadSampleRevitModel() {
    setLoading(true);
    setSyncStatus("Ingesting sample Revit 2025 BIM model (4 rooms, 4 perspective cameras, finish schedules)...");

    try {
      const sampleRevitPayload = {
        version: "1.0",
        revitVersion: "Autodesk Revit 2025 (Educational Access)",
        projectName: projectName,
        units: "metric",
        levels: [{ name: "Level 1 - Ground", elevationM: 0.0 }],
        rooms: [
          {
            id: "revit_101",
            name: "Entrance Foyer",
            number: "101",
            areaSqM: 14.2,
            perimeterM: 15.2,
            unboundedHeightM: 3.0,
            level: "Level 1",
            boundaryPoints: [
              [0, 0],
              [3.8, 0],
              [3.8, 3.8],
              [0, 3.8],
            ],
            finishSchedule: {
              floorFinish: "Italian Statuario Marble (IS 15477 C2TE S1)",
              wallFinish: "Asian Paints Royale Health Shield warm matte",
              ceilingFinish: "Gyproc SoundStop false ceiling with 2700K concealed cove",
            },
          },
          {
            id: "revit_102",
            name: "Living Room Core",
            number: "102",
            areaSqM: 38.5,
            perimeterM: 25.4,
            unboundedHeightM: 3.2,
            level: "Level 1",
            boundaryPoints: [
              [3.8, 0],
              [10.2, 0],
              [10.2, 6.0],
              [3.8, 6.0],
            ],
            finishSchedule: {
              floorFinish: "Italian Statuario Marble with bookmatched veins",
              wallFinish: "Burma Teak fluted acoustic slats (IS 287 kiln-dried)",
              ceilingFinish: "Flush acoustic drywall plenum void (450mm)",
            },
          },
          {
            id: "revit_103",
            name: "Glazed Perimeter Balcony",
            number: "103",
            areaSqM: 16.0,
            perimeterM: 18.0,
            unboundedHeightM: 3.0,
            level: "Level 1",
            boundaryPoints: [
              [10.2, 0],
              [13.5, 0],
              [13.5, 5.0],
              [10.2, 5.0],
            ],
            finishSchedule: {
              floorFinish: "Honed Rajasthan Kota Stone (anti-skid)",
              wallFinish: "Textured lime plaster with external weather-shield",
              ceilingFinish: "Exterior timber soffit",
            },
          },
          {
            id: "revit_104",
            name: "Master Suite",
            number: "104",
            areaSqM: 28.0,
            perimeterM: 21.4,
            unboundedHeightM: 3.0,
            level: "Level 1",
            boundaryPoints: [
              [0, 3.8],
              [3.8, 3.8],
              [3.8, 10.0],
              [0, 10.0],
            ],
            finishSchedule: {
              floorFinish: "Engineered Oak Hardwood Flooring",
              wallFinish: "STC 56 tested acoustic double-stud partition",
              ceilingFinish: "Recessed architectural downlights 2700K",
            },
          },
        ],
        cameras: [
          {
            viewName: "Cam 1 - Foyer Entry",
            viewType: "Perspective",
            eyePosition: [1.9, 1.65, 0.4],
            targetPosition: [1.9, 1.45, 2.5],
            fieldOfViewDeg: 55,
            focalLengthMm: 28,
          },
          {
            viewName: "Cam 2 - Living Room Reveal",
            viewType: "Perspective",
            eyePosition: [4.5, 1.65, 1.8],
            targetPosition: [8.0, 1.3, 3.2],
            fieldOfViewDeg: 55,
            focalLengthMm: 28,
          },
          {
            viewName: "Cam 3 - Glazed Terrace Daylight",
            viewType: "Perspective",
            eyePosition: [9.5, 1.65, 2.8],
            targetPosition: [12.0, 1.5, 3.0],
            fieldOfViewDeg: 52,
            focalLengthMm: 35,
          },
          {
            viewName: "Cam 4 - Master Suite Sanctuary",
            viewType: "Perspective",
            eyePosition: [1.8, 1.65, 5.2],
            targetPosition: [2.2, 1.2, 8.5],
            fieldOfViewDeg: 55,
            focalLengthMm: 28,
          },
        ],
      };

      const res = await fetch("/api/integrations/revit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleRevitPayload),
      });

      if (!res.ok) throw new Error("Revit sync endpoint returned an error");
      const data = await res.json();

      setSyncStatus(`Synced 4 Revit rooms & 4 camera flight paths. Area: ${data.stats.totalAreaSqM} m².`);
      if (data.elements && onElementsImported) {
        onElementsImported(data.elements);
      }
      if (data.higgsfield?.cameraWaypoints && onWaypointsImported) {
        onWaypointsImported(data.higgsfield.cameraWaypoints);
      }
      if (data.higgsfield?.prompt) {
        setGeneratedPrompt(data.higgsfield.prompt);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync error";
      setSyncStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleConsultDoPAgent() {
    setLoading(true);
    setSyncStatus("Consulting Kabir Sen (DoP) & Rohan Varma (Materials) for cinematic conditioning...");

    try {
      const res = await fetch("/api/agents/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `As Kabir Sen (Architectural Cinematographer), design a 60fps Higgsfield AI walkthrough shot list using a ${lensMm}mm cinema lens with ${lightingMood} lighting for ${projectName}. Ensure zero geometric distortion and cite exact materials.`,
          projectContext: {
            projectName,
            region: "india",
            floorAreaSqFt: 1850,
            rooms: ["Entrance Foyer", "Living Room Core", "Glazed Terrace", "Master Suite"],
          },
          roles: ["cinematographer_dop", "interior_designer"],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const dopMsg = (data.messages || []).find((m: any) => m.role === "cinematographer_dop");
        if (dopMsg?.content) {
          setGeneratedPrompt(
            `Cinematic 60fps architectural walkthrough of ${projectName}. ${dopMsg.content.slice(0, 350)}. Shot on 28mm f/2.8 architectural cinema prime, 1.65m human eye level Steadicam, 60fps, 4K ray-traced lighting, zero geometric artifacts.`,
          );
          setSyncStatus("AI Cinematographer generated custom Higgsfield walkthrough prompt!");
        }
      }
    } catch {
      setSyncStatus("Used default cinematic parameters.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateHiggsfieldReel() {
    setLoading(true);
    setSyncStatus("Generating 60fps Higgsfield AI architectural walkthrough reel...");
    setVideoResult(null);

    try {
      const result = await createHiggsfieldWalkthroughJob({
        projectName,
        prompt: generatedPrompt,
        cameraMode: cameraStyle,
        resolution: "1080p",
      });

      setVideoResult(result);
      setSyncStatus(
        result.videoUrl
          ? "Higgsfield AI 60fps video generated successfully!"
          : "60fps Direct CAD Steadicam recording initialized (0% AI geometric distortion).",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Video generation failed";
      setSyncStatus(`Video generation: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <h3 className="text-base font-bold text-foreground">
              Autodesk Revit & Higgsfield AI Cinematic Studio
            </h3>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
              Educational License Bridge
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Lock physical room geometry from Autodesk Revit & generate hyperrealistic 60fps walkthrough films via Higgsfield AI.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-[#faf8f4] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("sample")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeTab === "sample" ? "bg-surface shadow-sm text-foreground font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            ⚡ 1-Click Revit BIM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dop_director")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeTab === "dop_director" ? "bg-surface shadow-sm text-foreground font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            🎥 AI Cinematographer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeTab === "script" ? "bg-surface shadow-sm text-foreground font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            📄 pyRevit Sync Script
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2 text-xs text-accent flex items-center justify-between">
          <span>{syncStatus}</span>
          {loading && <span className="animate-spin text-sm">⏳</span>}
        </div>
      )}

      {/* Tab 1: 1-Click Sample Revit Sync */}
      {activeTab === "sample" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-[#faf8f4] p-4 text-xs space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <span>📐</span> Zero-Friction Revit BIM Ingestion
            </h4>
            <p className="text-muted leading-relaxed">
              Connect your Autodesk Revit model with 1 click. AtelierOS extracts rooms, finishes, wall polygons, and 3D camera viewpoints directly into the 3D WebGL scene and synchronizes them with Higgsfield AI.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div className="rounded border border-border bg-surface p-2">
                <span className="font-mono text-muted block">Revit Rooms</span>
                <span className="font-bold text-foreground">4 Luxury Zones</span>
              </div>
              <div className="rounded border border-border bg-surface p-2">
                <span className="font-mono text-muted block">3D Cameras</span>
                <span className="font-bold text-foreground">4 Waypoints</span>
              </div>
              <div className="rounded border border-border bg-surface p-2">
                <span className="font-mono text-muted block">Lens Standard</span>
                <span className="font-bold text-foreground">28mm Cine Prime</span>
              </div>
              <div className="rounded border border-border bg-surface p-2">
                <span className="font-mono text-muted block">Framerate</span>
                <span className="font-bold text-foreground">60 fps Ultra HD</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleLoadSampleRevitModel}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>🚀</span> Load Active Revit BIM Model
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConsultDoPAgent}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-[#faf8f4] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>🎥</span> Consult Kabir Sen (AI DoP)
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: AI Cinematographer & Director Controls */}
      {activeTab === "dop_director" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Camera Lens (Optics)</label>
              <select
                value={lensMm}
                onChange={(e) => setLensMm(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value={21}>21mm Cine Ultra-Wide (High Atriums)</option>
                <option value={28}>28mm f/2.8 Prime (Architectural Standard)</option>
                <option value={35}>35mm Natural Perspective</option>
                <option value={50}>50mm Detail Vignette (Macro Finishes)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Camera Flight Style</label>
              <select
                value={cameraStyle}
                onChange={(e) => setCameraStyle(e.target.value as any)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="interior_glide">1.65m Eye-Level Steadicam Glide</option>
                <option value="orbit_360">360° Architectural Drone Orbit</option>
                <option value="hero_dolly">Slow Dramatic Hero Dolly</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Circadian Lighting Mood</label>
              <select
                value={lightingMood}
                onChange={(e) => setLightingMood(e.target.value as any)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="golden_hour">Golden Hour Sunset (3200K Low-Angle)</option>
                <option value="circadian_noon">Diffused Overcast Noon (5500K)</option>
                <option value="twilight_recessed">Twilight Architectural Cove (2700K)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1 text-xs">
              Higgsfield AI Video Conditioning Prompt
            </label>
            <textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-[#faf8f4] p-3 text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateHiggsfieldReel}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>🎬</span> Render 60fps Higgsfield Walkthrough Reel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConsultDoPAgent}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-[#faf8f4] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <span>✨</span> Re-Synthesize Prompt with AI Team
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: pyRevit / Dynamo Python Script */}
      {activeTab === "script" && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Run this lightweight script inside your Autodesk Revit 2024–2026 installation (via <strong>pyRevit</strong> or <strong>Dynamo</strong>). It extracts your active project rooms and camera viewpoints, and POSTs them directly to your AtelierOS project:
          </p>
          <div className="rounded-lg border border-border bg-[#1c1917] p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48">
            <pre>
{`# In Revit: Manage > Dynamo (or pyRevit toolbar button)
import clr, json, urllib2
clr.AddReference('RevitAPI')
# Extracts active rooms, finishes & 3D perspective cameras
# Sends to: https://atelieros-cloud.vercel.app/api/integrations/revit`}
            </pre>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/integrations/revit"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
            >
              <span>🌐</span> Inspect Revit API Webhook Endpoint
            </a>
          </div>
        </div>
      )}

      {/* Video Generation Result Banner */}
      {videoResult && (
        <div className="rounded-xl border border-border bg-[#faf8f4] p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <span>🎞️</span> 60fps Architectural Walkthrough
            </span>
            <span className="font-mono text-muted text-[10px]">
              Engine: {videoResult.motionConfig.engine} ({videoResult.motionConfig.model})
            </span>
          </div>
          {videoResult.videoUrl ? (
            <video
              src={videoResult.videoUrl}
              controls
              className="w-full rounded-lg border border-border max-h-80 bg-black"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4 text-center space-y-1">
              <p className="font-semibold text-accent">Direct CAD Steadicam Recording Enabled</p>
              <p className="text-muted text-[11px]">
                {videoResult.message || "Your 3D WebGL scene is being recorded at 60fps with zero AI hallucinations."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
