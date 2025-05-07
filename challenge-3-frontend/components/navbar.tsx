"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between py-4 px-8 border-b">

      <div className="flex flex-wrap items-center justify-center w-full gap-2">
        <Link className="text-sm underline underline-offset-4" href="/">
          Home
        </Link> 
        <Link className="text-sm underline underline-offset-4" href="/wallet">
          Wallet
        </Link>
        <Link
          className="text-sm underline underline-offset-4"
          href="/send-transaction"
        >
          Send transaction
        </Link>
        <Link
          className="text-sm underline underline-offset-4"
          href="/write-contract"
        >
          Write contract
        </Link>
        <Link
          className="text-sm underline underline-offset-4"
          href="/mint-redeem-lst-bifrost"
        >
          Mint/Redeem LST Bifrost
        </Link>

        <Link className="text-sm underline underline-offset-4" href="/vesting">
          Vesting
        </Link>
        <Link className="text-sm underline underline-offset-4" href="/yield-farm">
          Yield Farm
        </Link>
      </div>
    </div>
  );
}
