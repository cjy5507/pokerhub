export default function Loading() {
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Profile header banner */}
      <div className="h-32 sm:h-44 bg-op-elevated animate-pulse" />

      {/* Avatar + info strip */}
      <div className="bg-op-surface border-b border-op-border px-4 pb-4">
        <div className="max-w-[1560px] mx-auto relative">
          <div className="flex items-end gap-4 -mt-10 sm:-mt-14">
            <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-op-elevated border-4 border-op-surface animate-pulse flex-shrink-0" />
            <div className="pb-2 space-y-2 flex-1">
              <div className="h-6 w-36 bg-op-elevated rounded animate-pulse" />
              <div className="h-4 w-48 bg-op-elevated rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1560px] mx-auto px-3 sm:px-4 py-3 sm:py-8 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-op-surface rounded-lg animate-pulse border border-op-border" />
          ))}
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-op-elevated rounded-full animate-pulse" />
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-2 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-op-surface rounded-lg animate-pulse border border-op-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
