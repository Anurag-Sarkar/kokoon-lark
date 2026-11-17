import { Loading, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function TaskLoading() {
  return (
    <Loading label="Loading task">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="grid gap-5 min-w-0">
          <div className="card p-5 sm:p-6">
            <div className="flex gap-2 mb-3"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-7 w-1/2 mt-2" />
            <div className="mt-4 grid gap-2"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-5/6" /><Skeleton className="h-3.5 w-2/3" /></div>
          </div>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
        <div className="grid gap-4">
          <div className="card p-4">
            <Skeleton className="h-3 w-16 mb-3" />
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line p-1">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded-lg" />)}</div>
          </div>
          <div className="card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-40 mt-3" />
            <Skeleton className="h-3 w-24 mt-2" />
            <Skeleton className="h-9 w-full mt-4 rounded-[10px]" />
          </div>
          <div className="card p-4">
            <Skeleton className="h-3 w-16 mb-3" />
            <div className="grid gap-2">{[0, 1].map((i) => <div key={i} className="flex items-center gap-2.5"><Skeleton className="size-6 rounded-full" /><Skeleton className="h-4 w-32" /></div>)}</div>
          </div>
          <SkeletonCard lines={5} />
        </div>
      </div>
    </Loading>
  );
}
