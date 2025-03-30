'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import CreateTokenVestingTab from './create-token-vesting-tab';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';

import React, { useEffect, useState } from 'react'
import { isAddressEqual } from 'viem';
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { notFound } from 'next/navigation';
import ActBeneficiaryTab from './act-beneficiary-tab';
import ActTokenTab from './act-token-tab';

export default function TokenVestingOwnerTabs() {
    const [isLoading, setIsLoading] = useState(true);
    const config = useConfig();

    const account = useAccount({
        config
    });

    const { data: ownerData, refetch: refetchOwner, isLoading: isOwnerLoading } = useReadContract({
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'owner',
        args: [],
        query: {
            enabled: true
        }
    });

    useEffect(() => {
        if (account.isConnected && refetchOwner) {
            refetchOwner();
        }
    }, [account.isConnected, refetchOwner]);

    useEffect(() => {
        const checkOwnership = async () => {
            if (!isOwnerLoading && account.isConnected) {
                setIsLoading(false);
            }
        };
        checkOwnership();
    }, [account.isConnected, account.status, isOwnerLoading, ownerData]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!account.isConnected || !ownerData || !account.address || !isAddressEqual(account.address, ownerData as `0x${string}`)) {
        console.log("Not owner:", ownerData, account.address);
        return <div>Loading...</div>;
    }

    return (
        <Tabs defaultValue="create" className="w-auto">
            <TabsList className="grid grid-cols-5 ">
                <TabsTrigger value="create">Create Token Vesting</TabsTrigger>
                <TabsTrigger value="beneficiary">Beneficiary</TabsTrigger>
                <TabsTrigger value='token'>Token</TabsTrigger>
            </TabsList>
            <TabsContent value="create">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <p className="self-center text-xl font-bold">Create Token Vesting</p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-3'>
                        <CreateTokenVestingTab />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="beneficiary">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <p className="self-center text-xl font-bold">Add/Remove Beneficiary</p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-3'>
                        <ActBeneficiaryTab />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="token">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <p className="self-center text-xl font-bold">Add/Remove Token</p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-3'>
                        <ActTokenTab />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
