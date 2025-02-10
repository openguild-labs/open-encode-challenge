"use client";
import MintRedeemLstBifrost from "@/components/mint-redeem-lst-bifrost";
import SigpassKit from "@/components/sigpasskit";
import Navbar from "@/components/navbar";

export default function MintRedeemLstBifrostPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold">Mint/Redeem LST Bifrost</h1>
      <MintRedeemLstBifrost />
    </div>
  );
}
