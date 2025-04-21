'use client';
import { contractAddresses } from '@/lib/contractAddresses';
import { tokenVestingAbi } from '@/lib/tokenVestingAbi';
import { VestingSchedule } from '@/types/token-vesting';
import React, { useEffect } from 'react'
import { useAccount, useConfig, useReadContract, useReadContracts } from 'wagmi';
import { Button } from '@/components/ui/button';
import { localConfig } from '@/app/providers';
import { useAtomValue } from 'jotai';
import { addressAtom } from '../sigpasskit';
import { Address, formatEther, formatUnits, isAddressEqual, zeroAddress } from 'viem';
import CopyButton from '../copy-button';
import { mockERC20Abi } from '@/lib/mockERC20Abi';

// Helper functions
const formatDuration = (seconds: number) => {
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = day * 365;

    let remaining = seconds;
    const years = Math.floor(remaining / year);
    remaining %= year;

    const months = Math.floor(remaining / month);
    remaining %= month;

    const days = Math.floor(remaining / day);
    remaining %= day;

    const hours = Math.floor(remaining / hour);
    remaining %= hour;

    const minutes = Math.floor(remaining / minute);
    remaining = Math.floor(remaining % minute);

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (remaining > 0) parts.push(`${remaining} ${remaining === 1 ? 'second' : 'seconds'}`);

    return parts.length > 0 ? parts.join(', ') : '0 seconds';
};

const formatRemainingTime = (seconds: number) => {
    if (seconds <= 0) return "0 remaining seconds";

    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 30;
    const year = day * 365;

    let time = seconds;
    const years = Math.floor(time / year);
    time %= year;

    const months = Math.floor(time / month);
    time %= month;

    const days = Math.floor(time / day);
    time %= day;

    const hours = Math.floor(time / hour);
    time %= hour;

    const minutes = Math.floor(time / minute);
    time = Math.floor(time % minute);

    const parts = [];
    if (years > 0) parts.push(`${years} remaining ${years === 1 ? 'year' : 'years'}`);
    if (months > 0) parts.push(`${months} remaining ${months === 1 ? 'month' : 'months'}`);
    if (days > 0) parts.push(`${days} remaining ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours} remaining ${hours === 1 ? 'hour' : 'hours'}`);
    if (minutes > 0) parts.push(`${minutes} remaining ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (time > 0) parts.push(`${time} remaining ${time === 1 ? 'second' : 'seconds'}`);

    return parts.length > 0 ? parts.join(', ') : '0 remaining seconds';
};

export default function TokenVestingDetails() {
    const config = useConfig();
    const account = useAccount();
    const address = useAtomValue(addressAtom);
    const [remainingTime, setRemainingTime] = React.useState('');

    const { data: vestingSchedulesData, refetch: refetchVestingSchedules, isFetched: vestingSchedulesIsFetched } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as Address,
        abi: tokenVestingAbi,
        functionName: 'vestingSchedules',
        args: [account.address],
        query: {
            enabled: account.isConnected
        }
    });

    const { data: calculateVestedAmountData, refetch: refetchCalculateVestedAmount } = useReadContract({
        config: address ? localConfig : config,
        address: contractAddresses.TOKEN_VESTING as Address,
        abi: tokenVestingAbi,
        functionName: 'calculateVestedAmount',
        args: [account.address],
        query: {
            enabled: account.isConnected
        }
    });

    const { data: tokenData, refetch: refetchToken } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [{
            abi: mockERC20Abi,
            address: (vestingSchedulesData as any)?.[6] as Address,
            functionName: 'symbol',
            args: [],
        }, {
            abi: mockERC20Abi,
            address: (vestingSchedulesData as any)?.[6] as Address,
            functionName: 'decimals',
            args: [],
        }],
        query: {
            enabled: vestingSchedulesIsFetched
                && (vestingSchedulesData as any)?.[6] !== undefined
                && (vestingSchedulesData as any)?.[6] !== null
                && !isAddressEqual((vestingSchedulesData as any)?.[6] as Address, zeroAddress)
        }
    });

    useEffect(() => {
        if (account.isConnected) {
            refetchVestingSchedules();
            refetchToken();
            refetchCalculateVestedAmount();
        }
    }, [account.isConnected, refetchVestingSchedules, refetchToken, refetchCalculateVestedAmount]);

    // Calculate and update remaining time
    useEffect(() => {
        const vestingSeconds = Number((vestingSchedulesData as any)?.[2] as number);
        const startTime = Number((vestingSchedulesData as any)?.[0] as number);
        const cliffSeconds = Number((vestingSchedulesData as any)?.[1] as number);

        if (vestingSeconds === undefined || vestingSeconds === null ||
            startTime === undefined || startTime === null ||
            cliffSeconds === undefined || cliffSeconds === null) {
            setRemainingTime('Not set');
            return;
        }

        const calculateRemainingTime = () => {
            const vestingEndTime = startTime + cliffSeconds + vestingSeconds;
            const now = Math.floor(Date.now() / 1000);
            const remaining = vestingEndTime - now;

            if (remaining <= 0) return "Vesting period completed";
            return formatDuration(remaining);
        };

        // Initial calculation
        setRemainingTime(calculateRemainingTime());

        // Set up interval to update every second
        const intervalId = setInterval(() => {
            setRemainingTime(calculateRemainingTime());
        }, 1000);

        // Clean up the interval when component unmounts
        return () => clearInterval(intervalId);
    }, [vestingSchedulesData]);

    const renderStartTimeRemaining = () => {
        const startTime = Number((vestingSchedulesData as any)?.[0] as number);
        if (startTime === undefined || startTime === null) return 'Not set';

        const now = Math.floor(Date.now() / 1000);
        const remaining = startTime - now;

        if (remaining > 0 && startTime > 0) {
            return (
                <div className="text-xs text-blue-600 mt-1">
                    {formatRemainingTime(remaining)}
                </div>
            );
        }
        return '0 seconds';
    };

    const renderCliffDuration = () => {
        const cliffSeconds = Number((vestingSchedulesData as any)?.[1] as number);
        const startTime = Number((vestingSchedulesData as any)?.[0] as number);

        if (cliffSeconds === undefined || cliffSeconds === null) return 'Not set';

        const cliffEndTime = startTime + cliffSeconds;
        const now = Math.floor(Date.now() / 1000);
        const remaining = cliffEndTime - now;
        const formattedDuration = formatDuration(cliffSeconds);

        if (remaining > 0 && startTime > 0) {
            return (
                <div>
                    <div>{formattedDuration}</div>
                    <div className="text-xs text-blue-600 mt-1">
                        {formatRemainingTime(remaining)}
                    </div>
                </div>
            );
        }
        return formattedDuration;
    };

    const renderVestingEndTime = () => {
        const vestingSeconds = Number((vestingSchedulesData as any)?.[2] as number);
        const startTime = Number((vestingSchedulesData as any)?.[0] as number);
        const cliffSeconds = Number((vestingSchedulesData as any)?.[1] as number);

        if (vestingSeconds === undefined || vestingSeconds === null ||
            startTime === undefined || startTime === null) return '';

        const vestingEndTime = startTime + cliffSeconds + vestingSeconds;
        return `Ends: ${new Date(vestingEndTime * 1000).toLocaleString()}`;
    };

    const renderVestingDuration = () => {
        const vestingSeconds = Number((vestingSchedulesData as any)?.[2] as number);
        if (vestingSeconds === undefined || vestingSeconds === null) return 'Not set';
        return formatDuration(vestingSeconds);
    };

    const renderRemainingTimeDisplay = () => {
        return (
            <div className="text-blue-600 dark:text-blue-400 text-sm mt-2">
                <div className="mb-1 font-medium">Time remaining:</div>
                <div>{remainingTime}</div>
            </div>
        );
    };

    const formatDateFromTimestamp = (timestamp: number) => {
        if (timestamp === undefined || timestamp === null) return 'Not set';
        return new Date(timestamp * 1000).toLocaleString();
    };

    const isRevoked = () => {
        const revokeTime = Number((vestingSchedulesData as any)?.[5] as number);
        return revokeTime !== undefined && revokeTime !== null && revokeTime > 0;
    };

    if (!account.isConnected || !vestingSchedulesData) {
        return (
            <div className="text-center py-10">
                <p className="text-lg font-medium">No vesting schedule found</p>
                {account.isConnected ? (
                    <p className="text-sm text-gray-500 mt-1">You don't have any vesting schedules</p>
                ) : (
                    <p className="text-sm text-gray-500 mt-1">Connect your wallet to view your vesting details</p>
                )}
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl shadow-sm min-w-[720px]">
            <h3 className="text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">Your Vesting Schedule</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Start Time</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDateFromTimestamp(Number((vestingSchedulesData as any)?.[0] as number))}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {"Remaining: "}
                            {renderStartTimeRemaining()}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Cliff Duration</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatDateFromTimestamp(
                                Number((vestingSchedulesData as any)?.[0] as number) +
                                Number((vestingSchedulesData as any)?.[1] as number)
                            )}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {"Remaining: "}
                            {renderCliffDuration()}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Vesting Duration</span>
                    </div>
                    <div className="flex flex-col justify-center gap-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {renderVestingEndTime()}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {"Remaining: "}
                            {renderVestingDuration()}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {renderRemainingTimeDisplay()}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092c-.49.094-.943.266-1.337.537-.396.273-.705.652-.92 1.33.43.065.86.125.128.173.373.346.896.529 1.459.54L8 7.5 8 7.446c0-.666.37-1.043.698-1.3.33-.258.795-.458 1.302-.575V5a1 1 0 102 0v.17c.577.094 1.116.3 1.499.575.385.276.71.673.711 1.255 0 .78-.408 1.274-.987 1.64-.572.361-1.36.557-2.223.557-.862 0-1.65-.195-2.223-.557-.578-.366-.987-.86-.987-1.64 0-.583.326-.98.71-1.256A3.256 3.256 0 018.88 5.17V5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Total Amount</span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {(vestingSchedulesData as any)?.[3] as number && (tokenData as any)?.[0].status == 'success' && (tokenData as any)?.[1].status == 'success'
                                ? formatUnits((vestingSchedulesData as any)?.[3] as bigint, Number((tokenData as any)?.[1].result as number))
                                : 'Not set'}
                        </span>
                        {(vestingSchedulesData as any)?.[3] as number && (tokenData as any)?.[0].status == 'success' && (tokenData as any)?.[1].status == 'success' && (
                            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                                ${(tokenData as any)?.[0].result as string}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-500">Vested Amount</span>
                </div>
                <div className="flex items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {calculateVestedAmountData !== undefined
                            && calculateVestedAmountData !== null
                            && (tokenData as any)?.[0].status === 'success'
                            && (tokenData as any)?.[1].status === 'success'
                            ? formatUnits(calculateVestedAmountData as bigint, Number((tokenData as any)?.[1].result as number))
                            : 'Not set'}
                    </span>
                    {calculateVestedAmountData !== undefined
                        && calculateVestedAmountData !== null
                        && (tokenData as any)?.[0].status === 'success'
                        && (tokenData as any)?.[1].status === 'success' && (
                            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                                ${(tokenData as any)?.[0].result as string}
                            </span>
                        )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 13.5a1 1 0 11-2 0 1 1 0 012 0zm-.25-8.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-500">Claimed Amount</span>
                </div>
                <div className="flex items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {(vestingSchedulesData as any)?.[4] as number != undefined
                            && (vestingSchedulesData as any)?.[4] as number != null
                            && (tokenData as any)?.[0].status == 'success'
                            && (tokenData as any)?.[1].status == 'success'
                            ? formatUnits((vestingSchedulesData as any)?.[4] as bigint, Number((tokenData as any)?.[1].result as number))
                            : 'Not set'}
                    </span>
                    {(vestingSchedulesData as any)?.[4] as number != undefined
                        && (vestingSchedulesData as any)?.[4] as number != null
                        && (tokenData as any)?.[0].status == 'success'
                        && (tokenData as any)?.[1].status == 'success'
                        && (
                            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                                ${(tokenData as any)?.[0].result as string}
                            </span>
                        )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-500">Revoked Time</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {isRevoked()
                            ? formatDateFromTimestamp(Number((vestingSchedulesData as any)?.[5] as number))
                            : 'Not revoked'}
                    </span>
                    {!isRevoked() && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow w-full">
                <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" />
                    </svg >
                    <span className="text-sm font-medium text-gray-500">Token Address</span>
                </div >
                <div className='flex flex-row items-center gap-2'>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200 break-all">
                        {(vestingSchedulesData as any)?.[6] as string || 'Not set'}
                    </span>
                    <CopyButton copyText={(vestingSchedulesData as any)?.[6] as string || 'Not set'} />
                </div>
            </div >
            <Button className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Claim Vested Tokens
            </Button >
        </div>
    )
}
