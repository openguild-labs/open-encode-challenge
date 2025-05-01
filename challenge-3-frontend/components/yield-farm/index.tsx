"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useReadContract } from "wagmi";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Stake from "./stake";
import Withdraw from "./withdraw";
import {
  LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
  YIELD_FARMING_CONTRACT_ADDRESS,
} from "@/lib/config";
import { mockErc20Abi, yieldFarmingAbi } from "@/lib/abi";
import { Skeleton } from "@/components/ui/skeleton";

export default function YieldFarm() {
  /* ------------------------------------------------------------ */
  /*                     On-chain pooled metrics                   */
  /* ------------------------------------------------------------ */
  const { data: tvlRaw } = useReadContract({
    address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
    abi: mockErc20Abi,
    functionName: "totalSupply",
  });

  const { data: rewardRateRaw } = useReadContract({
    address: YIELD_FARMING_CONTRACT_ADDRESS,
    abi: yieldFarmingAbi,
    functionName: "rewardRate",
  });

  const tvl = useMemo(
    () => (tvlRaw ? formatUnits(tvlRaw as bigint, 18) : null),
    [tvlRaw]
  );

  const rewardRate = useMemo(
    () => (rewardRateRaw ? formatUnits(rewardRateRaw as bigint, 18) : null),
    [rewardRateRaw]
  );

  /* ------------------------------------------------------------ */
  /*                            UI                                */
  /* ------------------------------------------------------------ */
  return (
    <div className="flex flex-col gap-10 w-full">
      {/* Pool statistics  */}
      <Card className="w-full border-0 bg-muted/20 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl">Pool&nbsp;Statistics</CardTitle>
          <CardDescription>Updated live on-chain</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6 pt-4">
          <Stat label="TVL" value={tvl ? `${tvl} LP` : undefined} />
          <Stat
            label="Reward Rate"
            value={rewardRate ? `${rewardRate} REWARD / s` : undefined}
          />
        </CardContent>
      </Card>

      {/* Stake / Withdraw tabs */}
      <Tabs defaultValue="stake" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stake">Stake</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="pt-6">
          <Stake />
        </TabsContent>
        <TabsContent value="withdraw" className="pt-6">
          <Withdraw />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------ */
/*                         Helper component                      */
/* ------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value ? (
        <span className="text-base font-semibold">{value}</span>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
    </div>
  );
}