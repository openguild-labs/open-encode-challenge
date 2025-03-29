'use client';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { VestingSchedule } from '@/types/token-vesting';
import React, { useEffect } from 'react'
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from 'react-day-picker';

export default function TokenVestingDetails() {

    const config = useConfig();

    const account = useAccount();

    const { data: vestingSchedulesData, refetch: vestingSchedulesRefetch } = useReadContract({
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
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

    console.log(vestingSchedulesData as VestingSchedule);

    if (!account.isConnected || !vestingSchedulesData || !(vestingSchedulesData as VestingSchedule).startTime) {
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
                        {(vestingSchedulesData as VestingSchedule).startTime
                            ? new Date(Number((vestingSchedulesData as VestingSchedule).startTime) * 1000).toLocaleString()
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
