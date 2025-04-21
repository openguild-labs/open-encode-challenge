"use client";
import SigpassKit from "@/components/sigpasskit";
import Navbar from "@/components/navbar";

export default function WalletPage() {
  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen gap-8">
      <Navbar />
      <div className="flex flex-col gap-8 max-w-[768px] mx-auto items-center justify-center pt-8">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <SigpassKit />
      </div>
    </div>
  );
}