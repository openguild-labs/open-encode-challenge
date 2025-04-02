'use client';
import { localConfig } from '@/app/providers';
import CopyButton from '@/components/copy-button';
import { addressAtom } from '@/components/sigpasskit';
import { DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { contractAddresses } from '@/lib/contractAddresses';
import { mockERC20Abi } from '@/lib/mockERC20Abi';
import { truncateHash } from '@/lib/utils';
import { yieldFarmingAbi } from '@/lib/yieldFarmingAbi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAtomValue } from 'jotai';
import { ChevronDown, ExternalLink, Ban, LoaderCircle, CircleCheck, X, Hash } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { isAddressEqual, zeroAddress, Address, parseUnits, BaseError } from 'viem';
import { useConfig, useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { z } from 'zod';

export default function YieldFarmingStakeTab() {
    const config = useConfig();

    const account = useAccount();

    const address = useAtomValue(addressAtom);

    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [open, setOpen] = useState(false);

    const {
        data: lpTokenData,
        isLoading: isLpTokenDataLoading,
        refetch: refetchLpTokenData,
        isFetched: isLpTokenDataFetched,
    } = useReadContract({
        config: address ? localConfig : config,
        abi: yieldFarmingAbi,
        address: contractAddresses.YIELD_FARMING as Address,
        functionName: 'lpToken',
        query: {
            enabled: true
        }
    });

    const lpToken = lpTokenData as Address | undefined;

    const { data: lpTokenAvailableData, refetch: refetchLpTokenAvailable } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [
            {
                address: lpToken as Address,
                abi: mockERC20Abi,
                functionName: 'name',
            },
            {
                address: lpToken as Address,
                abi: mockERC20Abi,
                functionName: 'symbol',
            },
            {
                address: lpToken as Address,
                abi: mockERC20Abi,
                functionName: 'decimals',
            },
        ],
        query: {
            enabled: isLpTokenDataFetched
                && lpToken != undefined
                && lpToken != null
                && !isAddressEqual(lpToken as Address, zeroAddress)
        }
    });

    const lpTokenName = lpTokenAvailableData?.[0]?.result as string | undefined;
    const lpTokenSymbol = lpTokenAvailableData?.[1]?.result as string | undefined;
    const lpTokenDecimals = lpTokenAvailableData?.[2]?.result as number | undefined;

    const { data: lpTokenHolderData, refetch: refetchLpTokenHolder } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [{
            address: lpToken as Address,
            abi: mockERC20Abi,
            functionName: 'balanceOf',
            args: [address ? address : account.address],
        },
        {
            address: lpToken as Address,
            abi: mockERC20Abi,
            functionName: 'allowance',
            args: [
                address ? address : account.address,
                contractAddresses.YIELD_FARMING as Address
            ],
        }],
        query: {
            enabled: account.isConnected
                && isLpTokenDataFetched
                && lpToken != undefined
                && lpToken != null
                && !isAddressEqual(lpToken as Address, zeroAddress)
        }
    })

    const lpTokenMaxBalances = lpTokenHolderData?.[0]?.result as bigint | undefined;
    const lpTokenAllowance = lpTokenHolderData?.[1]?.result as bigint | undefined;

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
                if (!lpTokenMaxBalances || !lpTokenDecimals) return;

                const inputAmount = parseUnits(val, lpTokenDecimals as number);

                if (inputAmount > (lpTokenMaxBalances as bigint)) {
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
        }
    })

    // extract the amount value from the form
    const amount = form.watch("amount");

    const lpTokenNeedsApprove = lpTokenAllowance != undefined &&
        amount != undefined && amount != null ?
        lpTokenAllowance < parseUnits(amount, lpTokenDecimals || 18) :
        false;

    const {
        data: hash,
        error,
        isPending,
        writeContractAsync
    } = useWriteContract({
        config: address ? localConfig : config,
    })

    async function onSubmit(data: z.infer<typeof formSchema>) { }

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
        }
    }, [isConfirmed]);

    // Find the chain ID from the connected account
    const chainId = account.chainId;

    // Get the block explorer URL for the current chain using the config object
    function getBlockExplorerUrl(chainId: number | undefined): string | undefined {
        const chain = config.chains?.find(chain => chain.id === chainId);
        return chain?.blockExplorers?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;
    }

    return (
        <div className="relative">
            {/* Enhanced decorative elements */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-purple-500/70 dark:bg-purple-800/70 rounded-full filter blur-3xl opacity-30 animate-pulse-slow"></div>
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-blue-500/70 dark:bg-blue-800/70 rounded-full filter blur-3xl opacity-30 animate-pulse-slow"></div>
            <div className="absolute top-1/4 right-1/3 w-24 h-24 bg-pink-500/50 dark:bg-pink-700/50 rounded-full filter blur-3xl opacity-20 animate-float"></div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-12 gap-y-6 w-full bg-black/5 dark:bg-white/5 rounded-xl p-6 shadow-lg border border-black/10 dark:border-white/10">
                    {/* Enhanced pattern overlay */}
                    <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 opacity-15 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                    {/* Shimmering effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 animate-shimmer"></div>

                    <div className="md:col-span-2 mb-4">
                        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient-x">Stake LP Tokens</h2>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 text-lg">Stake your tokens into the farming pool</p>
                        <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-2 animate-pulse-slow"></div>
                    </div>

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="flex flex-col h-full bg-white/50 dark:bg-black/50 p-4 rounded-lg transition-all duration-200 hover:shadow-md">
                                <FormLabel className="text-base font-medium flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                    Amount
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder="0.0"
                                        {...field}
                                        className="mt-2 transition-all border-2 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-300 dark:focus-within:ring-green-800"
                                    />
                                </FormControl>
                                <FormDescription className="mt-2 text-sm">
                                    Amount of tokens to be vested.
                                </FormDescription>
                                <FormMessage className="text-red-500 font-medium animate-pulse" />
                            </FormItem>
                        )}
                    />
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {isPending ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-16 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] ease-in-out duration-200 border border-white/10 overflow-hidden relative group"
                            >
                                <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming transaction...
                            </Button>
                        ) : lpTokenNeedsApprove ? (
                            <Button
                                type="submit"
                                className="w-full h-16 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] ease-in-out duration-200 border border-white/10 overflow-hidden relative group"
                            >
                                <span className="absolute -inset-x-10 -inset-y-20 bg-white/20 rotate-12 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></span>
                                Approve Token Transfer
                            </Button>
                        ) : (
                            <Button
                                disabled
                                className="w-full h-14 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium text-lg"
                            >
                                Approve Token Transfer
                            </Button>
                        )}

                        {isPending ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-14 rounded-xl bg-gray-200 dark:bg-gray-800"
                            >
                                <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming transaction...
                            </Button>
                        ) : lpTokenNeedsApprove ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-14 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium text-lg"
                            >
                                Approve Lp Token
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={!account.isConnected}
                                className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-[0.98] ease-in-out duration-200"
                            >
                                Stake Lp Token
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
            {/* Enhanced animated divider */}
            <div className="w-full h-1 my-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 dark:via-purple-600 to-transparent opacity-40 animate-gradient-x">
                </div >
            </div >
            {
                isDesktop ? (
                    <Dialog open={open} onOpenChange={setOpen} >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full md:w-2/3 mx-auto flex items-center gap-2 h-14 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-md hover:shadow-indigo-300 dark:hover:shadow-indigo-900/40 group"
                            >
                                <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
                                Transaction Status
                                <ChevronDown className="ml-auto transition-transform group-hover:scale-110" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-b from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/50 backdrop-blur-md shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                                    Transaction Status
                                </DialogTitle>
                            </DialogHeader>
                            <DialogDescription className="text-center">
                                Track your transaction progress below
                            </DialogDescription>
                            <div className="flex flex-col gap-4 p-4 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                {hash ? (
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all duration-200">
                                        <Hash className="w-5 h-5 text-indigo-600" />
                                        <span className="font-medium">Transaction Hash:</span>
                                        <a
                                            className="flex flex-row gap-2 items-center underline underline-offset-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                        <Hash className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-500">No transaction hash available</span>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {!isPending && !isConfirmed && !isConfirming && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-gray-200 dark:border-gray-800">
                                            <Ban className="w-5 h-5 text-gray-500" />
                                            <span className="text-gray-500">No transaction submitted yet</span>
                                        </div>
                                    )}

                                    {isConfirming && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 animate-pulse">
                                            <LoaderCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Waiting for confirmation...</span>
                                        </div>
                                    )}

                                    {isConfirmed && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <CircleCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <span className="text-green-600 dark:text-green-400 font-medium">Transaction confirmed successfully!</span>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                Error: {(error as BaseError).shortMessage || error.message}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" className="w-full rounded-lg border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all bg-gradient-to-r hover:bg-gradient-to-r from-transparent to-transparent hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-950/50 dark:hover:to-blue-950/50">
                                        Close
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full flex items-center gap-2 h-14 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-md hover:shadow-indigo-300 dark:hover:shadow-indigo-900/40 group"
                            >
                                <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
                                Transaction Status
                                <ChevronDown className="ml-auto transition-transform group-hover:scale-110" />
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="px-4 rounded-t-xl border-t-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-b from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/50">
                            <DrawerHeader className="pb-2">
                                <DrawerTitle className="text-xl font-bold text-center bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                                    Transaction Status
                                </DrawerTitle>
                                <DrawerDescription className="text-center">
                                    Track your transaction progress below
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="flex flex-col gap-4 p-4 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 mb-4">
                                {hash ? (
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                        <Hash className="w-5 h-5 flex-shrink-0 text-indigo-600" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">Transaction Hash:</span>
                                            <a
                                                className="flex flex-row gap-2 items-center underline underline-offset-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm"
                                                href={`${getBlockExplorerUrl(chainId)}/tx/${hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {truncateHash(hash)}
                                                <ExternalLink className="w-4 h-4" />
                                                <CopyButton copyText={hash} />
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                        <Hash className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-500">No transaction hash available</span>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {!isPending && !isConfirmed && !isConfirming && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-gray-200 dark:border-gray-800">
                                            <Ban className="w-5 h-5 text-gray-500" />
                                            <span className="text-gray-500">No transaction submitted yet</span>
                                        </div>
                                    )}

                                    {isConfirming && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 animate-pulse">
                                            <LoaderCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Waiting for confirmation...</span>
                                        </div>
                                    )}

                                    {isConfirmed && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <CircleCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <span className="text-green-600 dark:text-green-400 font-medium">Transaction confirmed successfully!</span>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex flex-row gap-2 items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                Error: {(error as BaseError).shortMessage || error.message}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20">
                                        Close
                                    </Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent >
                    </Drawer >
                )
            }
        </div>
    )
}
