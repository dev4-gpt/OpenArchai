"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CadUploadForm } from "./cad-upload-form";
import { ConstructionModelStatus } from "./construction-model-status";
import type { UnitSystem } from "@/lib/units";

type Point = [number, number];
type ConstructionModelRow = {
  id: string;
  status: string;
  detected_layers: string[] | null;
  elements: {
    walls: { start: Point; end: Point }[];
    doors: { position: Point; width_m: number | null }[];
    windows: { position: Point; width_m: number | null }[];
    floor_bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  } | null;
  error_message: string | null;
  upload_storage_path: string;
  review_status: string;
  ifc_storage_path: string | null;
};

// The Realtime payload only carries construction_models' own columns, not
// the joined upload_storage_path -- merge onto the existing row rather than
// replacing it outright, or that field silently disappears on the first
// live update.
function upsert(rows: ConstructionModelRow[], row: Partial<ConstructionModelRow> & { id: string }): ConstructionModelRow[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return rows; // a genuinely new row needs upload_storage_path we don't have -- ignore until next full fetch
  const next = rows.slice();
  next[idx] = { ...next[idx], ...row };
  return next;
}

export function ConstructionModelsList({
  projectId,
  initialModels,
  unitSystem,
}: {
  projectId: string;
  initialModels: ConstructionModelRow[];
  unitSystem: UnitSystem;
}) {
  const [models, setModels] = useState(initialModels);
  // Same fix as realtime-status.tsx: unique channel per mount avoids React
  // Strict Mode's dev double-invoke racing a close against the resubscribe.
  const channelId = useRef(crypto.randomUUID());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Same auth-race fix as realtime-status.tsx: the Realtime socket's JWT
    // sync happens asynchronously after sign-in, so subscribing before it
    // lands makes RLS silently evaluate every change as unauthenticated.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;
      supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`project-${projectId}-construction-${channelId.current}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "construction_models",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            setModels((prev) => upsert(prev, payload.new as unknown as Partial<ConstructionModelRow> & { id: string }));
          },
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("Construction models Realtime subscription failed:", status, err);
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [projectId]);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted">Construction-accurate (CAD)</h2>
      <div className="rounded-lg border border-border bg-surface p-4">
        <CadUploadForm projectId={projectId} />
      </div>
      {models.length > 0 && (
        <ul className="space-y-2">
          {models.map((model) => (
            <li key={model.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <ConstructionModelStatus
                constructionModelId={model.id}
                projectId={projectId}
                uploadStoragePath={model.upload_storage_path}
                status={model.status}
                detectedLayers={model.detected_layers}
                elements={model.elements}
                errorMessage={model.error_message}
                unitSystem={unitSystem}
                reviewStatus={model.review_status}
                ifcStoragePath={model.ifc_storage_path}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
