import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function TokenVestingLoading() {
    return (
        <div className='grid grid-rows-[1fr_5fr_5px] items-center justify-items-center min-h-screen p-12 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
            {/* Skeleton for the TokenVestingMenu */}
            <div className="w-full max-w-3xl space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-10 w-1/3" />
                </div>
            </div>

            {/* Skeleton for the main content area */}
            <div className="w-full max-w-3xl space-y-6">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                </div>
                <div className="flex gap-4 pt-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    )
}