export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {/* Animated architecture grid loader */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-2 border-accent/20 rounded-sm" />
          <div className="absolute inset-0 border-t-2 border-accent rounded-sm animate-spin" style={{ animationDuration: "1.2s" }} />
          {/* Blueprint cross-lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-6 bg-accent/30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-6 bg-accent/30" />
          </div>
        </div>
        <p className="text-muted text-sm tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}
