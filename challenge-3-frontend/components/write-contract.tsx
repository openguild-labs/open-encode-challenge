"use client";

// React imports
import { useState, useEffect } from "react";

// Wagmi imports
import {
  type BaseError,
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  useReadContracts,
  useAccount,
} from "wagmi";
import type { WriteContractErrorType } from "wagmi/actions";

// Viem imports
import { parseUnits, formatUnits, isAddress, Address } from "viem";

// Lucide imports (for icons)
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
  WalletMinimal,
} from "lucide-react";

// Zod imports
import { z } from "zod";

// Zod resolver imports
import { zodResolver } from "@hookform/resolvers/zod";

// React hook form imports
import { useForm } from "react-hook-form";

// UI imports
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

// Utils imports
import { truncateHash } from "@/lib/utils";

// Component imports
import CopyButton from "@/components/copy-button";

// Library imports
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { Skeleton } from "@/components/ui/skeleton";
import { localConfig } from "@/app/providers";

// Abi for ERC20 Token  
import { erc20AbiExtend } from "@/lib/abi";

export default function WriteContract() {
  const config = useConfig();
  const account = useAccount();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const address = useAtomValue(addressAtom);

  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  const USDC_CONTRACT_ADDRESS = "0xc8576Fb6De558b313afe0302B3fedc6F6447BbEE";

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20AbiExtend,
        functionName: "balanceOf",
        args: [address ? address : account.address],
      },
      {
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20AbiExtend,
        functionName: "decimals",
      },
    ],
    config: address ? localConfig : config,
  });

  const maxBalance = data?.[0]?.result as bigint | undefined;
  const decimals = data?.[1]?.result as number | undefined;

  const formSchema = z.object({
    address: z
      .string()
      .min(2)
      .max(50)
      .refine((val) => val === "" || isAddress(val), {
        message: "Invalid address format",
      }) as z.ZodType<Address | "">,
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
      address: "",
      amount: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (address) {
      await writeContractAsync({
        account: await getSigpassWallet(),
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20AbiExtend,
        functionName: "transfer",
        args: [
          values.address as Address,
          parseUnits(values.amount, decimals as number),
        ],
        chainId: westendAssetHub.id,
      });
    } else {
      await writeContractAsync({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20AbiExtend,
        functionName: "transfer",
        args: [
          values.address as Address,
          parseUnits(values.amount, decimals as number),
        ],
        chainId: westendAssetHub.id,
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

  useEffect(() => {
    if (isConfirmed) refetch();
  }, [isConfirmed, refetch]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiving&nbsp;Address</FormLabel>
                <FormControl>
                  <Input placeholder="0xA0Cf…251e" {...field} />
                </FormControl>
                <FormDescription>
                  The address to send USDC to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Amount</FormLabel>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <WalletMinimal className="w-4 h-4" />
                    {maxBalance ? (
                      formatUnits(maxBalance, decimals as number)
                    ) : (
                      <Skeleton className="w-[80px] h-4" />
                    )}{" "}
                    USDC
                  </div>
                </div>
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
                <FormDescription>The amount of USDC to send</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {isPending ? (
            <Button type="submit" disabled className="w-full">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Confirm&nbsp;in&nbsp;wallet…
            </Button>
          ) : (
            <Button type="submit" className="w-full">
              Send
            </Button>
          )}
        </form>
      </Form>

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
              Follow every step—from wallet signature to confirmation.
            </DialogDescription>
            <StatusBody
              hash={hash}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isConfirmed}
              error={error}
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
                Follow every step—from wallet signature to confirmation.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <StatusBody
                hash={hash}
                isPending={isPending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                error={error}
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

/* --------------------------------------------------------------------- */
/*                          helper component                             */
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
          Confirmed&nbsp;on-chain!
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