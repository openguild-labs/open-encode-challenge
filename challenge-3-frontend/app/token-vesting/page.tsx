import TokenVestingMenu from '@/components/token-vesting/token-vesting-menu'
import React from 'react'

export default function TokenVestingPage() {
    return (
        <div className='grid grid-rows-[1fr_5fr_5px] items-center justify-items-center min-h-screen p-12 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
            <TokenVestingMenu />
        </div>
    )
}
