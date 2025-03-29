'use client';
import React from 'react'
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TokenVestingDetails from './token-vesting-details';

export default function TokenVestingMenu() {
    const router = useRouter();

    const config = useConfig();

    const account = useAccount();

    const { data: ownerData, refetch: refetchOwner } = useReadContract({
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'owner',
        args: [],
        query: {
            enabled: true
        }
    });

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <p className="self-center text-xl font-bold">Token Vesting Schedule</p>
            <Button
                asChild={account.isConnected && account.address == ownerData}
                disabled={!(account.isConnected && account.address == ownerData)}
            >
                <Link
                    href={"/token-vesting/owner"}
                    onClick={(e) => {
                        e.preventDefault();
                        router.push("/token-vesting/owner");
                    }}
                >
                    Owner Actions
                </Link>
            </Button>
            <TokenVestingDetails />
        </div >
    )
}
