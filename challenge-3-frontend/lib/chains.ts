import { defineChain } from "viem";
import { contractAddresses } from "./contractAddresses";

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
    HARRY_TOKEN: {
      address: contractAddresses.HARRY_TOKEN,
      blockCreated: 11277385,
    },
    HOGWARTS_TOKEN: {
      address: contractAddresses.HOGWARTS_TOKEN,
      blockCreated: 11277424,
    },
    TOKEN_VESTING: {
      address: contractAddresses.TOKEN_VESTING,
      blockCreated: 11278166,
    },
    YIELD_FARMING: {
      address: contractAddresses.YIELD_FARMING,
      blockCreated: 11278201,
    },
    FAUCET: {
      address: contractAddresses.FAUCET,
      blockCreated: 0,
    },
  },
});
