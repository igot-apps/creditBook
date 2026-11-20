// Lightweight skeleton placeholders. Shimmer + reduced-motion handling live in index.css (.skeleton).

export const Skeleton = ({ className = "" }) => <div aria-hidden="true" className={`skeleton ${className}`} />;

const Loading = ({ label, children, className = "" }) => (
  <div role="status" aria-busy="true" aria-label={label} className={className}>
    {children}
    <span className="sr-only">{label}</span>
  </div>
);

/** Rows shaped like contact / transaction cards. */
export const SkeletonList = ({ rows = 5, label = "Loading list" }) => (
  <Loading label={label} className="space-y-3">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </Loading>
);

/** A grid of stat tiles (dashboard / reports). */
export const SkeletonStats = ({ count = 3, label = "Loading summary" }) => (
  <Loading label={label} className={`grid gap-3 ${count >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <Skeleton className="h-2.5 w-3/4" />
        <Skeleton className="h-5 w-full" />
      </div>
    ))}
  </Loading>
);

/** Shaped like the balance summary at the top of a customer / supplier profile. */
export const SkeletonBalance = () => (
  <Loading label="Loading balance" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <Skeleton className="h-3 w-1/3" />
    <div className="grid grid-cols-2 gap-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
    <div className="flex justify-between pt-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-7 w-1/3" /></div>
  </Loading>
);
