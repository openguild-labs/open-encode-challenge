"use client";
import SigpassKit from "@/components/sigpasskit";
import YieldFarmInteraction from "@/components/yield";
import Navbar from "@/components/navbar";

export default function WalletPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold">Yield farm</h1>
      <YieldFarmInteraction />
    </div>
    
  );
}