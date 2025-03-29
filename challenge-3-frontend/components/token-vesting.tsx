'use client';
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TokenVesting = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <Tabs defaultValue="create" className="w-[400px]">
                <TabsList>
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">Make changes to your account here.</TabsContent>
                <TabsContent value="password">Change your password here.</TabsContent>
            </Tabs>
        </div>
    )
}

export default TokenVesting