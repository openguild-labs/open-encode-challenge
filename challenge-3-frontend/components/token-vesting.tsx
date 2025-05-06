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
// const timeUnits = z.enum(["seconds", "minutes", "hours", "days"]); // Not used with current simple inputs

// Adjusted schema for createVestingSchedule to match current UI (direct seconds/timestamp inputs)
const createScheduleSchema = z.object({
  beneficiarySchedule: z.string().refine(isAddress, {
    message: "Please enter a valid Ethereum address.",
  }),
  amountSchedule: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number.",
  }),
  cliffSchedule: z.string()
    .refine((val) => /^\d+$/.test(val) && parseInt(val) >= 0, {
      message: "Cliff must be a non-negative number of seconds.",
    }),
  durationSchedule: z.string()
    .refine((val) => /^\d+$/.test(val) && parseInt(val) > 0, {
      message: "Duration must be a positive number of seconds.",
    }),
  startTimeSchedule: z.string()
    .refine((val) => /^\d+$/.test(val) && parseInt(val) >= 0, {
      message: "Start time must be a valid Unix timestamp (non-negative number).",
    }),
})
.refine(data => {
    const cliffSec = parseInt(data.cliffSchedule);
    const durationSec = parseInt(data.durationSchedule);
    if (!isNaN(cliffSec) && !isNaN(durationSec)) {
        return cliffSec <= durationSec;
    }
    return true; // Individual field validation will catch non-numeric inputs
}, {
    message: "Cliff cannot be greater than duration.",
    path: ["cliffSchedule"], // Associates error with the cliff field
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

  // --- Remove old state for form inputs ---
  // const [beneficiaryWhitelist, setBeneficiaryWhitelist] = useState("");
  // const [beneficiarySchedule, setBeneficiarySchedule] = useState("");
  // const [amountSchedule, setAmountSchedule] = useState("");
  // const [cliffSchedule, setCliffSchedule] = useState("");
  // const [durationSchedule, setDurationSchedule] = useState("");
  // const [startTimeSchedule, setStartTimeSchedule] = useState("");
  // const [beneficiaryRevoke, setBeneficiaryRevoke] = useState("");

  // --- React Hook Form Instances ---
  const whitelistForm = useForm<z.infer<typeof whitelistSchema>>({
    resolver: zodResolver(whitelistSchema),
    defaultValues: { beneficiaryWhitelist: undefined }, // Changed from ""
  });

  const scheduleForm = useForm<z.infer<typeof createScheduleSchema>>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      beneficiarySchedule: undefined, // Changed from ""
      amountSchedule: "",
      cliffSchedule: "",
      durationSchedule: "",
      startTimeSchedule: "",
    },
  });

  const revokeForm = useForm<z.infer<typeof revokeSchema>>({
    resolver: zodResolver(revokeSchema),
    defaultValues: { beneficiaryRevoke: undefined }, // Changed from ""
  });

  // Generic handler for form submission errors to show a toast
  const onFormError = (errors: any) => {
    console.error("Form validation errors:", errors);
    // Extract the first error message to display in toast, or a generic one
    let mainErrorMessage = "Please check the form for errors and try again.";
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
        const firstErrorField = errors[errorKeys[0]];
        if (firstErrorField && firstErrorField.message) {
            mainErrorMessage = typeof firstErrorField.message === 'string' ? firstErrorField.message : mainErrorMessage;
        }
    }
    toast({
      variant: "destructive",
      title: "Validation Error",
      description: mainErrorMessage,
    });
  };

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
      // Reset forms
      whitelistForm.reset();
      scheduleForm.reset();
      revokeForm.reset();
    }
    if (writeError) {
      toast({ variant: "destructive", title: "Transaction Error", description: writeError.message });
    }
    if (receiptError) {
      toast({ variant: "destructive", title: "Confirmation Error", description: receiptError.message });
    }
  }, [isConfirmed, writeError, receiptError, toast, refetchVestedAmount, whitelistForm, scheduleForm, revokeForm]);

  // --- Set isClient to true on mount ---
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Helper to validate address ---
  const isValidAddress = (addr: string): addr is Address => {
      return isAddress(addr);
  }

  // --- Handler Functions (Form Submit Handlers) ---
  const onSubmitWhitelist = async (data: z.infer<typeof whitelistSchema>) => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    // Validation is handled by Zod/react-hook-form
    writeContract({
      address: tokenVestingContractAddress,
      abi: tokenVestingAbi,
      functionName: 'addToWhitelist',
      args: [data.beneficiaryWhitelist as Address],
      account: connectedAddress,
    });
  };

  const onSubmitSchedule = async (data: z.infer<typeof createScheduleSchema>) => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    if (tokenDecimals === undefined) {
        return toast({ variant: "destructive", title: "Error", description: "Could not determine token decimals. Please wait or refresh." });
    }

    try {
      const amountInSmallestUnit = parseUnits(data.amountSchedule, tokenDecimals);
      const cliffNum = parseInt(data.cliffSchedule, 10); // Changed to parseInt, ensure base 10
      const durationNum = parseInt(data.durationSchedule, 10); // Changed to parseInt, ensure base 10
      const startTimeNum = BigInt(data.startTimeSchedule); // Kept as BigInt, assuming ABI matches

      // Cross-field validation (cliff <= duration) is handled by Zod .refine
      // Individual field format/range validation is handled by Zod field definitions

      writeContract({
        address: tokenVestingContractAddress,
        abi: tokenVestingAbi,
        functionName: 'createVestingSchedule',
        args: [
          data.beneficiarySchedule as Address,
          amountInSmallestUnit,
          cliffNum,
          durationNum,
          startTimeNum,
        ],
        account: connectedAddress,
      });
    } catch (e) {
      console.error("Error creating schedule:", e);
      toast({ variant: "destructive", title: "Input Error", description: `Failed to process schedule values. ${e instanceof Error ? e.message : String(e)}` });
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

  const onSubmitRevoke = async (data: z.infer<typeof revokeSchema>) => {
    if (!connectedAddress) return toast({ variant: "destructive", title: "Error", description: "Wallet not connected." });
    // Validation handled by Zod/react-hook-form
    writeContract({
      address: tokenVestingContractAddress,
      abi: tokenVestingAbi,
      functionName: 'revokeVesting',
      args: [data.beneficiaryRevoke as Address],
      account: connectedAddress,
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
        <Form {...whitelistForm}>
          <form onSubmit={whitelistForm.handleSubmit(onSubmitWhitelist, onFormError)} className="space-y-2">
            <FormField
              control={whitelistForm.control}
              name="beneficiaryWhitelist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="whitelist-beneficiary" className="font-medium">Add Beneficiary to Whitelist</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input id="whitelist-beneficiary" placeholder="0x... Beneficiary Address" {...field} />
                    </FormControl>
                    <Button type="submit" disabled={isPending || isConfirming || whitelistForm.formState.isSubmitting}>
                      {whitelistForm.formState.isSubmitting ? "Adding..." : "Add"}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {/* Create Vesting Schedule */}
        <Form {...scheduleForm}>
          <form onSubmit={scheduleForm.handleSubmit(onSubmitSchedule, onFormError)} className="space-y-3">
            <h3 className="font-medium pt-2">Create Vesting Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={scheduleForm.control}
                name="beneficiarySchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="beneficiary">Beneficiary Address</FormLabel>
                    <FormControl>
                      <Input id="beneficiary" placeholder="0x..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scheduleForm.control}
                name="amountSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="amount">Token Amount</FormLabel>
                    <FormControl>
                      {isLoadingDecimals ? <Skeleton className="h-9 w-full" /> : <Input id="amount" placeholder={`e.g., 1000 (using ${tokenDecimals ?? 'N/A'} decimals)`} {...field} />}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scheduleForm.control}
                name="cliffSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="cliff">Cliff (seconds)</FormLabel>
                    <FormControl>
                      <Input id="cliff" type="number" min="0" placeholder="e.g., 86400 (1 day)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scheduleForm.control}
                name="durationSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="duration">Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input id="duration" type="number" min="1" placeholder="e.g., 31536000 (1 year)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scheduleForm.control}
                name="startTimeSchedule"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel htmlFor="startTime">Start Time (Unix Timestamp)</FormLabel>
                    <FormControl>
                      <Input id="startTime" type="number" min="0" placeholder="Seconds since epoch, e.g., 1735689600" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isPending || isConfirming || isLoadingDecimals || tokenDecimals === undefined || scheduleForm.formState.isSubmitting} className="mt-2">
              {scheduleForm.formState.isSubmitting ? "Creating..." : "Create Schedule"}
            </Button>
            {(isLoadingTokenAddress || isLoadingDecimals) && <p className="text-xs text-muted-foreground mt-1">Fetching token info...</p>}
          </form>
        </Form>

        {/* Revoke Vesting */}
        <Form {...revokeForm}>
          <form onSubmit={revokeForm.handleSubmit(onSubmitRevoke, onFormError)} className="space-y-2 pt-2">
            <FormField
              control={revokeForm.control}
              name="beneficiaryRevoke"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="revoke-beneficiary" className="font-medium">Revoke Vesting for Beneficiary</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input id="revoke-beneficiary" placeholder="0x... Beneficiary Address" {...field} />
                    </FormControl>
                    <Button type="submit" variant="destructive" disabled={isPending || isConfirming || revokeForm.formState.isSubmitting}>
                      {revokeForm.formState.isSubmitting ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
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
