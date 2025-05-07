import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      evmVersion: "london",
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // For testing, allow unlimited contract size
      allowUnlimitedContractSize: true,
    },
    "asset-hub-westend": {
      url: "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      timeout: 100000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  mocha: {
    timeout: 40000, // 40 seconds for Polkadot network tests
  },
  // Add typechain support
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;