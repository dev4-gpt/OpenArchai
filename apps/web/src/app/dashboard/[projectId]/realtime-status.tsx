"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`project-${projectId}-status`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
