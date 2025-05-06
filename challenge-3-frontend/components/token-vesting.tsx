"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { tokenVestingAbi, tokenVestingContractAddress } from '@/lib/abi';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// Import parseUnits and formatUnits
import { parseUnits, formatUnits, isAddress, Address } from 'viem';
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseEther } from "viem";
// Import Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Define validation schemas for each tab
const whitelistSchema = z.object({
  beneficiaryWhitelist: z.string().refine(isAddress, {
    message: "Please enter a valid Ethereum address.",
  }),
});

// Define time units
const timeUnits = z.enum(["seconds", "minutes", "hours", "days"]);

const createScheduleSchema = z.object({
  beneficiarySchedule: z.string().refine(isAddress, {
    message: "Please enter a valid Ethereum address.",
  }),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number.",
  }),
  // Use separate fields for value and unit
  cliffValue: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Cliff value must be a non-negative integer.",
  }),
  cliffUnit: timeUnits,
  durationValue: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Duration value must be a positive integer.",
  }),
  durationUnit: timeUnits,
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { // Validate as a parseable date string
    message: "Please select a valid start date and time.",
  }),
});

const revokeSchema = z.object({
  beneficiaryRevoke: z.string().refine(isAddress, {
    message: "Please enter a valid Ethereum address.",
  }),
});


export default function TokenVestingComponent() {
  const [isClient, setIsClient] = useState(false); // Add isClient state
  const { address: connectedAddress, isConnected, status } = useAccount(); // Get status
  const { toast } = useToast();
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();

  // --- State for UI elements ---
  const [beneficiaryWhitelist, setBeneficiaryWhitelist] = useState("");
  const [beneficiarySchedule, setBeneficiarySchedule] = useState("");
  const [amountSchedule, setAmountSchedule] = useState("");
  const [cliffSchedule, setCliffSchedule] = useState("");
  const [durationSchedule, setDurationSchedule] = useState("");
  const [startTimeSchedule, setStartTimeSchedule] = useState("");
  const [beneficiaryRevoke, setBeneficiaryRevoke] = useState("");

  // --- Read Contract Data ---
  // Fetch token decimals (assuming the vesting contract's token() function returns the ERC20 address)
  const { data: tokenAddress, isLoading: isLoadingTokenAddress } = useReadContract({
    address: tokenVestingContractAddress,
    abi: tokenVestingAbi,
    functionName: 'token',
    // Move enabled into query object
    query: {
        enabled: status === 'connected', // Enable only when connected
    }
  });

  // Read token decimals using the fetched token address
  const { data: tokenDecimals, isLoading: isLoadingDecimals } = useReadContract({
    address: tokenAddress as Address | undefined,
    abi: [{ type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }], // Minimal ABI for decimals
    functionName: 'decimals',
    // Move enabled into query object
    query: {
        enabled: !!tokenAddress && status === 'connected', // Enable only when connected and tokenAddress is fetched
    }
  });

  const { data: vestedAmount, isLoading: isLoadingVestedAmount, refetch: refetchVestedAmount } = useReadContract({
    address: tokenVestingContractAddress,
    abi: tokenVestingAbi,
    functionName: 'calculateVestedAmount',
    args: [connectedAddress!],
    // Move enabled into query object
    query: {
        enabled: status === 'connected', // Enable only when connected
    }
  });

  // --- Transaction Status ---
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash });

  // --- Effects for Toast Notifications ---
  useEffect(() => {
    if (isConfirmed) {
      toast({ title: "Transaction Successful", description: "Your transaction has been confirmed." });
      refetchVestedAmount(); // Refetch vested amount after a successful transaction
      // Optionally clear form fields
      setBeneficiaryWhitelist("");
      setBeneficiarySchedule("");
      setAmountSchedule("");
      setCliffSchedule("");
      setDurationSchedule("");
      setStartTimeSchedule("");
      setBeneficiaryRevoke("");
    }
    if (writeError) {
      toast({ variant: "destructive", title: "Transaction Error", description: writeError.message });
    }
    if (receiptError) {
      toast({ variant: "destructive", title: "Confirmation Error", description: receiptError.message });
    }
  }, [isConfirmed, writeError, receiptError, toast, refetchVestedAmount]);

  // --- Set isClient to true on mount ---
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Helper to validate address ---
  const isValidAddress = (addr: string): addr is Address => {
      return isAddress(addr);
  }

  // --- Handler Functions ---
  const handleAddToWhitelist = async () => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    if (!beneficiaryWhitelist || !isValidAddress(beneficiaryWhitelist)) {
        return toast({ variant: "destructive", title: "Error", description: "Please enter a valid beneficiary address." });
    }
    writeContract({
      address: tokenVestingContractAddress,
      abi: tokenVestingAbi,
      functionName: 'addToWhitelist',
      args: [beneficiaryWhitelist],
      account: connectedAddress, // Specify the sender account
    });
  };

  const handleCreateSchedule = async () => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    if (!beneficiarySchedule || !isValidAddress(beneficiarySchedule)) {
        return toast({ variant: "destructive", title: "Error", description: "Please enter a valid beneficiary address." });
    }
    if (!amountSchedule || !cliffSchedule || !durationSchedule || !startTimeSchedule) {
      return toast({ variant: "destructive", title: "Error", description: "Please fill all schedule fields." });
    }
    if (tokenDecimals === undefined) {
        return toast({ variant: "destructive", title: "Error", description: "Could not determine token decimals." });
    }

    try {
      const amountInSmallestUnit = parseUnits(amountSchedule, tokenDecimals);
      const cliffNum = Number(cliffSchedule);
      const durationNum = Number(durationSchedule);
      const startTimeNum = Number(startTimeSchedule);

      if (isNaN(cliffNum) || isNaN(durationNum) || isNaN(startTimeNum) || cliffNum < 0 || durationNum <= 0 || startTimeNum < 0) {
        return toast({ variant: "destructive", title: "Input Error", description: "Invalid number format for cliff, duration, or start time." });
      }

      // Add check: cliff must be less than or equal to duration
      if (cliffNum > durationNum) {
        return toast({ variant: "destructive", title: "Input Error", description: "Cliff cannot be greater than duration." });
      }

      writeContract({
        address: tokenVestingContractAddress,
        abi: tokenVestingAbi,
        functionName: 'createVestingSchedule',
        args: [
          beneficiarySchedule,
          amountInSmallestUnit, // Use parsed amount
          cliffNum,
          durationNum,
          BigInt(startTimeNum), // Convert startTime to BigInt
        ],
        account: connectedAddress, // Specify the sender account
      });
    } catch (e) {
      console.error("Error creating schedule:", e);
      toast({ variant: "destructive", title: "Input Error", description: `Failed to parse amount or other numeric values. ${e instanceof Error ? e.message : ''}` });
    }
  };

  const handleClaimTokens = async () => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    writeContract({
      address: tokenVestingContractAddress,
      abi: tokenVestingAbi,
      functionName: 'claimVestedTokens',
      account: connectedAddress, // Specify the sender account
    });
  };

  const handleRevokeVesting = async () => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    if (!beneficiaryRevoke || !isValidAddress(beneficiaryRevoke)) {
        return toast({ variant: "destructive", title: "Error", description: "Please enter a valid beneficiary address to revoke." });
    }
    writeContract({
      address: tokenVestingContractAddress,
      abi: tokenVestingAbi,
      functionName: 'revokeVesting',
      args: [beneficiaryRevoke],
      account: connectedAddress, // Specify the sender account
    });
  };

  // --- Render Logic ---

  // Render skeletons until the component has mounted on the client
  if (!isClient) {
    return (
        <div className="space-y-6 w-full">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  // Now that we are on the client, use the connection status
  if (status === 'connecting' || status === 'reconnecting') {
    return (
        <div className="space-y-6 w-full">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (status === 'disconnected') {
    return <div className="text-center p-4 border rounded-md">Please connect your wallet to interact with the vesting contract.</div>;
  }

  // --- Render when connected ---
  const formattedVestedAmount = vestedAmount !== undefined && tokenDecimals !== undefined
    ? formatUnits(vestedAmount, tokenDecimals)
    : '0'; // Default to 0 if loading or decimals unknown

  return (
    <div className="space-y-6 w-full">
      {/* Display Vested Amount */}
      <div className="p-4 border rounded-md bg-card text-card-foreground shadow">
        <h2 className="text-lg font-semibold mb-2">Your Vesting Status</h2>
        <p className="text-sm text-muted-foreground truncate">Connected: {connectedAddress}</p>
        <p className="mt-1">Available to Claim: <span className="font-medium">
            {isLoadingVestedAmount || isLoadingDecimals ? <Skeleton className="h-5 w-24 inline-block" /> : formattedVestedAmount}
            </span> Tokens
        </p>
        <div className="mt-3 flex gap-2">
            <Button onClick={() => refetchVestedAmount()} variant="outline" size="sm" disabled={isLoadingVestedAmount}>Refresh</Button>
            <Button 
                onClick={handleClaimTokens} 
                disabled={isPending || isConfirming || isLoadingVestedAmount || isLoadingDecimals || vestedAmount === undefined || vestedAmount === BigInt(0)}
                size="sm"
            >
              {(isPending || isConfirming) ? (
                <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg> Processing...
                </> 
              ): 'Claim Vested Tokens'}
            </Button>
        </div>
      </div>

      {/* Owner Actions Card */}
      <div className="p-4 border rounded-md bg-card text-card-foreground shadow space-y-4">
        <h2 className="text-lg font-semibold">Owner Actions</h2>
        <p className="text-sm text-muted-foreground">These actions typically require the contract owner&apos;s address.</p>

        {/* Add to Whitelist */}
        <div className="space-y-2">
          <Label htmlFor="whitelist" className="font-medium">Add Beneficiary to Whitelist</Label>
          <div className="flex gap-2">
            <Input id="whitelist" placeholder="0x... Beneficiary Address" value={beneficiaryWhitelist} onChange={(e) => setBeneficiaryWhitelist(e.target.value)} />
            <Button onClick={handleAddToWhitelist} disabled={isPending || isConfirming}>Add</Button>
          </div>
        </div>

        {/* Create Vesting Schedule */}
        <div className="space-y-2">
          <h3 className="font-medium">Create Vesting Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="beneficiary">Beneficiary Address</Label>
              <Input id="beneficiary" placeholder="0x..." value={beneficiarySchedule} onChange={(e) => setBeneficiarySchedule(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Token Amount</Label>
              {isLoadingDecimals ? <Skeleton className="h-9 w-full" /> : <Input id="amount" placeholder={`e.g., 1000 (using ${tokenDecimals ?? 'N/A'} decimals)`} value={amountSchedule} onChange={(e) => setAmountSchedule(e.target.value)} />}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cliff">Cliff (seconds)</Label>
              <Input id="cliff" type="number" min="0" placeholder="e.g., 86400 (1 day)" value={cliffSchedule} onChange={(e) => setCliffSchedule(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input id="duration" type="number" min="1" placeholder="e.g., 31536000 (1 year)" value={durationSchedule} onChange={(e) => setDurationSchedule(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="startTime">Start Time (Unix Timestamp)</Label>
              <Input id="startTime" type="number" min="0" placeholder="Seconds since epoch, e.g., 1735689600" value={startTimeSchedule} onChange={(e) => setStartTimeSchedule(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreateSchedule} disabled={isPending || isConfirming || isLoadingDecimals || tokenDecimals === undefined} className="mt-2">Create Schedule</Button>
           {(isLoadingTokenAddress || isLoadingDecimals) && <p className="text-xs text-muted-foreground mt-1">Fetching token info...</p>}
        </div>

        {/* Revoke Vesting */}
        <div className="space-y-2">
          <Label htmlFor="revoke" className="font-medium">Revoke Vesting for Beneficiary</Label>
           <div className="flex gap-2">
            <Input id="revoke" placeholder="0x... Beneficiary Address" value={beneficiaryRevoke} onChange={(e) => setBeneficiaryRevoke(e.target.value)} />
            <Button onClick={handleRevokeVesting} disabled={isPending || isConfirming} variant="destructive">Revoke</Button>
          </div>
        </div>
      </div>

      {/* Transaction Status Display */}
      {(hash || isConfirming || isConfirmed || writeError || receiptError) && (
        <div className="p-4 border rounded-md bg-muted text-muted-foreground shadow mt-4 text-sm space-y-1">
            <h3 className="font-medium text-foreground">Transaction Status</h3>
            {hash && <p>Hash: <span className="font-mono text-xs">{hash}</span></p>}
            {isConfirming && <p className="text-yellow-600">Waiting for confirmation...</p>}
            {isConfirmed && <p className="text-green-600">Transaction confirmed.</p>}
            {(writeError || receiptError) && <p className="text-red-600">Error: {writeError?.message || receiptError?.message}</p>}
        </div>
      )}
    </div>
  );
}
