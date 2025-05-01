"use client";

import SendTransaction from "@/components/send-transaction";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SendTransactionPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[768px] mx-auto min-h-screen items-center justify-center py-16 px-4">
      <Card className="w-full border-0 bg-muted/30 backdrop-blur-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
            Send&nbsp;Transaction
          </CardTitle>
          <CardDescription>
            Transfer assets securely using passkey or browser wallets, with intuitive validation and real-time status updates from submission to confirmation.
          </CardDescription>
        </CardHeader>
      </Card>

      <SendTransaction />
    </div>
  );
}