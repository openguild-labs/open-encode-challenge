"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { parseUnits, Address, isAddress } from "viem";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { ChevronDown } from "lucide-react";
import TransactionStatus from "@/components/transaction-status";
import { tokenVestingAbi } from "@/lib/abi";
import { TOKEN_VESTING_CONTRACT_ADDRESS } from "@/lib/config";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub, localConfig } from "@/app/providers";
import { useMediaQuery } from "@/hooks/use-media-query";

const formSchema = z.object({
  beneficiary: z
    .string()
    .refine((val) => isAddress(val), { message: "Invalid address" }) as z.ZodType<Address>,
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Must be positive",
    }),
  startTime: z.string().min(1, { message: "Required" }),
  cliff: z.string().min(1, { message: "Required" }),
  duration: z.string().min(1, { message: "Required" }),
  slicePeriod: z.string().min(1, { message: "Required" }),
  revocable: z.boolean(),
});

export default function CreateForm() {
  const config = useConfig();
  const address = useAtomValue(addressAtom);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beneficiary: "",
      amount: "",
      startTime: Math.floor(Date.now() / 1000).toString(),
      cliff: "0",
      duration: "0",
      slicePeriod: "1",
      revocable: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await writeContractAsync({
      ...(address && { account: await getSigpassWallet() }),
      address: TOKEN_VESTING_CONTRACT_ADDRESS,
      abi: tokenVestingAbi,
      functionName: "createVestingSchedule",
      args: [
        values.beneficiary as `0x${string}`,
        parseUnits(values.amount, 18),
        BigInt(values.startTime),
        BigInt(values.cliff),
        BigInt(values.duration),
        BigInt(values.slicePeriod),
        values.revocable,
      ],
      chainId: westendAssetHub.id,
    });
  }

  /* Open status panel automatically when hash appears */
  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  return (
    <Card className="w-full border-0 bg-muted/20 shadow-sm">
      <CardHeader>
        <CardTitle>Create&nbsp;Vesting&nbsp;Schedule</CardTitle>
        <CardDescription>
          Lock tokens with optional slice&nbsp;period and revocability.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* beneficiary */}
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary</FormLabel>
                  <FormControl>
                    <Input placeholder="0x…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* timing */}
            <div className="grid grid-cols-3 gap-4">
              {["startTime","cliff","duration"].map((n)=>(
                <FormField
                  key={n}
                  control={form.control}
                  name={n as "startTime"|"cliff"|"duration"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{n.replace(/([A-Z])/g," $1")}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {/* slice */}
            <FormField
              control={form.control}
              name="slicePeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slice&nbsp;Period&nbsp;(s)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* revocable */}
            <FormField
              control={form.control}
              name="revocable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.currentTarget.checked)}
                      className="h-4 w-4 accent-pink-500"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Revocable by creator</FormLabel>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <span className="text-xs text-muted-foreground">
          UNIX&nbsp;seconds are used for all timestamps; ensure your wallet signs accurate values.
        </span>

        {/* transaction status trigger */}
        {isDesktop ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Transaction&nbsp;status <ChevronDown className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transaction status</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Follow every step—from wallet signature to final confirmation.
              </DialogDescription>
              <TransactionStatus
                hash={hash}
                isPending={isPending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                error={error ?? undefined}
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
                Transaction&nbsp;status <ChevronDown className="w-4 h-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Transaction status</DrawerTitle>
                <DrawerDescription>
                  Follow every step—from wallet signature to final confirmation.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <TransactionStatus
                  hash={hash}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  isConfirmed={isConfirmed}
                  error={error ?? undefined}
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
      </CardFooter>
    </Card>
  );
}