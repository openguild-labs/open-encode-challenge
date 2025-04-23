'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  phantomWallet,
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
  manta,
  moonbaseAlpha,
  moonbeam
} from 'wagmi/chains';
import { defineChain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { Provider as JotaiProvider } from 'jotai';
import {
  LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
  REWARD_TOKEN_CONTRACT_ADDRESS,
  YIELD_FARMING_CONTRACT_ADDRESS,
} from "@/lib/config";

export const westendAssetHub = defineChain({
  id: 420420421,
  name: "Westend AssetHub",
  nativeCurrency: {
    decimals: 18,
    name: 'Westend',
    symbol: 'WND',
  },
  rpcUrls: {
    default: {
      http: ['https://westend-asset-hub-eth-rpc.polkadot.io'],
      webSocket: ['wss://westend-asset-hub-eth-rpc.polkadot.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://assethub-westend.subscan.io' },
  },
  contracts: {
    lpToken: {
      address: LIQUIDITY_POOL_TOKEN_CONTRACT_ADDRESS,
    },
    rewardToken: {
      address: REWARD_TOKEN_CONTRACT_ADDRESS,
    },
    yieldToken: {
      address: YIELD_FARMING_CONTRACT_ADDRESS,
    },
  },
})

export const localConfig = createConfig({
  chains: [
    westendAssetHub,
    manta,
    moonbaseAlpha,
    moonbeam,
  ],
  transports: {
    [westendAssetHub.id]: http(),
    [manta.id]: http(),
    [moonbaseAlpha.id]: http(),
    [moonbeam.id]: http(),
  },
  ssr: true,
});

const { wallets } = getDefaultWallets();
// initialize and destructure wallets object

const config = getDefaultConfig({
  appName: "OpenGuild", // Name your app
  projectId: "ddf8cf3ee0013535c3760d4c79c9c8b9", // Enter your WalletConnect Project ID here
  wallets: [
    ...wallets,
    {
      groupName: 'Other',
      wallets: [phantomWallet, trustWallet, ledgerWallet],
    },
  ],
  chains: [
    westendAssetHub,
    moonbeam,
    moonbaseAlpha,
    manta
  ],
  transports: {
    [westendAssetHub.id]: http(),
    [moonbeam.id]: http(),
    [moonbaseAlpha.id]: http(),
    [manta.id]: http(),
  },
  ssr: true, // Because it is Nextjs's App router, you need to declare ssr as true
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </JotaiProvider>
  );
}
