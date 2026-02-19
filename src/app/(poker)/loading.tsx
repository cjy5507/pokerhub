export default function Loading() {
  return (
    <div className="min-h-screen bg-op-bg">
      {/* Sticky header */}
      <div className="bg-op-surface border-b border-op-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-36 bg-op-elevated rounded animate-pulse" />
            <div className="h-9 w-20 bg-op-elevated rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Hand cards grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <div className="h-5 w-28 bg-op-elevated rounded animate-pulse mb-4" />
        <div className="grid lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-op-surface rounded-xl animate-pulse border border-op-border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
