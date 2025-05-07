"use client";

import { useState } from "react";
import {
    useConfig,
    useWriteContract,
    useReadContracts,
    useAccount,
    useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { Skeleton } from "./ui/skeleton";
import { vestingAbi } from "@/lib/abi";
import { VESTING_ADDRESS } from "@/lib//config";

const formSchema = z.object({
    beneficiary: z.string().startsWith("0x"),
    amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
    }),
    startTime: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "Start time must be a valid timestamp",
    }),
    cliff: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
        message: "Cliff must be a non-negative number",
    }),
    duration: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Duration must be greater than 0",
    }),
});

export default function Vesting() {
    const config = useConfig();
    const account = useAccount();
    const address = useAtomValue(addressAtom);
    const [isCreating, setIsCreating] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            beneficiary: "",
            amount: "",
            startTime: Math.floor(Date.now() / 1000).toString(),
            cliff: "0",
            duration: "0",
        },
    });

    const { writeContractAsync } = useWriteContract({
        config: config,
    });

    const { data: vestingSchedule, isLoading: isLoadingSchedule } = useReadContracts({
        contracts: [
            {
                address: VESTING_ADDRESS,
                abi: vestingAbi,
                functionName: "getVestingSchedule",
                args: [account.address || "0x0000000000000000000000000000000000000000"],
            }
        ],
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsCreating(true);
            const tx = await writeContractAsync({
                address: VESTING_ADDRESS,
                abi: vestingAbi,
                functionName: 'createVestingSchedule',
                args: [
                    values.beneficiary as `0x${string}`,
                    parseUnits(values.amount, 18),
                    BigInt(values.startTime),
                    BigInt(values.cliff),
                    BigInt(values.duration),
                ],
            });

            const receipt = await useWaitForTransactionReceipt({
                hash: tx,
            });

            form.reset();
        } catch (error) {
            console.error('Error creating vesting schedule:', error);
        } finally {
            setIsCreating(false);
        }
    }

    const handleClaim = async () => {
        try {
            setIsClaiming(true);
            const tx = await writeContractAsync({
                address: VESTING_ADDRESS,
                abi: vestingAbi,
                functionName: 'release',
                args: [address as `0x${string}`],
            });

            await useWaitForTransactionReceipt({
                hash: tx,
            });
        } catch (error) {
            console.error('Error claiming tokens:', error);
        } finally {
            setIsClaiming(false);
        }
    };

    const schedule = vestingSchedule?.[0]?.result;

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-4">Create Vesting Schedule</h2>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="beneficiary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Beneficiary Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="0x..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Start Time (Unix Timestamp)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cliff"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliff (seconds)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duration (seconds)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? "Creating..." : "Create Vesting Schedule"}
                        </Button>
                    </form>
                </Form>
            </div>

            <div className="rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-4">Your Vesting Schedule</h2>
                {isLoadingSchedule ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-4 w-[160px]" />
                    </div>
                ) : schedule ? (
                    <div className="space-y-2">
                        <p>Total Amount: {formatUnits(schedule.totalAmount, 18)} tokens</p>
                        <p>Start Time: {new Date(Number(schedule.startTime) * 1000).toLocaleString()}</p>
                        <p>Cliff: {Number(schedule.cliff)} seconds</p>
                        <p>Duration: {Number(schedule.duration)} seconds</p>
                        <p>Released Amount: {formatUnits(schedule.releasedAmount, 18)} tokens</p>
                        <p>Status: {schedule.revoked ? 'Revoked' : 'Active'}</p>
                        {!schedule.revoked && (
                            <Button
                                onClick={handleClaim}
                                disabled={isClaiming || schedule.releasedAmount >= schedule.totalAmount}
                            >
                                {isClaiming ? "Claiming..." : "Claim Vested Tokens"}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500">No vesting schedule found</p>
                    </div>
                )}
            </div>
        </div>
    );
} 