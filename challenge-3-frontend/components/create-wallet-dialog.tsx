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
import { KeyRound, Ban, ExternalLink, LockKeyhole, Shield } from "lucide-react";
import Image from "next/image";
import {
  createSigpassWallet,
  checkBrowserWebAuthnSupport,
} from "@/lib/sigpass";

/**
 * Globally mounted dialog that lets users generate a Sigpass wallet.
 * Because it's outside the drawer hierarchy, it survives when the drawer unmounts.
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
      <DialogContent className="sm:max-w-[450px] border-purple-200 dark:border-purple-800 shadow-lg overflow-hidden p-0">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <LockKeyhole className="h-5 w-5" />
              Create Wallet
            </DialogTitle>
            <DialogDescription className="text-white/90 mt-2">
              Instantly get a wallet secured by&nbsp;
              <a
                href="https://www.yubico.com/resources/glossary/what-is-a-passkey/"
                className="inline-flex items-center gap-1 font-bold text-white underline underline-offset-2 hover:text-white/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Passkey <ExternalLink className="h-3 w-3" />
              </a>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-5">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">
              What is a Wallet?
            </h2>

            <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                <Image
                  src="/rainbowkit-1.svg"
                  alt="Digital assets icon"
                  width={40}
                  height={40}
                  className="dark:filter dark:brightness-0 dark:invert"
                />
              </div>
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

            <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                <Image
                  src="/rainbowkit-2.svg"
                  alt="Login icon"
                  width={40}
                  height={40}
                  className="dark:filter dark:brightness-0 dark:invert"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold">A new way to Log In</h3>
                <p className="text-sm text-muted-foreground">
                  Instead of creating new accounts and passwords on every
                  website, just connect your wallet.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-4">
            <a
              href="https://learn.rainbow.me/understanding-web3?utm_source=rainbowkit&utm_campaign=learnmore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-md font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center justify-center"
            >
              Learn more <ExternalLink className="ml-1 h-3 w-3" />
            </a>

            {webAuthn ? (
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg font-bold text-md hover:opacity-90 transition-opacity"
                onClick={handleCreate}
              >
                <Shield className="mr-2 h-4 w-4" />
                Create Secure Wallet
              </Button>
            ) : (
              <Button disabled className="rounded-lg font-bold text-md">
                <Ban className="mr-2 h-4 w-4" />
                Unsupported&nbsp;Browser
              </Button>
            )}
          </DialogFooter>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-purple-100 dark:border-purple-900/30">
          <p className="text-center text-sm text-muted-foreground">
            Powered by&nbsp;
            <a
              href="https://github.com/gmgn-app/sigpass"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2"
            >
              Sigpass <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
