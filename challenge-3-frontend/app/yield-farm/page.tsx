"use client";

import YieldFarm from "@/components/yield-farm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function YieldFarmPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto min-h-screen items-center justify-center py-16 px-4">
      {/* headline card */}
      <Card className="w-full border-0 bg-muted/30 backdrop-blur-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
            Yield&nbsp;Farming&nbsp;Dashboard
          </CardTitle>
          <CardDescription className="text-sm/relaxed">
            Supply liquidity, lock positions for boosted&nbsp;APR, auto-compound
            rewards on-chain, and inspect full emission logs &amp;&nbsp;TVL
            analytics—all in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground text-center">
          Figures refresh every&nbsp;15&nbsp;s from the latest block; past
          performance is not a guarantee of future returns.
        </CardContent>
      </Card>

      {/* interactive area */}
      <YieldFarm />
    </div>
  );
}