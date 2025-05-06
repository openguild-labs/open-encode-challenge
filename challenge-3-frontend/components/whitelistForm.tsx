"use client";
//import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useConfig } from "wagmi";
import { isAddress, type Address } from "viem";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { tokenVestingAbi } from "@/lib/abi";
import { getSigpassWallet } from "@/lib/sigpass";
import { localConfig } from "@/app/providers";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { LoaderCircle } from "lucide-react";
import { westendAssetHub } from "@/app/providers";

const whitelistSchema = z.object({
  beneficiary: z
    .string()
    .min(2)
    .max(50)
    .refine((val) => isAddress(val), {
      message: "Invalid Ethereum address",
    }) as z.ZodType<Address>,
});

export default function WhitelistForm() {
  const config = useConfig();
  const userAddress = useAtomValue(addressAtom);
  const TOKEN_VESTING_CONTRACT_ADRESS = "0xe52446815B09BB20813aE2Af750331E1f349C65d";

  const form = useForm<z.infer<typeof whitelistSchema>>({
    resolver: zodResolver(whitelistSchema),
    defaultValues: {
      beneficiary: "0x",
    },
  });

  const {
    data: hash,
    writeContractAsync,
    error,
    isPending,
  } = useWriteContract({
    config: userAddress ? localConfig : config,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: userAddress ? localConfig : config,
    });

  async function onSubmit(values: z.infer<typeof whitelistSchema>) {
    try {
      await writeContractAsync({
        account: await getSigpassWallet(),
        address: TOKEN_VESTING_CONTRACT_ADRESS,
        abi: tokenVestingAbi,
        functionName: "addToWhitelist",
        args: [values.beneficiary],
        chainId: westendAssetHub.id,
      });
      form.reset(); 
    } catch (err) {
      console.error("Whitelist error:", err);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="beneficiary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Whitelist Address</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Add to Whitelist"
            )}
          </Button>
        </form>
      </Form>
      {isConfirming && <p className="text-yellow-600">Confirming transaction...</p>}
      {isConfirmed && <p className="text-green-600">Address whitelisted successfully!</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
    </div>
  );
}
