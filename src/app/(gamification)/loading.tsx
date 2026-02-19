export default function Loading() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 pb-20 lg:pb-0 lg:py-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-20 bg-op-elevated rounded animate-pulse" />
        <div className="h-4 w-48 bg-op-elevated rounded animate-pulse" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-16 bg-op-elevated rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Ranking rows */}
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-lg border border-op-border bg-op-surface animate-pulse"
          >
            <div className="h-8 w-10 bg-op-elevated rounded flex-shrink-0" />
            <div className="h-10 w-10 rounded-full bg-op-elevated flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-24 bg-op-elevated rounded" />
              <div className="h-3 w-12 bg-op-elevated rounded" />
            </div>
            <div className="h-5 w-20 bg-op-elevated rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
