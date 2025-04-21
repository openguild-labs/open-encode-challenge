"use client";

import { useState, useEffect, useRef } from "react";
import { Address, formatUnits } from "viem";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { abi as TokenVestingAbi } from "@/abis/TokenVesting.json";
import { abi as TokenAbi } from "@/abis/Token.json";
import { VestingSchedule } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon } from "@radix-ui/react-icons";
// import { westendAssetHub } from "@/app/providers";
import { moonbaseAlpha, sepolia } from "wagmi/chains";

interface BeneficiaryPanelProps {
  contractAddress: Address;
  address: Address;
  view: "overview" | "claim";
}

export default function BeneficiaryPanel({
  contractAddress,
  address,
  view,
}: BeneficiaryPanelProps) {
  const { toast } = useToast();
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [vestingSchedule, setVestingSchedule] =
    useState<VestingSchedule | null>(null);
  const [vestedAmount, setVestedAmount] = useState<bigint | null>(null);
  const [claimableAmount, setClaimableAmount] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchNow, setRefetchNow] = useState(false);

  // For scrolling to claim card
  const claimCardRef = useRef<HTMLDivElement>(null);

  // Contract write operation
  const { data: claimHash, writeContract: claimTokens } = useWriteContract();

  // Handle transaction receipt
  const { isLoading: isClaimLoading, status: claimStatus } =
    useWaitForTransactionReceipt({
      hash: claimHash,
    });

  useEffect(() => {
    if (isClaimLoading) {
      return;
    }
    if (claimStatus === "success") {
      toast({
        title: "Success!",
        description: "Tokens claimed successfully",
      });
      setRefetchNow(true);
      fetchBeneficiaryData(); // Refresh data after claiming

      return () => {
        setRefetchNow(false);
      };
    }
  }, [claimStatus]);

  // Fetch vesting schedule with better error handling and logging
  const REFETCH_INTERVAL = 1000; // Miliseconds
  const {
    data: schedule,
    error: scheduleError,
    isLoading: scheduleLoading,
  } = useReadContract({
    address: contractAddress,
    abi: TokenVestingAbi,
    functionName: "vestingSchedules",
    args: [address],
    chainId: sepolia.id,
    query: {
      refetchInterval(query) {
        return refetchNow ? 0 : REFETCH_INTERVAL;
      },
    },
  });

  // Log both successful data and errors
  useEffect(() => {
    if (scheduleError) {
      console.error("Schedule fetch error:", scheduleError);
    }
    if (schedule) {
      console.log("Raw schedule data received:", schedule);
      // Log structure to understand the format
      console.log("Schedule data type:", typeof schedule);
      if (typeof schedule === "object") {
        console.log("Schedule keys:", Object.keys(schedule));
      }
    }
  }, [schedule, scheduleError]);

  // Similar for the whitelist check
  const { data: whitelisted, error: whitelistError } = useReadContract({
    address: contractAddress,
    abi: TokenVestingAbi,
    functionName: "whitelist",
    args: [address],
    chainId: sepolia.id,
    query: {
      refetchInterval(query) {
        return refetchNow ? 0 : REFETCH_INTERVAL;
      },
    },
  });

  // Log whitelist errors
  useEffect(() => {
    if (whitelistError) {
      console.error("Whitelist fetch error:", whitelistError);
    }
  }, [whitelistError]);

  // Fetch vested amount
  const { data: vested } = useReadContract({
    address: contractAddress,
    abi: TokenVestingAbi,
    functionName: "calculateVestedAmount",
    args: [address],
    chainId: sepolia.id,
    query: {
      refetchInterval(query) {
        return refetchNow ? 0 : REFETCH_INTERVAL;
      },
    },
  });

  // Helper function to fetch all beneficiary data
  const fetchBeneficiaryData = async () => {
    setIsLoading(true);

    try {
      // Set whitelist status
      setIsWhitelisted(
        whitelisted !== undefined ? (whitelisted as boolean) : false
      );

      // Set vesting schedule if there's one, handling both array and object formats
      console.log("Processing schedule data:", schedule);

      if (schedule) {
        let scheduleData;

        // Handle if schedule is returned as an array (tuple)
        if (Array.isArray(schedule)) {
          console.log("Schedule is an array with length:", schedule.length);
          // Map the tuple to our expected object structure
          scheduleData = {
            totalAmount: schedule[0],
            startTime: schedule[1],
            cliffDuration: schedule[2],
            vestDuration: schedule[3],
            amountClaimed: schedule[4],
            revoked: schedule[5],
          };
        } else {
          scheduleData = schedule as any;
        }

        // Check if we have a valid schedule with a non-zero amount
        if (
          scheduleData &&
          scheduleData.totalAmount &&
          scheduleData.totalAmount > 0
        ) {
          console.log("Valid schedule found:", scheduleData);

          setVestingSchedule({
            totalAmount: scheduleData.totalAmount,
            startTime: scheduleData.startTime,
            cliffDuration: scheduleData.cliffDuration,
            vestDuration: scheduleData.vestDuration,
            amountClaimed: scheduleData.amountClaimed,
            revoked: scheduleData.revoked,
          });

          // Set vested amount if available
          if (vested !== undefined) {
            setVestedAmount(vested as bigint);
            // Calculate claimable amount
            const claimable = (vested as bigint) - scheduleData.amountClaimed;
            setClaimableAmount(claimable);
          } else {
            // Calculate vested amount based on current time
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const startTime = scheduleData.startTime;
            const cliffTime = startTime + scheduleData.cliffDuration;
            const endTime = startTime + scheduleData.vestDuration;

            if (currentTime < cliffTime) {
              // During cliff period, nothing is vested
              setVestedAmount(BigInt(0));
              setClaimableAmount(BigInt(0));
            } else if (currentTime >= endTime) {
              // After vesting period, everything is vested
              setVestedAmount(scheduleData.totalAmount);
              setClaimableAmount(
                BigInt(scheduleData.totalAmount) -
                  BigInt(scheduleData.amountClaimed)
              );
            } else {
              // Linear vesting during the vesting period
              const timeFromCliff = currentTime - cliffTime;
              const vestingPeriod = endTime - cliffTime;
              // Convert all values to bigint to avoid type mismatch in division
              const vestedAmt =
                (scheduleData.totalAmount * timeFromCliff) /
                BigInt(vestingPeriod);

              setVestedAmount(vestedAmt);
              setClaimableAmount(
                BigInt(vestedAmt) - BigInt(scheduleData.amountClaimed)
              );
            }
          }
        } else {
          console.log("Schedule exists but has zero amount or is invalid");
          setVestingSchedule(null);
          setVestedAmount(null);
          setClaimableAmount(null);
        }
      } else {
        console.info("No schedule data received from contract");
        setVestingSchedule(null);
        setVestedAmount(null);
        setClaimableAmount(null);
      }
    } catch (error) {
      console.error("Error in fetchBeneficiaryData:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch vesting data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaryData();
  }, [address, whitelisted, schedule, vested]);

  const handleClaimTokens = () => {
    try {
      claimTokens({
        address: contractAddress,
        abi: TokenVestingAbi,
        functionName: "claimVestedTokens",
      });
    } catch (error) {
      console.error("Error claiming tokens:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to claim tokens",
      });
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const calculateProgress = () => {
    if (!vestingSchedule || !vestedAmount) return 0;
    return Number((vestedAmount * BigInt(100)) / vestingSchedule.totalAmount);
  };

  const isCliffPeriod = () => {
    if (!vestingSchedule) return false;
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    return (
      currentTime < vestingSchedule.startTime + vestingSchedule.cliffDuration
    );
  };

  const isVestingComplete = () => {
    if (!vestingSchedule) return false;
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    return (
      currentTime >= vestingSchedule.startTime + vestingSchedule.vestDuration
    );
  };

  useEffect(() => {
    if (!view) return;

    console.log("view value changed to: ", view);
    if (view === "claim") {
      // Add a small delay to ensure the DOM is updated
      setTimeout(() => {
        console.log("Attempting to scroll to claim card...");
        if (claimCardRef.current) {
          claimCardRef.current.scrollIntoView({ behavior: "smooth" });
        } else {
          console.log("claimCardRef still not defined after delay");
        }
      }, 100);
    }
  }, [view]);

  return (
    <div className="space-y-6">
      {schedule as any}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-5 w-[400px]" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-[200px]" />
            </div>
          </CardContent>
        </Card>
      ) : !isWhitelisted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-500">Not Whitelisted</CardTitle>
            <CardDescription>
              Your address has not been whitelisted by the administrator yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-4 text-center">
              <InfoCircledIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                You need to be whitelisted by the administrator to participate
                in the token vesting program.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !vestingSchedule ? (
        <Card>
          <CardHeader>
            <CardTitle>No Vesting Schedule</CardTitle>
            <CardDescription>
              You are whitelisted but don't have an active vesting schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-4 text-center">
              <InfoCircledIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Contact the administrator to create a vesting schedule for your
                address.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Vesting Schedule</CardTitle>
                {vestingSchedule.revoked && (
                  <Badge variant="destructive">Revoked</Badge>
                )}
                {isVestingComplete() && (
                  <Badge variant="secondary">Completed</Badge>
                )}
                {isCliffPeriod() && (
                  <Badge variant="outline">In Cliff Period</Badge>
                )}
              </div>
              <CardDescription>
                Track the progress of your token vesting schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-lg font-medium">
                      {formatUnits(vestingSchedule.totalAmount, 18)} tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Vested Amount
                    </p>
                    <p className="text-lg font-medium">
                      {vestedAmount ? formatUnits(vestedAmount, 18) : "0"}{" "}
                      tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Claimed Amount
                    </p>
                    <p className="text-lg font-medium">
                      {formatUnits(vestingSchedule.amountClaimed, 18)} tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Claimable Now
                    </p>
                    <p className="text-lg font-medium">
                      {claimableAmount ? formatUnits(claimableAmount, 18) : "0"}{" "}
                      tokens
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-secondary p-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Start Date
                      </p>
                      <p className="font-medium">
                        {formatTimestamp(vestingSchedule.startTime)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Cliff End Date
                      </p>
                      <p className="font-medium">
                        {formatTimestamp(
                          vestingSchedule.startTime +
                            vestingSchedule.cliffDuration
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Vesting End Date
                      </p>
                      <p className="font-medium">
                        {formatTimestamp(
                          vestingSchedule.startTime +
                            vestingSchedule.vestDuration
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {view === "claim" && (
            <Card ref={claimCardRef}>
              <CardHeader>
                <CardTitle>Claim Tokens</CardTitle>
                <CardDescription>Claim your vested tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-secondary/50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Claimable Amount
                        </p>
                        <p className="text-2xl font-bold">
                          {claimableAmount
                            ? formatUnits(claimableAmount, 18)
                            : "0"}{" "}
                          tokens
                        </p>
                      </div>

                      {vestingSchedule.revoked && (
                        <Badge
                          variant="destructive"
                          className="px-3 py-1 text-sm"
                        >
                          Vesting Revoked
                        </Badge>
                      )}

                      {isCliffPeriod() && (
                        <Badge variant="outline" className="px-3 py-1 text-sm">
                          In Cliff Period
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleClaimTokens}
                      disabled={
                        isClaimLoading ||
                        !claimableAmount ||
                        claimableAmount <= 0 ||
                        vestingSchedule.revoked ||
                        isCliffPeriod()
                      }
                      className="w-full"
                    >
                      {isClaimLoading ? "Claiming..." : "Claim Tokens"}
                    </Button>

                    {(!claimableAmount || claimableAmount <= 0) &&
                      !isCliffPeriod() &&
                      !vestingSchedule.revoked && (
                        <p className="text-sm text-muted-foreground text-center">
                          You don't have any tokens to claim at the moment.
                        </p>
                      )}

                    {isCliffPeriod() && (
                      <p className="text-sm text-muted-foreground text-center">
                        You are still in the cliff period. Tokens will be
                        available to claim after{" "}
                        {formatTimestamp(
                          vestingSchedule.startTime +
                            vestingSchedule.cliffDuration
                        )}
                      </p>
                    )}

                    {vestingSchedule.revoked && (
                      <p className="text-sm text-muted-foreground text-center">
                        Your vesting schedule has been revoked by the
                        administrator.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
