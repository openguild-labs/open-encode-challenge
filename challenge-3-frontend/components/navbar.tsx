import Link from "next/link";

export default function Navbar() {
  return (
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
    </div>
  );
}
