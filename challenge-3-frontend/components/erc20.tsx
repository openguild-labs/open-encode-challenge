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

// IMockERC20 interface ABI
const MOCK_ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
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

// Schema for token address input
const tokenAddressSchema = z.object({
  tokenAddress: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address>,
});

// Schema for mint and transfer forms
const actionSchema = z.object({
  recipient: z
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
});

export default function MockERC20Interaction() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const sigpassAddress = useAtomValue(addressAtom);

  const isCorrectChain = chainId === westendAssetHub.id;

  // State for token address
  const [tokenAddress, setTokenAddress] = useState<Address | null>(null);

  // State for balance
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Token address form
  const tokenForm = useForm<z.infer<typeof tokenAddressSchema>>({
    resolver: zodResolver(tokenAddressSchema),
    defaultValues: {
      tokenAddress: "",
    },
  });

  // Mint form
  const mintForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      recipient: "",
      amount: "",
    },
  });

  // Transfer form
  const transferForm = useForm<z.infer<typeof actionSchema>>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      recipient: "",
      amount: "",
    },
  });

  // Fetch balance
  const fetchBalance = async () => {
    if (!userAddress || !tokenAddress || !isCorrectChain) return;

    try {
      setBalanceLoading(true);
      const balanceResult = await publicClient.readContract({
        address: tokenAddress,
        abi: MOCK_ERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });
      setBalance(balanceResult as bigint);
      setBalanceError(null);
    } catch (error: any) {
      const errorMsg = error.message.includes("Cannot decode zero data")
        ? "Contract not found or balanceOf function missing at this address"
        : error.message || "Failed to fetch balance";
      setBalanceError(errorMsg);
      setLastError(errorMsg);
      console.error("Balance fetch error:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Fetch balance when userAddress or tokenAddress changes
  useEffect(() => {
    fetchBalance();
  }, [userAddress, tokenAddress, isCorrectChain]);

  // Debug chain and RPC config
  useEffect(() => {
    console.log("Current Chain ID:", chainId, "Expected Chain ID:", westendAssetHub.id);
    console.log("Token Address:", tokenAddress);
    console.log("Balance - Data:", balance, "Error:", balanceError, "Loading:", balanceLoading);
    // Test RPC connectivity
    fetch(westendAssetHub.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    })
      .then((res) => res.json())
      .then((data) => console.log("RPC Test Response:", data))
      .catch((err) => console.error("RPC Test Error:", err.message));
  }, [chainId, tokenAddress, balance, balanceError, balanceLoading]);

  // useWriteContract for contract interactions
  const { data: hash, error, isPending, writeContractAsync } = useWriteContract({
    config: sigpassAddress ? localConfig : config,
  });

  // Handle token address submission
  async function onTokenSubmit(values: z.infer<typeof tokenAddressSchema>) {
    setTokenAddress(values.tokenAddress);
    setLastError(null);
    tokenForm.reset();
  }

  // Handle mint submission
  async function onMintSubmit(values: z.infer<typeof actionSchema>) {
    if (!userAddress || !tokenAddress || !isCorrectChain) return;

    const amount = parseUnits(values.amount, 18); // Assuming 18 decimals for ERC20 token

    await writeContractAsync({
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "mint",
      args: [values.recipient, amount],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Handle transfer submission
  async function onTransferSubmit(values: z.infer<typeof actionSchema>) {
    if (!userAddress || !tokenAddress || !isCorrectChain) return;

    const amount = parseUnits(values.amount, 18); // Assuming 18 decimals for ERC20 token

    await writeContractAsync({
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "transfer",
      args: [values.recipient, amount],
      account: sigpassAddress ? await getSigpassWallet() : undefined,
      chainId: westendAssetHub.id,
    });
  }

  // Watch for transaction hash and open dialog/drawer
  useEffect(() => {
    if (hash) {
      setOpen(true);
      mintForm.reset();
      transferForm.reset();
    }
  }, [hash, mintForm, transferForm]);

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
        <h3 className="text-lg font-semibold">Token Contract</h3>
        {lastError && <p className="text-red-500">Error: {lastError}</p>}
        <Form {...tokenForm}>
          <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-4">
            <FormField
              control={tokenForm.control}
              name="tokenAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Contract Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0xA0Cf…251e" {...field} />
                  </FormControl>
                  <FormDescription>Enter the MockERC20 contract address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
              Set Token Address
            </Button>
          </form>
        </Form>
        {tokenAddress && (
          <p>
            Current Token Address:{" "}
            <span className="flex items-center gap-2">
              {truncateHash(tokenAddress)}
              <CopyButton copyText={tokenAddress} />
            </span>
          </p>
        )}
      </div>
      {tokenAddress && userAddress && (
        <div className="flex flex-col gap-4 border p-4 rounded">
          <h3 className="text-lg font-semibold">Token Balance</h3>
          {balanceError ? (
            <p className="text-red-500">Error: {balanceError}</p>
          ) : balanceLoading ? (
            <p>Loading balance...</p>
          ) : balance !== null ? (
            <p>Balance: {(Number(balance) / 1e18).toFixed(2)} tokens</p>
          ) : (
            <p>Unable to fetch balance.</p>
          )}
        </div>
      )}
      {tokenAddress && userAddress && (
        <>
          <div className="flex flex-col gap-4 border p-4 rounded">
            <h3 className="text-lg font-semibold">Mint Tokens</h3>
            <Form {...mintForm}>
              <form onSubmit={mintForm.handleSubmit(onMintSubmit)} className="space-y-4">
                <FormField
                  control={mintForm.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0xA0Cf…251e" {...field} />
                      </FormControl>
                      <FormDescription>Address to receive minted tokens.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mintForm.control}
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
                      <FormDescription>Amount of tokens to mint.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Minting...
                    </>
                  ) : (
                    "Mint Tokens"
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="flex flex-col gap-4 border p-4 rounded">
            <h3 className="text-lg font-semibold">Transfer Tokens</h3>
            <Form {...transferForm}>
              <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                <FormField
                  control={transferForm.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0xA0Cf…251e" {...field} />
                      </FormControl>
                      <FormDescription>Address to receive transferred tokens.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transferForm.control}
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
                      <FormDescription>Amount of tokens to transfer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPending || !isCorrectChain} className="w-full">
                  {isPending ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" /> Transferring...
                    </>
                  ) : (
                    "Transfer Tokens"
                  )}
                </Button>
              </form>
            </Form>
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