import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <Skeleton className="h-8 w-48" /> {/* Title Skeleton */}
      <div className="space-y-6 w-full">
        {/* Vesting Status Skeleton */}
        <div className="p-4 border rounded-md space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Owner Actions Skeleton */}
        <div className="p-4 border rounded-md space-y-4">
          <Skeleton className="h-6 w-1/4 mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />

          {/* Whitelist Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-16" />
            </div>
          </div>

          {/* Create Schedule Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3 mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full sm:col-span-2" />
            </div>
            <Skeleton className="h-10 w-32 mt-2" />
          </div>

          {/* Revoke Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
