"use client";
import WhitelistForm from "@/components/whitelistForm";
import SigpassKit from "@/components/sigpasskit";
import Navbar from "@/components/navbar";

export default function VestingSchedulesPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
      <SigpassKit />
      <Navbar />
      <h1 className="text-2xl font-bold"> Add whitelist</h1>
      <WhitelistForm />
    </div>
  );
}
