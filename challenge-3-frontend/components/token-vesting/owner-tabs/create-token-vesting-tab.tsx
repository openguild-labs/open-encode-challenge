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
import { addressAtom } from '../../sigpasskit';
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
import { Ban, CalendarIcon, ChevronDown, ChevronLeftIcon, CircleCheck, CloudLightning, ExternalLink, FormInput, Hash, LoaderCircle, X } from 'lucide-react';
import { ScrollBar, ScrollArea } from '../../ui/scroll-area';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { westendAssetHub } from '@/lib/chains';
import { getSigpassWallet } from '@/lib/sigpass';
import CopyButton from '../../copy-button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '../../ui/drawer';
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
        const newDate = new Date(currentDate);

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
        <div className='flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto'>
            <div className="w-full text-center mb-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">Create Vesting Schedule</h2>
                <p className="text-muted-foreground mt-2">Set up a new token vesting schedule with customized parameters</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 w-full bg-black/5 dark:bg-white/5 rounded-xl p-6 shadow-lg border border-black/10 dark:border-white/10">
                    <FormField
                        control={form.control}
                        name="beneficiary"
                        render={({ field }) => (
                            <FormItem className='flex flex-col h-full bg-white/50 dark:bg-black/50 p-4 rounded-lg transition-all duration-200 hover:shadow-md'>
                                <FormLabel className="text-base font-medium flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                                    Beneficiary Address
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="0x..."
                                        {...field}
                                        className="mt-2 transition-all border-2 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-300 dark:focus-within:ring-purple-800"
                                    />
                                </FormControl>
                                <FormDescription className="mt-2 text-sm">
                                    Address of the vesting beneficiary.
                                </FormDescription>
                                <FormMessage className="text-red-500 font-medium animate-pulse" />
                            </FormItem>
                        )}
                    />
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
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 px-3 py-1 text-xs text-white font-medium animate-pulse">
                                        Balance: {maxBalance ? `${formatEther(maxBalance as bigint)}` : "0"}
                                    </div>
                                </div>
                                <FormDescription className="mt-2 text-sm">
                                    Address of the token to be vested.
                                </FormDescription>
                                <FormMessage className="text-red-500 font-medium animate-pulse" />
                            </FormItem>
                        )}
                    />
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

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900">
                        <h3 className="md:col-span-3 font-semibold text-lg text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" /> Time Settings
                        </h3>

                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-base font-medium text-indigo-700 dark:text-indigo-300">Start Time</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all",
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
                                        <PopoverContent className="w-auto p-0 border-2 border-indigo-200 dark:border-indigo-800">
                                            <div className="sm:flex">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => handleDateSelect("startTime", date)}
                                                    initialFocus
                                                    className="border-r border-indigo-200 dark:border-indigo-800"
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
                                                                        onClick={() => handleTimeChange("startTime", "hour", hour.toString())}
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
                                    <FormDescription className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">
                                        When vesting begins
                                    </FormDescription>
                                    <FormMessage className="text-red-500 font-medium animate-pulse" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="startCliffTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-base font-medium text-indigo-700 dark:text-indigo-300">Cliff Time</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all",
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
                                        <PopoverContent className="w-auto p-0 border-2 border-indigo-200 dark:border-indigo-800">
                                            <div className="sm:flex">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => handleDateSelect("startCliffTime", date)}
                                                    initialFocus
                                                    className="border-r border-indigo-200 dark:border-indigo-800"
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
                                    <FormDescription className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">
                                        Start of cliff period
                                    </FormDescription>
                                    <FormMessage className="text-red-500 font-medium animate-pulse" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="endVestingTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-base font-medium text-indigo-700 dark:text-indigo-300">End Time</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all",
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
                                        <PopoverContent className="w-auto p-0 border-2 border-indigo-200 dark:border-indigo-800">
                                            <div className="sm:flex">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => handleDateSelect("endVestingTime", date)}
                                                    initialFocus
                                                    className="border-r border-indigo-200 dark:border-indigo-800"
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
                                    </Popover >
                                    <FormDescription className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">
                                        When vesting completes
                                    </FormDescription>
                                    <FormMessage className="text-red-500 font-medium animate-pulse" />
                                </FormItem >
                            )
                            }
                        />
                    </div >

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {isPending ? (
                            <Button type="submit" disabled className="w-full h-14 rounded-xl bg-gray-200 dark:bg-gray-800">
                                <LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Confirming transaction...
                            </Button>
                        ) : needsApprove ? (
                            <Button
                                type="submit"
                                className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-lg shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all active:scale-[0.98] ease-in-out duration-200"
                            >
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
                        ) : needsApprove ? (
                            <Button
                                type="submit"
                                disabled
                                className="w-full h-14 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium text-lg"
                            >
                                Create Vesting Schedule
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-[0.98] ease-in-out duration-200"
                            >
                                Create Vesting Schedule
                            </Button>
                        )}
                    </div>
                </form >
            </Form >
            {
                isDesktop ? (
                    <Dialog open={open} onOpenChange={setOpen} >
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
                        </DialogContent >
                    </Dialog >
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
                )
            }
        </div >
    )
}
