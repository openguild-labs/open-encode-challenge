'use client';
import { localConfig } from '@/app/providers';
import { useMediaQuery } from '@/hooks/use-media-query';
import { westendAssetHub } from '@/lib/chains';
import { contractAddresses } from '@/lib/contractAddresses';
import { getSigpassWallet } from '@/lib/sigpass';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { truncateHash } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { Address } from 'viem';
import { useAtomValue } from 'jotai';
import { useForm } from 'react-hook-form';
import { LoaderCircle, ChevronDown, ExternalLink, Ban, Hash, CircleCheck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Button } from '../../ui/button';
import { isAddress } from 'viem';
import { BaseError, useAccount, useConfig, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { z } from 'zod';
import CopyButton from '../../copy-button';
import { addressAtom } from '../../sigpasskit';
import { DialogHeader, DialogFooter } from '../../ui/dialog';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '../../ui/drawer';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';

export default function ActTokenTab() {
    const config = useConfig();

    const account = useAccount({ config });

    const address = useAtomValue(addressAtom);

    // useMediaQuery hook to check if the screen is desktop
    const isDesktop = useMediaQuery("(min-width: 768px)");
    // useState hook to open/close dialog/drawer
    const [open, setOpen] = useState(false);

    const formSchema: any = z.object({
        token: z.custom<`0x${string}`>(
            (val) => {
                if (val == null || val == undefined) return true;
                return isAddress(val as `0x${string}`)
            }
            ,
            {
                message: 'Invalid address',
            })
    }).refine((data) => {
        if (!data.token) return true; // Skip validation if values are missing
        return whitelistedTokenData != null && whitelistedTokenData == false;
    }, {
        message: 'Token is not whitelisted yet',
        path: ['token'],
    }).refine((data) => {
        if (!data.token) return true; // Skip validation if values are missing
        return whitelistedTokenData != null && whitelistedTokenData == true;
    }, {
        message: 'Token is already whitelisted',
        path: ['token'],
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            token: undefined
        },
    });

    // Whitelisted token
    const { data: whitelistedTokenData, refetch: refetchWhitelistedToken } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'tokens',
        args: [form.getValues().token],
        query: {
            enabled: account.isConnected && form.getValues().token != null && isAddress(form.getValues().token),
        }
    });

    const {
        data: hash,
        error,
        isPending,
        writeContractAsync
    } = useWriteContract({
        config: address ? localConfig : config,
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        if (whitelistedTokenData == null || whitelistedTokenData == undefined) {
            return;
        }

        writeContractAsync({
            account: await getSigpassWallet(),
            address: contractAddresses.TOKEN_VESTING as `0x${string}`,
            abi: tokenVestingAbi,
            functionName: "changeWhitelistedToken",
            args: [data.token as Address, !whitelistedTokenData],
            chainId: westendAssetHub.id
        })
    }

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
            refetchWhitelistedToken();
        }
    }, [isConfirmed, refetchWhitelistedToken]);

    // Find the chain ID from the connected account
    const chainId = account.chainId;

    // Get the block explorer URL for the current chain using the config object
    function getBlockExplorerUrl(chainId: number | undefined): string | undefined {
        const chain = config.chains?.find(chain => chain.id === chainId);
        return chain?.blockExplorers?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;
    }


    return (
        <div className='flex flex-col items-center justify-center gap-6 max-w-4xl mx-auto'>
            <div className="w-full text-center mb-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">Token Whitelist Management</h2>
                <p className="text-muted-foreground mt-2">Add or remove tokens from the whitelist</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-y-6 w-full bg-black/5 dark:bg-white/5 rounded-xl p-6 shadow-lg border border-black/10 dark:border-white/10">
                    <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                            <FormItem className='flex flex-col h-full bg-white/50 dark:bg-black/50 p-4 rounded-lg transition-all duration-200 hover:shadow-md'>
                                <FormLabel className="text-base font-medium flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                                    Token Address
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="0x..."
                                        {...field}
                                        className="mt-2 transition-all border-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-300 dark:focus-within:ring-blue-800"
                                    />
                                </FormControl>
                                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                                    Note: Input to check if the token is already whitelisted.
                                </div>
                                <FormDescription className="mt-2 text-sm">
                                    Address of the vesting token.
                                </FormDescription>
                                <FormMessage className="text-red-500 font-medium animate-pulse" />
                            </FormItem>
                        )}
                    />

                    {isPending ? (
                        <Button type="submit" disabled className="w-full h-12 rounded-xl bg-gray-200 dark:bg-gray-800">
                            <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming in wallet...
                        </Button>
                    ) : (
                        <Button
                            disabled={(whitelistedTokenData as any) == null || (whitelistedTokenData as any) == undefined}
                            type="submit"
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-[0.98] ease-in-out duration-200"
                        >
                            {whitelistedTokenData === false
                                ? "Add token to Whitelist"
                                : "Remove token from Whitelist"
                            }
                        </Button>
                    )}
                </form>
            </Form>

            {isDesktop ? (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full md:w-2/3 mx-auto flex items-center gap-2 h-12 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                        >
                            <Hash className="w-4 h-4" /> Transaction Status <ChevronDown className="ml-auto" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-xl border-2 border-indigo-200 dark:border-indigo-800">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                                Transaction Status
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="text-center">
                            Track your transaction progress below
                        </DialogDescription>
                        <div className="flex flex-col gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                            {hash ? (
                                <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
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
                                <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <Hash className="w-5 h-5 text-gray-500" />
                                    <span className="text-gray-500">No transaction hash available</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {!isPending && !isConfirmed && !isConfirming && (
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-gray-800">
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
                                <Button variant="outline" className="w-full rounded-lg border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all">
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
                            className="w-full flex items-center gap-2 h-12 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                        >
                            <Hash className="w-4 h-4" /> Transaction Status <ChevronDown className="ml-auto" />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="px-4 rounded-t-xl border-t-2 border-indigo-200 dark:border-indigo-800">
                        <DrawerHeader className="pb-2">
                            <DrawerTitle className="text-xl font-bold text-center bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                                Transaction Status
                            </DrawerTitle>
                            <DrawerDescription className="text-center">
                                Track your transaction progress below
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="flex flex-col gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg mb-4">
                            {hash ? (
                                <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
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
                                <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <Hash className="w-5 h-5 text-gray-500" />
                                    <span className="text-gray-500">No transaction hash available</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {!isPending && !isConfirmed && !isConfirming && (
                                    <div className="flex flex-row gap-2 items-center p-3 bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-gray-800">
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
                                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-medium transition-all active:scale-[0.98]">
                                    Close
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    )
}
