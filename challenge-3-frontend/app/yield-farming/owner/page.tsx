import BackButton from '@/components/back-button'
import YieldFarmingOwnerTabs from '@/components/yield-farming/yield-farming-owner-tabs'
import React from 'react'


export default function YieldFarmingOwnerPage() {
    return (<div className='flex flex-col justify-center min-h-screen w-full gap-8 sm:p-20 sm:pt-2 font-[family-name:var(--font-geist-sans)]'>
        <div className="flex items-center w-full">
            <BackButton />
        </div>
        <YieldFarmingOwnerTabs />
    </div>)
}
