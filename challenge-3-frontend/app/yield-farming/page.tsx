import YieldFarmingDetails from '@/components/yield-farming/yield-farming-details'
import YieldFarmingTabs from '@/components/yield-farming/yield-farming-tabs'
import React from 'react'
import YieldFarmingTitle from '../../components/yield-farming/yield-farming-title';

export default function YieldFarmingPage() {
    return (
        <div className='grid grid-rows-[120px_5fr] items-center justify-items-center min-h-screen p-12 pb-20 gap-8 sm:p-18 font-[family-name:var(--font-geist-sans)]'>
            <YieldFarmingTitle />
            <div className="grid grid-cols-2 gap-8">
                <YieldFarmingDetails />
                <YieldFarmingTabs />
            </div>
        </div>
    )
}
