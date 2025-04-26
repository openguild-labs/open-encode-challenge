"use client";

import { useState, useEffect } from "react";
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
  useSwitchChain,
  useBalance,
} from "wagmi";
import { parseEther, isAddress, Address } from "viem";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
} from "lucide-react";
import { truncateHash } from "@/lib/utils";
import CopyButton from "@/components/copy-button";
import { westendAssetHub } from "@/app/providers";

// Form schema for native token transfer
const transferSchema = z.object({
  recipient: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address>,
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,12}$/.test(val), {
      message: "Amount cannot have more than 12 decimal places",
    }),
});

export default function TransferNativeToken() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const isCorrectChain = chainId === westendAssetHub.id;

  // Fetch user balance
  const { data: balance, isLoading: balanceLoading, error: balanceError } = useBalance({
    address: userAddress,
    chainId: westendAssetHub.id,
  });

  // Form setup
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipient: "",
      amount: "",
    },
  });

  // Send transaction
  const { data: hash, error, isPending, sendTransactionAsync } = useSendTransaction();

  // Transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Open dialog/drawer on transaction
  useEffect(() => {
    if (hash) {
      setOpen(true);
      form.reset();
    }
  }, [hash, form]);

  // Submit handler
  async function onSubmit(values: z.infer<typeof transferSchema>) {
    if (!userAddress || !isCorrectChain) return;

    try {
      const amount = parseEther(values.amount); // Convert to wei (18 decimals, adjusted for WND)
      await sendTransactionAsync({
        to: values.recipient,
        value: amount,
        chainId: westendAssetHub.id,
      });
    } catch (err) {
      console.error("Transfer error:", err);
    }
  }

  // Debug chain and balance
  useEffect(() => {
    console.log("Current Chain ID:", chainId, "Expected Chain ID:", westendAssetHub.id);
    console.log("User Address:", userAddress);
    console.log("Balance:", balance ? `${balance.formatted} ${balance.symbol}` : "Loading...");
    if (balanceError) console.error("Balance Error:", balanceError.message);
  }, [chainId, userAddress, balance, balanceError]);

  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      {!isCorrectChain && (
        <div className="text-red-500 text-center">
          Wrong network. Please switch to Westend Asset Hub.
          <Button
            className="mt-2"
            onClick={() => switchChain?.({ chainId: westendAssetHub.id })}
            disabled={!switchChain}
          >
            Switch Network
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 border p-4 rounded">
        <h3 className="text-lg font-semibold">Transfer Native Tokens (WND)</h3>
        <p>
          Your Balance: {balanceLoading ? (
            "Loading..."
          ) : balanceError ? (
            <span className="text-red-500">Error: {balanceError.message}</span>
          ) : balance ? (
            `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
          ) : (
            "Connect wallet to view balance"
          )}
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0xA0Cf…251e" {...field} />
                  </FormControl>
                  <FormDescription>Address to receive WND tokens.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (WND)</FormLabel>
                  <FormControl>
                    {isDesktop ? (
                      <Input type="number" step="0.0001" placeholder="1.0" {...field} required />
                    ) : (
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.]?[0-9]*"
                        placeholder="1.0"
                        {...field}
                        required
                      />
                    )}
                  </FormControl>
                  <FormDescription>Amount of WND to transfer.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending || !isCorrectChain || !userAddress || balanceLoading}
              className="w-full"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send WND"
              )}
            </Button>
          </form>
        </Form>
      </div>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Transaction Status <ChevronDown />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Status</DialogTitle>
            </DialogHeader>
            <DialogDescription>Follow the transaction status below.</DialogDescription>
            <div className="flex flex-col gap-2">
              {hash ? (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" />
                  Transaction Hash
                  <a
                    className="flex flex-row gap-2 items-center underline underline-offset-4"
                    href={`${westendAssetHub.blockExplorers?.default?.url}/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncateHash(hash)}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <CopyButton copyText={hash} />
                </div>
              ) : (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" /> No transaction hash
                </div>
              )}
              {!isPending && !isConfirmed && !isConfirming && (
                <div className="flex flex-row gap-2 items-center">
                  <Ban className="w-4 h-4" /> No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" /> Error: {error.message}
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full">
              Transaction Status <ChevronDown />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Transaction Status</DrawerTitle>
              <DrawerDescription>Follow the transaction status below.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4">
              {hash ? (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" />
                  Transaction Hash
                  <a
                    className="flex flex-row gap-2 items-center underline underline-offset-4"
                    href={`${westendAssetHub.blockExplorers?.default?.url}/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncateHash(hash)}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <CopyButton copyText={hash} />
                </div>
              ) : (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" /> No transaction hash
                </div>
              )}
              {!isPending && !isConfirmed && !isConfirming && (
                <div className="flex flex-row gap-2 items-center">
                  <Ban className="w-4 h-4" /> No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" /> Error: {error.message}
                </div>
              )}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}