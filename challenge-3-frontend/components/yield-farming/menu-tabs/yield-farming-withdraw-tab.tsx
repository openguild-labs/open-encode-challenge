'use client';
import { localConfig } from '@/app/providers';
import CopyButton from '@/components/copy-button';
import { addressAtom } from '@/components/sigpasskit';
import { DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { contractAddresses } from '@/lib/contractAddresses';
import { mockERC20Abi } from '@/lib/mockERC20Abi';
import { truncateHash } from '@/lib/utils';
import { yieldFarmingAbi } from '@/lib/yieldFarmingAbi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAtomValue } from 'jotai';
import { ChevronDown, ExternalLink, Ban, LoaderCircle, CircleCheck, X, Hash, Wallet } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { isAddressEqual, zeroAddress, parseUnits, Address, BaseError } from 'viem';
import { useConfig, useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { z } from 'zod';

export default function YieldFarmingWithdrawTab() {

    const config = useConfig();

    const account = useAccount();

    const address = useAtomValue(addressAtom);

    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [open, setOpen] = useState(false);

    const {
        data: rewardTokenData,
        isLoading: isRewardTokenDataLoading,
        refetch: refetchRewardTokenData,
        isFetched: isRewardTokenDataFetched,
    } = useReadContract({
        config: address ? localConfig : config,
        abi: yieldFarmingAbi,
        address: contractAddresses.YIELD_FARMING as Address,
        functionName: 'rewardToken',
        query: {
            enabled: true
        }
    });

    const rewardToken = rewardTokenData as Address | undefined;

    const {
        data: stakerData,
        isLoading: isStakerDataLoading,
        refetch: refetchStakerData,
        isFetched: isStakerDataFetched,
    } = useReadContract({
        config: address ? localConfig : config,
        abi: yieldFarmingAbi,
        address: contractAddresses.YIELD_FARMING as Address,
        functionName: 'userInfo',
        args: [address ? address : account.address],
        query: {
            enabled: account.isConnected
        }
    });

    const userInfoAmount = (stakerData as any)?.[0] as bigint | undefined;
    const userInfoStartTime = (stakerData as any)?.[1] as number | undefined;
    const userInfoRewardDebt = (stakerData as any)?.[2] as bigint | undefined;
    const userInfoPendingRewards = (stakerData as any)?.[3] as bigint | undefined;

    const { data: rewardTokenDecimalsData, refetch: refetchRewardTokenDecimals } = useReadContract({
        config: address ? localConfig : config,
        address: rewardToken as Address,
        abi: mockERC20Abi,
        functionName: 'decimals',
        query: {
            enabled: account.isConnected
                && isRewardTokenDataFetched
                && rewardToken != undefined
                && rewardToken != null
                && !isAddressEqual(rewardToken as Address, zeroAddress)
        }
    })

    const rewardTokenDecimals = rewardTokenDecimalsData as number | undefined;

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
                if (!userInfoAmount || !rewardTokenDecimals) return;

                const inputAmount = parseUnits(val, rewardTokenDecimals as number);

                if (inputAmount > (userInfoAmount as bigint)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Amount exceeds available balance",
                    });
                }
            }),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: "",
        }
    })

    const amount = form.watch("amount");

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

    const chainId = account.chainId;

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
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-12 gap-y-6 w-full bg-gradient-to-br from-white/90 to-white/60 dark:from-black/70 dark:to-black/50 rounded-2xl p-8 shadow-2xl border border-white/30 dark:border-white/10 backdrop-blur-md relative overflow-hidden z-10">
                    {/* Enhanced pattern overlay */}
                    <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 opacity-15 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                    {/* Shimmering effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 animate-shimmer"></div>

                    <div className="md:col-span-2 mb-4">
                        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient-x">Withdraw LP Tokens</h2>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 text-lg">Withdraw your staked tokens from the farming pool</p>
                        <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-2 animate-pulse-slow"></div>
                    </div>

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="flex flex-col h-full bg-white/90 dark:bg-slate-900/80 p-6 rounded-xl transition-all duration-300 hover:shadow-xl border border-white/50 dark:border-indigo-900/50 transform hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-700 group">
                                <FormLabel className="text-base font-semibold flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-400">
                                    <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:scale-125 transition-transform">
                                        Amount
                                    </span>
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            placeholder="0.0"
                                            {...field}
                                            className="mt-1 transition-all border-2 p-6 text-lg font-medium focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-300/40 dark:focus-within:ring-purple-800/40 rounded-xl bg-white/90 dark:bg-black/50 shadow-inner"
                                        />
                                        <div className="absolute top-0 right-0 h-full flex items-center pr-4">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => form.setValue('amount', userInfoAmount ? userInfoAmount.toString() : '0')}
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-xs font-bold text-white px-3 py-1 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-95"
                                            >
                                                MAX
                                            </Button>
                                        </div>
                                    </div>
                                </FormControl>
                                <div className="flex justify-between items-center mt-3">
                                    <FormDescription className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                        <Wallet className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Available: <span className="font-mono font-medium text-indigo-600 dark:text-indigo-300">{userInfoAmount?.toString() || '0'}</span>
                                    </FormDescription>
                                    <div className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/50 animate-pulse-slow">
                                        LP Tokens
                                    </div>
                                </div>
                                <FormMessage className="text-red-500 font-medium animate-pulse mt-2" />
                            </FormItem>
                        )}
                    />

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {isPending ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-16 rounded-xl bg-gray-200 dark:bg-gray-800 transition-all duration-300"
                            >
                                <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming transaction...
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={!account.isConnected}
                                className="w-full h-16 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] ease-in-out duration-200 border border-white/10 overflow-hidden relative group"
                            >
                                <span className="absolute -inset-x-10 -inset-y-20 bg-white/20 rotate-12 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></span>
                                Withdraw LP Token
                            </Button>
                        )}

                        {isPending ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-16 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] ease-in-out duration-200 border border-white/10 overflow-hidden relative group"
                            >
                                <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming transaction...
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={!account.isConnected}
                                className="w-full h-16 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-700 hover:via-fuchsia-600 hover:to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] ease-in-out duration-200 border border-white/10 overflow-hidden relative group"
                            >
                                <span className="absolute -inset-x-10 -inset-y-20 bg-white/20 rotate-12 transform -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out"></span>
                                Emergency withdraw
                            </Button>
                        )}

                        {/* Enhanced information card */}
                        <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-950/60 dark:to-indigo-950/60 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 flex flex-col justify-center shadow-lg hover:shadow-blue-200/30 dark:hover:shadow-blue-900/30 transition-all duration-300 transform hover:-translate-y-1">
                            <h3 className="text-blue-700 dark:text-blue-400 font-semibold mb-1 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></span>
                                Withdrawal Info
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Withdrawing LP tokens will stop earning rewards for those tokens. Your earned rewards will be automatically sent to your wallet.
                            </p>
                        </div>
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
