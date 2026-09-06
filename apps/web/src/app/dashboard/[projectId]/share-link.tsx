"use client";

import { useEffect, useState } from "react";
import { generateShareLink, revokeShareLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareLink({
  projectId,
  initialShareToken,
}: {
  projectId: string;
  initialShareToken: string | null;
}) {
  const [token, setToken] = useState(initialShareToken);
  const [origin, setOrigin] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // window.location.origin genuinely can't be known during SSR -- reading
    // it in an initializer instead of an effect would make the server-
    // rendered HTML and the client's first hydrated render disagree on the
    // input's value. A one-render-late correction here is the correct
    // tradeoff, not the "mirroring external state" anti-pattern this rule
    // usually catches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const url = token ? `${origin}/share/${token}` : null;

  async function handleGenerate() {
    setPending(true);
    setError(null);
    try {
      const newToken = await generateShareLink(projectId);
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revoke this share link? The current link will stop working immediately.")) return;
    setPending(true);
    setError(null);
    try {
      await revokeShareLink(projectId);
      setToken(null);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke link");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium">Share with client</p>
      <p className="text-xs text-muted">
        Anyone with this link can view the completed model and renders — no account needed.
      </p>
      {token ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input readOnly value={url || "Loading…"} className="text-xs" />
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button type="button" variant="danger" size="sm" onClick={handleRevoke} disabled={pending}>
            {pending ? "Revoking…" : "Revoke link"}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="primary" size="sm" onClick={handleGenerate} disabled={pending}>
          {pending ? "Generating…" : "Generate share link"}
        </Button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
