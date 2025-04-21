"use client";

import { useState, useEffect } from "react";
import { Address, parseUnits, formatUnits } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { abi as TokenVestingAbi } from "@/abis/TokenVesting.json";
import { abi as TokenAbi } from "@/abis/Token.json";
import {
  BeneficiaryInfo,
  VestingFormData,
  WhitelistFormData,
} from "@/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { reverse } from "dns";

interface AdminPanelProps {
  contractAddress: Address;
  tokenAddress: Address;
  view: "overview" | "create" | "manage";
}

export default function AdminPanel({
  contractAddress,
  tokenAddress,
  view,
}: AdminPanelProps) {
  const { address } = useAccount();
  const { toast } = useToast();

  // State for vesting form
  const [vestingForm, setVestingForm] = useState<VestingFormData>({
    beneficiary: "",
    amount: "",
    cliffDuration: "",
    vestDuration: "",
    startTimestamp: "",
  });

  // State for whitelist form
  const [whitelistForm, setWhitelistForm] = useState<WhitelistFormData>({
    beneficiary: "",
  });

  // State for beneficiaries
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Address | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<Address | null>(null);

  // Contract write operations
  const { data: approveHash, writeContract: approveToken } = useWriteContract();
  const { data: createHash, writeContract: createSchedule } =
    useWriteContract();
  const { data: whitelistHash, writeContract: addToWhitelist } =
    useWriteContract();
  const { data: removeHash, writeContract: removeFromWhitelist } =
    useWriteContract();
  const { data: revokeHash, writeContract: revokeVesting } = useWriteContract();

  // Handle transaction receipts
  const { isLoading: isApproveLoading, status: approveStatus } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  useEffect(() => {
    if (isApproveLoading) {
      return;
    }
    if (approveStatus === "success") {
      toast({
        title: "Approval successful",
        description: "You can now create the vesting schedule",
      });
      handleCreateSchedule();
    }
  }, [approveStatus]);

  const { isLoading: isCreateLoading, status: createStatus } =
    useWaitForTransactionReceipt({
      hash: createHash,
    });

  useEffect(() => {
    if (isCreateLoading) {
      return;
    }
    if (createStatus === "success") {
      toast({
        title: "Success!",
        description: "Vesting schedule created successfully",
      });

      // Add/update the beneficiary with vesting schedule in localStorage
      const currentTime = Math.floor(Date.now() / 1000);
      const startTime = vestingForm.startTimestamp
        ? parseInt(vestingForm.startTimestamp)
        : currentTime + 60;

      const newBeneficiary: BeneficiaryInfo = {
        address: vestingForm.beneficiary as Address,
        isWhitelisted: true, // When creating a vesting schedule, beneficiary is automatically whitelisted
        vestingSchedule: {
          totalAmount: parseUnits(vestingForm.amount, 18),
          startTime: BigInt(startTime),
          cliffDuration: BigInt(
            parseInt(vestingForm.cliffDuration) * 24 * 60 * 60
          ),
          vestDuration: BigInt(
            parseInt(vestingForm.vestDuration) * 24 * 60 * 60
          ),
          amountClaimed: BigInt(0),
          revoked: false,
        },
        vestedAmount: BigInt(0),
        claimableAmount: BigInt(0),
      };

      // Update or add the beneficiary
      const updatedBeneficiaries = [...beneficiaries];
      const existingIndex = updatedBeneficiaries.findIndex(
        (b) => b.address === newBeneficiary.address
      );

      if (existingIndex >= 0) {
        updatedBeneficiaries[existingIndex] = {
          ...updatedBeneficiaries[existingIndex],
          ...newBeneficiary,
        };
      } else {
        updatedBeneficiaries.push(newBeneficiary);
      }

      // Persist to localStorage
      try {
        localStorage.setItem(
          "vestingBeneficiaries",
          JSON.stringify(
            updatedBeneficiaries,
            (key, value) => {
              // Convert bigint to string
              return typeof value === "bigint" ? String(value) : value;
            },
            2
          )
        );
        console.log("Updated vesting schedules stored in localStorage");
      } catch (err) {
        console.error(
          "Failed to store vesting schedules in localStorage:",
          err
        );
      }

      resetVestingForm();
      fetchBeneficiaries(); // Refresh the beneficiaries list
    } else if (createStatus === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create vesting schedule",
      });
    }
  }, [createStatus]);

  const { isLoading: isWhitelistLoading, status: whitelistStatus } =
    useWaitForTransactionReceipt({
      hash: whitelistHash,
    });

  useEffect(() => {
    if (isWhitelistLoading) {
      return;
    }
    if (whitelistStatus === "success") {
      toast({
        title: "Success!",
        description: "Beneficiary added to whitelist",
      });

      // Create new beneficiary object
      const newBeneficiary: BeneficiaryInfo = {
        address: whitelistForm.beneficiary as Address,
        isWhitelisted: true,
      };

      // Check if the beneficiary already exists in the array
      const updatedBeneficiaries = [...beneficiaries];
      const existingIndex = updatedBeneficiaries.findIndex(
        (b) => b.address === newBeneficiary.address
      );

      // If exists, update it, otherwise add it
      if (existingIndex >= 0) {
        updatedBeneficiaries[existingIndex] = {
          ...updatedBeneficiaries[existingIndex],
          isWhitelisted: true,
        };
      } else {
        updatedBeneficiaries.push(newBeneficiary);
      }

      // Persist to localStorage for later retrieval
      try {
        localStorage.setItem(
          "vestingBeneficiaries",
          JSON.stringify(
            updatedBeneficiaries,
            (key, value) => {
              // Convert bigint to string
              return typeof value === "bigint" ? String(value) : value;
            },
            2
          )
        );
        console.log("Beneficiaries stored in localStorage");
      } catch (err) {
        console.error("Failed to store beneficiaries in localStorage:", err);
      }

      // Clear whitelist input form
      setWhitelistForm((prev) => ({ ...prev, beneficiary: "" }));
    } else if (whitelistStatus === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to whitelist",
      });
    }
    fetchBeneficiaries(); // Refresh the beneficiaries list
  }, [whitelistStatus]);

  const { isLoading: isRemoveLoading, status: removeStatus } =
    useWaitForTransactionReceipt({
      hash: removeHash,
    });

  useEffect(() => {
    if (isRemoveLoading) {
      return;
    }
    if (removeStatus === "success") {
      // Changed from revokeStatus to removeStatus
      toast({
        title: "Success!",
        description: "Beneficiary removed from whitelist",
      });

      // Update localStorage to mark the beneficiary as not whitelisted
      const updatedBeneficiaries = beneficiaries.map((ben) => {
        if (ben.address === pendingRemoval) {
          return {
            ...ben,
            isWhitelisted: false,
          };
        }
        return ben;
      });

      // Persist to localStorage
      try {
        localStorage.setItem(
          "vestingBeneficiaries",
          JSON.stringify(
            updatedBeneficiaries,
            (key, value) => {
              // Convert bigint to string
              return typeof value === "bigint" ? String(value) : value;
            },
            2
          )
        );
        console.log("Updated whitelist stored in localStorage");
      } catch (err) {
        console.error("Failed to store whitelist in localStorage:", err);
      }

      fetchBeneficiaries(); // Refresh the beneficiaries list
    } else if (removeStatus === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove from whitelist",
      });
    }
  }, [removeStatus]);

  const { isLoading: isRevokeLoading, status: revokeStatus } =
    useWaitForTransactionReceipt({
      hash: revokeHash,
    });

  useEffect(() => {
    if (isRevokeLoading) {
      return;
    }
    if (revokeStatus === "success") {
      toast({
        title: "Success!",
        description: "Vesting schedule revoked",
      });

      // Update localStorage to mark the schedule as revoked
      const updatedBeneficiaries = beneficiaries.map((ben) => {
        if (ben.address === pendingRevoke) {
          return {
            ...ben,
            vestingSchedule: ben.vestingSchedule
              ? {
                  ...ben.vestingSchedule,
                  revoked: true,
                }
              : undefined,
          };
        }
        return ben;
      });

      // Persist to localStorage
      try {
        localStorage.setItem(
          "vestingBeneficiaries",
          JSON.stringify(
            updatedBeneficiaries,
            (key, value) => {
              // Convert bigint to string
              return typeof value === "bigint" ? String(value) : value;
            },
            2
          )
        );
        console.log("Updated vesting schedules stored in localStorage");
      } catch (err) {
        console.error(
          "Failed to store vesting schedules in localStorage:",
          err
        );
      }

      fetchBeneficiaries(); // Refresh the beneficiaries list
    }
  }, [revokeStatus]);

  // Helper function to fetch beneficiary data
  const fetchBeneficiaries = async () => {
    // In a real implementation, you would query events or use a subgraph
    // For this demo, we'll just use a mock
    let mockBeneficiaries: BeneficiaryInfo[] = [];

    try {
      const storedData = localStorage.getItem("vestingBeneficiaries");
      if (storedData && storedData !== "") {
        mockBeneficiaries = JSON.parse(storedData, (key, value) => {
          // Convert string to bigint
          return key === "totalAmount" ||
            key === "startTime" ||
            key === "cliffDuration" ||
            key === "vestDuration" ||
            key === "amountClaimed" ||
            key === "vestedAmount" ||
            key === "claimableAmount"
            ? BigInt(value)
            : value;
        });
      }
    } catch (error) {
      console.error("Error parsing localStorage data:", error);
    }

    if (mockBeneficiaries.length === 0) {
      mockBeneficiaries = [
        {
          address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address,
          isWhitelisted: true,
          vestingSchedule: {
            totalAmount: parseUnits("10000", 18),
            startTime: BigInt(Math.floor(Date.now() / 100)),
            cliffDuration: BigInt(30 * 24 * 60 * 60), // 30 days
            vestDuration: BigInt(365 * 24 * 60 * 60), // 1 year
            amountClaimed: BigInt(0),
            revoked: false,
          },
          vestedAmount: parseUnits("2000", 18),
          claimableAmount: parseUnits("2000", 18),
        },
        {
          address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address,
          isWhitelisted: true,
          vestingSchedule: undefined,
        },
        {
          address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address,
          isWhitelisted: false,
        },
      ];
    }

    setBeneficiaries(mockBeneficiaries);
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    formType: "vesting" | "whitelist"
  ) => {
    const { name, value } = e.target;
    if (formType === "vesting") {
      setVestingForm((prev) => ({ ...prev, [name]: value }));
    } else {
      setWhitelistForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetVestingForm = () => {
    setVestingForm({
      beneficiary: "",
      amount: "",
      cliffDuration: "",
      vestDuration: "",
      startTimestamp: "",
    });
  };

  const handleSubmitVesting = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // In a real implementation, validate the form first

      // First approve tokens for the vesting contract
      approveToken({
        address: tokenAddress,
        abi: TokenAbi,
        functionName: "approve",
        args: [
          contractAddress,
          parseUnits(vestingForm.amount, 18), // Assuming token has 18 decimals
        ],
      });
    } catch (error) {
      console.error("Error creating vesting schedule:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create vesting schedule",
      });
    }
  };

  const handleCreateSchedule = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = vestingForm.startTimestamp
      ? parseInt(vestingForm.startTimestamp)
      : currentTime + 60; // Default to 1 minute from now

    createSchedule({
      address: contractAddress,
      abi: TokenVestingAbi,
      functionName: "createVestingSchedule",
      args: [
        vestingForm.beneficiary as Address,
        parseUnits(vestingForm.amount, 18), // Assuming token has 18 decimals
        BigInt(parseInt(vestingForm.cliffDuration) * 24 * 60 * 60), // Convert days to seconds
        BigInt(parseInt(vestingForm.vestDuration) * 24 * 60 * 60), // Convert days to seconds
        BigInt(startTime),
      ],
    });
  };

  const handleWhitelistSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      addToWhitelist({
        address: contractAddress,
        abi: TokenVestingAbi,
        functionName: "addToWhitelist",
        args: [whitelistForm.beneficiary as Address],
      });
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to whitelist",
      });
    }
  };

  const handleRemoveFromWhitelist = (beneficiaryAddress: Address) => {
    try {
      setPendingRemoval(beneficiaryAddress);
      removeFromWhitelist({
        address: contractAddress,
        abi: TokenVestingAbi,
        functionName: "removeFromWhitelist",
        args: [beneficiaryAddress],
      });
    } catch (error) {
      console.error("Error removing from whitelist:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove from whitelist",
      });
      setPendingRemoval(null);
    }
  };

  const handleRevokeVesting = (beneficiaryAddress: Address) => {
    try {
      setPendingRevoke(beneficiaryAddress);
      revokeVesting({
        address: contractAddress,
        abi: TokenVestingAbi,
        functionName: "revokeVesting",
        args: [beneficiaryAddress],
      });
    } catch (error) {
      console.error("Error revoking vesting:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revoke vesting",
      });
      setPendingRevoke(null);
    }
  };
  return (
    <div className="space-y-6">
      {view === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Vesting Schedule Overview</CardTitle>
            <CardDescription>View all active vesting schedules</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Whitelist Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Vested Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiaries.map((beneficiary) => (
                  <TableRow key={beneficiary.address}>
                    <TableCell className="font-mono">
                      {beneficiary.address}
                    </TableCell>
                    <TableCell>
                      {beneficiary.isWhitelisted ? (
                        <Badge className="bg-green-500">Whitelisted</Badge>
                      ) : (
                        <Badge variant="outline">Not Whitelisted</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {beneficiary.vestingSchedule
                        ? formatUnits(
                            beneficiary.vestingSchedule.totalAmount,
                            18
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {beneficiary.vestedAmount
                        ? formatUnits(beneficiary.vestedAmount, 18)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {beneficiary.vestingSchedule?.revoked ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : beneficiary.vestingSchedule ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">No Schedule</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {beneficiary.isWhitelisted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveFromWhitelist(beneficiary.address)
                            }
                            disabled={isRemoveLoading}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWhitelistForm({
                                beneficiary: beneficiary.address,
                              });
                              handleWhitelistSubmit(new Event("click") as any);
                            }}
                            disabled={isWhitelistLoading}
                          >
                            Whitelist
                          </Button>
                        )}

                        {beneficiary.vestingSchedule &&
                          !beneficiary.vestingSchedule.revoked && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRevokeVesting(beneficiary.address)
                              }
                              disabled={isRevokeLoading}
                            >
                              Revoke
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {beneficiaries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No beneficiaries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {view === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Vesting Schedule</CardTitle>
            <CardDescription>
              Set up a new token vesting schedule for a beneficiary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitVesting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary Address</Label>
                <Input
                  id="beneficiary"
                  name="beneficiary"
                  placeholder="0x..."
                  value={vestingForm.beneficiary}
                  onChange={(e) => handleInputChange(e, "vesting")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Token Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  placeholder="1000"
                  value={vestingForm.amount}
                  onChange={(e) => handleInputChange(e, "vesting")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliffDuration">Cliff Duration (days)</Label>
                  <Input
                    id="cliffDuration"
                    name="cliffDuration"
                    type="number"
                    min="0"
                    placeholder="30"
                    value={vestingForm.cliffDuration}
                    onChange={(e) => handleInputChange(e, "vesting")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vestDuration">Vesting Duration (days)</Label>
                  <Input
                    id="vestDuration"
                    name="vestDuration"
                    type="number"
                    min="1"
                    placeholder="365"
                    value={vestingForm.vestDuration}
                    onChange={(e) => handleInputChange(e, "vesting")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTimestamp">
                  Start Time (Unix Timestamp)
                </Label>
                <Input
                  id="startTimestamp"
                  name="startTimestamp"
                  type="number"
                  min={Math.floor(Date.now() / 1000)}
                  placeholder="Leave empty for current time + 1 minute"
                  value={vestingForm.startTimestamp}
                  onChange={(e) => handleInputChange(e, "vesting")}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use current time + 1 minute. Current timestamp:{" "}
                  {Math.floor(Date.now() / 1000)}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isApproveLoading || isCreateLoading}
              >
                {isApproveLoading
                  ? "Approving..."
                  : isCreateLoading
                  ? "Creating..."
                  : "Create Vesting Schedule"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {view === "manage" && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Beneficiaries</CardTitle>
            <CardDescription>
              Add or remove beneficiaries from the whitelist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWhitelistSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="beneficiaryAddress">Beneficiary Address</Label>
                <Input
                  id="beneficiaryAddress"
                  name="beneficiary"
                  placeholder="0x..."
                  value={whitelistForm.beneficiary}
                  onChange={(e) => handleInputChange(e, "whitelist")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isWhitelistLoading}
              >
                {isWhitelistLoading ? "Adding..." : "Add to Whitelist"}
              </Button>
            </form>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Current Whitelist</h3>
              <div className="space-y-2">
                {beneficiaries
                  .filter((b) => b.isWhitelisted)
                  .map((beneficiary) => (
                    <div
                      key={beneficiary.address}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="font-mono text-sm">
                        {beneficiary.address}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRemoveFromWhitelist(beneficiary.address)
                        }
                        disabled={isRemoveLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                {beneficiaries.filter((b) => b.isWhitelisted).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No whitelisted beneficiaries
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
