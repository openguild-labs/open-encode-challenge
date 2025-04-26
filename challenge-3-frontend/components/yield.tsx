"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { createPublicClient, http, Address } from "viem";
import { parseUnits } from "viem";
import {
  Ban,
  ExternalLink,
  ChevronDown,
  X,
  Hash,
  LoaderCircle,
  CircleCheck,
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { truncateHash } from "@/lib/utils";
import CopyButton from "@/components/copy-button";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { config, localConfig } from "@/app/providers";

// Hardcoded YieldFarm contract address
const FARM_ADDRESS: Address = "0xb406f1de53ede0d4763a5b26d569ca9dcfea85fb"; // Replace with actual deployed address

// Create publicClient for Westend Asset Hub
const publicClient = createPublicClient({
  chain: westendAssetHub,
  transport: http(westendAssetHub.rpcUrls.default.http[0]),
});

// YieldFarm contract ABI
const YIELD_FARM_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_lp", type: "address" },
      { internalType: "address", name: "_reward", type: "address" },
      { internalType: "uint256", name: "_rate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "EmergencyWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "RewardsClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Staked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
    ],
    name: "calculateBoostMultiplier",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "l",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lpToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
    ],
    name: "pendingRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rPTS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardPerToken",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardRate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amt", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_rate", type: "uint256" },
    ],
    name: "updateRewardRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "userInfo",
    outputs: [
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint256", name: "rewardDebt", type: "uint256" },
      { internalType: "uint256", name: "pendingRewards", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amt", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// IERC20 ABI for token interactions
const IERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Schema for stake, withdraw, and update reward rate forms
const actionSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
    }),
});

export default function YieldFarmInteraction() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const sigpassAddress = useAtomValue(addressAtom);

  const isCorrectChain = chainId === westendAssetHub.id;

  // State for contract data
  const [lpTokenAddress, setLpTokenAddress] = useState<Address | null>(null);
  const [rewardTokenAddress, setRewardTokenAddress] = useState<Address | null>(null);
  const [owner, setOwner] = useState<Address | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [totalStaked, setTotalStaked] = useState<bigint | null>(null);
  const [totalStakedError, setTotalStakedError] = useState<string | null>(null);
  const [totalStakedLoading, setTotalStakedLoading] = useState(false);
  const [rewardRate, setRewardRate] = useState<bigint | null>(null);
  const [rewardRateError, setRewardRateError] = useState<string | null>(null);
  const [rewardRateLoading, setRewardRateLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<bigint | null>(null);
  const [pendingRewardsError, setPendingRewardsError] = useState<string | null>(null);
  const [pendingRewardsLoading, setPendingRewardsLoading] = useState(false);
  const [boostMultiplier, setBoostMultiplier] = useState<bigint | null>(null);
  const [boostMultiplierError, setBoostMultiplierError] = useState<string | null>(null);
  const [boostMultiplierLoading, setBoostMultiplierLoading] = useState(false);

  // State for token balances
  const [lpBalance, setLpBalance] = useState<bigint | null>(null);
  const [lpBalanceError, setLpBalanceError] = useState<string | null>(null);
  const [lpBalanceLoading, setLpBalanceLoading] = useState(false);
  const [rewardBalance, setRewardBalance] = useState<bigint | null>(null);
  const [rewardBalanceError, setRewardBalanceError] = useState<string | null>(null);
  const [rewardBalanceLoading, setRewardBalanceLoading] = useState(false);

  // Stake form
  const stakeForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Withdraw form
  const withdrawForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Update reward rate form
  const rewardRateForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Fetch contract data
  const fetchContractData = async () => {
    if (!userAddress || !isCorrectChain) return;

    try {
      // Fetch owner
      setOwnerLoading(true);
      const ownerResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "owner",
      });
      setOwner(ownerResult as Address);
      setOwnerError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or owner function missing at this address"
        : error.message || "Failed to fetch owner";
      setOwnerError(errorMsg);
      setLastError(errorMsg);
      console.error("Owner fetch error:", error);
    } finally {
      setOwnerLoading(false);
    }

    try {
      // Fetch LP token address
      const lpTokenResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "lpToken",
      });
      setLpTokenAddress(lpTokenResult as Address);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or lpToken function missing"
        : error.message || "Failed to fetch LP token address";
      setLastError(errorMsg);
      console.error("LP token fetch error:", error);
    }

    try {
      // Fetch reward token address
      const rewardTokenResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "rewardToken",
      });
      setRewardTokenAddress(rewardTokenResult as Address);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or rewardToken function missing"
        : error.message || "Failed to fetch reward token address";
      setLastError(errorMsg);
      console.error("Reward token fetch error:", error);
    }

    try {
      // Fetch total staked
      setTotalStakedLoading(true);
      const totalStakedResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "totalStaked",
      });
      setTotalStaked(totalStakedResult as bigint);
      setTotalStakedError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or totalStaked function missing"
        : error.message || "Failed to fetch total staked";
      setTotalStakedError(errorMsg);
      setLastError(errorMsg);
      console.error("Total staked fetch error:", error);
    } finally {
      setTotalStakedLoading(false);
    }

    try {
      // Fetch reward rate
      setRewardRateLoading(true);
      const rewardRateResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "rewardRate",
      });
      setRewardRate(rewardRateResult as bigint);
      setRewardRateError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or rewardRate function missing"
        : error.message || "Failed to fetch reward rate";
      setRewardRateError(errorMsg);
      setLastError(errorMsg);
      console.error("Reward rate fetch error:", error);
    } finally {
      setRewardRateLoading(false);
    }

    try {
      // Fetch user info
      setUserInfoLoading(true);
      const userInfoResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "userInfo",
        args: [userAddress],
      });
      setUserInfo(userInfoResult);
      setUserInfoError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or userInfo function missing"
        : error.message || "Failed to fetch user info";
      setUserInfoError(errorMsg);
      setLastError(errorMsg);
      console.error("User info fetch error:", error);
    } finally {
      setUserInfoLoading(false);
    }

    try {
      // Fetch pending rewards
      setPendingRewardsLoading(true);
      const pendingRewardsResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "pendingRewards",
        args: [userAddress],
      });
      setPendingRewards(pendingRewardsResult as bigint);
      setPendingRewardsError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or pendingRewards function missing"
        : error.message || "Failed to fetch pending rewards";
      setPendingRewardsError(errorMsg);
      setLastError(errorMsg);
      console.error("Pending rewards fetch error:", error);
    } finally {
      setPendingRewardsLoading(false);
    }

    try {
      // Fetch boost multiplier
      setBoostMultiplierLoading(true);
      const boostMultiplierResult = await publicClient.readContract({
        address: FARM_ADDRESS,
        abi: YIELD_FARM_ABI,
        functionName: "calculateBoostMultiplier",
        args: [userAddress],
      });
      setBoostMultiplier(boostMultiplierResult as bigint);
      setBoostMultiplierError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or calculateBoostMultiplier function missing"
        : error.message || "Failed to fetch boost multiplier";
      setBoostMultiplierError(errorMsg);
      setLastError(errorMsg);
      console.error("Boost multiplier fetch error:", error);
    } finally {
      setBoostMultiplierLoading(false);
    }
  };

  // Fetch token balances
  const fetchTokenBalances = async () => {
    if (!userAddress || !lpTokenAddress || !rewardTokenAddress || !isCorrectChain) return;

    try {
      // Fetch LP token balance
      setLpBalanceLoading(true);
      const lpBalanceResult = await publicClient.readContract({
        address: lpTokenAddress,
        abi: IERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });
      setLpBalance(lpBalanceResult as bigint);
      setLpBalanceError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "LP token contract not found or balanceOf function missing"
        : error.message || "Failed to fetch LP token balance";
      setLpBalanceError(errorMsg);
      setLastError(errorMsg);
      console.error("LP balance fetch error:", error);
    } finally {
      setLpBalanceLoading(false);
    }

    try {
      // Fetch reward token balance
      setRewardBalanceLoading(true);
      const rewardBalanceResult = await publicClient.readContract({
        address: rewardTokenAddress,
        abi: IERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });
      setRewardBalance(rewardBalanceResult as bigint);
      setRewardBalanceError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Reward token contract not found or balanceOf function missing"
        : error.message || "Failed to fetch reward token balance";
      setRewardBalanceError(errorMsg);
      setLastError(errorMsg);
      console.error("Reward balance fetch error:", error);
    } finally {
      setRewardBalanceLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchContractData();
    fetchTokenBalances();
  }, [userAddress, lpTokenAddress, rewardTokenAddress, isCorrectChain]);

  // Debug logs
  useEffect(() => {
    console.log("Current Chain ID:", chainId, "Expected Chain ID:", westendAssetHub.id);
    console.log("Farm Address:", FARM_ADDRESS);
    console.log("LP Token Address:", lpTokenAddress);
    console.log("Reward Token Address:", rewardTokenAddress);
    console.log("Owner - Data:", owner, "Error:", ownerError, "Loading:", ownerLoading);
    console.log("Total Staked - Data:", totalStaked, "Error:", totalStakedError, "Loading:", totalStakedLoading);
    console.log("Reward Rate - Data:", rewardRate, "Error:", rewardRateError, "Loading:", rewardRateLoading);
    console.log("User Info - Data:", userInfo, "Error:", userInfoError, "Loading:", userInfoLoading);
    console.log("Pending Rewards - Data:", pendingRewards, "Error:", pendingRewardsError, "Loading:", pendingRewardsLoading);
    console.log("Boost Multiplier - Data:", boostMultiplier, "Error:", boostMultiplierError, "Loading:", boostMultiplierLoading);
    console.log("LP Balance - Data:", lpBalance, "Error:", lpBalanceError, "Loading:", lpBalanceLoading);
    console.log("Reward Balance - Data:", rewardBalance, "Error:", rewardBalanceError, "Loading:", rewardBalanceLoading);
    // Test RPC connectivity
    fetch(westendAssetHub.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    })
      .then((res) => res.json())
      .then((data) => console.log("RPC Test Response:", data))
      .catch((err) => console.error("RPC Test Error:", err.message));
  }, [
    chainId,
    lpTokenAddress,
    rewardTokenAddress,
    owner,
    ownerError,
    ownerLoading,
    totalStaked,
    totalStakedError,
    totalStakedLoading,
    rewardRate,
    rewardRateError,
    rewardRateLoading,
    userInfo,
    userInfoError,
    userInfoLoading,
    pendingRewards,
    pendingRewardsError,
    pendingRewardsLoading,
    boostMultiplier,
    boostMultiplierError,
    boostMultiplierLoading,
    lpBalance,
    lpBalanceError,
    lpBalanceLoading,
    rewardBalance,
    rewardBalanceError,
    rewardBalanceLoading,
  ]);

  // useWriteContract for contract interactions
  const { data: hash, error, isPending, writeContractAsync } = useWriteContract({
    config: sigpassAddress ? localConfig : config,
  });

  // Handle stake submission
  async function onStakeSubmit(values: z.infer<typeof actionSchema>) {
    if (!userAddress || !isCorrectChain) return;

    const amount = parseUnits(values.amount, 18); // Assuming 18 decimals for LP token

    // Estimate gas
    const estimatedGas = await publicClient.estimateContractGas({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "stake",
      args: [amount],
      account: userAddress,
    });

    // Fetch gas price
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n; // 50% buffer
    const maxPriorityFeePerGas = gasPrice / 10n; // 10% of base

    await writeContractAsync({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "stake",
      args: [amount],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: estimatedGas + estimatedGas / 5n, // 20% buffer
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Handle withdraw submission
  async function onWithdrawSubmit(values: z.infer<typeof actionSchema>) {
    if (!userAddress || !isCorrectChain) return;

    const amount = parseUnits(values.amount, 18); // Assuming 18 decimals for LP token

    // Estimate gas
    const estimatedGas = await publicClient.estimateContractGas({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "withdraw",
      args: [amount],
      account: userAddress,
    });

    // Fetch gas price
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n;
    const maxPriorityFeePerGas = gasPrice / 10n;

    await writeContractAsync({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "withdraw",
      args: [amount],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: estimatedGas + estimatedGas / 5n,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Handle claim rewards
  async function onClaimRewards() {
    if (!userAddress || !isCorrectChain) return;

    // Estimate gas
    const estimatedGas = await publicClient.estimateContractGas({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "claimRewards",
      args: [],
      account: userAddress,
    });

    // Fetch gas price
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n;
    const maxPriorityFeePerGas = gasPrice / 10n;

    await writeContractAsync({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "claimRewards",
      args: [],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: estimatedGas + estimatedGas / 5n,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Handle emergency withdraw
  async function onEmergencyWithdraw() {
    if (!userAddress || !isCorrectChain) return;

    // Estimate gas
    const estimatedGas = await publicClient.estimateContractGas({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "emergencyWithdraw",
      args: [],
      account: userAddress,
    });

    // Fetch gas price
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n;
    const maxPriorityFeePerGas = gasPrice / 10n;

    await writeContractAsync({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "emergencyWithdraw",
      args: [],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: estimatedGas + estimatedGas / 5n,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Handle update reward rate submission
  async function onRewardRateSubmit(values: z.infer<typeof actionSchema>) {
    if (!userAddress || userAddress !== owner || !isCorrectChain) return;

    const rate = parseUnits(values.amount, 18); // Assuming 18 decimals for reward rate

    // Estimate gas
    const estimatedGas = await publicClient.estimateContractGas({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "updateRewardRate",
      args: [rate],
      account: userAddress,
    });

    // Fetch gas price
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n;
    const maxPriorityFeePerGas = gasPrice / 10n;

    await writeContractAsync({
      address: FARM_ADDRESS,
      abi: YIELD_FARM_ABI,
      functionName: "updateRewardRate",
      args: [rate],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: estimatedGas + estimatedGas / 5n,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Handle approve LP tokens
  async function onApprove() {
    if (!userAddress || !lpTokenAddress || !isCorrectChain) return;

    const amount = parseUnits("1000", 18); // Approve 1000 tokens
    const gasPrice = await publicClient.getGasPrice();
    const maxFeePerGas = gasPrice + gasPrice / 2n;
    const maxPriorityFeePerGas = gasPrice / 10n;

    await writeContractAsync({
      address: lpTokenAddress,
      abi: IERC20_ABI,
      functionName: "approve",
      args: [FARM_ADDRESS, amount],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: 100_000n,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  // Watch for transaction hash and open dialog/drawer
  useEffect(() => {
    if (hash) {
      setOpen(true);
      stakeForm.reset();
      withdrawForm.reset();
      rewardRateForm.reset();
    }
  }, [hash, stakeForm, withdrawForm, rewardRateForm]);

  // Transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    config: sigpassAddress ? localConfig : config,
  });

  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      {!isCorrectChain && (
        <div className="text-red-500 text-center">
          Wrong network. Please switch to Westend Asset Hub.
          <Button
            className="mt-2"
            onClick={() => switchChain?.({ chainId: westendAssetHub.id })}
            disabled={!switchChain}
          >
            Switch Network
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 border p-4 rounded">
        <h3 className="text-lg font-semibold">Yield Farm Contract</h3>
        {lastError && <p className="text-red-500">Error: {lastError}</p>}
        <p>
          Farm Address:{" "}
          <span className="flex items-center gap-2">
            {truncateHash(FARM_ADDRESS)}
            <CopyButton copyText={FARM_ADDRESS} />
          </span>
        </p>
        {lpTokenAddress && (
          <p>
            LP Token Address:{" "}
            <span className="flex items-center gap-2">
              {truncateHash(lpTokenAddress)}
              <CopyButton copyText={lpTokenAddress} />
            </span>
          </p>
        )}
        {rewardTokenAddress && (
          <p>
            Reward Token Address:{" "}
            <span className="flex items-center gap-2">
              {truncateHash(rewardTokenAddress)}
              <CopyButton copyText={rewardTokenAddress} />
            </span>
          </p>
        )}
      </div>
      {userAddress && (
        <div className="flex flex-col gap-4 border p-4 rounded">
          <h3 className="text-lg font-semibold">Farm Information</h3>
          <p>
            Contract Owner:{" "}
            {owner ? (
              <span className="flex items-center gap-2">
                {truncateHash(owner)}
                <CopyButton copyText={owner} />
              </span>
            ) : ownerError ? (
              <span className="text-red-500">Error: {ownerError}</span>
            ) : ownerLoading ? (
              "Loading..."
            ) : (
              "Unable to fetch owner"
            )}
          </p>
          <p>
            Total Staked:{" "}
            {totalStaked !== null ? (
              `${(Number(totalStaked) / 1e18).toFixed(2)} LP tokens`
            ) : totalStakedError ? (
              <span className="text-red-500">Error: {totalStakedError}</span>
            ) : totalStakedLoading ? (
              "Loading..."
            ) : (
              "Unable to fetch total staked"
            )}
          </p>
          <p>
            Reward Rate:{" "}
            {rewardRate !== null ? (
              `${(Number(rewardRate) / 1e18).toFixed(2)} tokens/second`
            ) : rewardRateError ? (
              <span className="text-red-500">Error: {rewardRateError}</span>
            ) : rewardRateLoading ? (
              "Loading..."
            ) : (
              "Unable to fetch reward rate"
            )}
          </p>
        </div>
      )}
      {userAddress && (
        <div className="flex flex-col gap-4 border p-4 rounded">
          <h3 className="text-lg font-semibold">User Information</h3>
          <p>
            LP Token Balance:{" "}
            {lpBalance !== null ? (
              `${(Number(lpBalance) / 1e18).toFixed(2)} LP tokens`
            ) : lpBalanceError ? (
              <span className="text-red-500">Error: {lpBalanceError}</span>
            ) : lpBalanceLoading ? (
              "Loading..."
            ) : (
              "Unable to fetch LP balance"
            )}
          </p>
          <p>
            Reward Token Balance:{" "}
            {rewardBalance !== null ? (
              `${(Number(rewardBalance) / 1e18).toFixed(2)} reward tokens`
            ) : rewardBalanceError ? (
              <span className="text-red-500">Error: {rewardBalanceError}</span>
            ) : rewardBalanceLoading ? (
              "Loading..."
            ) : (
              "Unable to fetch reward balance"
            )}
          </p>
          <p>
            Staked Amount:{" "}
            {userInfo ? (
              `${(Number(userInfo[0]) / 1e18).toFixed(2)} LP tokens`
            ) : userInfoError ? (
              <span className="text-red-500">Error: {userInfoError}</span>
            ) : userInfoLoading ? (
              "Loading..."
            ) : (
              "No staked amount"
            )}
          </p>
          <p>
            Pending Rewards:{" "}
            {pendingRewards !== null ? (
              `${(Number(pendingRewards) / 1e18).toFixed(2)} reward tokens`
            ) : pendingRewardsError ? (
              <span className="text-red-500">Error: {pendingRewardsError}</span>
            ) : pendingRewardsLoading ? (
              "Loading..."
            ) : (
              "No pending rewards"
            )}
          </p>
          <p>
            Boost Multiplier:{" "}
            {boostMultiplier !== null ? (
              `${(Number(boostMultiplier) / 100).toFixed(2)}x`
            ) : boostMultiplierError ? (
              <span className="text-red-500">Error: {boostMultiplierError}</span>
            ) : boostMultiplierLoading ? (
              "Loading..."
            ) : (
              "No boost multiplier"
            )}
          </p>
        </div>
      )}
      {userAddress && userAddress === owner && (
        <div className="flex flex-col gap-4 border p-4 rounded">
          <h3 className="text-lg font-semibold">Owner Actions</h3>
          <Form {...rewardRateForm}>
            <form onSubmit={rewardRateForm.handleSubmit(onRewardRateSubmit)} className="space-y-4">
              <FormField
                control={rewardRateForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Reward Rate (tokens/second)</FormLabel>
                    <FormControl>
                      {isDesktop ? (
                        <Input type="number" placeholder="0.1" {...field} required />
                      ) : (
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.]?[0-9]*"
                          placeholder="0.1"
                          {...field}
                          required
                        />
                      )}
                    </FormControl>
                    <FormDescription>Update the reward rate for the farm.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
                {isPending ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Updating...
                  </>
                ) : (
                  "Update Reward Rate"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
      {userAddress && (
        <>
          <div className="flex flex-col gap-4 border p-4 rounded">
            <h3 className="text-lg font-semibold">Stake LP Tokens</h3>
            <Button onClick={onApprove} disabled={isPending || !isCorrectChain || !lpTokenAddress} className="w-full">
              {isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Approving...
                </>
              ) : (
                "Approve LP Tokens"
              )}
            </Button>
            <Form {...stakeForm}>
              <form onSubmit={stakeForm.handleSubmit(onStakeSubmit)} className="space-y-4">
                <FormField
                  control={stakeForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        {isDesktop ? (
                          <Input type="number" placeholder="100" {...field} required />
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            placeholder="100"
                            {...field}
                            required
                          />
                        )}
                      </FormControl>
                      <FormDescription>Amount of LP tokens to stake.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Staking...
                    </>
                  ) : (
                    "Stake Tokens"
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="flex flex-col gap-4 border p-4 rounded">
            <h3 className="text-lg font-semibold">Withdraw LP Tokens</h3>
            <Form {...withdrawForm}>
              <form onSubmit={withdrawForm.handleSubmit(onWithdrawSubmit)} className="space-y-4">
                <FormField
                  control={withdrawForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        {isDesktop ? (
                          <Input type="number" placeholder="100" {...field} required />
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            placeholder="100"
                            {...field}
                            required
                          />
                        )}
                      </FormControl>
                      <FormDescription>Amount of LP tokens to withdraw.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Withdrawing...
                    </>
                  ) : (
                    "Withdraw Tokens"
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="flex flex-col gap-4 border p-4 rounded">
            <h3 className="text-lg font-semibold">Reward Actions</h3>
            <Button
              onClick={onClaimRewards}
              disabled={isPending || !isCorrectChain || !pendingRewards || pendingRewards === 0n}
              className="w-full"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Claiming...
                </>
              ) : (
                "Claim Rewards"
              )}
            </Button>
            <Button
              onClick={onEmergencyWithdraw}
              disabled={isPending || !isCorrectChain || !userInfo || userInfo[0] === 0n}
              variant="destructive"
              className="w-full"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Withdrawing...
                </>
              ) : (
                "Emergency Withdraw"
              )}
            </Button>
          </div>
        </>
      )}
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Transaction Status <ChevronDown />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Status</DialogTitle>
            </DialogHeader>
            <DialogDescription>Follow the transaction status below.</DialogDescription>
            <div className="flex flex-col gap-2">
              {hash ? (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" />
                  Transaction Hash
                  <a
                    className="flex flex-row gap-2 items-center underline underline-offset-4"
                    href={`${westendAssetHub.blockExplorers?.default?.url}/tx/${hash}`}
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
                  <Ban className="w-4 h-4" />
                  No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" />
                  Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" />
                  Error: {error.message}
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
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full">
              Transaction Status <ChevronDown />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Transaction Status</DrawerTitle>
              <DrawerDescription>Follow the transaction status below.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4">
              {hash ? (
                <div className="flex flex-row gap-2 items-center">
                  <Hash className="w-4 h-4" />
                  Transaction Hash
                  <a
                    className="flex flex-row gap-2 items-center underline underline-offset-4"
                    href={`${westendAssetHub.blockExplorers?.default?.url}/tx/${hash}`}
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
                  <Ban className="w-4 h-4" />
                  No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" />
                  Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" />
                  Error: {error.message}
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
      )}
    </div>
  );
}