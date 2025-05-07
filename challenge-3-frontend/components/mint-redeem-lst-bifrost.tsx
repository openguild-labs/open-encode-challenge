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
  useAccount,
} from "wagmi";
import type { WriteContractErrorType } from "wagmi/actions";

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
import { erc20Abi, moonbeamSlpxAbi } from "@/lib/abi";

export default function MintRedeemLstBifrost() {
  /* --------------------------------------------------------------------- */
  /*                             initial hooks                             */
  /* --------------------------------------------------------------------- */
  const config = useConfig();
  const account = useAccount();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const address = useAtomValue(addressAtom);

  /* --------------------------------------------------------------------- */
  /*                         write contract helpers                        */
  /* --------------------------------------------------------------------- */
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  /* --------------------------------------------------------------------- */
  /*                               constants                               */
  /* --------------------------------------------------------------------- */
  const XCDOT_CONTRACT_ADDRESS = "0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080";
  const XCASTR_CONTRACT_ADDRESS = "0xFfFFFfffA893AD19e540E172C10d78D4d479B5Cf";
  // GLMR is both the native token of Moonbeam and an ERC20 token
  const GLMR_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000802";
  const BIFROST_SLPX_CONTRACT_ADDRESS =
    "0xF1d4797E51a4640a76769A50b57abE7479ADd3d8";

  const getContractAddress = (token: string) => {
    switch (token) {
      case "xcdot":
        return XCDOT_CONTRACT_ADDRESS;
      case "xcastr":
        return XCASTR_CONTRACT_ADDRESS;
      case "glmr":
        return GLMR_CONTRACT_ADDRESS;
      default:
        return XCDOT_CONTRACT_ADDRESS;
    }
  };

  /* --------------------------------------------------------------------- */
  /*                               form setup                              */
  /* --------------------------------------------------------------------- */
  const formSchema = z.object({
    token: z.enum(["xcdot", "glmr", "xcastr"], {
      required_error: "Please select a token",
    }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "xcdot",
      amount: "",
    },
  });

  const selectedToken = form.watch("token");

  /* --------------------------------------------------------------------- */
  /*                           read-only contracts                         */
  /* --------------------------------------------------------------------- */
  const { data, refetch: refetchBalance } = useReadContracts({
    contracts: [
      {
        address: getContractAddress(selectedToken),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address ? address : account.address],
      },
      {
        address: getContractAddress(selectedToken),
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: getContractAddress(selectedToken),
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: getContractAddress(selectedToken),
        abi: erc20Abi,
        functionName: "allowance",
        args: [
          address ? address : account.address,
          BIFROST_SLPX_CONTRACT_ADDRESS,
        ],
      },
    ],
    config: address ? localConfig : config,
  });

  const maxBalance = data?.[0]?.result as bigint | undefined;
  const symbol = data?.[1]?.result as string | undefined;
  const decimals = data?.[2]?.result as number | undefined;
  const mintAllowance = data?.[3]?.result as bigint | undefined;

  const amount = form.watch("amount");
  const needsApprove =
    mintAllowance !== undefined && amount
      ? mintAllowance < parseUnits(amount, decimals || 18)
      : false;

  /* --------------------------------------------------------------------- */
  /*                            submit handler                             */
  /* --------------------------------------------------------------------- */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (needsApprove) {
      await writeContractAsync({
        ...(address && { account: await getSigpassWallet() }),
        address: getContractAddress(values.token),
        abi: erc20Abi,
        functionName: "approve",
        args: [
          BIFROST_SLPX_CONTRACT_ADDRESS,
          parseUnits(values.amount, decimals as number),
        ],
      });
      return;
    }

    const orderArgs = [
      getContractAddress(values.token),
      parseUnits(values.amount, decimals as number),
      1284, // Moonbeam chain id
      account.address, // receiver
      "dotui", // remark
      0, // channel_id
    ] as const;

    await writeContractAsync({
      ...(address && { account: await getSigpassWallet() }),
      address: BIFROST_SLPX_CONTRACT_ADDRESS,
      abi: moonbeamSlpxAbi,
      functionName: "create_order",
      args: orderArgs,
      ...(selectedToken === "glmr" && {
        value: parseUnits(values.amount, decimals as number),
      }),
    });
  }

  /* --------------------------------------------------------------------- */
  /*                       tx status + side effects                        */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  useEffect(() => {
    if (isConfirmed) refetchBalance();
  }, [isConfirmed, refetchBalance]);

  const explorerUrl =
    config.chains?.find((c) => c.id === account.chainId)?.blockExplorers
      ?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;

  /* --------------------------------------------------------------------- */
  /*                                render                                 */
  /* --------------------------------------------------------------------- */
  return (
    <Tabs defaultValue="mint" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="mint">Mint</TabsTrigger>
        <TabsTrigger value="redeem">Redeem</TabsTrigger>
      </TabsList>

      {/* ------------------------------- Mint ------------------------------ */}
      <TabsContent value="mint">
        <div className="flex flex-col gap-4 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* token selector */}
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a token" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Tokens</SelectLabel>
                            <SelectItem value="xcdot">xcDOT</SelectItem>
                            <SelectItem value="glmr">GLMR</SelectItem>
                            <SelectItem value="xcastr">xcASTR</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>The token to mint</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* amount input */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Amount</FormLabel>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <WalletMinimal className="w-4 h-4" />
                        {maxBalance !== undefined ? (
                          formatUnits(maxBalance, decimals as number)
                        ) : (
                          <Skeleton className="w-[80px] h-4" />
                        )}{" "}
                        {symbol ?? <Skeleton className="w-[40px] h-4" />}
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
                      The amount of{" "}
                      {selectedToken === "glmr" ? "GLMR" : symbol ?? "token"} to
                      mint
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* allowance & preview */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm">Token allowance</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <HandCoins className="w-4 h-4" />
                  {mintAllowance !== undefined ? (
                    formatUnits(mintAllowance, decimals as number)
                  ) : (
                    <Skeleton className="w-[80px] h-4" />
                  )}{" "}
                  {symbol ?? <Skeleton className="w-[40px] h-4" />}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-sm">You will receive</h2>
                <span className="text-xs text-muted-foreground">
                  {selectedToken === "glmr"
                    ? "xcvGLMR"
                    : selectedToken === "xcdot"
                    ? "xcvDOT"
                    : "xcvASTR"}
                </span>
              </div>

              {/* action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending || !needsApprove}
                >
                  {isPending && needsApprove ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                      Confirm…
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending || needsApprove}
                >
                  {isPending && !needsApprove ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                      Confirm…
                    </>
                  ) : (
                    "Mint"
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* status panel */}
          {isDesktop ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Transaction status <ChevronDown className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transaction status</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Follow every step—from wallet signature to final confirmation.
                </DialogDescription>
                <StatusBody
                  hash={hash}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  isConfirmed={isConfirmed}
                  error={error}
                  explorerUrl={explorerUrl}
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
                  Transaction status <ChevronDown className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Transaction status</DrawerTitle>
                  <DrawerDescription>
                    Follow every step—from wallet signature to final
                    confirmation.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-4">
                  <StatusBody
                    hash={hash}
                    isPending={isPending}
                    isConfirming={isConfirming}
                    isConfirmed={isConfirmed}
                    error={error}
                    explorerUrl={explorerUrl}
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
      </TabsContent>

      {/* ------------------------------ Redeem ----------------------------- */}
      <TabsContent value="redeem">
        <div className="w-full text-center py-12 text-muted-foreground">
          Redeem flow coming soon…
        </div>
      </TabsContent>
    </Tabs>
  );
}

/* --------------------------------------------------------------------- */
/*                              helpers                                  */
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
    <div className="flex flex-col gap-2 text-sm">
      {hash ? (
        <div className="flex items-center gap-2 break-all">
          <Hash className="w-4 h-4" />
          <span>Tx Hash</span>
          <a
            className="inline-flex items-center gap-1 underline underline-offset-4"
            href={`${explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {truncateHash(hash)}
            <ExternalLink className="w-4 h-4" />
          </a>
          <CopyButton copyText={hash} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" /> No transaction hash
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-blue-500">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Awaiting signature in wallet…
        </div>
      )}

      {!isPending && !isConfirming && !isConfirmed && (
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4" /> No transaction submitted
        </div>
      )}

      {isConfirming && (
        <div className="flex items-center gap-2 text-yellow-500">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Broadcast to network—waiting for confirmations…
        </div>
      )}

      {isConfirmed && (
        <div className="flex items-center gap-2 text-green-600">
          <CircleCheck className="w-4 h-4" />
          Confirmed on-chain!
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