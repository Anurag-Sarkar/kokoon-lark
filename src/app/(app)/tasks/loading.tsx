import { Loading, Skeleton, SkeletonHeader, TasksListSkeleton } from "@/components/ui/Skeleton";

export default function TasksLoading() {
  return (
    <Loading label="Loading tasks">
      <SkeletonHeader />
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Skeleton className="h-9 w-52 rounded-[10px]" />
        <Skeleton className="h-9 w-64 rounded-[10px]" />
        <Skeleton className="h-9 w-28 rounded-[10px]" />
        <Skeleton className="h-9 w-28 rounded-[10px]" />
        <Skeleton className="h-9 w-28 rounded-[10px] ml-auto" />
      </div>
      <TasksListSkeleton />
    </Loading>
  );
}
