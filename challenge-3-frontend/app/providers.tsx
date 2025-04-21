"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import {
  phantomWallet,
  trustWallet,
  ledgerWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { sepolia, manta, moonbaseAlpha, moonbeam } from "wagmi/chains";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { Provider as JotaiProvider } from "jotai";

export const westendAssetHub = defineChain({
  id: 420420421,
  name: "Westend AssetHub",
  nativeCurrency: {
    decimals: 18,
    name: "Westend",
    symbol: "WND",
  },
  rpcUrls: {
    default: {
      http: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
      webSocket: ["wss://westend-asset-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://assethub-westend.subscan.io" },
  },
  contracts: {
    multicall3: {
      address: "0x5545dec97cb957e83d3e6a1e82fabfacf9764cf1",
      blockCreated: 10174702,
    },
  },
});

const { wallets } = getDefaultWallets();

const localConfig = getDefaultConfig({
  appName: "pkVester", // Name your app
  projectId: "ed53c978c176ff8e0e1c463760d1bd75", // Enter your WalletConnect Project ID here
  wallets: [
    ...wallets,
    {
      groupName: "Other",
      wallets: [phantomWallet, trustWallet, ledgerWallet],
    },
  ],
  chains: [westendAssetHub, moonbeam, moonbaseAlpha, manta, sepolia],
  transports: {
    [westendAssetHub.id]: http(),
    [moonbeam.id]: http(),
    [moonbaseAlpha.id]: http(),
    [manta.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <WagmiProvider config={localConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>{children}</RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </JotaiProvider>
  );
}
