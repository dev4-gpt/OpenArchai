"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AtelierOS] Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-lg px-6">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 rounded-sm bg-danger/10 border border-danger/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-danger" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">Dashboard failed to load</h2>
        <p className="text-muted text-sm mb-6">
          There was a problem loading your projects. This may be a temporary network issue.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-muted/60">Ref: {error.digest}</span>
          )}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
