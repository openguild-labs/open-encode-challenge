"use client";

import { useState, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  KeyRound,
  ChevronDown,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { formatEther, Address } from "viem";
import {
  createSigpassWallet,
  getSigpassWallet,
  checkSigpassWallet,
  checkBrowserWebAuthnSupport,
} from "@/lib/sigpass";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  createConfig,
  http,
  useConfig,
} from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Image from "next/image";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage, RESET } from "jotai/utils";
import { westendAssetHub } from "@/app/providers";
import { createWalletDialogOpenAtom } from "@/lib/atoms";

// Persistent address storage
export const addressAtom = atomWithStorage<Address | undefined>(
  "SIGPASS_ADDRESS",
  undefined
);

// Local wagmi config for Sigpass‐only wallets
const localConfig = createConfig({
  chains: [westendAssetHub],
  transports: { [westendAssetHub.id]: http() },
  ssr: true,
});

/* -------------------------------------------------------------------------- */
/*                          Custom ConnectButton UI                           */
/* -------------------------------------------------------------------------- */
function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected =
          ready &&
          account &&
          chain &&
          !chain.unsupported;

        if (!connected) {
          return (
            <Button
              variant="polkadot"
              size="sm"
              onClick={openConnectModal}
              className="rounded-full font-bold"
            >
              Connect&nbsp;Wallet
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-3">
            <button
              onClick={openChainModal}
              className="flex items-center gap-2 rounded-full bg-muted/30 hover:bg-muted/50 px-3 py-1 text-xs font-medium transition-colors"
            >
              {chain.hasIcon && chain.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={chain.iconUrl}
                  alt={chain.name ?? 'chain'}
                  className="size-4 rounded-full"
                  style={{ background: chain.iconBackground }}
                />
              )}
              <span className="truncate">{chain.name}</span>
            </button>

            <button
              onClick={openAccountModal}
              className="rounded-full bg-muted/30 hover:bg-muted/50 px-3 py-1 text-xs font-semibold transition-colors"
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

/* -------------------------------------------------------------------------- */
/*                               SigpassKit UI                                */
/* -------------------------------------------------------------------------- */
export default function SigpassKit() {
  /* ------------------------------------------------------------------ */
  /*                         global & local state                       */
  /* ------------------------------------------------------------------ */
  const setCreateWalletOpen = useSetAtom(createWalletDialogOpenAtom);

  const [hasWallet, setHasWallet] = useState(false);            // Sigpass created?
  const [detailsOpen, setDetailsOpen] = useState(false);        // Wallet-details modal
  const [webAuthn, setWebAuthn] = useState(false);              // Browser support
  const [copied, setCopied] = useState(false);                  // Copy feedback

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const account      = useAccount();
  const wagmiConfig  = useConfig();
  const [address, setAddress] = useAtom(addressAtom);

  /* ------------------------------------------------------------------ */
  /*                             effects                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    checkSigpassWallet().then(setHasWallet);
    setWebAuthn(checkBrowserWebAuthnSupport());
  }, []);

  const { data: balance } = useBalance({
    address,
    chainId: westendAssetHub.id,
    config: address ? localConfig : wagmiConfig,
  });

  /* ------------------------------------------------------------------ */
  /*                       helper event handlers                        */
  /* ------------------------------------------------------------------ */
  // Retrieve stored account from WebAuthn
  const handleGetWallet = async () => {
    const acc = await getSigpassWallet();
    if (acc) setAddress(acc.address);
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  // Disconnect (local) wallet
  const disconnect = () => {
    setAddress(undefined);
    setDetailsOpen(false);
    setAddress(RESET);
  };

  // Truncate address for display
  const short = (addr: Address, len = 4) =>
    `${addr.slice(0, len)}…${addr.slice(-len)}`;

  /* ------------------------------------------------------------------ */
  /*                         rendered component                         */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex items-center gap-2">
      {/* ----------------------------- NO WALLET CREATED ---------------------------- */}
      {!hasWallet && !account.isConnected && !address ? (
        <Button
          className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
          onClick={() => setCreateWalletOpen(true)}
        >
          Create&nbsp;Wallet
        </Button>
      ) : null}

      {/* ------------------------ WALLET EXISTS BUT NOT LOADED ---------------------- */}
      {hasWallet && !account.isConnected && address === undefined ? (
        <Button
          className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
          onClick={handleGetWallet}
        >
          Get&nbsp;Wallet
        </Button>
      ) : null}

      {/* -------------------------- LOCAL WALLET LOADED ----------------------------- */}
      {hasWallet && !account.isConnected && address ? (
        /* Desktop uses Dialog; Mobile uses Drawer for wallet details */
        isDesktop ? (
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="border-2 border-primary rounded-xl font-bold text-md hover:scale-105 transition-transform"
              >
                {short(address)}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[300px]">
              <DialogHeader>
                <DialogTitle>Wallet</DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-center font-bold text-lg text-primary">
                {short(address, 4)}
              </DialogDescription>

              <p className="text-center text-sm text-muted-foreground">
                {balance
                  ? `${formatEther(balance.value)} WND`
                  : <Skeleton className="mx-auto h-4 w-[80px]" />}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Button
                  onClick={copyAddress}
                  className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <DialogClose asChild>
                  <Button 
                    variant="outline"
                    onClick={disconnect}
                    className="rounded-xl font-bold text-md hover:scale-105 transition-transform" 
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="border-2 border-primary rounded-xl font-bold text-md hover:scale-105 transition-transform"
              >
                {short(address)}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[260px]">
              <DrawerHeader className="flex flex-col items-center">
                <DrawerTitle>Wallet</DrawerTitle>
                <DrawerDescription className="font-bold text-primary">
                  {short(address, 4)}
                </DrawerDescription>
              </DrawerHeader>

              <p className="text-center text-sm text-muted-foreground mb-4">
                {balance
                  ? `${formatEther(balance.value)} WND`
                  : <Skeleton className="mx-auto h-4 w-[80px]" />}
              </p>

              <div className="grid grid-cols-2 gap-4 px-4">
                <Button
                  onClick={copyAddress}
                  className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={disconnect}
                  variant="outline"
                  className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        )
      ) : null}

      {/* ------------------------------ CONNECT BUTTON ------------------------------ */}
      {!address ? <CustomConnectButton /> : null}
    </div>
  );
}
