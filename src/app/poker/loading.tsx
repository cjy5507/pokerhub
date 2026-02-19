export default function Loading() {
  return (
    <div className="min-h-screen bg-op-bg pb-20 lg:pb-0">
      {/* Lobby header */}
      <div className="bg-op-surface border-b border-op-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="h-7 w-32 bg-op-elevated rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-op-elevated rounded-lg animate-pulse" />
            <div className="h-9 w-9 bg-op-elevated rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Blind filter tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-16 bg-op-elevated rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-44 bg-op-surface rounded-xl animate-pulse border border-op-border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
