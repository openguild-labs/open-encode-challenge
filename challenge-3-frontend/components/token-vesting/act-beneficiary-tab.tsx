'use client';
import { useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react'
import { useAccount, useConfig, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { addressAtom } from '../sigpasskit';
import { z } from 'zod';
import { Address, BaseError, isAddress } from 'viem';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { localConfig } from '@/app/providers';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getSigpassWallet } from '@/lib/sigpass';
import { westendAssetHub } from '@/lib/chains';
import { Ban, ChevronDown, CircleCheck, ExternalLink, Hash, LoaderCircle, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { truncateHash } from '@/lib/utils';
import CopyButton from '../copy-button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '../ui/drawer';

export default function ActBeneficiaryTab() {

    const config = useConfig();

    const account = useAccount({ config });

    const address = useAtomValue(addressAtom);

    // useMediaQuery hook to check if the screen is desktop
    const isDesktop = useMediaQuery("(min-width: 768px)");
    // useState hook to open/close dialog/drawer
    const [open, setOpen] = useState(false);

    const formSchema: any = z.object({
        beneficiary: z.custom<`0x${string}`>(
            (val) => {
                if (val == null || val == undefined) return true; // Skip validation if values are missing
                console.log(val);
                return isAddress(val as `0x${string}`)
            }
            ,
            {
                message: 'Invalid address',
            })
    }).refine((data) => {
        if (!data.beneficiary) return true; // Skip validation if values are missing
        return whitelistedData != null && whitelistedData == false;
    }, {
        message: 'Address is already an beneficiary',
        path: ['beneficiary'],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            beneficiary: undefined
        },
    });

    // Beneficiary
    const { data: whitelistedData, refetch: refetchWhitelisted } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'whitelist',
        args: [form.getValues().beneficiary],
        query: {
            enabled: account.isConnected && form.getValues().beneficiary != null && form.getValues().beneficiary != undefined && isAddress(form.getValues().beneficiary),
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
        if (whitelistedData == null || whitelistedData == undefined) {
            return;
        }

        if (whitelistedData == false) {
            // Add Beneficiary
            console.log("Add Beneficiary", data.beneficiary);
            writeContractAsync({
                account: await getSigpassWallet(),
                address: contractAddresses.TOKEN_VESTING as `0x${string}`,
                abi: tokenVestingAbi,
                functionName: "addToWhitelist",
                args: [data.beneficiary as Address],
                chainId: westendAssetHub.id
            })
        }
        else {
            // Remove Beneficiary
            console.log("Remove Beneficiary", data.beneficiary);
            writeContractAsync({
                account: await getSigpassWallet(),
                address: contractAddresses.TOKEN_VESTING as `0x${string}`,
                abi: tokenVestingAbi,
                functionName: "removeFromWhitelist",
                args: [data.beneficiary as Address],
                chainId: westendAssetHub.id
            })
        }
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
            refetchWhitelisted();
        }
    }, [isConfirmed, refetchWhitelisted]);

    // Find the chain ID from the connected account
    const chainId = account.chainId;

    // Get the block explorer URL for the current chain using the config object
    function getBlockExplorerUrl(chainId: number | undefined): string | undefined {
        const chain = config.chains?.find(chain => chain.id === chainId);
        return chain?.blockExplorers?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;
    }

    return (
        <div className='flex flex-col items-center justify-center gap-2'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-[1fr] gap-x-10 gap-y-4 w-full">
                    <FormField
                        control={form.control}
                        name="beneficiary"
                        render={({ field }) => (
                            <FormItem className='flex flex-col h-full'>
                                <FormLabel>Beneficiary Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="0x..." {...field} />
                                </FormControl>
                                <FormDescription>
                                    Address of the vesting beneficiary.
                                    Note: Input to check if the address is already a beneficiary.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {
                        isPending ? (
                            <Button type="submit" disabled className="w-full">
                                <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in wallet...
                            </Button>
                        ) : (
                            <Button
                                disabled={(whitelistedData as any) == null || (whitelistedData as any) == undefined}
                                type="submit"
                                className="mt-4 col-span-2 active:scale-95 ease-in-out duration-200"
                            >
                                {
                                    whitelistedData == false ? "Add Beneficiary" : "Remove Beneficiary"
                                }
                            </Button>
                        )
                    }
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
    )
}
