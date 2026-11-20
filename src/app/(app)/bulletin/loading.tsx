import { Loading, Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/Skeleton";

export default function BulletinLoading() {
  return (
    <Loading label="Loading the bulletin board">
      <SkeletonHeader />
      <Skeleton className="h-4 w-28 mb-3" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} lines={3} />)}
      </div>
    </Loading>
  );
}
