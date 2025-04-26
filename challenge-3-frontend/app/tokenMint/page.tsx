"use client";
import MockERC20Interaction from "@/components/erc20";
import SigpassKit from "@/components/sigpasskit";
import Navbar from "@/components/navbar";

export default function WalletPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold">Mint / Transfer ERC20 Token</h1>
      <MockERC20Interaction />
    </div>

  );
}