"use client";

import { Check, Loader2, X, AlertTriangle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";

interface TransactionStatusProps {
  hash?: `0x${string}`;
  isPending?: boolean;
  isConfirming?: boolean;
  isConfirmed?: boolean;
  error?: Error;
  explorerUrl?: string;
}

export default function TransactionStatus({
  hash,
  isPending,
  isConfirming,
  isConfirmed,
  error,
  explorerUrl,
}: TransactionStatusProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Timer for pending transactions
  useEffect(() => {
    if (!isPending && !isConfirming) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPending, isConfirming]);

  return (
    <div className="space-y-4">
      {/* Transaction hash */}
      {hash && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Transaction Hash</span>
            {explorerUrl && (
              <a
                href={`${explorerUrl}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-500 hover:text-blue-600"
              >
                View <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
          <div className="mt-1 font-mono text-sm break-all">{hash}</div>
        </div>
      )}

      {/* Status indicators */}
      <div className="space-y-3">
        <StatusItem
          status={
            isPending ? "current" : isPending === false ? "complete" : "pending"
          }
          title="Transaction initiated"
          description="Your transaction has been created and is being prepared"
        />

        <StatusItem
          status={
            isPending === false && isConfirming
              ? "current"
              : isConfirming === false && isConfirmed
              ? "complete"
              : "pending"
          }
          title="Confirming transaction"
          description="Waiting for the network to confirm your transaction"
          showTimer={isConfirming}
          time={timeElapsed}
        />

        <StatusItem
          status={isConfirmed ? "complete" : "pending"}
          title="Transaction confirmed"
          description="Your transaction has been successfully confirmed"
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">
                Transaction Error
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error.message.split("(")[0]}{" "}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusItemProps {
  status: "pending" | "current" | "complete";
  title: string;
  description: string;
  showTimer?: boolean;
  time?: number;
}

function StatusItem({
  status,
  title,
  description,
  showTimer,
  time,
}: StatusItemProps) {
  return (
    <div className="flex items-start">
      <div className="mr-3 mt-0.5">
        {status === "pending" ? (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
        ) : status === "current" ? (
          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4
            className={`font-medium ${
              status === "pending"
                ? "text-gray-500 dark:text-gray-400"
                : status === "current"
                ? "text-blue-700 dark:text-blue-400"
                : "text-green-700 dark:text-green-400"
            }`}
          >
            {title}
          </h4>

          {showTimer && time !== undefined && (
            <span className="text-xs text-muted-foreground">
              {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
