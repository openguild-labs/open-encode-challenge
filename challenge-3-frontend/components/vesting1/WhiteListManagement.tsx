"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { isAddress } from "viem";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
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
} from "@/components/ui/drawer";
import {
  ChevronDown,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TransactionStatus from "@/components/transaction-status";
import { vestingABI } from "@/lib/vestingABI";
import { VESTING_CONTRACT_ADDRESS } from "@/lib/addresses";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub, localConfig } from "@/app/providers";
import { useMediaQuery } from "@/hooks/use-media-query";

// Form schema for adding to whitelist
const addFormSchema = z.object({
  beneficiary: z.string().refine((val) => isAddress(val), {
    message: "Invalid address",
  }),
});

// Form schema for removing from whitelist
const removeFormSchema = z.object({
  beneficiary: z.string().refine((val) => isAddress(val), {
    message: "Invalid address",
  }),
});

// Form schema for checking whitelist status
const checkFormSchema = z.object({
  beneficiary: z.string().refine((val) => isAddress(val), {
    message: "Invalid address",
  }),
});

export default function WhiteListManagement() {
  const config = useConfig();
  const address = useAtomValue(addressAtom);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("add");
  const [checkResult, setCheckResult] = useState({ address: "", status: null });

  // Initialize forms
  const addForm = useForm({
    resolver: zodResolver(addFormSchema),
    defaultValues: { beneficiary: "" },
  });

  const removeForm = useForm({
    resolver: zodResolver(removeFormSchema),
    defaultValues: { beneficiary: "" },
  });

  const checkForm = useForm({
    resolver: zodResolver(checkFormSchema),
    defaultValues: { beneficiary: "" },
  });

  // Write contract hooks for adding/removing from whitelist
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  // For checking whitelist status
  const {
    data: isWhitelisted,
    isLoading: isCheckLoading,
    refetch: refetchWhitelistStatus,
  } = useReadContract({
    address: VESTING_CONTRACT_ADDRESS,
    abi: vestingABI,
    functionName: "whitelist",
    args: checkResult.address ? [checkResult.address] : undefined,
    query: {
      enabled: Boolean(checkResult.address),
    },
  });

  useEffect(() => {
    if (checkResult.address && !isCheckLoading) {
      setCheckResult((prev) => ({ ...prev, status: isWhitelisted }));
    }
  }, [isWhitelisted, isCheckLoading, checkResult.address]);

  // Handle adding to whitelist
  async function handleAddToWhitelist(values) {
    try {
      await writeContractAsync({
        ...(address && { account: await getSigpassWallet() }),
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingABI,
        functionName: "addToWhitelist",
        args: [values.beneficiary],
        chainId: westendAssetHub.id,
      });
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  }

  // Handle removing from whitelist
  async function handleRemoveFromWhitelist(values) {
    try {
      await writeContractAsync({
        ...(address && { account: await getSigpassWallet() }),
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingABI,
        functionName: "removeFromWhitelist",
        args: [values.beneficiary],
        chainId: westendAssetHub.id,
      });
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  }

  // Handle checking whitelist status
  async function handleCheckWhitelist(values) {
    setCheckResult({ address: values.beneficiary, status: null });
    refetchWhitelistStatus();
  }

  // Open status panel automatically when hash appears
  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  // Transaction status component
  const TxStatusComponent = () => {
    if (isDesktop) {
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Status</DialogTitle>
              <DialogDescription>
                Track your transaction from submission to confirmation
              </DialogDescription>
            </DialogHeader>
            <TransactionStatus
              hash={hash}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isConfirmed}
              error={error ?? undefined}
              explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
              customMessages={{
                pending:
                  activeTab === "add"
                    ? "Adding to whitelist..."
                    : "Removing from whitelist...",
                success:
                  activeTab === "add"
                    ? "Added to whitelist!"
                    : "Removed from whitelist!",
              }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Transaction Status</DrawerTitle>
            <DrawerDescription>
              Track your transaction from submission to confirmation
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <TransactionStatus
              hash={hash}
              isPending={isPending}
              isConfirming={isConfirming}
              isConfirmed={isConfirmed}
              error={error ?? undefined}
              explorerUrl={config.chains?.[0]?.blockExplorers?.default?.url}
              customMessages={{
                pending:
                  activeTab === "add"
                    ? "Adding to whitelist..."
                    : "Removing from whitelist...",
                success:
                  activeTab === "add"
                    ? "Added to whitelist!"
                    : "Removed from whitelist!",
              }}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };

  return (
    <Card className="border border-purple-500/20 shadow-md">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/30">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Whitelist Management
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="add" className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </TabsTrigger>
            <TabsTrigger value="remove" className="flex items-center gap-1">
              <UserMinus className="h-4 w-4" />
              <span className="hidden sm:inline">Remove</span>
            </TabsTrigger>
            <TabsTrigger value="check" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Check</span>
            </TabsTrigger>
          </TabsList>

          {/* Add to Whitelist Tab */}
          <TabsContent value="add">
            <Form {...addForm}>
              <form
                onSubmit={addForm.handleSubmit(handleAddToWhitelist)}
                className="space-y-5"
              >
                <FormField
                  control={addForm.control}
                  name="beneficiary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Beneficiary Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          {...field}
                          className="border-purple-500/30 focus-visible:ring-purple-500"
                        />
                      </FormControl>
                      <FormDescription>
                        Add this address to the vesting whitelist
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming
                    ? "Processing..."
                    : "Add to Whitelist"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Remove from Whitelist Tab */}
          <TabsContent value="remove">
            <Form {...removeForm}>
              <form
                onSubmit={removeForm.handleSubmit(handleRemoveFromWhitelist)}
                className="space-y-5"
              >
                <FormField
                  control={removeForm.control}
                  name="beneficiary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" /> Beneficiary Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          {...field}
                          className="border-purple-500/30 focus-visible:ring-purple-500"
                        />
                      </FormControl>
                      <FormDescription>
                        Remove this address from the vesting whitelist
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming
                    ? "Processing..."
                    : "Remove from Whitelist"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Check Whitelist Status Tab */}
          <TabsContent value="check">
            <Form {...checkForm}>
              <form
                onSubmit={checkForm.handleSubmit(handleCheckWhitelist)}
                className="space-y-5"
              >
                <FormField
                  control={checkForm.control}
                  name="beneficiary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Search className="h-4 w-4" /> Beneficiary Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          {...field}
                          className="border-purple-500/30 focus-visible:ring-purple-500"
                        />
                      </FormControl>
                      <FormDescription>
                        Check if an address is whitelisted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  disabled={isCheckLoading}
                >
                  {isCheckLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Check Status
                </Button>
              </form>
            </Form>

            {/* Display check results */}
            {checkResult.address && checkResult.status !== null && (
              <div className="mt-4">
                <Alert
                  className={`${
                    checkResult.status
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900"
                  }`}
                >
                  {checkResult.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <AlertDescription>
                    {checkResult.status
                      ? "This address is whitelisted"
                      : "This address is not whitelisted"}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-slate-50 dark:bg-slate-900/30 rounded-b-lg p-4">
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900 w-full">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            Only whitelisted addresses can receive vesting schedules
          </AlertDescription>
        </Alert>
      </CardFooter>

      {/* Transaction Status Modal */}
      {hash && <TxStatusComponent />}
    </Card>
  );
}
