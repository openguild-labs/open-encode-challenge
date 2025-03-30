'use client';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { VestingSchedule } from '@/types/token-vesting';
import React, { useEffect } from 'react'
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { Button } from '@/components/ui/button';
import { localConfig } from '@/app/providers';
import { useAtomValue } from 'jotai';
import { addressAtom } from '../sigpasskit';
import { Address } from 'viem';

export default function TokenVestingDetails() {

    const config = useConfig();

    const account = useAccount();

    // get the address from session storage
    const address = useAtomValue(addressAtom);

    const { data: vestingSchedulesData, refetch: vestingSchedulesRefetch } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as Address,
        abi: tokenVestingAbi,
        functionName: 'vestingSchedules',
        args: [account.address],
        query: {
            enabled: account.isConnected
        }
    });

    useEffect(() => {
        if (account.isConnected) {
            vestingSchedulesRefetch();
        }
    }, [account.isConnected, vestingSchedulesRefetch]);

    if (!account.isConnected || !vestingSchedulesData) {
        return (
            <div className="text-center py-10">
                <p className="text-lg font-medium">No vesting schedule found</p>
                {account.isConnected ? (
                    <p className="text-sm text-gray-500 mt-1">You don't have any vesting schedules</p>
                ) : (
                    <p className="text-sm text-gray-500 mt-1">Connect your wallet to view your vesting details</p>
                )}
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <h3 className="text-lg font-semibold text-center">Your Vesting Schedule</h3>
            <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Start Time</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as any)?.[0] as number
                            ? new Date(Number((vestingSchedulesData as any)?.[0] as number) * 1000).toLocaleString()
                            : 'Not set'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Cliff Duration</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).cliffDuration
                            ? `${Number((vestingSchedulesData as VestingSchedule).cliffDuration)} seconds`
                            : 'Not set'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Vesting Duration</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).vestingDuration
                            ? `${Number((vestingSchedulesData as VestingSchedule).vestingDuration)} seconds`
                            : 'Not set'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Total Amount</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).totalAmount
                            ? `${Number((vestingSchedulesData as VestingSchedule).totalAmount)} tokens`
                            : 'Not set'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Claimed Amount</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).claimed
                            ? `${Number((vestingSchedulesData as VestingSchedule).claimed)} tokens`
                            : '0 tokens'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Revoked Time</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).revokedTime && Number((vestingSchedulesData as VestingSchedule).revokedTime) > 0
                            ? new Date(Number((vestingSchedulesData as VestingSchedule).revokedTime) * 1000).toLocaleString()
                            : 'Not revoked'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Revoked Amount</span>
                    <span className="font-medium">
                        {(vestingSchedulesData as VestingSchedule).revokedAmount && Number((vestingSchedulesData as VestingSchedule).revokedAmount) > 0
                            ? `${Number((vestingSchedulesData as VestingSchedule).revokedAmount)} tokens`
                            : 'None'}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Token Address</span>
                    <span className="font-medium text-xs break-all">
                        {(vestingSchedulesData as VestingSchedule).token || 'Not set'}
                    </span>
                </div>
            </div>
            <Button>Claim Vested Tokens</Button>
        </div>
    )
}
