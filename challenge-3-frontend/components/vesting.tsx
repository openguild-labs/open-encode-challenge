/* Previous imports remain unchanged */
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
import { parseUnits, isAddress } from "viem";
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

// Create publicClient for Westend Asset Hub
const publicClient = createPublicClient({
  chain: westendAssetHub,
  transport: http(westendAssetHub.rpcUrls.default.http[0]),
});

// TokenVesting contract ABI
const TOKEN_VESTING_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "beneficiary", type: "address" },
      { indexed: false, internalType: "uint128", name: "amount", type: "uint128" },
    ],
    name: "TokensClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "beneficiary", type: "address" },
      { indexed: false, internalType: "uint128", name: "amount", type: "uint128" },
    ],
    name: "VestingScheduleCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "beneficiary", type: "address" },
    ],
    name: "Whitelisted",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "beneficiary", type: "address" },
    ],
    name: "addToWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "beneficiary", type: "address" },
    ],
    name: "calculateVestedAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claimVestedTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "beneficiary", type: "address" },
      { internalType: "uint128", name: "amount", type: "uint128" },
      { internalType: "uint32", name: "cliffDuration", type: "uint32" },
      { internalType: "uint32", name: "vestingDuration", type: "uint32" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
    ],
    name: "createVestingSchedule",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "beneficiary", type: "address" },
    ],
    name: "revokeVesting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "beneficiary", type: "address" },
    ],
    name: "removeFromWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "vestingSchedules",
    outputs: [
      { internalType: "uint128", name: "totalAmount", type: "uint128" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint32", name: "cliffDuration", type: "uint32" },
      { internalType: "uint32", name: "vestingDuration", type: "uint32" },
      { internalType: "uint128", name: "amountClaimed", type: "uint128" },
      { internalType: "bool", name: "revoked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
    ],
    name: "whitelist",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
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
];

// Form schema for creating vesting schedule
const formSchema = z.object({
  beneficiary: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address>,
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
    }),
  cliffDuration: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
      message: "Cliff duration must be a non-negative integer",
    }),
  vestingDuration: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "Vesting duration must be a positive integer",
    }),
  startTime: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 0), {
      message: "Start time must be a non-negative integer or empty",
    }),
});

// Admin form schema for whitelist
const adminSchema = z.object({
  whitelistAddress: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address>,
});

// Utility function to retry readContract
async function readContractWithRetry<T>(
  options: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  },
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await publicClient.readContract({
        ...options,
      });
      return result as T;
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed for ${options.functionName}:`, error.message);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed to read ${options.functionName} after ${retries} attempts`);
}

export default function TokenVesting() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [whitelistSuccess, setWhitelistSuccess] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const sigpassAddress = useAtomValue(addressAtom);

  // Contract address (VERIFY THIS IS CORRECT FOR WESTEND ASSET HUB)
  const CONTRACT_ADDRESS = "0xbde21Dc635D265552Ba6Eb80600E2d410D40700C" as Address;
  const isCorrectChain = chainId === westendAssetHub.id;

  // State for contract data
  const [owner, setOwner] = useState<Address | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);

  const [vestingSchedule, setVestingSchedule] = useState<any | null>(null);
  const [vestingError, setVestingError] = useState<string | null>(null);
  const [vestingLoading, setVestingLoading] = useState(true);

  const [claimableAmount, setClaimableAmount] = useState<bigint | null>(null);
  const [claimableError, setClaimableError] = useState<string | null>(null);
  const [claimableLoading, setClaimableLoading] = useState(true);

  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [pausedError, setPausedError] = useState<string | null>(null);
  const [pausedLoading, setPausedLoading] = useState(true);

  // Fetch contract data
  const fetchContractData = async () => {
    setLastError(null);
    if (!isCorrectChain) {
      setLastError("Please connect to Westend Asset Hub");
      return;
    }

    try {
      // Fetch owner
      setOwnerLoading(true);
      const ownerResult = await readContractWithRetry<Address>({
        address: CONTRACT_ADDRESS,
        abi: TOKEN_VESTING_ABI,
        functionName: "owner",
      });
      setOwner(ownerResult);
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
      // Fetch vesting schedule
      if (userAddress) {
        setVestingLoading(true);
        const vestingResult = await readContractWithRetry<any>({
          address: CONTRACT_ADDRESS,
          abi: TOKEN_VESTING_ABI,
          functionName: "vestingSchedules",
          args: [userAddress],
        });
        setVestingSchedule(vestingResult);
        setVestingError(null);
      }
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or vestingSchedules function missing"
        : error.message || "Failed to fetch vesting schedule";
      setVestingError(errorMsg);
      setLastError(errorMsg);
      console.error("Vesting fetch error:", error);
    } finally {
      setVestingLoading(false);
    }

    try {
      // Fetch claimable amount
      if (userAddress) {
        setClaimableLoading(true);
        const claimableResult = await readContractWithRetry<bigint>({
          address: CONTRACT_ADDRESS,
          abi: TOKEN_VESTING_ABI,
          functionName: "calculateVestedAmount",
          args: [userAddress],
        });
        setClaimableAmount(claimableResult);
        setClaimableError(null);
      }
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or calculateVestedAmount function missing"
        : error.message || "Failed to fetch claimable amount";
      setClaimableError(errorMsg);
      setLastError(errorMsg);
      console.error("Claimable fetch error:", error);
    } finally {
      setClaimableLoading(false);
    }

    try {
      // Fetch paused status
      setPausedLoading(true);
      const pausedResult = await readContractWithRetry<boolean>({
        address: CONTRACT_ADDRESS,
        abi: TOKEN_VESTING_ABI,
        functionName: "paused",
      });
      setIsPaused(pausedResult);
      setPausedError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or paused function missing"
        : error.message || "Failed to fetch paused status";
      setPausedError(errorMsg);
      setLastError(errorMsg);
      console.error("Paused fetch error:", error);
    } finally {
      setPausedLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchContractData();
  }, [isCorrectChain, userAddress]);

  // Debug chain, contract, and RPC config
  useEffect(() => {
    console.log("Current Chain ID:", chainId, "Expected Chain ID:", westendAssetHub.id);
    console.log("Contract Address:", CONTRACT_ADDRESS);
    console.log("Westend Asset Hub Config:", {
      id: westendAssetHub.id,
      name: westendAssetHub.name,
      rpcUrls: westendAssetHub.rpcUrls,
      blockExplorers: westendAssetHub.blockExplorers,
    });
    console.log("Owner - Data:", owner, "Error:", ownerError, "Loading:", ownerLoading);
    console.log("Vesting - Data:", vestingSchedule, "Error:", vestingError, "Loading:", vestingLoading);
    console.log("Claimable - Data:", claimableAmount, "Error:", claimableError, "Loading:", claimableLoading);
    console.log("Paused - Data:", isPaused, "Error:", pausedError, "Loading:", pausedLoading);
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
    owner,
    ownerError,
    ownerLoading,
    vestingSchedule,
    vestingError,
    vestingLoading,
    claimableAmount,
    claimableError,
    claimableLoading,
    isPaused,
    pausedError,
    pausedLoading,
  ]);

  // useWriteContract for contract interactions
  const { data: hash, error, isPending, writeContractAsync } = useWriteContract({
    config: sigpassAddress ? localConfig : config,
  });

  // Vesting schedule form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beneficiary: "",
      amount: "",
      cliffDuration: "0",
      vestingDuration: "",
      startTime: "",
    },
  });

  // Admin form for whitelist
  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      whitelistAddress: "",
    },
  });

  // Submit handler for creating vesting schedule
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userAddress || userAddress !== owner || !isCorrectChain) return;

    const amount = parseUnits(values.amount, 18); // Assuming 18 decimals for ERC20 token
    const cliffDuration = parseInt(values.cliffDuration);
    const vestingDuration = parseInt(values.vestingDuration);
    const startTime = values.startTime ? parseInt(values.startTime) : 0;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: TOKEN_VESTING_ABI,
      functionName: "createVestingSchedule",
      args: [values.beneficiary, amount, cliffDuration, vestingDuration, startTime],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Handler for claiming vested tokens
  async function onClaim(id: string) {
    if (!claimableAmount || claimableAmount === 0n || !isCorrectChain) return;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: TOKEN_VESTING_ABI,
      functionName: "claimVestedTokens",
      args: [id],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Admin submit handler for whitelist
  async function onAdminSubmit(values: z.infer<typeof adminSchema>) {
    if (!userAddress || userAddress !== owner || !isCorrectChain) return;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: TOKEN_VESTING_ABI,
      functionName: "addToWhitelist",
      args: [values.whitelistAddress],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
      gas: 300_000_000n, // From previous gas limit adjustments
      maxFeePerGas: 20_000_000_000_000n, // From previous gas price fix
      maxPriorityFeePerGas: 2_000_000_000_000n,
    });
    setWhitelistSuccess(`Address ${truncateHash(values.whitelistAddress)} added to whitelist!`);
    adminForm.reset();
  }

  // Handler for pausing contract
  async function onPause() {
    if (!userAddress || userAddress !== owner || !isCorrectChain) return;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: TOKEN_VESTING_ABI,
      functionName: "pause",
      args: [],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Handler for unpausing contract
  async function onUnpause() {
    if (!userAddress || userAddress !== owner || !isCorrectChain) return;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: TOKEN_VESTING_ABI,
      functionName: "unpause",
      args: [],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Watch for transaction hash and open dialog/drawer
  useEffect(() => {
    if (hash) {
      setOpen(true);
      form.reset();
      adminForm.reset();
      setTimeout(() => setWhitelistSuccess(null), 5000); // Clear success message after 5s
    }
  }, [hash, form, adminForm]);

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
      {isPaused && (
        <div className="text-red-500 text-center">
          Contract is paused. No actions allowed except by owner.
        </div>
      )}
      <div className="flex flex-col gap-4 border p-4 rounded">
        <h3 className="text-lg font-semibold">Contract Information</h3>
        {lastError && (
          <p className="text-red-500">Last Error: {lastError}</p>
        )}
        <p>
          Contract Owner: {owner ? (
            <span className="flex items-center gap-2">
              {truncateHash(owner)}
              <CopyButton copyText={owner} />
            </span>
          ) : ownerError ? (
            <span className="text-red-500">Error: {ownerError}</span>
          ) : ownerLoading ? (
            "Loading..."
          ) : (
            "Unable to fetch owner. Contract may not exist."
          )}
        </p>
        <Button
          onClick={fetchContractData}
          disabled={ownerLoading || vestingLoading || claimableLoading || pausedLoading || !isCorrectChain}
          variant="outline"
        >
          {ownerLoading || vestingLoading || claimableLoading || pausedLoading ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin" /> Refreshing...
            </>
          ) : (
            "Refresh Data"
          )}
        </Button>
      </div>
      {userAddress === owner && isCorrectChain && (
        <div className="flex flex-col gap-4 border p-4 rounded">
          <h3 className="text-lg font-semibold">Admin Actions</h3>
          <div className="flex flex-col gap-2">
            <h4 className="text-md font-medium">Add to Whitelist</h4>
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                <FormField
                  control={adminForm.control}
                  name="whitelistAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address to Whitelist</FormLabel>
                      <FormControl>
                        <Input placeholder="0xA0Cf…251e" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the address to allow vesting schedule creation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPending || isPaused || !isCorrectChain} className="w-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Adding to Whitelist...
                    </>
                  ) : (
                    "Add to Whitelist"
                  )}
                </Button>
                {whitelistSuccess && (
                  <div className="text-green-500 text-sm">{whitelistSuccess}</div>
                )}
              </form>
            </Form>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-md font-medium">Contract Controls</h4>
            <Button
              onClick={onPause}
              disabled={isPending || isPaused || !isCorrectChain}
              variant="outline"
              className="w-full"
            >
              Pause Contract
            </Button>
            <Button
              onClick={onUnpause}
              disabled={isPending || !isPaused || !isCorrectChain}
              variant="outline"
              className="w-full"
            >
              Unpause Contract
            </Button>
          </div>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="beneficiary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beneficiary Address</FormLabel>
                <FormControl>
                  <Input placeholder="0xA0Cf…251e" {...field} />
                </FormControl>
                <FormDescription>Address to receive vested tokens.</FormDescription>
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
                <FormDescription>Amount of tokens to vest.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cliffDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliff Duration (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="86400" {...field} required />
                </FormControl>
                <FormDescription>Time before vesting begins.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vestingDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vesting Duration (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="31536000" {...field} required />
                </FormControl>
                <FormDescription>Total vesting period.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time (Unix timestamp, optional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>Leave empty for current time.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={isPending || isPaused || userAddress !== owner || !isCorrectChain}
            className="w-full"
          >
            {isPending ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              "Create Vesting Schedule"
            )}
          </Button>
        </form>
      </Form>
      <div className="flex flex-col gap-4 border p-4 rounded">
        <h3 className="text-lg font-semibold">Vesting Status</h3>
        {vestingSchedule ? (
          <div className="flex flex-col gap-2">
            <p>Total Amount: {(Number(vestingSchedule[0]) / 1e18).toFixed(2)} tokens</p>
            <p>Start Time: {new Date(Number(vestingSchedule[1]) * 1000).toLocaleString()}</p>
            <p>Cliff Duration: {Number(vestingSchedule[2]) / 86400} days</p>
            <p>Vesting Duration: {Number(vestingSchedule[3]) / 86400} days</p>
            <p>Amount Claimed: {(Number(vestingSchedule[4]) / 1e18).toFixed(2)} tokens</p>
            <p>Revoked: {vestingSchedule[5] ? "Yes" : "No"}</p>
            <p>Claimable: {(Number(claimableAmount || 0) / 1e18).toFixed(2)} tokens</p>
            <Button
              onClick={onClaim}
              disabled={isPending || isPaused || !claimableAmount || claimableAmount === 0n || !isCorrectChain}
              className="w-full"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Claiming...
                </>
              ) : (
                "Claim Vested Tokens"
              )}
            </Button>
          </div>
        ) : vestingError ? (
          <p className="text-red-500">Error: {vestingError}</p>
        ) : vestingLoading ? (
          <p>Loading vesting schedule...</p>
        ) : (
          <p>No vesting schedule found.</p>
        )}
      </div>
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
                  <Hash className="w-4 h-4" /> No transaction hash
                </div>
              )}
              {!isPending && !isConfirmed && !isConfirming && (
                <div className="flex flex-row gap-2 items-center">
                  <Ban className="w-4 h-4" /> No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" /> Error: {error.message}
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
                  <Hash className="w-4 h-4" /> No transaction hash
                </div>
              )}
              {!isPending && !isConfirmed && !isConfirming && (
                <div className="flex flex-row gap-2 items-center">
                  <Ban className="w-4 h-4" /> No transaction submitted
                </div>
              )}
              {isConfirming && (
                <div className="flex flex-row gap-2 items-center text-yellow-500">
                  <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting for confirmation...
                </div>
              )}
              {isConfirmed && (
                <div className="flex flex-row gap-2 items-center text-green-500">
                  <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                </div>
              )}
              {error && (
                <div className="flex flex-row gap-2 items-center text-red-500">
                  <X className="w-4 h-4" /> Error: {error.message}
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