import { Loading, Skeleton, SkeletonCard, SkeletonHeader, SkeletonRows, SkeletonTiles } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <Loading label="Loading dashboard">
      <SkeletonHeader />
      <div className="grid gap-6">
        <div className="card p-5 sm:p-6 flex flex-col sm:flex-row gap-6 sm:items-center">
          <Skeleton className="size-[140px] rounded-full shrink-0" />
          <div className="flex-1 grid gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full max-w-md" /><Skeleton className="h-4 w-2/3" /></div>
        </div>
        <SkeletonTiles />
        <div className="grid lg:grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
        <SkeletonRows n={4} />
        <div>
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card p-3.5"><Skeleton className="size-8 rounded-full" /><Skeleton className="h-4 w-20 mt-3" /><Skeleton className="h-3 w-24 mt-2" /></div>)}</div>
        </div>
      </div>
    </Loading>
  );
}
