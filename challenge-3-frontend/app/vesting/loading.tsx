import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <Skeleton className="w-[40px] h-[40px] rounded-md" />
      <div className="flex flex-col md:flex-row gap-2">
        <Skeleton className="w-[100px] h-[40px] rounded-md" />
        <Skeleton className="w-[100px] h-[40px] rounded-md" />
        <Skeleton className="w-[100px] h-[40px] rounded-md" />
        <Skeleton className="w-[100px] h-[40px] rounded-md" />
      </div>
      <Skeleton className="w-full h-[300px] rounded-md" />
    </div>
  )
}