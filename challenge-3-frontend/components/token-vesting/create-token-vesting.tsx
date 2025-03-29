'use client';
import { localConfig } from '@/app/providers';
import { useMediaQuery } from '@/hooks/use-media-query';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { useAtomValue } from 'jotai';
import React from 'react'
import { isAddress } from 'viem';
import { useConfig, useAccount, useReadContract, useWriteContract } from 'wagmi';
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
import { cn } from '@/lib/utils';
import { format } from "date-fns"
import { CalendarIcon, ChevronLeftIcon, FormInput } from 'lucide-react';
import { ScrollBar, ScrollArea } from '../ui/scroll-area';

export default function CreateTokenVesting() {

    const config = useConfig();

    const account = useAccount();

    const isDesktop = useMediaQuery("(min-width: 768px)");

    // get the address from session storage
    const address = useAtomValue(addressAtom);

    const [tokenAddress, setTokenAddress] = React.useState<string | `0x${string}` | undefined>(undefined);

    const { data: whitelistedTokensData, refetch: refetchWhitelistedToken } = useReadContract({
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'tokens',
        args: [tokenAddress],
        query: {
            enabled: !!tokenAddress
        }
    });

    const { data: whitelistedData, refetch: refetchWhitelisted } = useReadContract({
        address: contractAddresses.TOKEN_VESTING as `0x${string}`,
        abi: tokenVestingAbi,
        functionName: 'whitelist',
        args: [account.address],
        query: {
            enabled: account.isConnected
        }
    });

    const {
        data: createVestingHash,
        error: createVestingHashError,
        isPending: createVestingHashIsPending,
        writeContractAsync: createVestingWriteContractAsync,
    } = useWriteContract({
        config: address ? localConfig : config
    });

    const formScheme = z.object({
        beneficiary: z.custom<`0x${string}` | undefined>((val) => !val, {
            message: 'Beneficiary address is required',
        }).refine((val) => isAddress(val as string), {
            message: 'Invalid address',
        }),

        token: z.string({
            required_error: 'Token is required',
        }).refine((val) => isAddress(val), {
            message: 'Invalid address',
        }),

        amount: z
            .string()
            .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
                message: "Amount must be a positive number",
            })
            .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
                message: "Amount cannot have more than 18 decimal places",
            }),

        startTime: z.coerce.date().refine((val) => val.getTime() > Date.now(), 'Start time must be in the future').default(() => new Date(Date.now() + 1000 * 40)),

        endVestingTime: z.coerce.date(),

        startCliffTime: z.coerce.date()
    }).refine((data) => data.startTime < data.startCliffTime && data.startCliffTime < data.endVestingTime, {
        message: "Invalid time range",
        path: ["startTime", "startCliffTime", "endVestingTime"],
    });

    const form = useForm<z.infer<typeof formScheme>>({
        resolver: zodResolver(formScheme),
        defaultValues: {
            beneficiary: undefined,
            token: undefined,
            startTime: new Date(Date.now() + 1000 * 40),
            endVestingTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            startCliffTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            amount: '0',
        }
    })

    function onSubmit(data: z.infer<typeof formScheme>) {
        console.log(data)
    }

    function handleDateSelect(fieldName: any, date: Date | undefined) {
        if (date) {
            form.setValue(fieldName, date);
        }
    }

    function handleTimeChange(setValueName: any, type: "hour" | "minute" | "ampm", value: string, isTimestamp: boolean = false) {
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
            isTimestamp
                ? Math.floor(newDate.getTime() / 1000)
                : newDate
        );
    }

    return (
        <div className='flex flex-row items-center gap-2'>
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
                                <FormLabel>Enter your date & time (12h)</FormLabel>
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
                                                                            field.value.getHours() % 12 === hour % 12
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange("startTime", "hour", hour.toString(), true)
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
                                                                            field.value.getMinutes() === minute
                                                                            ? "default"
                                                                            : "ghost"
                                                                    }
                                                                    className="sm:w-full shrink-0 aspect-square"
                                                                    onClick={() =>
                                                                        handleTimeChange('startTime', "minute", minute.toString(), true)
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
                                                                            field.value.getHours() < 12) ||
                                                                            (ampm === "PM" &&
                                                                                field.value.getHours() >= 12))
                                                                        ? "default"
                                                                        : "ghost"
                                                                }
                                                                className="sm:w-full shrink-0 aspect-square"
                                                                onClick={() => handleTimeChange("startTime", "ampm", ampm, true)}
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
                                    Please select your preferred date and time.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startCliffTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col h-full">
                                <FormLabel>Cliff Time</FormLabel>
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
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    When tokens begin to unlock.
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
                            <FormItem className="flex flex-col h-full">
                                <FormLabel>End Vesting Time</FormLabel>
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
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    When vesting period completes.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="col-span-2 mt-4">Submit</Button>
                </form>
            </Form>
        </div>
    )
}
