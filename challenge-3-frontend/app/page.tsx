import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Image
          src="/og-logo.png"
          alt="OpenGuild logo"
          width={180}
          height={38}
          priority
        />
        <p>Get started by checking out the demos</p>
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            <Link href="/wallet">Wallet</Link>
          </li>
          <li className="mb-2">
            <Link href="/send-transaction">Send transaction</Link>
          </li>
          <li className="mb-2">
            <Link href="/write-contract">Write contract</Link>
          </li>
          <li className="mb-2">
            <Link href="/mint-redeem-lst-bifrost">Mint/Redeem LST Bifrost</Link>
          </li>
          <li className="mb-2">
            <Link href="/vesting">Vesting</Link>
          </li>
          <li className="mb-2">
            <Link href="/yield-farm">Yield farm</Link>
          </li>
        </ol>
      </div>
      <footer className="row-start-3 flex flex-col gap-4">

      </footer>
    </div>
  );
}
