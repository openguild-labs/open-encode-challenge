"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Stake from "./stake";
import Withdraw from "./withdraw";

export default function YieldFarm() {
    return (
        <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
            <Tabs defaultValue="stake" className="w-[320px] md:w-[425px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stake">Stake</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                </TabsList>
                <TabsContent value="stake">
                    <Stake />
                </TabsContent>
                <TabsContent value="withdraw">
                    <Withdraw />
                </TabsContent>
            </Tabs>
        </div>
    );
}