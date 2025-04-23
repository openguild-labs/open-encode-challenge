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
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { localConfig } from "@/app/providers";
import { mockErc20Abi, yieldFarmingAbi } from "@/lib/abi";
import {
    LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
    YIELD_FARMING_CONTRACT_ADDRESS,
} from "@/lib/config";
import { Skeleton } from "../ui/skeleton";

export default function Withdraw() {
    const config = useConfig();
    const account = useAccount();
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [open, setOpen] = useState(false);
    const address = useAtomValue(addressAtom);
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
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: "",
        },
    });

    const {
        data: hash,
        error,
        isPending,
        writeContractAsync,
    } = useWriteContract({
        config: address ? localConfig : config,
    });

    const { data, refetch } = useReadContracts({
        contracts: [
            {
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "userInfo",
                args: [address ? address : account.address],
            },
            {
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "pendingRewards",
                args: [address ? address : account.address],
            },
            {
                address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
                abi: mockErc20Abi,
                functionName: "decimals",
            },
        ],
        config: address ? localConfig : config,
    });

    const maxBalance = (data?.[0]?.result as [bigint] | undefined)?.[0];
    const pendingRewards = data?.[1]?.result as bigint | undefined;
    const decimals = data?.[2]?.result as number | undefined;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (address) {
            writeContractAsync({
                account: await getSigpassWallet(),
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "withdraw",
                args: [parseUnits(values.amount, decimals as number)],
                chainId: westendAssetHub.id,
            });
        } else {
            writeContractAsync({
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "withdraw",
                args: [parseUnits(values.amount, decimals as number)],
                chainId: westendAssetHub.id,
            });
        }
    }

    const handleClaim = async () => {
        if (address) {
            writeContractAsync({
                account: await getSigpassWallet(),
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "claimRewards",
                chainId: westendAssetHub.id,
            });
        } else {
            writeContractAsync({
                address: YIELD_FARMING_CONTRACT_ADDRESS,
                abi: yieldFarmingAbi,
                functionName: "claimRewards",
                chainId: westendAssetHub.id,
            });
        }
    };

    useEffect(() => {
        if (hash) {
            setOpen(true);
        }
    }, [hash]);

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            hash,
            config: address ? localConfig : config,
        });

    useEffect(() => {
        if (isConfirmed) {
            refetch();
        }
    }, [isConfirmed, refetch]);

    return (
        <div className="flex flex-col gap-4 w-full">
            {pendingRewards && pendingRewards > 0 ? (
                <>
                    <span className="text-sm text-muted-foreground">
                        Total reward:&nbsp;
                        {formatUnits(pendingRewards as bigint, decimals as number)}
                    </span>
                    <Button className="w-full" onClick={handleClaim} disabled={isPending}>
                        Claim reward
                    </Button>
                </>
            ) : null}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex flex-row gap-2 items-center justify-between">
                                    <FormLabel>Amount to unstake</FormLabel>
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
                                    The amount of LPToken to unstake
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-row gap-2 items-center justify-between">
                        {isPending ? (
                            <Button type="submit" disabled className="w-full">
                                <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in
                                wallet...
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full">
                                Withdraw
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
            {
                // Desktop would be using dialog
                isDesktop ? (
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
                    // Mobile would be using drawer
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
                )
            }
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
                <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                    <a
                        className="flex flex-row gap-2 items-center underline underline-offset-4"
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
                <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    No transaction hash
                </div>
            )}

            {isPending && (
                <div className="flex flex-row gap-2 items-center text-blue-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Awaiting
                    signature in wallet…
                </div>
            )}

            {!isPending && !isConfirmed && !isConfirming && (
                <div className="flex flex-row gap-2 items-center">
                    <Ban className="w-4 h-4" /> No transaction submitted
                </div>
            )}
            {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Broadcast to
                    network—waiting for confirmations…
                </div>
            )}
            {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                    <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                </div>
            )}
            {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                    <X className="w-4 h-4" />{" "}
                    {"shortMessage" in (error as BaseError)
                        ? (error as BaseError).shortMessage
                        : (error as Error).message}
                </div>
            )}
        </div>
    );
}

function StatusDialog({
    open,
    setOpen,
    ...status
}: { open: boolean; setOpen: (v: boolean) => void } & StatusProps) {
    return (
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
                    Transaction status <ChevronDown />
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Transaction status</DrawerTitle>
                    <DrawerDescription>
                        Follow every step—from wallet signature to final confirmation.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-2 p-4">
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