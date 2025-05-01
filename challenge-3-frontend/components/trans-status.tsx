"use client";

import {
  Ban,
  CircleCheck,
  ExternalLink,
  Hash,
  LoaderCircle,
  X,
} from "lucide-react";
import { type BaseError } from "wagmi";
import { truncateHash } from "@/lib/utils";
import CopyButton from "@/components/copy-button";

export interface TransactionStatusProps {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error?: BaseError | null;
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
  return (
    <div className="flex flex-col gap-2">
      {hash ? (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Transaction&nbsp;Hash
          <a
            href={`${explorerUrl}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 underline underline-offset-4"
          >
            {truncateHash(hash)}
            <ExternalLink className="w-4 h-4" />
          </a>
          <CopyButton copyText={hash} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          No&nbsp;transaction&nbsp;hash
        </div>
      )}

      {!isPending && !isConfirming && !isConfirmed && (
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4" />
          No&nbsp;transaction&nbsp;submitted
        </div>
      )}

      {isConfirming && (
        <div className="flex items-center gap-2 text-yellow-500">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Waiting&nbsp;for&nbsp;confirmation…
        </div>
      )}

      {isConfirmed && (
        <div className="flex items-center gap-2 text-green-500">
          <CircleCheck className="w-4 h-4" />
          Transaction&nbsp;confirmed!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500">
          <X className="w-4 h-4" />
          Error:&nbsp;{(error as BaseError).shortMessage || error.message}
        </div>
      )}
    </div>
  );
}
