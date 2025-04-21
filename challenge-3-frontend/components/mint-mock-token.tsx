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
import { LP_ADDRESS } from "@/lib/config";
import { mockErc20Abi } from "@/lib/abi";
type Props = {
    label: string;
};
export default function MintMockToken({ label }: Props) {

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

    const { data, refetch } = useReadContract({
        address: LP_ADDRESS,
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
                    address: LP_ADDRESS,
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
                    address: LP_ADDRESS,
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