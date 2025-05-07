// pages/yield-farming.tsx
'use client';
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function YieldFarming() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const isAdmin = true; // simulate admin check

  return (
    <div className="p-8 grid gap-8 max-w-5xl mx-auto font-sans">
      {/* Stake Section */}
      <Card>
        <CardHeader>
          <CardTitle>Stake Your Tokens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Amount to stake"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
          />
          <Button>Stake</Button>
          <p className="text-sm text-muted-foreground">LP Token Balance: 120.5</p>
          <p className="text-sm text-muted-foreground">Estimated APR: 18.25%</p>
        </CardContent>
      </Card>

      {/* Rewards Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-lg font-semibold">Pending Rewards: 42.00</p>
          <Button>Claim Rewards</Button>
          <p className="text-sm text-muted-foreground">Staking Duration: 12 days</p>
          <div className="flex items-center gap-2">
            <span className="text-xs">Progress to 30-day boost:</span>
            <Progress value={40} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Section */}
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Tokens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <Button>Withdraw</Button>
          <p className="text-sm text-muted-foreground">Currently Staked: 250.00</p>
        </CardContent>
      </Card>

      {/* Emergency Withdraw */}
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-600">⚠ Emergency Withdraw</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-red-500">
            Use only if absolutely necessary. This action is irreversible and might forfeit rewards.
          </p>
          <Button variant="destructive">Emergency Withdraw</Button>
        </CardContent>
      </Card>

      {/* Admin Panel */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Current Reward Rate: 2.5x</p>
            <Input placeholder="New Reward Rate (e.g., 3.0)" />
            <Button>Update Rate</Button>
          </CardContent>
        </Card>
      )}

      {/* Boost Multiplier Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Boost Multiplier</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-lg font-semibold">Current Multiplier: 1.5x</p>
          <div className="flex items-center gap-2">
            <span className="text-xs">Progress to 2x:</span>
            <Progress value={75} className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
