"use client";
import Navbar from "@/components/navbar";
import SigpassKit from "@/components/sigpasskit";
import Vesting from "@/components/vesting";

export default function VestingPage() {
    return (
        <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center">
            <SigpassKit />
            <Navbar />
            <h1 className="text-2xl font-bold mb-6"> Vesting</h1>
            <Vesting />
        </div>
    );
} 