/* Grey placeholder blocks shown while a page's data loads (each route's loading.tsx composes these). */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line ${className}`} aria-hidden />;
}

export function SkeletonHeader({ back = false, action = true }: { back?: boolean; action?: boolean }) {
  return (
    <div className="mb-6">
      {back && <Skeleton className="h-4 w-24 mb-4" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full mt-2" />
        </div>
        {action && <Skeleton className="h-9 w-28 rounded-[10px]" />}
      </div>
    </div>
  );
}

export function SkeletonTiles({ n = 5 }: { n?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${n >= 6 ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-5"}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12 mt-2" />
          <Skeleton className="h-3 w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ n = 5, title = true }: { n?: number; title?: boolean }) {
  return (
    <div>
      {title && <Skeleton className="h-4 w-32 mb-2" />}
      <div className="card overflow-hidden">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 border-t border-line first:border-t-0">
            <Skeleton className="size-2.5 rounded-full" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4" />
              <Skeleton className="h-3 w-48 max-w-full mt-1.5" />
            </div>
            <Skeleton className="hidden sm:block h-5 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56 max-w-full mt-2" />
      <div className="mt-4 grid gap-2.5">
        {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-3.5 ${i % 3 === 2 ? "w-2/3" : i % 2 ? "w-5/6" : "w-full"}`} />)}
      </div>
    </div>
  );
}

/** Wraps a skeleton so screen readers hear "Loading" once and the blocks fade in. */
export function Loading({ children, label = "Loading" }: { children: React.ReactNode; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="fade-up">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Generic page: header, stat tiles, two cards and a list. The fallback for every route without its own loading.tsx. */
export function PageSkeleton() {
  return (
    <Loading>
      <SkeletonHeader />
      <div className="grid gap-6">
        <SkeletonTiles />
        <div className="grid lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
        <SkeletonRows n={5} />
      </div>
    </Loading>
  );
}
