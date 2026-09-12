"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getModelSignedUrl, getRenderSignedUrl } from "./model-actions";
import { retryReconstruction, retryRender } from "./actions";
import { ModelViewer } from "@/components/model-viewer";
import { StylePickerForm } from "./style-picker-form";
import { RetryButton } from "@/components/ui/retry-button";

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
  pending: "text-muted",
  processing: "text-accent",
  done: "text-success",
  error: "text-danger",
};

function upsert<T extends { id: string }>(rows: T[], row: T): T[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  const next = rows.slice();
  next[idx] = row;
  return next;
}

import type { UnitSystem } from "@/lib/units";

function DoneModelViewer({ gltfStoragePath, unitSystem }: { gltfStoragePath: string; unitSystem?: UnitSystem }) {
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

  if (error) return <p className="mt-2 text-xs text-danger">{error}</p>;
  if (!url) return <p className="mt-2 text-xs text-muted">Loading 3D model…</p>;
  return (
    <div className="mt-2 space-y-1.5">
      <ModelViewer url={url} unitSystem={unitSystem} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-medium text-accent underline underline-offset-2"
      >
        Open model (.glb)
      </a>
    </div>
  );
}

function DoneRenderImage({ imageStoragePath }: { imageStoragePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRenderSignedUrl(imageStoragePath)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load render");
      });
    return () => {
      cancelled = true;
    };
  }, [imageStoragePath]);

  if (error) return <p className="text-xs text-danger">{error}</p>;
  if (!url) return <p className="text-xs text-muted">Loading render…</p>;
  return (
    <div className="mt-1 space-y-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL expires in 60s, not worth next/image's caching */}
      <img src={url} alt="Styled render" className="max-h-64 rounded-md border border-border" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-medium text-accent underline underline-offset-2"
      >
        Open image
      </a>
    </div>
  );
}

export function RealtimeStatus({
  projectId,
  initialModels,
  initialRenders,
  unitSystem = "metric",
}: {
  projectId: string;
  initialModels: ModelRow[];
  initialRenders: RenderRow[];
  unitSystem?: UnitSystem;
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
      <h2 className="text-sm font-medium text-muted">3D Models</h2>
      <ul className="space-y-3">
        {models.map((model) => {
          const modelRenders = renders.filter((r) => r.model_id === model.id);
          const hasActiveRender = modelRenders.some((r) => r.status === "pending" || r.status === "processing");

          return (
            <li key={model.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Model {model.id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <span className={STATUS_STYLES[model.status]}>{model.status}</span>
                  {model.status === "error" && (
                    <RetryButton onRetry={() => retryReconstruction(model.id)} />
                  )}
                </div>
              </div>
              {model.status === "error" && model.error_message && (
                <p className="mt-1 text-xs text-danger">{model.error_message}</p>
              )}
              {model.status === "done" && model.gltf_storage_path && (
                <DoneModelViewer gltfStoragePath={model.gltf_storage_path} unitSystem={unitSystem} />
              )}

              {modelRenders.length > 0 && (
                <ul className="mt-2 space-y-2 border-l border-border pl-3">
                  {modelRenders.map((render) => (
                    <li key={render.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">{render.prompt_style ?? "render"}</span>
                        <div className="flex items-center gap-2">
                          <span className={STATUS_STYLES[render.status]}>{render.status}</span>
                          {render.status === "error" && (
                            <RetryButton onRetry={() => retryRender(render.id)} />
                          )}
                        </div>
                      </div>
                      {render.status === "error" && render.error_message && (
                        <p className="mt-1 text-danger">{render.error_message}</p>
                      )}
                      {render.status === "done" && render.image_storage_path && (
                        <DoneRenderImage imageStoragePath={render.image_storage_path} />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {model.status === "done" && model.gltf_storage_path && (
                <StylePickerForm modelId={model.id} projectId={projectId} disabled={hasActiveRender} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
