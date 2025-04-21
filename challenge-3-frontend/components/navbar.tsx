"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import PortfolioCard from "./portfolio-card";

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  // This effect is to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format address for display
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get initials for avatar
  const getInitials = (addr: string) => {
    if (!addr) return "";
    return addr.slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between w-full py-4 border-b">
      <div className="flex items-center space-x-6">
        <Link className="text-sm font-medium hover:text-primary" href="/">
          Home
        </Link>
        <Link className="text-sm font-medium hover:text-primary" href="/wallet">
          Wallet
        </Link>
        <Link
          className="text-sm font-medium hover:text-primary"
          href="/send-transaction"
        >
          Send Transaction
        </Link>
        <Link
          className="text-sm font-medium hover:text-primary"
          href="/write-contract"
        >
          Write Contract
        </Link>
        <Link
          className="text-sm font-medium hover:text-primary"
          href="/token-vesting"
        >
          Token Vesting
        </Link>
        <Link
          className="text-sm font-medium hover:text-primary"
          href="/mint-redeem-lst-bifrost"
        >
          Mint/Redeem LST
        </Link>
      </div>

      {mounted && (
        <div>
          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rounded-full"
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full">
                    <span className="text-xs">{getInitials(address || "")}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatAddress(address || "")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(address || "");
                  }}
                >
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => disconnect()}
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted: rainbowMounted,
              }) => (
                <Button
                  onClick={openConnectModal}
                  className="flex items-center gap-2"
                >
                  <Wallet size={16} />
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          )}
        </div>
      )}
    </div>
  );
}
