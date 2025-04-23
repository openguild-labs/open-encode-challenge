"use client";

import { useEffect } from "react";
import {
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  useAccount,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSigpassWallet } from "@/lib/sigpass";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { localConfig, westendAssetHub } from "@/app/providers";
import { LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS } from "@/lib/config";
import { mockErc20Abi } from "@/lib/abi";

type Props = {
  label: string;
};

export default function MintLpToken({ label }: Props) {
  const config = useConfig();
  const account = useAccount();
  const address = useAtomValue(addressAtom);

  const {
    data: hash,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  const { data: decimalsData, refetch } = useReadContract({
    address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
    abi: mockErc20Abi,
    functionName: "decimals",
    chainId: westendAssetHub.id,
    config: address ? localConfig : config,
  });

  const decimals = decimalsData as number | undefined;

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  const handleMint = async () => {
    try {
      const args = [
        address ?? account.address,
        parseUnits("1000", decimals as number),
      ] as const;

      if (address) {
        await writeContractAsync({
          account: await getSigpassWallet(),
          address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
          abi: mockErc20Abi,
          functionName: "mint",
          args,
          chainId: westendAssetHub.id,
        });
      } else {
        await writeContractAsync({
          address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
          abi: mockErc20Abi,
          functionName: "mint",
          args,
          chainId: westendAssetHub.id,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      refetch();
    }
  }, [isConfirmed, refetch]);

  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      <Button onClick={handleMint} disabled={isConfirming || isPending}>
        {(isConfirming || isPending) && <Loader2 className="animate-spin mr-2" />}
        Mint 1000 {label}
      </Button>
    </div>
  );
}