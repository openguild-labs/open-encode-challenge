"use client";

import Vesting from "@/components/vesting";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function VestingPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto min-h-screen items-center justify-center py-16 px-4">
      {/* headline + how-it-works */}
      <Card className="w-full border-0 bg-muted/30 backdrop-blur-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
            Token&nbsp;Vesting&nbsp;Studio
          </CardTitle>
          <CardDescription className="text-sm/relaxed">
            Craft multi-cliff schedules with custom slice&nbsp;periods and optional
            revocability, unlock tokens linearly (or instantly after each cliff), and
            monitor real-time release progress with human-readable timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-left text-sm">
          <h4 className="font-semibold">How&nbsp;it&nbsp;works</h4>
          <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
            <li><strong>Cliff</strong>&nbsp;— minimum time before any tokens unlock.</li>
            <li><strong>Slice&nbsp;period</strong>&nbsp;— granularity of unlock distributions.</li>
            <li><strong>Revocable</strong>&nbsp;— if enabled, the creator can revoke unvested tokens.</li>
          </ul>
        </CardContent>
      </Card>

      {/* interactive widgets */}
      <Vesting />
    </div>
  );
} 