'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import CreateTokenVestingTab from './owner-tabs/create-token-vesting-tab';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';

import React, { useEffect, useState } from 'react'
import { isAddressEqual } from 'viem';
import { useAccount, useConfig, useReadContract } from 'wagmi';
import { notFound } from 'next/navigation';
import ActBeneficiaryTab from './owner-tabs/act-beneficiary-tab';
import ActTokenTab from './owner-tabs/act-token-tab';

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

    // if (isLoading) {
    //     return <div>Loading...</div>;
    // }

    // if (!account.isConnected || !ownerData || !account.address || !isAddressEqual(account.address, ownerData as `0x${string}`)) {
    //     console.log("Not owner:", ownerData, account.address);
    //     return <div>Loading...</div>;
    // }

    return (
        <Tabs defaultValue="create" className="w-auto space-y-4">
            <TabsList className="grid grid-cols-5 p-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl">
                <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300 flex items-center gap-2 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
                    Create Token Vesting
                </TabsTrigger>
                <TabsTrigger value="beneficiary" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300 flex items-center gap-2 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    Beneficiary
                </TabsTrigger>
                <TabsTrigger value='token' className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300 flex items-center gap-2 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M8 12h8" /></svg>
                    Token
                </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="transform transition-all duration-300 ease-in-out">
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-purple-100/50 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle>
                            <p className="self-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
                                Create Token Vesting
                            </p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-4 p-6'>
                        <CreateTokenVestingTab />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="beneficiary" className="transform transition-all duration-300 ease-in-out">
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-purple-100/50 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle>
                            <p className="self-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Add/Remove Beneficiary
                            </p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-4 p-6'>
                        <ActBeneficiaryTab />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="token" className="transform transition-all duration-300 ease-in-out">
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-purple-100/50 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle>
                            <p className="self-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M8 12h8" /></svg>
                                Add/Remove Token
                            </p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-4 p-6'>
                        <ActTokenTab />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
