"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useConfig,
  useReadContract,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import {
  ChevronDown,
  Clock,
  User,
  Coins,
  Calendar,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TransactionStatus from "@/components/transaction-status";
import { vestingABI } from "@/lib/vestingABI";
import { VESTING_CONTRACT_ADDRESS } from "@/lib/addresses";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub, localConfig } from "@/app/providers";
import { useMediaQuery } from "@/hooks/use-media-query";
import { erc20Abi } from "viem";

function useTokenApproval(
  tokenAddress: Address,
  spender: Address,
  amount: bigint
) {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const approve = async () => {
    return writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return { approve, isPending, error };
}

const formSchema = z.object({
  beneficiary: z.string().refine((val) => isAddress(val), {
    message: "Invalid address",
  }) as z.ZodType<Address>,
  tokenAddress: z.string().refine((val) => isAddress(val), {
    message: "Invalid token address",
  }) as z.ZodType<Address>,
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Must be positive",
    }),
  startTime: z.string().min(1, { message: "Required" }),
  cliffDuration: z.string().min(1, { message: "Required" }),
  vestingDuration: z.string().min(1, { message: "Required" }),
});

export default function CreateVestingForm() {
  const config = useConfig();
  const address = useAtomValue(addressAtom);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [approvalHash, setApprovalHash] = useState<Address>();
  const [approvalCompleted, setApprovalCompleted] = useState(false);

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

  // Get current time in seconds
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beneficiary: "",
      tokenAddress: "",
      amount: "",
      startTime: (currentTimeInSeconds + 300).toString(), // Current time + 5 minutes
      cliffDuration: "0",
      vestingDuration: "2592000", // 30 days in seconds
    },
  });

  const {
    approve: approveToken,
    isPending: isApprovalPending,
    error: approvalError,
  } = useTokenApproval(
    form.watch("tokenAddress") as Address,
    VESTING_CONTRACT_ADDRESS,
    parseUnits(form.watch("amount"), 18)
  );

  const handleStartTimeHelp = () => {
    setShowHint(!showHint);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // First check allowance
      const allowance = await config.publicClient?.readContract({
        address: values.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address || (await getSigpassWallet()), VESTING_CONTRACT_ADDRESS],
      });

      const amount = parseUnits(values.amount, 18);

      if (!allowance || allowance < amount) {
        // Need approval
        const hash = await approveToken();
        setApprovalHash(hash);
        // Wait for approval to complete
        await config.publicClient?.waitForTransactionReceipt({ hash });
        setApprovalCompleted(true);
      }

      // Proceed with vesting schedule creation
      const startTimeValue = BigInt(values.startTime);
      const cliffDurationValue = BigInt(values.cliffDuration);
      const vestingDurationValue = BigInt(values.vestingDuration);

      await writeContractAsync({
        ...(address && { account: await getSigpassWallet() }),
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingABI,
        functionName: "createVestingSchedule",
        args: [
          values.beneficiary,
          values.tokenAddress,
          amount,
          Number(startTimeValue),
          Number(cliffDurationValue),
          Number(vestingDurationValue),
        ],
        chainId: westendAssetHub.id,
      });
    } catch (err) {
      console.error("Transaction failed:", err);
    } finally {
      setApprovalCompleted(false);
    }
  }

  /* Open status panel automatically when hash appears */
  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  return (
    <Card className="border border-purple-500/20 shadow-md">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* beneficiary */}
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Beneficiary
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      className="border-purple-500/30 focus-visible:ring-purple-500"
                    />
                  </FormControl>
                  <FormDescription>
                    Address that will receive the vested tokens
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* token address */}
            <FormField
              control={form.control}
              name="tokenAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Token Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      className="border-purple-500/30 focus-visible:ring-purple-500"
                    />
                  </FormControl>
                  <FormDescription>
                    Address of the ERC20 token to be vested
                  </FormDescription>
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
                  <FormLabel className="flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Amount
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="100"
                      {...field}
                      className="border-purple-500/30 focus-visible:ring-purple-500"
                    />
                  </FormControl>
                  <FormDescription>Total tokens to be vested</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* startTime */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Start Time
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            UNIX timestamp in seconds
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="border-purple-500/30 focus-visible:ring-purple-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* cliff duration */}
              <FormField
                control={form.control}
                name="cliffDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Cliff (seconds)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="border-purple-500/30 focus-visible:ring-purple-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* vesting duration */}
              <FormField
                control={form.control}
                name="vestingDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Duration (seconds)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="border-purple-500/30 focus-visible:ring-purple-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showHint && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
                <p>Time Helper:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-xs">
                  <li>30 days = 2,592,000 seconds</li>
                  <li>90 days = 7,776,000 seconds</li>
                  <li>1 year = 31,536,000 seconds</li>
                  <li>Current Unix time: {currentTimeInSeconds}</li>
                </ul>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              disabled={isPending || isApprovalPending}
            >
              {isApprovalPending
                ? "Approving Tokens..."
                : isPending
                ? "Creating Schedule..."
                : "Create Vesting Schedule"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/30 rounded-b-lg p-4">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartTimeHelp}
            className="text-xs text-muted-foreground"
          >
            Show time reference
          </Button>

          <span className="text-xs text-muted-foreground">
            All times are in UNIX seconds
          </span>
        </div>

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
                Track your transaction from submission to confirmation
              </DialogDescription>
              <TransactionStatus
                hash={approvalHash || hash}
                isPending={isApprovalPending || isPending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                error={(approvalError || error) ?? undefined}
                explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
                customMessages={{
                  pending: isApprovalPending
                    ? "Approving tokens..."
                    : "Creating vesting schedule...",
                  success: isApprovalPending
                    ? "Tokens approved!"
                    : "Vesting schedule created!",
                }}
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
                  Track your transaction from submission to confirmation
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
