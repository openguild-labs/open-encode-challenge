"use client";

import { useState, useEffect } from "react";
import {
  useReadContracts,
  useWriteContract,
  useConfig,
  useAccount,
  useWaitForTransactionReceipt,
  type BaseError,
} from "wagmi";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { tokenVestingAbi } from "@/lib/abi";
import { TOKEN_VESTING_CONTRACT_ADDRESS } from "@/lib/config";
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ChevronDown } from "lucide-react";
import TransactionStatus from "@/components/transaction-status";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function ScheduleCard() {
  const config = useConfig();
  const account = useAccount();
  const address = useAtomValue(addressAtom);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  /* --------------------------------------------------------------------- */
  /*                             Derive address                            */
  /* --------------------------------------------------------------------- */
  const beneficiary = (address ?? account.address) as
    | `0x${string}`
    | undefined;

  /* --------------------------------------------------------------------- */
  /*                               On-chain read                           */
  /* --------------------------------------------------------------------- */
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: TOKEN_VESTING_CONTRACT_ADDRESS,
        abi: tokenVestingAbi,
        functionName: "getVestingSchedule",
        args: [
          beneficiary ?? "0x0000000000000000000000000000000000000000",
        ],
      },
    ],
    config,
  });

  const schedule = data?.[0]?.result as
    | {
        totalAmount: bigint;
        startTime: bigint;
        cliff: bigint;
        duration: bigint;
        releasedAmount: bigint;
        revoked: boolean;
      }
    | undefined;

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
    if (!beneficiary) return;
    await writeContractAsync({
      ...(address && { account: await getSigpassWallet() }),
      address: TOKEN_VESTING_CONTRACT_ADDRESS,
      abi: tokenVestingAbi,
      functionName: "release",
      args: [beneficiary],
      chainId: westendAssetHub.id,
    });
  };

  /* --------------------------------------------------------------------- */
  /*                           UI side-effects                             */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    const id = setInterval(refetch, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  useEffect(() => {
    if (hash) setOpen(true);
  }, [hash]);

  /* --------------------------------------------------------------------- */
  /*                                Render                                 */
  /* --------------------------------------------------------------------- */
  return (
    <Card className="w-full border-0 bg-muted/20 shadow-sm">
      <CardHeader>
        <CardTitle>Your&nbsp;Vesting&nbsp;Schedule</CardTitle>
        <CardDescription>Track and claim your vested tokens.</CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : schedule ? (
          <ul className="space-y-1 text-sm">
            <li>
              <span className="font-medium">Total:</span>{" "}
              {formatUnits(schedule.totalAmount, 18)} tokens
            </li>
            <li>
              <span className="font-medium">Start:</span>{" "}
              {new Date(Number(schedule.startTime) * 1000).toLocaleString()}
            </li>
            <li>
              <span className="font-medium">Cliff:</span>{" "}
              {Number(schedule.cliff)} s
            </li>
            <li>
              <span className="font-medium">Duration:</span>{" "}
              {Number(schedule.duration)} s
            </li>
            <li>
              <span className="font-medium">Released:</span>{" "}
              {formatUnits(schedule.releasedAmount, 18)} tokens
            </li>
            <li>
              <span className="font-medium">Status:</span>{" "}
              {schedule.revoked ? "Revoked" : "Active"}
            </li>
          </ul>
        ) : (
          <p className="text-muted-foreground">No vesting schedule found.</p>
        )}
      </CardContent>

      {!schedule?.revoked && (
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={
              isPending ||
              !schedule ||
              schedule.releasedAmount >= schedule.totalAmount ||
              !beneficiary
            }
          >
            {isPending ? "Claiming…" : "Claim Vested Tokens"}
          </Button>

          {/* ---------------------------- Status panel --------------------------- */}
          {isDesktop ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Transaction&nbsp;status <ChevronDown className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transaction status</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                  Follow every step—from wallet signature to final confirmation.
                </DialogDescription>
                <TransactionStatus
                  hash={hash}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  isConfirmed={isConfirmed}
                  error={error as BaseError | undefined}
                  explorerUrl={
                    config.chains?.[0]?.blockExplorers?.default?.url
                  }
                />
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
                  Transaction&nbsp;status <ChevronDown className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Transaction status</DrawerTitle>
                  <DrawerDescription>
                    Follow every step—from wallet signature to final confirmation.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-4">
                  <TransactionStatus
                    hash={hash}
                    isPending={isPending}
                    isConfirming={isConfirming}
                    isConfirmed={isConfirmed}
                    error={error as BaseError | undefined}
                    explorerUrl={
                      config.chains?.[0]?.blockExplorers?.default?.url
                    }
                  />
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </CardFooter>
      )}
    </Card>
  );
}