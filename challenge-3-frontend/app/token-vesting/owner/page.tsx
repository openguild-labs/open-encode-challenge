import BackButton from '@/components/back-button'
import CreateTokenVesting from '@/components/token-vesting/create-token-vesting'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { ChevronLeftIcon } from 'lucide-react'
import React from 'react'

export default function TokenVestingOwnerPage() {
    return (
        <div className='flex flex-col items-center justify-items-center min-h-screen gap-8 sm:p-20 sm:pt-2 font-[family-name:var(--font-geist-sans)]'>
            <div className="flex items-center w-full">
                <BackButton />
            </div>
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
                            <CreateTokenVesting />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
