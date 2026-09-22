"use client";

import { useState } from "react";

export function RetryButton({
  onRetry,
  label = "Retry",
  className,
}: {
  onRetry: () => Promise<void>;
  label?: string;
  className?: string;
}) {
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
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          className ??
          "text-xs font-medium text-accent underline underline-offset-2 disabled:opacity-50 hover:text-accent/80 transition-colors"
        }
      >
        {pending ? "Retrying…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </span>
  );
}
