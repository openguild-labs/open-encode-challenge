"use client";

import MintRedeemLstBifrost from "@/components/mint-redeem-lst-bifrost";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function MintRedeemLstBifrostPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center py-16 px-4">
      <Card className="w-full border-0 bg-muted/30 backdrop-blur-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Mint&nbsp;/&nbsp;Redeem&nbsp;LST&nbsp;Bifrost
          </CardTitle>
          <CardDescription>
            Swap supported assets for liquid staking tokens or redeem them anytime through
            cross-chain Bifrost orders with seamless approvals and progress tracking.
          </CardDescription>
        </CardHeader>
      </Card>

      <MintRedeemLstBifrost />
    </div>
  );
}