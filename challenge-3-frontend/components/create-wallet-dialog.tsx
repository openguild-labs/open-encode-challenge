"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { createWalletDialogOpenAtom } from "@/lib/atoms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound, Ban, ExternalLink } from "lucide-react";
import Image from "next/image";
import {
  createSigpassWallet,
  checkBrowserWebAuthnSupport,
} from "@/lib/sigpass";

/**
 * Globally mounted dialog that lets users generate a Sigpass wallet.
 * Because it’s outside the drawer hierarchy, it survives when the drawer unmounts.
 */
export default function CreateWalletDialog() {
  const [open, setOpen] = useAtom(createWalletDialogOpenAtom);
  const [webAuthn, setWebAuthn] = useState(false);

  useEffect(() => {
    setWebAuthn(checkBrowserWebAuthnSupport());
  }, []);

  const handleCreate = async () => {
    await createSigpassWallet("dapp");
    // Dialog closes only after successful creation
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Wallet</DialogTitle>
          <DialogDescription>
            Instantly get a wallet secured by&nbsp;
            <a
              href="https://www.yubico.com/resources/glossary/what-is-a-passkey/"
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Passkey <ExternalLink className="h-4 w-4" />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <h2 className="font-bold">What is a Wallet?</h2>

          <div className="flex items-center gap-4">
            <Image
              src="/rainbowkit-1.svg"
              alt="Digital assets icon"
              width={50}
              height={50}
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">
                A Home for your Digital&nbsp;Assets
              </h3>
              <p className="text-sm text-muted-foreground">
                Wallets are used to send, receive, store, and display digital
                assets like Polkadot and NFTs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Image
              src="/rainbowkit-2.svg"
              alt="Login icon"
              width={50}
              height={50}
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">A new way to Log In</h3>
              <p className="text-sm text-muted-foreground">
                Instead of creating new accounts and passwords on every
                website, just connect your wallet.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <a
            href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore"
            target="_blank"
            rel="noopener noreferrer"
            className="text-md font-bold"
          >
            Learn more
          </a>

          {webAuthn ? (
            <Button
              className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
              onClick={handleCreate}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Create
            </Button>
          ) : (
            <Button
              disabled
              className="rounded-xl font-bold text-md hover:scale-105 transition-transform"
            >
              <Ban className="mr-2 h-4 w-4" />
              Unsupported&nbsp;Browser
            </Button>
          )}
        </DialogFooter>

        <p className="text-center text-sm text-muted-foreground">
          Powered by&nbsp;
          <a
            href="https://github.com/gmgn-app/sigpass"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold underline underline-offset-4"
          >
            Sigpass <ExternalLink className="h-4 w-4" />
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}