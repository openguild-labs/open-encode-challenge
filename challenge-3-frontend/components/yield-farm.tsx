"use client";

// React
import { useState, useEffect } from "react";

// Wagmi
import {
  type BaseError,
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  useReadContracts,
  useAccount
} from "wagmi";

// viem
import { parseUnits, formatUnits } from "viem";

// Lucide (for icons)
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
  WalletMinimal,
  HandCoins,
} from "lucide-react";

// zod (for form validation)
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// react-hook-form (for form handling)
import { useForm } from "react-hook-form";

// UI components
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
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
import { Skeleton } from "@/components/ui/skeleton";

// utils imports
import { truncateHash } from "@/lib/utils";

// components imports
import CopyButton from "@/components/copy-button";
import { getSigpassWallet } from "@/lib/sigpass";

// jotai for state management
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";

// config
import { localConfig } from "@/app/providers";

// abi for the Moonbeam SLPX contract and ERC20 token
import { mockErc20Abi, yieldFarmingAbi } from "@/lib/abi";
import {
  lpTokenAddress,
  rewardTokenAddress,
  yieldFarmingAddress
} from "@/lib/constants";

export default function YieldFarm() {
  // useConfig hook to get config
  const config = useConfig();

  // useAccount hook to get account
  const account = useAccount();

  // useMediaQuery hook to check if the screen is desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // useState hook to open/close dialog/drawer
  const [open, setOpen] = useState(false);

  // get the address from session storage
  const address = useAtomValue(addressAtom);

  // useWriteContract hook to write contract
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  // form schema for sending transaction
  const formSchema = z.object({
    // amount is a required field
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
  });

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    // resolver is zodResolver
    resolver: zodResolver(formSchema),
    // default values for address and amount
    defaultValues: {
      amount: "",
    },
  });

  

  // useReadContracts hook to read contract
  const { data, refetch: refetchBalance } = useReadContracts({
    contracts: [
      {
        address: lpTokenAddress,
        abi: mockErc20Abi,
        functionName: "balanceOf",
        args: [address ? address : account.address],
      },
      {
        address: lpTokenAddress,
        abi: mockErc20Abi,
        functionName: "symbol",
      },
      {
        address: lpTokenAddress,
        abi: mockErc20Abi,
        functionName: "decimals",
      },
      {
        // get the allowance of the selected token
        address: lpTokenAddress,
        abi: mockErc20Abi,
        functionName: "allowance",
        args: [address ? address : account.address, yieldFarmingAddress],
      },
      {
        address: yieldFarmingAddress,
        abi: yieldFarmingAbi,
        functionName: "pendingRewards",
        args: [address ? address : account.address],
      },
    ],
    config: address ? localConfig : config,
  });

  const isOnchainLoading = data === undefined;


  // extract the data from the read contracts hook
  const maxBalance = data?.[0]?.result as bigint | undefined; // balance of the selected token
  const symbol = data?.[1]?.result as string | undefined; // symbol of the selected token
  const decimals = data?.[2]?.result as number | undefined; // decimals of the selected token
  const mintAllowance = data?.[3]?.result as bigint | undefined; // allowance of the selected token
  const pendingRewards = data?.[4]?.result as bigint | undefined;
  // extract the amount value from the form
  const amount = form.watch("amount");

  // check if the amount is greater than the mint allowance
//   const needsApprove = mintAllowance !== undefined && 
//     amount ? 
//     mintAllowance < parseUnits(amount, decimals || 18) : 
//     false;

    const needsApprove = typeof mintAllowance === "bigint" &&typeof decimals === "number" &&  amount && mintAllowance < parseUnits(amount, decimals);

console.log("needsApprove", needsApprove);
  console.log("mintAllowance", mintAllowance);
  console.log("maxBalance", maxBalance);


  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submitting form with values:", values);
    try {
      if (needsApprove) {
        console.log("Approving...");
        await writeContractAsync({
          address: lpTokenAddress,
          abi: mockErc20Abi,
          functionName: "approve",
          args: [yieldFarmingAddress, parseUnits(values.amount, decimals as number)],
        });
      } else {
        console.log("Staking...");
        await writeContractAsync({
          address: yieldFarmingAddress,
          abi: yieldFarmingAbi,
          functionName: "stake",
          args: [parseUnits(values.amount, decimals as number)],
        });
      }
    } catch (error) {
      console.error("Error during transaction:", error);
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

  // when isConfirmed, refetch the balance of the address
  useEffect(() => {
    if (isConfirmed) {
      refetchBalance();
    }
  }, [isConfirmed, refetchBalance]);

  // Find the chain ID from the connected account
  const chainId = account.chainId;

  // Get the block explorer URL for the current chain using the config object
  function getBlockExplorerUrl(chainId: number | undefined): string | undefined {
    const chain = config.chains?.find(chain => chain.id === chainId);
    return chain?.blockExplorers?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;
  }

  return (
    <Tabs defaultValue="stake" className="w-[320px] md:w-[425px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="stake">Stake</TabsTrigger>
        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
      </TabsList>
      <TabsContent value="stake">
        <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
        <div className="flex flex-col gap-4">
          <Button
            onClick={async () => {
              try {
                const userAddress = address || account.address; // Use fallback if address is undefined
                if (userAddress) {
                  console.log("Minting tokens for address:", userAddress);
                  await writeContractAsync({
                    account: await getSigpassWallet(),
                    address: lpTokenAddress,
                    abi: mockErc20Abi,
                    functionName: "mint",
                    args: [userAddress, parseUnits("1000", decimals || 18)],
                  });
                  console.log("Minting successful!");
                  refetchBalance(); // Refetch balance after minting
                } else {
                  console.error("No address found for minting.");
                }
              } catch (error) {
                console.error("Error during minting:", error);
              }
            }}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <LoaderCircle className="animate-spin mr-2" />
            ) : null}
            Mint 1000 LP Tokens
          </Button>
        </div>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row gap-2 items-center justify-between">
                  <FormLabel>Amount to stake</FormLabel>
                  <div className="flex flex-row gap-2 items-center text-xs text-muted-foreground">
                    <WalletMinimal className="w-4 h-4" />{" "}
                    {maxBalance ? (
                      formatUnits(maxBalance as bigint, decimals as number)
                    ) : (
                      <Skeleton className="w-[80px] h-4" />
                    )}{" "}
                    LP Token
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
                  The amount of LPToken to stake
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
              type="submit"
              className="w-full"
              disabled={isPending || !amount || isOnchainLoading}
            >
              {isPending ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : needsApprove ? (
                "Approve"
              ) : (
                "Stake"
              )}
            </Button>
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
                        <a
                          className="flex flex-row gap-2 items-center underline underline-offset-4"
                          href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
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
                        <Hash className="w-4 h-4" />
                        No transaction hash
                      </div>
                    )}
                    {!isPending && !isConfirmed && !isConfirming && (
                      <div className="flex flex-row gap-2 items-center">
                        <Ban className="w-4 h-4" /> No transaction submitted
                      </div>
                    )}
                    {isConfirming && (
                      <div className="flex flex-row gap-2 items-center text-yellow-500">
                        <LoaderCircle className="w-4 h-4 animate-spin" />{" "}
                        Waiting for confirmation...
                      </div>
                    )}
                    {isConfirmed && (
                      <div className="flex flex-row gap-2 items-center text-green-500">
                        <CircleCheck className="w-4 h-4" /> Transaction
                        confirmed!
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
                        <a
                          className="flex flex-row gap-2 items-center underline underline-offset-4"
                          href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
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
                    {!isPending && !isConfirmed && !isConfirming && (
                      <div className="flex flex-row gap-2 items-center">
                        <Ban className="w-4 h-4" /> No transaction submitted
                      </div>
                    )}
                    {isConfirming && (
                      <div className="flex flex-row gap-2 items-center text-yellow-500">
                        <LoaderCircle className="w-4 h-4 animate-spin" />{" "}
                        Waiting for confirmation...
                      </div>
                    )}
                    {isConfirmed && (
                      <div className="flex flex-row gap-2 items-center text-green-500">
                        <CircleCheck className="w-4 h-4" /> Transaction
                        confirmed!
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
      </TabsContent>
      <TabsContent value="withdraw">Placeholder</TabsContent>
    </Tabs>
  );
}

