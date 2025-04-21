"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { useAccount, useReadContract } from "wagmi";
import AdminPanel from "@/components/token-vesting/admin-panel";
import BeneficiaryPanel from "@/components/token-vesting/beneficiary-panel";
import { Address } from "viem";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { abi as TokenVestingAbi } from "@/abis/TokenVesting.json";
// import { westendAssetHub } from "@/app/providers";
import { sepolia, moonbaseAlpha } from "wagmi/chains";

// Simulated contract address - in production this would come from environment variables or a config
const CONTRACT_ADDRESS =
  "0xc5BF7a8634721D1366396707E24533C6ac786Fae" as Address;
const TOKEN_ADDRESS = "0xd5954beef69b90978ec667b1fcf696d102dcde97" as Address;

export default function TokenVestingPage() {
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { toast } = useToast();
  const { data: owner, error: ownerError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: TokenVestingAbi,
    functionName: "owner",
    chainId: sepolia.id,
  });

  useEffect(() => {
    if (!address) return;
    if (ownerError) {
      console.error("Error fetching contract owner", ownerError);
      return;
    }
    console.log("Owner: ", owner);
    setIsAdmin(owner === address);
  }, [owner, address]);

  // In a real application, you'd check if the connected address is the contract owner
  // For now, we'll have a toggle to simulate admin/beneficiary view
  const toggleRole = () => {
    setIsAdmin(!isAdmin);
    toast({
      title: `Switched to ${!isAdmin ? "Admin" : "Beneficiary"} view`,
      description: "This is for demonstration purposes only",
    });
  };

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen gap-8">
      <Navbar />

      <div className="flex flex-col items-center w-full p-4 gap-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
          Token Vesting Portal
        </h1>
        {/* <Separator className="my-10" /> */}
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
          <div className="text-2xl font-bold">
            Connect your wallet to continue
          </div>
          <p className="text-muted-foreground">
            You need to connect your wallet to interact with the vesting
            contract
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              {isAdmin ? "Administrator Panel" : "Beneficiary Dashboard"}
            </h2>
            <Button
              onClick={toggleRole}
              variant="secondary"
              className="text-sm px-4 py-2 rounded-full"
            >
              Switch to {isAdmin ? "Beneficiary" : "Admin"} View
            </Button>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="create">Create Schedule</TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="manage">Manage Beneficiaries</TabsTrigger>
              )}
              {!isAdmin && (
                <TabsTrigger value="claim">Claim Tokens</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {isAdmin ? (
                <AdminPanel
                  contractAddress={CONTRACT_ADDRESS}
                  tokenAddress={TOKEN_ADDRESS}
                  view="overview"
                />
              ) : (
                <BeneficiaryPanel
                  contractAddress={CONTRACT_ADDRESS}
                  address={address as Address}
                  view="overview"
                />
              )}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="create" className="space-y-4">
                <AdminPanel
                  contractAddress={CONTRACT_ADDRESS}
                  tokenAddress={TOKEN_ADDRESS}
                  view="create"
                />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="manage" className="space-y-4">
                <AdminPanel
                  contractAddress={CONTRACT_ADDRESS}
                  tokenAddress={TOKEN_ADDRESS}
                  view="manage"
                />
              </TabsContent>
            )}

            {!isAdmin && (
              <TabsContent value="claim" className="space-y-4">
                <BeneficiaryPanel
                  contractAddress={CONTRACT_ADDRESS}
                  address={address as Address}
                  view="claim"
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>Built with DotUI • Polkadot's UI Kit for Web3</p>
      </footer>

      <Toaster />
    </div>
  );
}
