import { Loading, Skeleton, SkeletonHeader } from "@/components/ui/Skeleton";

export default function NewTaskLoading() {
  return (
    <Loading label="Loading form">
      <SkeletonHeader action={false} />
      <div className="card p-5 sm:p-6 max-w-3xl grid gap-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className={`${i === 1 ? "h-24" : "h-10"} w-full rounded-[10px]`} />
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-[10px] justify-self-end" />
      </div>
    </Loading>
  );
}
