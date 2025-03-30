'use client';
import { localConfig } from '@/app/providers';
import { useMediaQuery } from '@/hooks/use-media-query';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react'
import { Address, BaseError, formatEther, isAddress, parseEther, parseUnits } from 'viem';
import { useConfig, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { z } from 'zod';
import { addressAtom } from '../sigpasskit';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn, truncateHash } from '@/lib/utils';
import { format } from "date-fns"
import { Ban, CalendarIcon, ChevronDown, ChevronLeftIcon, CircleCheck, ExternalLink, FormInput, Hash, LoaderCircle, X } from 'lucide-react';
import { ScrollBar, ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { westendAssetHub } from '@/lib/chains';
import { getSigpassWallet } from '@/lib/sigpass';
import CopyButton from '../copy-button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '../ui/drawer';
import { mockERC20Abi } from '@/lib/mockERC20Abi';

export default function CreateTokenVestingTab() {

    const config = useConfig();

    const account = useAccount();

    const isDesktop = useMediaQuery("(min-width: 768px)");

    // get the address from session storage
    const address = useAtomValue(addressAtom);

    const [open, setOpen] = useState(false);

    const formSchema: any = z.object({
        beneficiary: z.custom<`0x${string}`>((val) => isAddress(val), {
            message: 'Beneficiary address is required',
        }).refine((val) => val != null && val != undefined && isAddress(val as string), {
            message: 'Invalid address',
        }),

        token: z.string({
            required_error: 'Token is required',
        }).refine((val) => val != null && val != undefined && isAddress(val), {
            message: 'Invalid address',
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

        startTime: z.coerce.date().refine((val) => val.getTime() > Date.now(), 'Start time must be in the future').default(() => new Date(Date.now() + 1000 * 40)),

        endVestingTime: z.coerce.date().refine((val) => val.getTime() > Date.now(), 'Start time must be in the future').default(() => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),

        startCliffTime: z.coerce.date().refine((val) => val.getTime() > Date.now(), 'Start time must be in the future').default(() => new Date(Date.now() + 1000 * 40))
    }).refine((data) => {
        if (!data.startTime || !data.startCliffTime) return true; // Skip validation if values are missing
        return data.startTime.getTime() <= data.startCliffTime.getTime();
    }, {
        message: "Start time must be before or equal to cliff time",
        path: ["startTime"],
    }).refine((data) => {
        if (!data.startCliffTime || !data.endVestingTime) return true; // Skip validation if values are missing
        return data.startCliffTime.getTime() < data.endVestingTime.getTime();
    }, {
        message: "Cliff time must be before end vesting time",
        path: ["endVestingTime"],
    }).refine((data) => {
        if (!data.beneficiary) return true; // Skip validation if values are missing
        return whitelistedData != null && whitelistedData == true;
    }, {
        message: "Address is not an beneficiary",
        path: ["beneficiary"],
    }).refine((data) => {
        if (!data.token) return true; // Skip validation if values are missing
        return whitelistedTokenData != null && whitelistedTokenData == true;
    }, {
        message: "Token is not in whitelists",
        path: ["token"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            beneficiary: undefined,
            token: undefined,
            startTime: new Date(Date.now() + 1000 * 40),
            startCliffTime: new Date(Date.now() + 1000 * 40),
            endVestingTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            amount: "",
        }
    })

    // Whitelisted token
    const { data: whitelistedTokenData, refetch: refetchWhitelistedToken } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as Address,
        abi: tokenVestingAbi,
        functionName: 'tokens',
        args: [form.getValues().token],
        query: {
            enabled: account.isConnected && form.getValues().token != null && isAddress(form.getValues().token),
        }
    });

    // Beneficiary
    const { data: whitelistedData, refetch: refetchWhitelisted } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as Address,
        abi: tokenVestingAbi,
        functionName: 'whitelist',
        args: [form.getValues().beneficiary],
        query: {
            enabled: account.isConnected && form.getValues().beneficiary != null && isAddress(form.getValues().beneficiary),
        }
    });

    // Token Balance
    const { data: tokenData, refetch: refetchToken } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [{
            address: form.getValues().token as Address,
            abi: mockERC20Abi,
            functionName: 'balanceOf',
            args: [address ? address : account.address],
        },
        {
            address: form.getValues().token as Address,
            abi: mockERC20Abi,
            functionName: 'decimals',
        },
        {
            address: form.getValues().token as Address,
            abi: mockERC20Abi,
            functionName: 'allowance',
            args: [
                address ? address : account.address,
                contractAddresses.TOKEN_VESTING as Address
            ],
        }],
        query: {
            enabled: account.isConnected && form.getValues().token != null && isAddress(form.getValues().token),
        }
    });

    const maxBalance = tokenData?.[0]?.result as bigint | undefined;
    const decimals = tokenData?.[1]?.result as number | undefined;
    const allowances = tokenData?.[2]?.result as bigint | undefined;

    // extract the amount value from the form
    const amount = form.watch("amount");

    // check if the amount is greater than the mint allowance
    const needsApprove = allowances != undefined &&
        amount != undefined && amount != null ?
        allowances < parseUnits(amount, decimals || 18) :
        false;

    const {
        data: hash,
        error,
        isPending,
        writeContractAsync
    } = useWriteContract({
        config: address ? localConfig : config,
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        const amountInWei = parseEther(data.amount).toString();

        const startTime = Math.floor(data.startTime / 1000);

        const cliffDuration = Math.floor((data.startCliffTime.getTime() - data.startTime.getTime()) / 1000);

        const vestingDuration = Math.floor((data.endVestingTime.getTime() - data.startTime.getTime()) / 1000);

        console.log(allowances);
        console.log(BigInt(amountInWei));

        if (address) {
            if (needsApprove) {
                console.log("Need to approve");
                await writeContractAsync({
                    account: await getSigpassWallet(),
                    address: data.token as `0x${string}`,
                    abi: mockERC20Abi,
                    functionName: "approve",
                    args: [contractAddresses.TOKEN_VESTING as `0x${string}`, amountInWei],
                    chainId: westendAssetHub.id
                });
            }
        }

        if (!address) {
            if (needsApprove) {
                console.log("Need to approve");
                await writeContractAsync({
                    address: data.token as `0x${string}`,
                    abi: mockERC20Abi,
                    functionName: "approve",
                    args: [contractAddresses.TOKEN_VESTING as `0x${string}`, amountInWei],
                    chainId: westendAssetHub.id
                });
            }
        }

        if (!address && !needsApprove) {
            await writeContractAsync({
                account: await getSigpassWallet(),
                address: contractAddresses.TOKEN_VESTING as `0x${string}`,
                abi: tokenVestingAbi,
                functionName: "createVestingSchedule",
                args: [data.beneficiary as Address, amountInWei, cliffDuration, vestingDuration, startTime, data.token as Address],
                chainId: westendAssetHub.id
            })
        }

        if (address && !needsApprove) {
            await writeContractAsync({
                address: contractAddresses.TOKEN_VESTING as `0x${string}`,
                abi: tokenVestingAbi,
                functionName: "createVestingSchedule",
                args: [data.beneficiary as Address, amountInWei, cliffDuration, vestingDuration, startTime, data.token as Address],
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
            refetchWhitelistedToken();
            refetchToken();
        }
    }, [isConfirmed, refetchWhitelisted, refetchToken, refetchWhitelistedToken]);

    // Find the chain ID from the connected account
    const chainId = account.chainId;

    // Get the block explorer URL for the current chain using the config object
    function getBlockExplorerUrl(chainId: number | undefined): string | undefined {
        const chain = config.chains?.find(chain => chain.id === chainId);
        return chain?.blockExplorers?.default?.url || config.chains?.[0]?.blockExplorers?.default?.url;
    }

    function handleDateSelect(fieldName: any, date: Date | undefined) {
        if (date) {
            form.setValue(fieldName, date);
        }
    }

    function handleTimeChange(setValueName: any, type: "hour" | "minute" | "ampm", value: string,) {
        const currentDate = form.getValues(setValueName) || new Date();
        let newDate = new Date(currentDate);

        if (type === "hour") {
            const hour = parseInt(value, 10);
            newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
        } else if (type === "minute") {
            newDate.setMinutes(parseInt(value, 10));
        } else if (type === "ampm") {
            const hours = newDate.getHours();
            if (value === "AM" && hours >= 12) {
                newDate.setHours(hours - 12);
            } else if (value === "PM" && hours < 12) {
                newDate.setHours(hours + 12);
            }
        }
        form.setValue(
            setValueName,
            newDate
        );
    }

    return (
        <div className='flex flex-col items-center justify-center gap-6'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-[1fr_1fr] grid-rows-[auto_auto_auto] gap-x-10 gap-y-4 w-full">
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
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                            <FormItem className='flex flex-col h-full'>
                                <FormLabel>Token</FormLabel>
                                <FormControl>
                                    <Input placeholder="0x..." {...field} />
                                </FormControl>
                                <FormDescription>
                                    <div className="">
                                        <p>Balance: {maxBalance ? `${formatEther(maxBalance as bigint)}` : "0"}</p>
                                    </div>
                                    Address of the token to be vested.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Start time (12h)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "MM/dd/yyyy hh:mm aa")
                                                ) : (
                                                    <span>MM/DD/YYYY hh:mm aa</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <div className="sm:flex">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => handleDateSelect("startTime", date)}
                                                initialFocus
                                            />
                                            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i + 1)
                                                            .reverse()
                                                            .map((hour) => (
                                                                <Button
                                                                    key={hour}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() % 12 === hour % 12
                                                                                : (field.value as Date).getHours() % 12 === hour % 12)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() => {
                                                                        console.log(field.value)
                                                                        handleTimeChange("startTime", "hour", hour.toString())
                                                                    }}
                                                                >
                                                                    {hour}
                                                                </Button>
                                                            ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                                                            (minute) => (
                                                                <Button
                                                                    key={minute}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getMinutes() === minute
                                                                                : (field.value as Date).getMinutes() === minute)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange('startTime', "minute", minute.toString())
                                                                    }
                                                                >
                                                                    {minute.toString().padStart(2, '0')}
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="">
                                                    <div className="flex sm:flex-col p-2">
                                                        {["AM", "PM"].map((ampm) => (
                                                            <Button
                                                                key={ampm}
                                                                size="icon"
                                                                variant={
                                                                    field.value &&
                                                                        ((ampm === "AM" &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() < 12
                                                                                : (field.value as Date).getHours() < 12)) ||
                                                                            (ampm === "PM" &&
                                                                                (typeof field.value === 'number'
                                                                                    ? new Date(field.value * 1000).getHours() >= 12
                                                                                    : (field.value as Date).getHours() >= 12)))
                                                                        ? "default"
                                                                        : "ghost"
                                                                }
                                                                className="sm:w-full shrink-0 aspect-square"
                                                                onClick={() => handleTimeChange("startTime", "ampm", ampm)}
                                                            >
                                                                {ampm}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Time when vesting starts.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startCliffTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Start Cliff time (12h)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "MM/dd/yyyy hh:mm aa")
                                                ) : (
                                                    <span>MM/DD/YYYY hh:mm aa</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <div className="sm:flex">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => handleDateSelect("startCliffTime", date)}
                                                initialFocus
                                            />
                                            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i + 1)
                                                            .reverse()
                                                            .map((hour) => (
                                                                <Button
                                                                    key={hour}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() % 12 === hour % 12
                                                                                : (field.value as Date).getHours() % 12 === hour % 12)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange("startCliffTime", "hour", hour.toString())
                                                                    }
                                                                >
                                                                    {hour}
                                                                </Button>
                                                            ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                                                            (minute) => (
                                                                <Button
                                                                    key={minute}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getMinutes() === minute
                                                                                : (field.value as Date).getMinutes() === minute)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange('startCliffTime', "minute", minute.toString())
                                                                    }
                                                                >
                                                                    {minute.toString().padStart(2, '0')}
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="">
                                                    <div className="flex sm:flex-col p-2">
                                                        {["AM", "PM"].map((ampm) => (
                                                            <Button
                                                                key={ampm}
                                                                size="icon"
                                                                variant={
                                                                    field.value &&
                                                                        ((ampm === "AM" &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() < 12
                                                                                : (field.value as Date).getHours() < 12)) ||
                                                                            (ampm === "PM" &&
                                                                                (typeof field.value === 'number'
                                                                                    ? new Date(field.value * 1000).getHours() >= 12
                                                                                    : (field.value as Date).getHours() >= 12)))
                                                                        ? "default"
                                                                        : "ghost"
                                                                }
                                                                className="sm:w-full shrink-0 aspect-square"
                                                                onClick={() => handleTimeChange("startCliffTime", "ampm", ampm)}
                                                            >
                                                                {ampm}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Time when cliff starts.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="flex flex-col h-full">
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="0.0" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Amount of tokens to be vested.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endVestingTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>End Vesting time (12h)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "MM/dd/yyyy hh:mm aa")
                                                ) : (
                                                    <span>MM/DD/YYYY hh:mm aa</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <div className="sm:flex">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => handleDateSelect("endVestingTime", date)}
                                                initialFocus
                                            />
                                            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i + 1)
                                                            .reverse()
                                                            .map((hour) => (
                                                                <Button
                                                                    key={hour}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() % 12 === hour % 12
                                                                                : (field.value as Date).getHours() % 12 === hour % 12)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange("endVestingTime", "hour", hour.toString())
                                                                    }
                                                                >
                                                                    {hour}
                                                                </Button>
                                                            ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="w-64 sm:w-auto">
                                                    <div className="flex sm:flex-col p-2">
                                                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                                                            (minute) => (
                                                                <Button
                                                                    key={minute}
                                                                    size="icon"
                                                                    variant={
                                                                        field.value &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getMinutes() === minute
                                                                                : (field.value as Date).getMinutes() === minute)
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange('endVestingTime', "minute", minute.toString())
                                                                    }
                                                                >
                                                                    {minute.toString().padStart(2, '0')}
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="sm:hidden" />
                                                </ScrollArea>
                                                <ScrollArea className="">
                                                    <div className="flex sm:flex-col p-2">
                                                        {["AM", "PM"].map((ampm) => (
                                                            <Button
                                                                key={ampm}
                                                                size="icon"
                                                                variant={
                                                                    field.value &&
                                                                        ((ampm === "AM" &&
                                                                            (typeof field.value === 'number'
                                                                                ? new Date(field.value * 1000).getHours() < 12
                                                                                : (field.value as Date).getHours() < 12)) ||
                                                                            (ampm === "PM" &&
                                                                                (typeof field.value === 'number'
                                                                                    ? new Date(field.value * 1000).getHours() >= 12
                                                                                    : (field.value as Date).getHours() >= 12)))
                                                                        ? "default"
                                                                        : "ghost"
                                                                }
                                                                className="sm:w-full shrink-0 aspect-square"
                                                                onClick={() => handleTimeChange("endVestingTime", "ampm", ampm)}
                                                            >
                                                                {ampm}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Time when vesting ends.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {
                        isPending ? (
                            <Button type="submit" disabled className="w-full h-full">
                                <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in wallet...
                            </Button>
                        ) : needsApprove ? (
                            <Button type="submit" className="w-full h-full active:scale-95 ease-in-out duration-200">Approve</Button>
                        ) : (
                            <Button disabled className="w-full h-full active:scale-95 ease-in-out duration-200">Approve</Button>
                        )

                    }
                    {isPending ? (
                        <Button type="submit" disabled className="w-full h-full">
                            <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in
                            wallet...
                        </Button>
                    ) : needsApprove ? (
                        <Button type="submit" disabled className="w-full h-full mt-4 active:scale-95 ease-in-out duration-200 self-center">Create</Button>
                    ) : (
                        <Button type="submit" className="w-full h-full mt-4 active:scale-95 ease-in-out duration-200 self-center">Create</Button>
                    )}
                </form>
            </Form >
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
        </div >
    )
}
