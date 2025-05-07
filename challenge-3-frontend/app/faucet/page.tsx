// app/faucet/page.tsx

import Image from "next/image"
import Link from "next/link"
import { FaucetCard } from "@/components/ui/faucetcard"

export default function FaucetPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Image src="/polkadot.png" alt="Polkadot Logo" width={100} height={100} />
      <h1 className="text-2xl font-bold mt-4 mb-2">Polkadot Token Faucet</h1>
      <p className="mb-6 text-muted-foreground text-center max-w-md">
        This is a UI prototype for requesting testnet DOT tokens. No API or backend is connected yet.
      </p>

      <FaucetCard />

      <Link href="/" className="mt-6 text-blue-500 hover:underline">
        ← Back to home
      </Link>
    </div>
  )
}
