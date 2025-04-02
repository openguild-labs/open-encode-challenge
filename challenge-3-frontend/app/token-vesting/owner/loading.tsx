import BackButton from '@/components/back-button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className='flex flex-col items-center justify-items-center min-h-screen gap-8 sm:p-20 sm:pt-2 font-[family-name:var(--font-geist-sans)]'>
            <div className="flex items-center w-full">
                <BackButton />
            </div>

            {/* Skeleton for TokenVestingOwnerTabs */}
            <div className="w-full max-w-4xl">
                {/* Tab headers skeleton */}
                <div className="flex border-b mb-4">
                    <Skeleton className="h-10 w-28 m-2" />
                    <Skeleton className="h-10 w-28 m-2" />
                    <Skeleton className="h-10 w-28 m-2" />
                </div>

                {/* Tab content skeleton */}
                <div className="space-y-6 p-4">
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-40 w-full rounded-md" />
                    <Skeleton className="h-10 w-32 mt-4 rounded-md" />
                </div>
            </div>
        </div>
    )
}