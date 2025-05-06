"use client";

import { useState, useEffect } from "react";
import {
  type BaseError,
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  
} from "wagmi";
import { 
  parseEther, 
  isAddress, 
  Address } from "viem";
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
import { useAtomValue } from 'jotai';
import { addressAtom } from '@/components/sigpasskit';
import { localConfig } from '@/app/providers';
import { tokenVestingAbi } from "@/lib/abi";


const formSchema = z.object({
  
  tokenAddress: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address | "">,

    beneficiary: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => val === "" || isAddress(val), {
      message: "Invalid Ethereum address format",
    }) as z.ZodType<Address | "">,
 

  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => /^\d*\.?\d{0,18}$/.test(val), {
      message: "Amount cannot have more than 18 decimal places",
    }),

    startDate: z.date({
      required_error: "Start date is required",
    }),
    cliffDuration: z.date({
      required_error: "Cliff duration is required",
    }),
    vestingDuration: z
      .string()
      .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
        message: "Vesting duration must be a positive number (in seconds)",
      }),
});

export default function TokenVesting() {

  // useConfig hook to get config
  const config = useConfig();

  // useMediaQuery hook to check if the screen is desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // useState hook to open/close dialog/drawer
  const [open, setOpen] = useState(false);

  // get the address from session storage
  const address = useAtomValue(addressAtom)

  // useSendTransaction hook to send transaction
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  const TOKEN_VESTING_CONTRACT_ADRESS = "0xe52446815B09BB20813aE2Af750331E1f349C65d"

  // Form 
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    
    defaultValues: {
      amount: "",
      beneficiary: "",
      startDate: new Date(),
      cliffDuration: new Date(),
      vestingDuration: "",

    },
  });


// Fixed submit handler
async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    if (values.tokenAddress) {
      // This is for adding to whitelist functionality
      await writeContractAsync({
        account: await getSigpassWallet(),
        address: TOKEN_VESTING_CONTRACT_ADRESS,
        abi: tokenVestingAbi,
        functionName: "addToWhitelist",
        args: [values.beneficiary],
        chainId: westendAssetHub.id,
      });
    } else {
      // This is for native token transfer
      await writeContractAsync({
        address: values.beneficiary as Address, 
        abi: tokenVestingAbi,
        functionName: "transfer", 
        args: [values.beneficiary, parseEther(values.amount)], 
        chainId: westendAssetHub.id,
      });
    }
    
    // Handle success
    console.log("Transaction submitted successfully");
    
  } catch (error) {
    // Handle error
    console.error("Transaction failed:", error);
  }
}
  useEffect(() => {
    if (hash) {
      setOpen(true);
    }
  }, [hash]);


  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });


  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
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
                <FormDescription>
                  The address of the beneficiary receiving the tokens.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Token Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1000" {...field} />
                </FormControl>
                <FormDescription>
                  The total amount of tokens to vest.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD"
                    value={field.value ? field.value.toISOString().split("T")[0] : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  The date when the vesting starts in days.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cliff Duration */}
          <FormField
            control={form.control}
            name="cliffDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliff Duration</FormLabel>   
                <FormControl>
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD"
                    value={field.value ? field.value.toISOString().split("T")[0] : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  End of cliff period.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Vesting Duration */}
          <FormField
            control={form.control}
            name="vestingDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vesting Duration (in days)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="31536000" {...field} />
                </FormControl>
                <FormDescription>
                  The total duration of the vesting schedule in days.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {
            isPending ? (
              <Button type="submit" disabled className="w-full">
                <LoaderCircle className="w-4 h-4 animate-spin" /> Confirm in wallet...
              </Button>
            ) : (
              <Button type="submit" className="w-full">Vest Tokens</Button>
            )
          }
        </form>
      </Form>
      {
        // Desktop would be using dialog
        isDesktop ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Transaction status <ChevronDown />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transaction status</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                Follow the transaction status below.
              </DialogDescription>
              <div className="flex flex-col gap-2">
                {hash ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                    <a className="flex flex-row gap-2 items-center underline underline-offset-4" href={`${config.chains?.[0]?.blockExplorers?.default?.url}/tx/${hash}`} target="_blank" rel="noopener noreferrer">
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
                {
                  !isPending && !isConfirmed && !isConfirming && (
                    <div className="flex flex-row gap-2 items-center">
                      <Ban className="w-4 h-4" /> No transaction submitted
                    </div>
                  )
                }
                {isConfirming && (
                  <div className="flex flex-row gap-2 items-center text-yellow-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting
                    for confirmation...
                  </div>
                )}
                {isConfirmed && (
                  <div className="flex flex-row gap-2 items-center text-green-500">
                    <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                  </div>
                )}
                {error && (
                  <div className="flex flex-row gap-2 items-center text-red-500">
                    <X className="w-4 h-4" /> Error:{" "}
                    {(error as BaseError).shortMessage || error.message}
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
          // Mobile would be using drawer
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="w-full">
                Transaction status <ChevronDown />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Transaction status</DrawerTitle>
                <DrawerDescription>
                  Follow the transaction status below.
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-2 p-4">
                {hash ? (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    Transaction Hash
                    <a className="flex flex-row gap-2 items-center underline underline-offset-4" href={`${config.chains?.[0]?.blockExplorers?.default?.url}/tx/${hash}`} target="_blank" rel="noopener noreferrer">
                      {truncateHash(hash)}
                      <ExternalLink className="w-4 h-4" />
                      <CopyButton copyText={hash} />
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 items-center">
                    <Hash className="w-4 h-4" />
                    No transaction hash
                  </div>
                )}
                {
                  !isPending && !isConfirmed && !isConfirming && (
                    <div className="flex flex-row gap-2 items-center">
                      <Ban className="w-4 h-4" /> No transaction submitted
                    </div>
                  )
                }
                {isConfirming && (
                  <div className="flex flex-row gap-2 items-center text-yellow-500">
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Waiting
                    for confirmation...
                  </div>
                )}
                {isConfirmed && (
                  <div className="flex flex-row gap-2 items-center text-green-500">
                    <CircleCheck className="w-4 h-4" /> Transaction confirmed!
                  </div>
                )}
                {error && (
                  <div className="flex flex-row gap-2 items-center text-red-500">
                    <X className="w-4 h-4" /> Error:{" "}
                    {(error as BaseError).shortMessage || error.message}
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
        )
      }
    </div>
  );
}