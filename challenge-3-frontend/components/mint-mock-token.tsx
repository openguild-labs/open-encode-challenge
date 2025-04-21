"use client";

// React imports
import { useEffect } from "react";

// Wagmi imports
import {
  useWaitForTransactionReceipt,
  useConfig,
  useWriteContract,
  useAccount,
  useReadContract,
} from "wagmi";

// Viem imports
import { parseUnits } from "viem";

// Lucide imports (for icons)
import { Loader2 } from "lucide-react";

// UI imports
import { Button } from "@/components/ui/button";

// Utils imports

// Component imports

// Library imports
import { getSigpassWallet } from "@/lib/sigpass";
import { useAtomValue } from "jotai";
import { addressAtom } from "@/components/sigpasskit";
import { localConfig, westendAssetHub } from "@/app/providers";
import { LPTOKEN_CONTRACT_ADDRESS } from "@/lib/constants";
import { mockErc20Abi } from "@/lib/abi";
type Props = {
  label: string;
};
export default function MintMockToken({ label }: Props) {
  // useConfig hook to get config
  const config = useConfig();

  // useAccount hook to get account
  const account = useAccount();

  // get the address from session storage
  const address = useAtomValue(addressAtom);

  // useWriteContract hook to write contract
  const {
    data: hash,
    isPending,
    writeContractAsync,
  } = useWriteContract({
    config: address ? localConfig : config,
  });

  // useReadContracts hook to read contract
  const { data, refetch } = useReadContract({
    address: LPTOKEN_CONTRACT_ADDRESS,
    abi: mockErc20Abi,
    functionName: "decimals",
    chainId: westendAssetHub.id,
    config: address ? localConfig : config,
  });

  // get the max balance and decimals from the data
  const decimals = data as number | undefined;

  // useWaitForTransactionReceipt hook to wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      config: address ? localConfig : config,
    });

  const handleMintToken = async () => {
    try {
      if (address) {
        writeContractAsync({
          account: await getSigpassWallet(),
          address: LPTOKEN_CONTRACT_ADDRESS,
          abi: mockErc20Abi,
          functionName: "mint",
          args: [
            address ? address : account.address,
            parseUnits("1000", decimals as number),
          ],
          chainId: westendAssetHub.id,
        });
      } else {
        writeContractAsync({
          address: LPTOKEN_CONTRACT_ADDRESS,
          abi: mockErc20Abi,
          functionName: "mint",
          args: [
            address ? address : account.address,
            parseUnits("1000", decimals as number),
          ],
          chainId: westendAssetHub.id,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // when isConfirmed, refetch the balance of the address
  useEffect(() => {
    if (isConfirmed) {
      refetch();
    }
  }, [isConfirmed, refetch]);

  return (
    <div className="flex flex-col gap-4 w-[320px] md:w-[425px]">
      <Button onClick={handleMintToken} disabled={isConfirming || isPending}>
        {isConfirming || isPending ? (
          <Loader2 className="animate-spin mr-2" />
        ) : null}
        Mint 1000 {label}
      </Button>
    </div>
  );
}
