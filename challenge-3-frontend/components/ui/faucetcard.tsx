"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function FaucetCard({ className }: { className?: string }) {
  const [wallet, setWallet] = React.useState("")
  const [status, setStatus] = React.useState<"idle" | "loading" | "success">("idle")

  const handleRequest = () => {
    setStatus("loading")
    setTimeout(() => setStatus("success"), 1500) // simulate faucet
  }

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto bg-card text-card-foreground p-6 rounded-xl shadow-md space-y-4",
        className
      )}
    >
      <h2 className="text-2xl font-semibold text-center">Polkadot Token Faucet</h2>

      <input
        type="text"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        placeholder="Enter your wallet address"
        className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground"
      />

      <button
        onClick={handleRequest}
        disabled={!wallet || status === "loading"}
        className={cn(
          "w-full px-4 py-2 rounded-md font-medium",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        )}
      >
        {status === "loading" ? "Requesting..." : "Request Tokens"}
      </button>

      {status === "success" && (
        <p className="text-center text-green-500 font-medium">✅ Tokens sent (mock)!</p>
      )}
    </div>
  )
}
