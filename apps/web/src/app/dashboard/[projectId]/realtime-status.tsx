"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getModelSignedUrl } from "./model-actions";
import { ModelViewer } from "@/components/model-viewer";

type Status = "pending" | "processing" | "done" | "error";

type ModelRow = {
  id: string;
  status: Status;
  gltf_storage_path: string | null;
  error_message: string | null;
  created_at: string;
};

type RenderRow = {
  id: string;
  model_id: string | null;
  status: Status;
  image_storage_path: string | null;
  prompt_style: string | null;
  error_message: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "text-gray-500",
  processing: "text-blue-600",
  done: "text-green-600",
  error: "text-red-600",
};

function upsert<T extends { id: string }>(rows: T[], row: T): T[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  const next = rows.slice();
  next[idx] = row;
  return next;
}

function DoneModelViewer({ gltfStoragePath }: { gltfStoragePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getModelSignedUrl(gltfStoragePath)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load model");
      });
    return () => {
      cancelled = true;
    };
  }, [gltfStoragePath]);

  if (error) return <p className="mt-2 text-xs text-red-500">{error}</p>;
  if (!url) return <p className="mt-2 text-xs text-gray-500">Loading 3D model…</p>;
  return (
    <div className="mt-2">
      <ModelViewer url={url} />
    </div>
  );
}

export function RealtimeStatus({
  projectId,
  initialModels,
  initialRenders,
}: {
  projectId: string;
  initialModels: ModelRow[];
  initialRenders: RenderRow[];
}) {
  const [models, setModels] = useState(initialModels);
  const [renders, setRenders] = useState(initialRenders);
  // Unique per mount so React Strict Mode's dev-only double-invoke
  // (mount -> cleanup -> mount) doesn't reuse the same channel topic —
  // reusing it let the first channel's async close race the second
  // channel's subscribe, silently dropping the server-side postgres_changes
  // registration even though the client reported "SUBSCRIBED".
  const channelId = useRef(crypto.randomUUID());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // The Realtime client authorizes postgres_changes against the session's
    // JWT, but that token is pushed to the Realtime socket asynchronously
    // after sign-in/hydration. Subscribing before it lands makes the
    // channel report SUBSCRIBED while RLS silently evaluates every change
    // as unauthenticated, so no events ever arrive. Waiting for a resolved
    // session first (and passing its token explicitly) avoids the race.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;
      supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`project-${projectId}-status-${channelId.current}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "models", filter: `project_id=eq.${projectId}` },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            setModels((prev) => upsert(prev, payload.new as ModelRow));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "renders", filter: `project_id=eq.${projectId}` },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            setRenders((prev) => upsert(prev, payload.new as RenderRow));
          },
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("Realtime subscription failed:", status, err);
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!models.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">3D Models</h2>
      <ul className="divide-y rounded border">
        {models.map((model) => (
          <li key={model.id} className="px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Model {model.id.slice(0, 8)}</span>
              <span className={STATUS_STYLES[model.status]}>{model.status}</span>
            </div>
            {model.status === "error" && model.error_message && (
              <p className="mt-1 text-xs text-red-500">{model.error_message}</p>
            )}
            {model.status === "done" && model.gltf_storage_path && (
              <DoneModelViewer gltfStoragePath={model.gltf_storage_path} />
            )}
            {renders.filter((r) => r.model_id === model.id).length > 0 && (
              <ul className="mt-2 space-y-1 border-l pl-3">
                {renders
                  .filter((r) => r.model_id === model.id)
                  .map((render) => (
                    <li key={render.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{render.prompt_style ?? "render"}</span>
                      <span className={STATUS_STYLES[render.status]}>{render.status}</span>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
