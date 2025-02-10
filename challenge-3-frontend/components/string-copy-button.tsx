"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Address as EvmAddress } from "viem";


export default function StringCopyButton({
  copyText,
  buttonTitle,
}: {
  copyText: EvmAddress | string | null;
  buttonTitle: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(copyText ? copyText : "");
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  return (
    <Button variant="ghost" disabled={isCopied} onClick={copy} className="p-2 font-mono">
      {isCopied ? (
        <div className="flex flex-row gap-2 items-center">
          {buttonTitle}
          <Check className="h-4 w-4" />
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          {buttonTitle}
          <Copy className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
}
