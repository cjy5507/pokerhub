export default function Loading() {
  return (
    <div className="mx-auto max-w-[600px] px-4 py-6 space-y-6">
      {/* Header */}
      <div className="h-8 w-24 bg-op-elevated rounded animate-pulse" />

      {/* Thread cards */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-op-surface rounded-xl border border-op-border p-4 space-y-3 animate-pulse"
        >
          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-op-elevated flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-28 bg-op-elevated rounded" />
              <div className="h-3 w-16 bg-op-elevated rounded" />
            </div>
          </div>
          {/* Content */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-op-elevated rounded" />
            <div className="h-4 w-3/4 bg-op-elevated rounded" />
          </div>
          {/* Action bar */}
          <div className="flex gap-4 pt-1">
            <div className="h-4 w-12 bg-op-elevated rounded" />
            <div className="h-4 w-12 bg-op-elevated rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
