"use client";

import { useState, useEffect } from "react";
import {
  type BaseError,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { parseEther, isAddress, Address } from "viem";
import { ChevronDown, LoaderCircle } from "lucide-react";
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
import TransactionStatus from "@/components/transaction-status";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { localConfig } from "@/app/providers";

// form schema for sending transaction
const formSchema = z.object({
  address: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address | "">,
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
  const config = useConfig();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const address = useAtomValue(addressAtom);

  const {
    data: hash,
    error,
    isPending,
    sendTransactionAsync,
  } = useSendTransaction({
    config: address ? localConfig : config,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: "", amount: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (address) {
      await sendTransactionAsync({
        account: await getSigpassWallet(),
        to: values.address as Address,
        value: parseEther(values.amount),
        chainId: westendAssetHub.id,
      });
    } else {
      await sendTransactionAsync({
        to: values.address as Address,
        value: parseEther(values.amount),
      });
    }
  }

  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  return (
    <div className="flex flex-col gap-4 w-full">
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
                    <Input type="number" placeholder="0.001" {...field} required />
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
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                &nbsp;Confirm&nbsp;in&nbsp;wallet…
              </>
            ) : (
              "Send"
            )}
          </Button>
        </form>
      </Form>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Transaction&nbsp;status <ChevronDown />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction status</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Follow the transaction status below.
            </DialogDescription>

            <TransactionStatus
              hash={hash}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isConfirmed}
              error={error as BaseError | undefined}
              explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
            />

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
              Transaction&nbsp;status <ChevronDown />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Transaction status</DrawerTitle>
              <DrawerDescription>
                Follow the transaction status below.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <TransactionStatus
                hash={hash}
                isPending={isPending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                error={error as BaseError | undefined}
                explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
              />
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