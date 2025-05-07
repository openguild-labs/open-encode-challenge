import Link from "next/link";
import { ConnectButton } from '@rainbow-me/rainbowkit'; // Import ConnectButton

export default function Navbar() {
  return (
    <nav className="flex flex-wrap items-center justify-between w-full p-4 gap-2 border-b mb-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link className="text-sm underline underline-offset-4" href="/">
          Home
        </Link>
        <Link className="text-sm underline underline-offset-4" href="/token-vesting">
          Token Vesting
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
      <div>
        <ConnectButton /> {/* Add the ConnectButton here */}
      </div>
    </nav>
  );
}
