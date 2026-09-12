"use client";

import { useState } from "react";

export function RetryButton({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      await onRetry();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-medium text-accent underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </span>
  );
}
