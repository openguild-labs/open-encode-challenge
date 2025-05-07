"use client";

import { useState, useEffect } from "react";
import {
  useReadContracts,
  useWriteContract,
  useConfig,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { vestingABI } from "@/lib/vestingABI";
import { VESTING_CONTRACT_ADDRESS } from "@/lib/addresses";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub, localConfig } from "@/app/providers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  ChevronDown,
  RefreshCw,
  Lock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import TransactionStatus from "@/components/transaction-status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VestingScheduleView() {
  const config = useConfig();
  const account = useAccount();
  const address = useAtomValue(addressAtom);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState("");
  const [tokens, setTokens] = useState([]);

  /* --------------------------------------------------------------------- */
  /*                             Derive address                            */
  /* --------------------------------------------------------------------- */
  const beneficiary = (address ?? account.address) as `0x${string}` | undefined;

  /* --------------------------------------------------------------------- */
  /*                               On-chain read                           */
  /* --------------------------------------------------------------------- */
  const { data, isLoading, refetch } = useReadContracts({
    contracts: selectedToken
      ? [
          {
            address: VESTING_CONTRACT_ADDRESS,
            abi: vestingABI,
            functionName: "getVestingSchedule",
            args: [
              beneficiary ?? "0x0000000000000000000000000000000000000000",
              selectedToken as `0x${string}`,
            ],
          },
          {
            address: VESTING_CONTRACT_ADDRESS,
            abi: vestingABI,
            functionName: "calculateVestedAmount",
            args: [
              beneficiary ?? "0x0000000000000000000000000000000000000000",
              selectedToken as `0x${string}`,
            ],
          },
        ]
      : [],
    config,
  });

  const schedule = data?.[0]?.result as
    | {
        totalAmount: bigint;
        startTime: bigint;
        cliffDuration: bigint;
        vestingDuration: bigint;
        amountClaimed: bigint;
        revoked: boolean;
      }
    | undefined;

  const vestedAmount = data?.[1]?.result as bigint | undefined;

  /* --------------------------------------------------------------------- */
  /*                               Write tx                                */
  /* --------------------------------------------------------------------- */
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

  const handleClaim = async () => {
    if (!beneficiary || !selectedToken) return;
    try {
      await writeContractAsync({
        ...(address && { account: await getSigpassWallet() }),
        address: VESTING_CONTRACT_ADDRESS,
        abi: vestingABI,
        functionName: "claimVestedTokens",
        args: [selectedToken],
        chainId: westendAssetHub.id,
      });
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  };

  /* --------------------------------------------------------------------- */
  /*                            UI Functions                               */
  /* --------------------------------------------------------------------- */

  const formatDate = (timestamp: any) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatDuration = (seconds: any) => {
    const days = Number(seconds) / 86400;
    if (days >= 1) {
      return `${Math.floor(days)} days`;
    }
    const hours = Number(seconds) / 3600;
    if (hours >= 1) {
      return `${Math.floor(hours)} hours`;
    }
    const minutes = Number(seconds) / 60;
    return `${Math.floor(minutes)} minutes`;
  };

  const calculateProgress = () => {
    if (!schedule) return 0;

    const now = Math.floor(Date.now() / 1000);
    const start = Number(schedule.startTime);
    const end = start + Number(schedule.vestingDuration);

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.floor(((now - start) / (end - start)) * 100);
  };

  const getVestingStatus = () => {
    if (!schedule) return "Unknown";
    if (schedule.revoked) return "Revoked";

    const now = Math.floor(Date.now() / 1000);
    const start = Number(schedule.startTime);
    const cliff = start + Number(schedule.cliffDuration);
    const end = start + Number(schedule.vestingDuration);

    if (now < start) return "Pending";
    if (now < cliff) return "In Cliff Period";
    if (now >= end) return "Fully Vested";
    return "Vesting";
  };

  const isClaimable = () => {
    if (!schedule || !vestedAmount || schedule.revoked) return false;
    return vestedAmount > 0n;
  };

  /* --------------------------------------------------------------------- */
  /*                           UI side-effects                             */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    const id = setInterval(refetch, 60000);
    return () => clearInterval(id);
  }, [refetch]);

  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  useEffect(() => {
    const mockTokens = [
      "0x03f24894056eD36A5F0d7032e16495EFCb24c917", // LP Token
      "0x5F553F9Bf257055B2c9FaE6817A515BbBEf87cdc", // RW Token
    ];
    setTokens(mockTokens);
    if (mockTokens.length > 0 && !selectedToken) {
      setSelectedToken(mockTokens[0]);
    }
  }, []);

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
    <div className="space-y-6">
      {/* No address connected */}
      {!beneficiary && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription>
            Please connect your wallet to view your vesting schedules
          </AlertDescription>
        </Alert>
      )}

      {/* Token selector */}
      {beneficiary && tokens.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tokens.map((token) => (
            <Button
              key={token}
              variant={token === selectedToken ? "default" : "outline"}
              className={
                token === selectedToken
                  ? "bg-gradient-to-r from-purple-600 to-blue-500"
                  : ""
              }
              onClick={() => setSelectedToken(token)}
              size="sm"
            >
              {token.slice(0, 6)}...{token.slice(-4)}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      )}

      {/* Vesting Schedule Detail */}
      {beneficiary && selectedToken && isLoading ? (
        <Card className="border border-purple-500/20">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ) : beneficiary &&
        selectedToken &&
        schedule &&
        schedule.totalAmount > 0n ? (
        <Card className="border border-purple-500/20 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-600 to-blue-500" />
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Status Tag */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Schedule Details</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    getVestingStatus() === "Fully Vested"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : getVestingStatus() === "Revoked"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {getVestingStatus()}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Vesting Progress</span>
                  <span>{calculateProgress()}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>

              {/* Token Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold flex items-center">
                    <Lock className="inline h-4 w-4 mr-1 text-purple-500" />
                    {formatUnits(schedule.totalAmount, 18)} tokens
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Claimed</p>
                  <p className="text-lg font-semibold flex items-center">
                    <CheckCircle className="inline h-4 w-4 mr-1 text-green-500" />
                    {formatUnits(schedule.amountClaimed, 18)} tokens
                  </p>
                </div>
              </div>

              {/* Current Available */}
              <div className="space-y-1 bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Available to Claim
                </p>
                <p className="text-xl font-semibold flex items-center">
                  {vestedAmount && vestedAmount > 0n ? (
                    <>
                      <CheckCircle className="inline h-5 w-5 mr-2 text-green-500" />
                      {formatUnits(vestedAmount, 18)} tokens
                    </>
                  ) : (
                    <>
                      <XCircle className="inline h-5 w-5 mr-2 text-red-500" />0
                      tokens
                    </>
                  )}
                </p>
              </div>

              {/* Vesting Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-base flex items-center">
                    <Calendar className="inline h-4 w-4 mr-1 text-blue-500" />
                    {formatDate(schedule.startTime)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-base flex items-center">
                    <Calendar className="inline h-4 w-4 mr-1 text-blue-500" />
                    {formatDate(
                      BigInt(schedule.startTime) +
                        BigInt(schedule.vestingDuration)
                    )}
                  </p>
                </div>
              </div>

              {/* Cliff Duration */}
              {schedule.cliffDuration > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cliff Period</p>
                  <p className="text-base">
                    {formatDuration(schedule.cliffDuration)} (until{" "}
                    {formatDate(
                      BigInt(schedule.startTime) +
                        BigInt(schedule.cliffDuration)
                    )}
                    )
                  </p>
                </div>
              )}

              {/* Claim Button */}
              <Button
                onClick={handleClaim}
                disabled={!isClaimable() || isPending || isConfirming}
                className={`w-full ${
                  isClaimable()
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                    : ""
                }`}
              >
                {isPending || isConfirming
                  ? "Processing..."
                  : isClaimable()
                  ? `Claim ${
                      vestedAmount ? formatUnits(vestedAmount, 18) : "0"
                    } Tokens`
                  : "No Tokens to Claim"}
              </Button>

              {/* Additional info on revoked state */}
              {schedule.revoked && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription>
                    This vesting schedule has been revoked by the contract
                    owner.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ) : beneficiary &&
        selectedToken &&
        (!schedule || schedule.totalAmount === 0n) ? (
        <Card className="border border-purple-500/20">
          <CardContent className="p-6 text-center">
            <div className="py-8 space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No Vesting Schedule Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                You don't have any active vesting schedule for this token. If
                you believe this is incorrect, please contact the administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Transaction Status Dialog/Drawer */}
      {hash && <TxStatusComponent />}
    </div>
  );
}
