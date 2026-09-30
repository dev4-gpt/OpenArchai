import Link from "next/link";

export const metadata = {
  title: "Not Found | AtelierOS",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md px-6">
        {/* Blueprint grid decoration */}
        <div className="mb-8 relative mx-auto w-32 h-32">
          <svg viewBox="0 0 128 128" className="w-full h-full opacity-10" fill="none">
            {/* Grid lines */}
            {[16, 32, 48, 64, 80, 96, 112].map((v) => (
              <g key={v}>
                <line x1={v} y1={0} x2={v} y2={128} stroke="currentColor" strokeWidth={0.5} />
                <line x1={0} y1={v} x2={128} y2={v} stroke="currentColor" strokeWidth={0.5} />
              </g>
            ))}
            {/* Floor plan outline */}
            <rect x={20} y={20} width={88} height={88} stroke="currentColor" strokeWidth={2} />
            <line x1={64} y1={20} x2={64} y2={108} stroke="currentColor" strokeWidth={1} />
            <line x1={20} y1={64} x2={108} y2={64} stroke="currentColor" strokeWidth={1} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-accent/40 font-mono">404</span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-muted text-sm mb-8">
          This plan doesn&apos;t exist or may have been deleted. Let&apos;s get you back to your workspace.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 text-sm rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
