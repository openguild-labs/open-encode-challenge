import BackButton from '@/components/back-button'
import TokenVestingOwnerTabs from '@/components/token-vesting/token-vesting-owner-tabs';


export default function TokenVestingOwnerPage() {
    return (
        <div className='flex flex-col items-center justify-items-center min-h-screen gap-8 sm:p-20 sm:pt-2 font-[family-name:var(--font-geist-sans)]'>
            <div className="flex items-center w-full">
                <BackButton />
            </div>
            <TokenVestingOwnerTabs />
        </div>
    )
}
