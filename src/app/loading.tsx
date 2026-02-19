export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Notice banner */}
      <div className="h-10 bg-op-surface rounded-lg animate-pulse border border-op-border" />

      {/* News hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 h-36 bg-op-surface rounded-lg animate-pulse border border-op-border" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-op-surface rounded-lg animate-pulse border border-op-border" />
          ))}
        </div>
      </div>

      {/* Two post columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, col) => (
          <div key={col} className="space-y-2">
            <div className="h-6 w-28 bg-op-elevated rounded animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-op-surface rounded-lg animate-pulse border border-op-border" />
            ))}
          </div>
        ))}
      </div>

      {/* Hot posts section */}
      <div className="space-y-2">
        <div className="h-6 w-24 bg-op-elevated rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-op-surface rounded-lg animate-pulse border border-op-border" />
        ))}
      </div>
    </div>
  );
}
