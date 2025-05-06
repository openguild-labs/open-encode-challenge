"use client";
import TokenVestingComponent from "@/components/token-vesting";

export default function TokenVestingPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">Token Vesting</h1>
      <TokenVestingComponent />
    </div>
  );
}
