"use client";

import { useState, useEffect } from "react";
import {
  type BaseError,
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  useReadContracts,
  useAccount,
} from "wagmi";
import type { WriteContractErrorType } from "wagmi/actions";
import { parseUnits, formatUnits } from "viem";
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
  WalletMinimal,
  Lock,
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
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
import { westendAssetHub, localConfig } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { Skeleton } from "@/components/ui/skeleton";
import { mockErc20Abi, yieldFarmingAbi } from "@/lib/abi";
import { LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS, YIELD_FARMING_CONTRACT_ADDRESS } from "@/lib/config";

export default function Stake() {
  const config = useConfig();
  const account = useAccount();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const address = useAtomValue(addressAtom);

  /* ------------------------------- schema ------------------------------- */
  const formSchema = z.object({
    amount: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
      })
      .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
        message: "Amount cannot have more than 18 decimal places",
      })
      .superRefine((val, ctx) => {
        if (!maxBalance || !decimals) return;
        const inputAmount = parseUnits(val, decimals as number);
        if (inputAmount > (maxBalance as bigint)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Amount exceeds available balance",
          });
        }
      }),
    lockDays: z.enum(["0", "7", "30", "90"]),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: "", lockDays: "0" },
  });

  /* ------------------------- on-chain allowances ------------------------ */
  const {
    data,
    refetch: refetchBalances,
  } = useReadContracts({
    contracts: [
      {
        address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
        abi: mockErc20Abi,
        functionName: "balanceOf",
        args: [address ?? account.address],
      },
      {
        address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
        abi: mockErc20Abi,
        functionName: "decimals",
      },
      {
        address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
        abi: mockErc20Abi,
        functionName: "allowance",
        args: [address ?? account.address, YIELD_FARMING_CONTRACT_ADDRESS],
      },
    ],
    config: address ? localConfig : config,
  });

  const maxBalance = data?.[0]?.result as bigint | undefined;
  const decimals = data?.[1]?.result as number | undefined;
  const allowance = data?.[2]?.result as bigint | undefined;

  const amountInput = form.watch("amount");
  const needsApprove =
    allowance !== undefined && amountInput
      ? allowance < parseUnits(amountInput, decimals || 18)
      : false;

  /* --------------------------- write helpers --------------------------- */
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const stakeAmount = parseUnits(values.amount, decimals as number);

    // off-chain analytics only use lockDays
    const txArgs = [stakeAmount] as const;

    if (address) {
      await writeOrApprove(txArgs, needsApprove, true);
    } else {
      await writeOrApprove(txArgs, needsApprove, false);
    }
  }

  async function writeOrApprove(
    stakeArgs: readonly [bigint],
    approveFirst: boolean,
    isSigpass: boolean
  ) {
    if (approveFirst) {
      await writeContractAsync({
        ...(isSigpass && { account: await getSigpassWallet() }),
        address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
        abi: mockErc20Abi,
        functionName: "approve",
        args: [YIELD_FARMING_CONTRACT_ADDRESS, stakeArgs[0]],
        chainId: westendAssetHub.id,
      });
    } else {
      await writeContractAsync({
        ...(isSigpass && { account: await getSigpassWallet() }),
        address: YIELD_FARMING_CONTRACT_ADDRESS,
        abi: yieldFarmingAbi,
        functionName: "stake",
        args: stakeArgs,
        chainId: westendAssetHub.id,
      });
    }
  }

  /* --------------------------- tx lifecycle ---------------------------- */
  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  useEffect(() => {
    if (isConfirmed) refetchBalances();
  }, [isConfirmed, refetchBalances]);

  /* ------------------------------ render ------------------------------- */
  return (
    <div className="flex flex-col gap-4 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* amount field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Amount&nbsp;to&nbsp;stake</FormLabel>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <WalletMinimal className="w-4 h-4" />
                    {maxBalance ? (
                      formatUnits(maxBalance, decimals as number)
                    ) : (
                      <Skeleton className="h-4 w-[80px]" />
                    )}
                    &nbsp;LP
                  </div>
                </div>
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
                <FormDescription>
                  Flexible deposits earn the base APR; locking boosts rewards.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* lock-period selector */}
          <FormField
            control={form.control}
            name="lockDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Lock&nbsp;Period
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Select period</SelectLabel>
                      <SelectItem value="0">None — flexible</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Longer locks receive a higher reward multiplier.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* submit */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                Confirm…
              </>
            ) : needsApprove ? (
              "Approve"
            ) : (
              "Stake"
            )}
          </Button>
        </form>
      </Form>

      {/* status dialog / drawer */}
      {isDesktop ? (
        <StatusDialog
          open={open}
          setOpen={setOpen}
          hash={hash}
          isPending={isPending}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          error={error}
          explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
        />
      ) : (
        <StatusDrawer
          open={open}
          setOpen={setOpen}
          hash={hash}
          isPending={isPending}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          error={error}
          explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*                               helpers                                 */
/* --------------------------------------------------------------------- */

type StatusProps = {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: BaseError | WriteContractErrorType | null | undefined;
  explorerUrl?: string;
};

function StatusBody({
  hash,
  isPending,
  isConfirming,
  isConfirmed,
  error,
  explorerUrl,
}: StatusProps) {
  return (
    <div className="flex flex-col gap-2">
      {hash ? (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          <span>Tx&nbsp;Hash</span>
          <a
            href={`${explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline underline-offset-4"
          >
            {truncateHash(hash)}
            <ExternalLink className="w-4 h-4" />
          </a>
          <CopyButton copyText={hash} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          <span>No&nbsp;hash</span>
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-blue-500">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Awaiting&nbsp;signature&nbsp;in&nbsp;wallet…
        </div>
      )}

      {!isPending && !isConfirming && !isConfirmed && (
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4" /> No&nbsp;transaction
        </div>
      )}

      {isConfirming && (
        <div className="flex items-center gap-2 text-yellow-500">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Broadcast&nbsp;to&nbsp;network—waiting&nbsp;for&nbsp;confirmations…
        </div>
      )}

      {isConfirmed && (
        <div className="flex items-center gap-2 text-green-500">
          <CircleCheck className="w-4 h-4" />
          Confirmed&nbsp;on-chain!&nbsp;Funds&nbsp;are&nbsp;now&nbsp;active.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500">
          <X className="w-4 h-4" />
          {"shortMessage" in (error as BaseError)
            ? (error as BaseError).shortMessage
            : (error as Error).message}
        </div>
      )}
    </div>
  );
}

// StatusDialog and StatusDrawer remain identical except for updated StatusProps
function StatusDialog({
  open,
  setOpen,
  ...status
}: { open: boolean; setOpen: (v: boolean) => void } & StatusProps) {
  return (
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
        <StatusBody {...status} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDrawer({
  open,
  setOpen,
  ...status
}: { open: boolean; setOpen: (v: boolean) => void } & StatusProps) {
  return (
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
          <StatusBody {...status} />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}