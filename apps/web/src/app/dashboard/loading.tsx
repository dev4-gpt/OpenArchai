export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-7 w-40 bg-surface border border-border rounded animate-pulse" />
        <div className="h-9 w-32 bg-surface border border-border rounded-lg animate-pulse" />
      </div>

      {/* Project cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-lg p-5 space-y-3 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-4 w-3/4 bg-border rounded" />
            <div className="h-3 w-1/2 bg-border/60 rounded" />
            <div className="h-px bg-border mt-4" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-16 bg-border/60 rounded" />
              <div className="h-6 w-16 bg-border/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
