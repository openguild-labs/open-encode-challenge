'use client';
import { contractAddresses } from '@/lib/contractAddresses';
import { yieldFarmingAbi } from '@/lib/yieldFarmingAbi';
import { useAtomValue } from 'jotai';
import React from 'react'
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { addressAtom } from '../sigpasskit';
import { localConfig } from '@/app/providers';
import { Button } from '../ui/button';
import { isAddressEqual } from 'viem';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function YieldFarmingTitle() {

    const router = useRouter();

    const config = useConfig();

    const account = useAccount();

    const address = useAtomValue(addressAtom);

    const { data: ownerData, refetch: refetchOwner } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.YIELD_FARMING as `0x${string}`,
        abi: yieldFarmingAbi,
        functionName: 'owner',
        args: [],
        query: {
            enabled: account.isConnected
        }
    });

    return (
        <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
            <p className="self-center text-xl font-bold">Yield Farming Dashboard</p>
            <Button
                asChild={account.isConnected
                    && ownerData as any
                    && isAddressEqual(account.address!!, ownerData as `0x${string}`)
                }
                disabled={
                    !(account.isConnected
                        && ownerData as any
                        && isAddressEqual(account.address!!, ownerData as `0x${string}`))
                }
            >
                <Link
                    href={"/yield-farming/owner"}
                    onClick={(e) => {
                        e.preventDefault();
                        router.push("/yield-farming/owner");
                    }}
                >
                    Owner Actions
                </Link>
            </Button>
        </div>
    )
}
