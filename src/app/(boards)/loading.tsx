export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20 lg:pb-0">
      {/* Board header */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-40 bg-op-elevated rounded animate-pulse" />
        <div className="h-4 w-64 bg-op-elevated rounded animate-pulse" />
      </div>

      {/* Controls bar */}
      <div className="mb-4 flex gap-3">
        <div className="h-9 w-64 bg-op-elevated rounded-lg animate-pulse" />
        <div className="flex-1" />
        <div className="h-9 w-32 bg-op-elevated rounded-lg animate-pulse" />
        <div className="h-9 w-20 bg-op-elevated rounded-lg animate-pulse" />
      </div>

      {/* Post list */}
      <div className="bg-op-surface rounded-lg overflow-hidden border border-op-border">
        <div className="hidden lg:flex h-11 px-4 items-center gap-4 border-b border-op-border bg-op-elevated animate-pulse" />
        <div className="flex flex-col gap-3 p-3 lg:gap-0 lg:p-0 lg:divide-y lg:divide-op-border">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-14 lg:h-12 bg-op-surface animate-pulse lg:border-0 rounded-lg lg:rounded-none"
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-9 bg-op-elevated rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
