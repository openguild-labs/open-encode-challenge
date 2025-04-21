'use client';
import { useAtomValue } from 'jotai';
import React from 'react'
import { useAccount, useConfig, useReadContracts, useWriteContract } from 'wagmi';
import { addressAtom } from '../sigpasskit';
import { localConfig } from '@/app/providers';
import { yieldFarmingAbi } from '@/lib/yieldFarmingAbi';
import { contractAddresses } from '@/lib/contractAddresses';
import { Address, isAddressEqual, parseUnits, zeroAddress } from 'viem';
import { mockERC20Abi } from '@/lib/mockERC20Abi';
import { z } from 'zod';
import CopyButton from '../copy-button';

export default function YieldFarmingDetails() {

    const config = useConfig();

    const account = useAccount();

    const address = useAtomValue(addressAtom);

    const {
        data: yieldFarmingData,
        isLoading: isYieldFarmingDataLoading,
        refetch: refetchYieldFarmingData,
        isFetched: isYieldFarmingDataFetched,
    } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'lpToken',
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'rewardToken',
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'rewardRate',
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'lastUpdateTime', // timestamp of the last update
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'rewardPerTokenStored',
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'totalStaked',
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'BOOST_THRESHOLD_1', // 7 days in timestamp
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'BOOST_THRESHOLD_2', // 30 days in timestamp
            },
            {
                abi: yieldFarmingAbi,
                address: contractAddresses.YIELD_FARMING as Address,
                functionName: 'BOOST_THRESHOLD_3', // 90 days in timestamp
            },
        ],
        query: {
            enabled: true
        }
    });

    const lpToken = yieldFarmingData?.[0]?.result as Address | undefined;
    const rewardToken = yieldFarmingData?.[1]?.result as Address | undefined;
    const rewardRate = yieldFarmingData?.[2]?.result as bigint | undefined;
    console.log(rewardRate);
    const lastUpdateTime = yieldFarmingData?.[3]?.result as bigint | undefined;
    const rewardPerTokenStored = yieldFarmingData?.[4]?.result as bigint | undefined;
    const totalStaked = yieldFarmingData?.[5]?.result as bigint | undefined;
    const boostThreshold1 = yieldFarmingData?.[6]?.result as bigint | undefined;
    const boostThreshold2 = yieldFarmingData?.[7]?.result as bigint | undefined;
    const boostThreshold3 = yieldFarmingData?.[8]?.result as bigint | undefined;

    // Token Information
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
            enabled: isYieldFarmingDataFetched
                && lpToken != undefined
                && lpToken != null
                && !isAddressEqual(lpToken as Address, zeroAddress)
        }
    });

    const lpTokenName = lpTokenAvailableData?.[0]?.result as string | undefined;
    const lpTokenSymbol = lpTokenAvailableData?.[1]?.result as string | undefined;
    const lpTokenDecimals = lpTokenAvailableData?.[2]?.result as number | undefined;

    const { data: rewardTokenAvailableData, refetch: refetchRewardTokenAvailable } = useReadContracts({
        config: address ? localConfig : config,
        contracts: [
            {
                address: rewardToken as Address,
                abi: mockERC20Abi,
                functionName: 'name',
            },
            {
                address: rewardToken as Address,
                abi: mockERC20Abi,
                functionName: 'symbol',
            },
            {
                address: rewardToken as Address,
                abi: mockERC20Abi,
                functionName: 'decimals',
            },
        ],
        query: {
            enabled: isYieldFarmingDataFetched
                && rewardToken != undefined
                && rewardToken != null
                && !isAddressEqual(rewardToken as Address, zeroAddress)
        }
    });

    const rewardTokenName = rewardTokenAvailableData?.[0]?.result as string | undefined;
    const rewardTokenSymbol = rewardTokenAvailableData?.[1]?.result as string | undefined;
    const rewardTokenDecimals = rewardTokenAvailableData?.[2]?.result as number | undefined;

    return (
        <div className="bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-8 space-y-8 border border-gray-200 dark:border-gray-700 h-full">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500">Yield Farming Dashboard</h1>

            {isYieldFarmingDataLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* LP Token Information */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"></path>
                            </svg>
                            LP Token
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-blue-500 dark:text-blue-300 font-medium mb-1">Address</p>
                                {
                                    lpToken ? (
                                        <div className="flex flex-row items-center justify-center gap-2">
                                            <p className="font-mono text-sm break-all">{lpToken}</p>
                                            <CopyButton copyText={lpToken} />
                                        </div>
                                    ) : (
                                        <p className="font-mono text-sm break-all">Not set</p>
                                    )
                                }
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-purple-500 dark:text-purple-300 font-medium mb-1">Name / Symbol</p>
                                <p className="text-lg font-semibold">{lpTokenName || '...'} <span className="text-purple-600 dark:text-purple-400">({lpTokenSymbol || '...'})</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Reward Token Information */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-green-100 dark:border-green-900 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                            </svg>
                            Reward Token
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-green-500 dark:text-green-300 font-medium mb-1">Address</p>
                                {
                                    rewardToken ? (
                                        <div className="flex flex-row items-center justify-center gap-2">
                                            <p className="font-mono text-sm break-all">{rewardToken}</p>
                                            <CopyButton copyText={rewardToken} />
                                        </div>
                                    ) : (
                                        <p className="font-mono text-sm break-all">Not set</p>
                                    )
                                }
                            </div>
                            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-teal-500 dark:text-teal-300 font-medium mb-1">Name / Symbol</p>
                                <p className="text-lg font-semibold">{rewardTokenName || '...'} <span className="text-teal-600 dark:text-teal-400">({rewardTokenSymbol || '...'})</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Pool Statistics */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-amber-100 dark:border-amber-900 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                            </svg>
                            Pool Statistics
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-amber-500 dark:text-amber-300 font-medium mb-1">Reward Rate</p>
                                <div className="text-lg font-bold text-amber-700 dark:text-amber-300  flex flex-wrap items-center">
                                    {rewardRate
                                        ? (Number(rewardRate) / Math.pow(10, rewardTokenDecimals || 18)).toFixed(6)
                                        : '0'}
                                    <span className="text-sm ml-1">{rewardTokenSymbol}/s</span>
                                </div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-orange-500 dark:text-orange-300 font-medium mb-1">Last Update Time</p>
                                <p className="text-orange-700 dark:text-orange-300">{lastUpdateTime ? new Date(Number(lastUpdateTime) * 1000).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-rose-500 dark:text-rose-300 font-medium mb-1">Reward Per Token</p>
                                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{rewardPerTokenStored ? (Number(rewardPerTokenStored) / Math.pow(10, rewardTokenDecimals || 18)).toFixed(6) : '0'}</p>
                            </div>
                            <div className="bg-pink-50 dark:bg-pink-900/30 p-4 rounded-lg transform transition-transform hover:scale-102">
                                <p className="text-sm text-pink-500 dark:text-pink-300 font-medium mb-1">Total Staked</p>
                                <div className="text-lg font-bold text-pink-700 dark:text-pink-300 flex flex-wrap items-center">
                                    {totalStaked ? (Number(totalStaked) / Math.pow(10, lpTokenDecimals || 18)).toFixed(6) : '0'}
                                    <span className="text-sm ml-1">{lpTokenSymbol}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Boost Thresholds */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path>
                            </svg>
                            Boost Thresholds
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border-l-4 border-indigo-400 transform transition-transform hover:scale-102">
                                <p className="text-sm text-indigo-500 dark:text-indigo-300 font-medium mb-1">Threshold 1</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-300">{boostThreshold1 ? `${Number(boostThreshold1 / BigInt(86400))} days` : 'N/A'}</p>
                            </div>
                            <div className="bg-violet-50 dark:bg-violet-900/30 p-4 rounded-lg border-l-4 border-violet-400 transform transition-transform hover:scale-102">
                                <p className="text-sm text-violet-500 dark:text-violet-300 font-medium mb-1">Threshold 2</p>
                                <p className="text-lg font-bold text-violet-600 dark:text-violet-300">{boostThreshold2 ? `${Number(boostThreshold2 / BigInt(86400))} days` : 'N/A'}</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border-l-4 border-purple-400 transform transition-transform hover:scale-102">
                                <p className="text-sm text-purple-500 dark:text-purple-300 font-medium mb-1">Threshold 3</p>
                                <p className="text-lg font-bold text-purple-600 dark:text-purple-300">{boostThreshold3 ? `${Number(boostThreshold3 / BigInt(86400))} days` : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
