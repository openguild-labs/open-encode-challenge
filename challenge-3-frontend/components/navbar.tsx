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
        href="/vesting"
      >
        Vesting
      </Link>
      <Link
        className="text-sm underline underline-offset-4"
        href="/yield-farm"
      >
        Yield Farm
      </Link>
      <Link
        className="text-sm underline underline-offset-4"
        href="/transferWND"
      >
        Transfer WND
      </Link>
      <Link
        className="text-sm underline underline-offset-4"
        href="/tokenMint"
      >
        Mint / Transfer ERC20 Token
      </Link>
    </div>
  );
}
