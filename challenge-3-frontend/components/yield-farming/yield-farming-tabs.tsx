'use client';
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import YieldFarmingStakeTab from './menu-tabs/yield-farming-stake-tab';
import YieldFarmingWithdrawTab from './menu-tabs/yield-farming-withdraw-tab';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export default function YieldFarmingTabs() {
    return (
        <Tabs defaultValue="stake" className="min-w-full h-full">
            <TabsList>
                <TabsTrigger value="stake">Stake</TabsTrigger>
                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>
            <TabsContent value="stake">
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-purple-100/50 transition-all duration-300 min-w-full">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle>
                            <p className="self-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
                                Stake your Token
                            </p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-4 p-6 w-full'>
                        <YieldFarmingStakeTab />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="withdraw">
                <Card className="border-2 border-purple-200 shadow-lg hover:shadow-purple-100/50 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                        <CardTitle>
                            <p className="self-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
                                Withdraw your Token
                            </p>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col items-center justify-center gap-4 p-6'>
                        <YieldFarmingWithdrawTab />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
