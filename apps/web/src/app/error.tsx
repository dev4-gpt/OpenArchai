"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AtelierOS] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md px-6">
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-accent" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted text-sm mb-1">
          AtelierOS encountered an unexpected error.
        </p>
        {error.digest && (
          <p className="text-muted text-xs mb-6 font-mono bg-surface border border-border rounded px-2 py-1 inline-block">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
