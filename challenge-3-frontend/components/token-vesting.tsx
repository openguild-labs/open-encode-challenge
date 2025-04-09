"use client";

// React imports
import { useState, useEffect } from "react";

// Wagmi imports
import {
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
} from "wagmi";

// Viem imports
import { isAddress, Address, zeroAddress } from "viem";

// Lucide imports (for icons)
import { Ban, ExternalLink, LoaderCircle, CircleCheck } from "lucide-react";

// Zod imports
import { z } from "zod";

// Zod resolver imports
import { zodResolver } from "@hookform/resolvers/zod";

// React hook form imports
import { useForm } from "react-hook-form";

// UI imports
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
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// Utils imports
import { truncateHash } from "@/lib/utils";

// Component imports
import CopyButton from "@/components/copy-button";

// Library imports
import { getSigpassWallet } from "@/lib/sigpass";
import { westendAssetHub } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { localConfig } from "@/app/providers";

// Import the TokenVesting ABI
import { tokenVestingAbi } from "@/lib/abi";
import { useToast } from "@/hooks/use-toast";

export default function TokenVesting() {
  // useConfig hook to get config
  const config = useConfig();

  // useMediaQuery hook to check if the screen is desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // useState hook to open/close dialog/drawer
  const [open, setOpen] = useState(false);

  // get the address from session storage
  const address = useAtomValue(addressAtom);

  // Toast for notifications
  const { toast } = useToast();

  // useWriteContract hook to write contract
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  // The token vesting contract address
  // Note: This should be replaced with the actual deployed contract address
  const TOKEN_VESTING_CONTRACT_ADDRESS =
    "0xYourDeployedContractAddressHere" as Address;

  // Check if the current user is the contract owner - commenting out for now as it's not used
  // but could be useful for permission checks in the future
  /* 
  const { data: isOwner } = useReadContract({
    address: TOKEN_VESTING_CONTRACT_ADDRESS,
    abi: tokenVestingAbi,
    functionName: 'owner',
    account: address ? address : account.address,
    config: address ? localConfig : config,
  });
  */

  // form schema for adding to whitelist
  const formSchema = z.object({
    // address is a required field
    beneficiary: z
      .string()
      .min(2)
      .max(50)
      .refine((val) => isAddress(val), {
        message: "Invalid address format",
      }) as z.ZodType<Address>,
  });

  // Define the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beneficiary: zeroAddress, // Use zeroAddress as default instead of empty string
    },
  });

  // Update the onSubmit function to use getSigpassWallet consistently
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (address) {
        // Using SigPass wallet
        const sigpassWallet = await getSigpassWallet();
        if (!sigpassWallet) {
          toast({
            title: "Wallet Error",
            description: "Failed to retrieve SigPass wallet.",
            variant: "destructive",
          });
          return;
        }

        const approval = window.confirm(
          `Do you want to approve adding ${values.beneficiary} to the whitelist?`
        );

        if (!approval) {
          toast({
            title: "Approval Denied",
            description:
              "You denied the approval to add the address to the whitelist.",
            variant: "destructive",
          });
          return;
        }

        await writeContractAsync({
          account: sigpassWallet,
          address: TOKEN_VESTING_CONTRACT_ADDRESS,
          abi: tokenVestingAbi,
          functionName: "addToWhitelist",
          args: [values.beneficiary],
          chainId: westendAssetHub.id,
        });
      } else {
        // Fallback to connected wallet
        const approval = window.confirm(
          `Do you want to approve adding ${values.beneficiary} to the whitelist?`
        );

        if (!approval) {
          toast({
            title: "Approval Denied",
            description:
              "You denied the approval to add the address to the whitelist.",
            variant: "destructive",
          });
          return;
        }

        await writeContractAsync({
          address: TOKEN_VESTING_CONTRACT_ADDRESS,
          abi: tokenVestingAbi,
          functionName: "addToWhitelist",
          args: [values.beneficiary],
          chainId: westendAssetHub.id,
        });
      }
    } catch (e) {
      console.error("Error adding to whitelist:", e);
      toast({
        title: "Failed to add to whitelist",
        description: "There was an error adding the address to the whitelist",
        variant: "destructive",
      });
    }
  }

  // Watch for transaction hash and open dialog/drawer when received
  useEffect(() => {
    if (hash) {
      setOpen(true);
    }
  }, [hash]);

  // useWaitForTransactionReceipt hook to wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  // After confirmation, display success toast
  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "Address added to whitelist",
        description: "The address has been successfully added to the whitelist",
        variant: "default",
      });
    }
  }, [isConfirmed, toast]);

  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Add to Whitelist</h2>
        <p className="text-sm text-gray-500 mb-4">
          Add an address to the token vesting whitelist. Only the contract owner
          can add addresses.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="beneficiary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the Ethereum address to add to the whitelist
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Adding to whitelist...
                </>
              ) : (
                "Add to Whitelist"
              )}
            </Button>
          </form>
        </Form>
      </div>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Status</DialogTitle>
              <DialogDescription>
                View the status of your transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Transaction Hash:</span>
                <div className="flex flex-row items-center gap-2">
                  <span className="font-mono text-xs">
                    {hash ? truncateHash(hash) : "N/A"}
                  </span>
                  {hash && <CopyButton copyText={hash} />}
                </div>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Status:</span>
                <div className="flex flex-row items-center gap-2">
                  {isConfirming && (
                    <div className="flex items-center">
                      <LoaderCircle className="h-3 w-3 animate-spin mr-2" />
                      <span className="text-xs">Confirming...</span>
                    </div>
                  )}
                  {isConfirmed && (
                    <div className="flex items-center text-green-500">
                      <CircleCheck className="h-3 w-3 mr-2" />
                      <span className="text-xs">Confirmed!</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center text-red-500">
                      <Ban className="h-3 w-3 mr-2" />
                      <span className="text-xs">Error!</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Blockchain:</span>
                <div className="flex flex-row items-center gap-2">
                  <span className="text-xs">{westendAssetHub.name}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              {hash && (
                <a
                  href={`https://westend.subscan.io/extrinsic/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline">
                    View on Subscan
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Transaction Status</DrawerTitle>
              <DrawerDescription>
                View the status of your transaction.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4">
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Transaction Hash:</span>
                <div className="flex flex-row items-center gap-2">
                  <span className="font-mono text-xs">
                    {hash ? truncateHash(hash) : "N/A"}
                  </span>
                  {hash && <CopyButton copyText={hash} />}
                </div>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Status:</span>
                <div className="flex flex-row items-center gap-2">
                  {isConfirming && (
                    <div className="flex items-center">
                      <LoaderCircle className="h-3 w-3 animate-spin mr-2" />
                      <span className="text-xs">Confirming...</span>
                    </div>
                  )}
                  {isConfirmed && (
                    <div className="flex items-center text-green-500">
                      <CircleCheck className="h-3 w-3 mr-2" />
                      <span className="text-xs">Confirmed!</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center text-red-500">
                      <Ban className="h-3 w-3 mr-2" />
                      <span className="text-xs">Error!</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center justify-between">
                <span className="text-sm font-semibold">Blockchain:</span>
                <div className="flex flex-row items-center gap-2">
                  <span className="text-xs">{westendAssetHub.name}</span>
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              {hash && (
                <a
                  href={`https://westend.subscan.io/extrinsic/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline">
                    View on Subscan
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
