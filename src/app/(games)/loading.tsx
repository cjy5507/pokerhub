export default function Loading() {
  return (
    <div className="min-h-screen bg-op-bg pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-op-border bg-op-surface">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 bg-op-elevated rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-24 bg-op-elevated rounded animate-pulse" />
              <div className="h-4 w-36 bg-op-elevated rounded animate-pulse" />
            </div>
          </div>
          <div className="h-14 bg-op-elevated rounded-xl animate-pulse border border-op-border" />
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="h-80 bg-op-surface rounded-2xl animate-pulse border border-op-border" />
        <div className="h-48 bg-op-surface rounded-2xl animate-pulse border border-op-border" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-op-surface rounded-lg animate-pulse border border-op-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
