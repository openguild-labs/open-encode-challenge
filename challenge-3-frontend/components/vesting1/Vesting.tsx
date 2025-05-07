"use client";
import { useState } from "react";
import CreateVestingForm from "./CreateVestingForm";
import VestingScheduleView from "./VestingScheduleView";
import WhiteListManagement from "./WhiteListManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "wagmi";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";

export default function Vesting() {
  const account = useAccount();
  const sigpassAddress = useAtomValue(addressAtom);
  const [activeTab, setActiveTab] = useState("create");
  const isOwner =
    (sigpassAddress ?? account.address)?.toLowerCase() ===
    process.env.NEXT_PUBLIC_CONTRACT_OWNER?.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text">
        Token Vesting Dashboard
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="create" disabled={!isOwner}>
            Create Schedule
          </TabsTrigger>
          <TabsTrigger value="view">My Vesting</TabsTrigger>
          <TabsTrigger value="whitelist" disabled={!isOwner}>
            Whitelist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-8">
          <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/10 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              Create New Vesting Schedule
            </h2>
            <p className="text-muted-foreground mb-6">
              Lock tokens for your team or investors with customizable vesting
              parameters.
            </p>
            <CreateVestingForm />
          </div>
        </TabsContent>

        <TabsContent value="view">
          <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/10 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              Your Vesting Schedules
            </h2>
            <p className="text-muted-foreground mb-6">
              View and claim your vested tokens when they become available.
            </p>
            <VestingScheduleView />
          </div>
        </TabsContent>
        <TabsContent value="whitelist">
          <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/10 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Whitelist Management</h2>
            <p className="text-muted-foreground mb-6">
              Manage which addresses can receive vesting schedules.
            </p>
            <WhiteListManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
