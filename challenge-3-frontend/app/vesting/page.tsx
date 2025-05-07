"use client";

import dynamic from "next/dynamic";

// Import Vesting with dynamic import (since it uses client hooks)
const Vesting = dynamic(() => import("@/components/vesting1/Vesting"), {
  ssr: false,
});

export default function VestingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
        Token Vesting Dashboard
      </h1>
      <Vesting />
    </div>
  );
}
