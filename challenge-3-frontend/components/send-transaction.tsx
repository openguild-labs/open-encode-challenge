"use client";

import { useState, useEffect } from "react";
import {
  type BaseError,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useConfig
} from "wagmi";
import { parseEther, isAddress, Address } from "viem";
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
} from "lucide-react";
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
import { useMediaQuery } from "@/hooks/use-media-query";
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
import { truncateHash } from "@/lib/utils";
import CopyButton from "@/components/copy-button";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub } from "@/app/providers";
import { useAtomValue } from 'jotai';
import { addressAtom } from '@/components/sigpasskit';
import { localConfig } from '@/app/providers';

// form schema for sending transaction
const formSchema = z.object({
  // address is a required field
  address: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address | "">,
  // amount is a required field
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
    }),
});

export default function SendTransaction() {

  // useConfig hook to get config
  const config = useConfig();

  // useMediaQuery hook to check if the screen is desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // useState hook to open/close dialog/drawer
  const [open, setOpen] = useState(false);

  // get the address from session storage
  const address = useAtomValue(addressAtom)

  // useSendTransaction hook to send transaction
  const {
    data: hash,
    error,
    isPending,
    sendTransactionAsync,
  } = useSendTransaction({
    config: address ? localConfig : config,
  });


  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    // resolver is zodResolver
    resolver: zodResolver(formSchema),
    // default values for address and amount
    defaultValues: {
      address: "",
      amount: "",
    },
  });


  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (address) {
      sendTransactionAsync({
        account: await getSigpassWallet(),
        to: values.address as Address,
        value: parseEther(values.amount),
        chainId: westendAssetHub.id,
      });
    } else {
      // Fallback to connected wallet
      sendTransactionAsync({
        to: values.address as Address,
        value: parseEther(values.amount),
      });
    }
  }

  // Watch for transaction hash and open dialog/drawer when received
  useEffect(() => {
    if (hash) {
      setOpen(true);
    }
  }, [hash]);


  // useWaitForTransactionReceipt hook to wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });


  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiving Address</FormLabel>
                <FormControl>
                  <Input placeholder="0xA0Cf…251e" {...field} />
                </FormControl>
                <FormDescription>The address to send WND to.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  {isDesktop ? (
                    <Input
                      type="number"
                      placeholder="0.001"
                      {...field}
                      required
                    />
                  ) : (
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      placeholder="0.001"
                      {...field}
                      required
                    />
                  )}
                </FormControl>
                <FormDescription>The amount of WND to send.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {
            isPending ? (
              <Button type="submit" disabled className="w-full">
                <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in wallet...
              </Button>
            ) : (
              <Button type="submit" className="w-full">Send</Button>
            )
          }
        </form>
      </Form>
      {
        // Desktop would be using dialog
        isDesktop ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Transaction status <ChevronDown />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transaction status</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Follow the transaction status below.
              </DialogDescription>
              <div className="flex flex-col gap-2">
                {hash ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                    <a className="flex flex-row gap-2 items-center underline underline-offset-4" href={`${config.chains?.[0]?.blockExplorers?.default?.url}/tx/${hash}`} target="_blank" rel="noopener noreferrer">
                      {truncateHash(hash)}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <CopyButton copyText={hash} />
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    No transaction hash
                  </div>
                )}
                {
                  !isPending && !isConfirmed && !isConfirming && (
                    <div className="flex flex-row gap-2 items-center">
                      <Ban className="w-4 h-4" /> No transaction submitted
                    </div>
                  )
                }
                {isConfirming && (
                  <div className="flex flex-row gap-2 items-center text-yellow-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting
                    for confirmation...
                  </div>
                )}
                {isConfirmed && (
                  <div className="flex flex-row gap-2 items-center text-green-500">
                    <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                  </div>
                )}
                {error && (
                  <div className="flex flex-row gap-2 items-center text-red-500">
                    <X className="w-4 h-4" /> Error:{" "}
                    {(error as BaseError).shortMessage || error.message}
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
          // Mobile would be using drawer
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="w-full">
                Transaction status <ChevronDown />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Transaction status</DrawerTitle>
                <DrawerDescription>
                  Follow the transaction status below.
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-2 p-4">
                {hash ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                    <a className="flex flex-row gap-2 items-center underline underline-offset-4" href={`${config.chains?.[0]?.blockExplorers?.default?.url}/tx/${hash}`} target="_blank" rel="noopener noreferrer">
                      {truncateHash(hash)}
                      <ExternalLink className="w-4 h-4" />
                      <CopyButton copyText={hash} />
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    No transaction hash
                  </div>
                )}
                {
                  !isPending && !isConfirmed && !isConfirming && (
                    <div className="flex flex-row gap-2 items-center">
                      <Ban className="w-4 h-4" /> No transaction submitted
                    </div>
                  )
                }
                {isConfirming && (
                  <div className="flex flex-row gap-2 items-center text-yellow-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting
                    for confirmation...
                  </div>
                )}
                {isConfirmed && (
                  <div className="flex flex-row gap-2 items-center text-green-500">
                    <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                  </div>
                )}
                {error && (
                  <div className="flex flex-row gap-2 items-center text-red-500">
                    <X className="w-4 h-4" /> Error:{" "}
                    {(error as BaseError).shortMessage || error.message}
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
        )
      }
    </div>
  );
}
