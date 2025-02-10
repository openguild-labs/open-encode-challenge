"use client";

import { useState, useEffect } from "react";
import '@rainbow-me/rainbowkit/styles.css';
import { useMediaQuery } from "@/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Copy, Check, KeyRound, Ban, ExternalLink, LogOut, ChevronDown, X } from 'lucide-react';
import { formatEther, Address } from 'viem';
import { createSigpassWallet, getSigpassWallet, checkSigpassWallet, checkBrowserWebAuthnSupport } from "@/lib/sigpass";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, createConfig, http, useConfig } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import Image from 'next/image';
import { useAtom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { westendAssetHub } from '@/app/providers';


// Set the string key and the initial value
export const addressAtom = atomWithStorage<Address | undefined>('SIGPASS_ADDRESS', undefined)

// create a local config for the wallet
const localConfig = createConfig({
  chains: [westendAssetHub],
  transports: {
    [westendAssetHub.id]: http(),
  },
  ssr: true,
});

export default function SigpassKit() {
  const [wallet, setWallet] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [webAuthnSupport, setWebAuthnSupport] = useState<boolean>(false);
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const account = useAccount();
  const [address, setAddress] = useAtom(addressAtom);
  const [isCopied, setIsCopied] = useState(false);
  const config = useConfig();
  const { data: balance } = useBalance({
    address: address,
    chainId: westendAssetHub.id,
    config: address ? localConfig : config,
  });

  // check if the wallet is already created
  useEffect(() => {
    async function fetchWalletStatus() {
      const status = await checkSigpassWallet();
      setWallet(status);
    }
    fetchWalletStatus();
  }, []);

  // check if the browser supports WebAuthn
  useEffect(() => {
    const support = checkBrowserWebAuthnSupport();
    setWebAuthnSupport(support);
  }, []);

  // get the wallet
  async function getWallet() {
    const account = await getSigpassWallet();
    if (account) {
      setAddress(account.address);
    } else {
      console.error('Issue getting wallet');
    }
  }

  // create a wallet
  async function createWallet() {
    const account = await createSigpassWallet("dapp");
    if (account) {
      setOpen(false);
      setWallet(true);
    }
  }

  // truncate address to 6 characters and add ... at the end
  function truncateAddress(address: Address, length: number = 4) {
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  // copy the address to the clipboard
  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address ? address : "");
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    }
  }

  // disconnect the wallet
  function disconnect() {
    setAddress(undefined);
    setOpen(false);
    setAddress(RESET);
  }


  if (isDesktop) {
    return (
      <div className="flex flex-row gap-2 items-center">
        {!wallet && !account.isConnected && !address ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">Create Wallet</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Wallet</DialogTitle>
                <DialogDescription>
                  Instantly get a wallet with <a href="https://www.yubico.com/resources/glossary/what-is-a-passkey/" className="inline-flex items-center gap-1 font-bold underline underline-offset-2" target="_blank" rel="noopener noreferrer">Passkey<ExternalLink className="h-4 w-4" /></a>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-row gap-8">
                <div className="flex flex-col gap-4">
                  <h2 className="font-bold">What is a Wallet?</h2>
                  <div className="flex flex-row gap-4 items-center">
                    <Image 
                      src="/rainbowkit-1.svg" 
                      alt="icon-1" 
                      width={50}
                      height={50}
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-bold">A Home for your Digital Assets</h3>
                      <p className="text-sm text-muted-foreground">Wallets are used to send, receive, store, and display digital assets like Polkadot and NFTs.</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 items-center">
                    <Image 
                      src="/rainbowkit-2.svg" 
                      alt="icon-2" 
                      width={50}
                      height={50}
                    />
                    <div className="flex flex-col gap-2">
                      <h3 className="font-bold">A new way to Log In</h3>
                      <p className="text-sm text-muted-foreground">Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <div className="flex flex-row gap-2 mt-4 justify-between w-full items-center">
                  <a href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore" className="text-md font-bold" target="_blank" rel="noopener noreferrer">Learn more</a> 
                  {
                  webAuthnSupport ? (
                    <Button 
                      className="rounded-xl font-bold text-md hover:scale-105 transition-transform" 
                      onClick={createWallet} // add a name to the wallet, can be your dapp name or user input
                    >
                      <KeyRound />
                      Create
                    </Button>
                  ) : (
                    <Button disabled className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                      <Ban />
                      Unsupported Browser
                    </Button>
                  )
                }
                </div>
              </DialogFooter>
              <div className="text-sm text-muted-foreground">
                Powered by <a href="https://github.com/gmgn-app/sigpass" className="inline-flex items-center gap-1 font-bold underline underline-offset-4"  target="_blank" rel="noopener noreferrer">Sigpass<ExternalLink className="h-4 w-4" /></a>
              </div>
            </DialogContent>
          </Dialog>
        ) : wallet && !account.isConnected && address === undefined ? (
          <Button 
            className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
            onClick={getWallet}
          >
            Get Wallet
          </Button>
        ) : wallet && !account.isConnected && address ? 
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="border-2 border-primary rounded-xl font-bold text-md hover:scale-105 transition-transform"
                variant="outline"
              >
                {truncateAddress(address)}
                <ChevronDown />
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Wallet</DialogTitle>
              </DialogHeader>
              <DialogDescription className="flex flex-col gap-2 text-primary text-center font-bold text-lg items-center">
                {truncateAddress(address, 4)}
              </DialogDescription>
              <div className="flex flex-col items-center text-sm text-muted-foreground">
                {balance ? `${formatEther(balance.value)} WND` : <Skeleton className="w-[80px] h-[24px] rounded-md" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={copyAddress} className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button onClick={disconnect} variant="outline" className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                  <LogOut />
                  Disconnect
                </Button>
              </div>
            </DialogContent>
          </Dialog>
         : null}
        {
          !address ? <ConnectButton /> : null
        }
      </div>
    )
  }
 
  return (
    <div className="flex flex-row gap-2 items-center">
      {(!wallet && !account.isConnected && !address) ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button className="rounded-xl font-bold text-md hover:scale-105 transition-transform">Create Wallet</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Create Wallet</DrawerTitle>
              <DrawerDescription>
                Instantly get a wallet with <a href="https://www.yubico.com/resources/glossary/what-is-a-passkey/" className="inline-flex items-center gap-1 font-bold underline underline-offset-2" target="_blank" rel="noopener noreferrer">Passkey<ExternalLink className="h-4 w-4" /></a>
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <div className="flex flex-col gap-4">
                <h2 className="font-bold">What is a Wallet?</h2>
                <div className="flex flex-row gap-4 items-center">
                  <Image 
                    src="/rainbowkit-1.svg" 
                    alt="icon-1" 
                    width={50}
                    height={50}
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold">A Home for your Digital Assets</h3>
                    <p className="text-sm text-muted-foreground">Wallets are used to send, receive, store, and display digital assets like Polkadot and NFTs.</p>
                  </div>
                </div>
                <div className="flex flex-row gap-4 items-center">
                  <Image 
                    src="/rainbowkit-2.svg" 
                    alt="icon-2" 
                    width={50}
                    height={50}
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold">A new way to Log In</h3>
                    <p className="text-sm text-muted-foreground">Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                  </div>
                </div>
                <a href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore" className="text-md font-bold text-center" target="_blank" rel="noopener noreferrer">Learn more</a> 
              </div>
            </div>
            <DrawerFooter>
              {webAuthnSupport ? (
                  <Button 
                    className="rounded-xl font-bold text-md hover:scale-105 transition-transform" 
                    onClick={createWallet}
                  >
                    <KeyRound />
                    Create
                  </Button>
                ) : (
                  <Button disabled className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                    <Ban />
                    Unsupported Browser
                  </Button>
                )}
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
              <div className="text-sm text-muted-foreground">
                Powered by <a href="https://github.com/gmgn-app/sigpass" className="inline-flex items-center gap-1 font-bold underline underline-offset-4" target="_blank" rel="noopener noreferrer">Sigpass<ExternalLink className="h-4 w-4" /></a>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : wallet && !account.isConnected && address === undefined ? (
        <Button 
          className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
          onClick={getWallet}
        >
          Get Wallet
        </Button>
      ) : wallet && !account.isConnected && address ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button 
              className="border-2 border-primary rounded-xl font-bold text-md hover:scale-105 transition-transform"
              variant="outline"
            >
              {truncateAddress(address)}
              <ChevronDown />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[250px]">
            <DrawerHeader className="flex flex-col items-center justify-between">
              <div className="flex flex-row items-center justify-between w-full">
                <DrawerTitle>Wallet</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="outline" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerDescription className="flex flex-col gap-2 text-primary text-center font-bold text-lg items-center">
                {truncateAddress(address, 4)}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-center text-sm text-muted-foreground mb-4">
                {balance ? `${formatEther(balance.value)} WND` : <Skeleton className="w-[80px] h-[24px] rounded-md" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={copyAddress} className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button onClick={disconnect} variant="outline" className="rounded-xl font-bold text-md hover:scale-105 transition-transform">
                  <LogOut />
                  Disconnect
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
      {!address ? <ConnectButton /> : null}
    </div>
  )
}

