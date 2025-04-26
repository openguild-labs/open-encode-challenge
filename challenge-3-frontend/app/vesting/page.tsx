"use client";
import TokenVesting from "@/components/vesting";
import SigpassKit from "@/components/sigpasskit";
import Navbar from "@/components/navbar";

export default function WalletPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold">Vesting</h1>
      <TokenVesting />
    </div>

  );
}