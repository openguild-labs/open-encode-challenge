#  Frontend for OpenGuild Solidity Challenges (Token Vesting & Yield Farm)

![DOT UI Kit](/public/og-logo.png) 

This project is a frontend application built to interact with the smart contracts developed for the OpenGuild x Encode Club Solidity Challenges, specifically the **Token Vesting contract (Challenge 1)**. It utilizes the DOT UI Kit scaffolding, Next.js, Tailwind CSS, RainbowKit, Wagmi, and Viem.

## 🌟 Project Overview

This frontend provides a user interface for:
*   Connecting a Web3 wallet (MetaMask) configured for the **Westend Asset Hub**.
*   Interacting with a deployed **Token Vesting** smart contract.
*   Creating new vesting schedules (admin/deployer functionality).
*   Viewing details of existing vesting schedules for a beneficiary.
*   Allowing beneficiaries to release their vested tokens.

*(Note: While the scaffolding supports multi-chain, this particular instance is primarily configured and demonstrated for the TokenVesting contract on Westend Asset Hub).*

## ✨ Implemented Features

*   **Wallet Connectivity:**
    *   Connect/disconnect using RainbowKit, pre-configured for Westend Asset Hub.
    *   Display connected account and network.
*   **Token Vesting Interaction (Main Focus):**
    *   **Admin/Deployer View:**
        *   Form to create a new vesting schedule:
            *   Input beneficiary address.
            *   Input total amount of tokens to vest.
            *   Input vesting start time (defaults to now, can be future).
            *   Input cliff duration (e.g., in days).
            *   Input total vesting duration (e.g., in days).
        *   Requires interaction with a deployed ERC20 token contract (for specifying the token to be vested) and the TokenVesting factory/contract itself.
    *   **Beneficiary View:**
        *   Input their address (or auto-fills if connected).
        *   Display vesting schedule details: total vested, amount released, releasable amount, cliff, start, end.
        *   Button to `release` available tokens.
    *   (Functionality for interacting with the Yield Farming contract is not the primary focus of this instance but could be added).

## 🛠️ Tech Stack
*   [Next.js](https://nextjs.org/) (v14+)
*   [React](https://react.dev/) (v18+)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Lucide Icons](https://lucide.dev/)
*   [ShadCN UI](https://ui.shadcn.com/) (for UI components like Button, Input, Dialog)
*   [RainbowKit](https://www.rainbowkit.com/) (for wallet connection)
*   [Wagmi](https://wagmi.sh/) (for React Hooks interacting with Ethereum)
*   [Viem](https://viem.sh/) (as a low-level Ethereum interface, used by Wagmi)
*   [TypeScript](https://www.typescriptlang.org/)

## ⚙️ Setup & Configuration

### Prerequisites
*   [Node.js](https://nodejs.org/en/download/) (current LTS, e.g., v20.x or v18.x)
*   [npm](https://www.npmjs.com/get-npm) (v9.x or v10.x) or [Yarn](https://yarnpkg.com/)
*   [Git](https://git-scm.com/downloads)

### Getting Started

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/<your_github_username>/open-encode-challenge.git
    cd open-encode-challenge/challenge-3-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # OR
    # yarn install
    ```

### Connecting to Smart Contracts

The frontend needs to know the addresses and ABIs of the deployed smart contracts on Westend Asset Hub.

1.  **Contract Addresses & ABIs:**
    *   **Token Vesting Contract:** The address of your deployed `TokenVesting.sol` contract.
    *   **ERC20 Token Contract:** The address of the ERC20 token that is being vested.
    *   ABIs for both contracts are required.

2.  **Configuration:**
    *   Contract addresses and ABIs are primarily managed in `lib/abi.ts` and utilized within the components (e.g., `components/token-vesting.tsx`).
    *   **Update `lib/abi.ts` (or a dedicated config file/environment variables) with your deployed contract addresses:**
        ```typescript
        // Example in lib/abi.ts or a new lib/config.ts
        export const TOKEN_VESTING_CONTRACT_ADDRESS = "0xYourDeployedTokenVestingContractAddress_OnWestend";
        export const VESTED_TOKEN_CONTRACT_ADDRESS = "0xYourDeployedERC20TokenAddress_OnWestend";

        // You'll also need the ABIs. These can be large, so often they are imported from JSON files
        // For example, after compiling your contracts with Hardhat:
        // import TokenVestingABI from '../../challenge-1-vesting/artifacts/contracts/TokenVesting.sol/TokenVesting.json';
        // import ERC20TokenABI from '../../challenge-1-vesting/artifacts/contracts/token.sol/TestToken.json'; // Or your specific ERC20 token ABI

        // export const tokenVestingABI = TokenVestingABI.abi;
        // export const erc20TokenABI = ERC20TokenABI.abi;
        ```
        *Make sure the paths to ABI JSON files are correct relative to `lib/abi.ts` or adjust as needed.*
        *For a production build, prefer using environment variables for contract addresses (`NEXT_PUBLIC_TOKEN_VESTING_CONTRACT_ADDRESS`).*

3.  **Network Configuration:**
    *   The file `app/providers.tsx` configures Wagmi and RainbowKit. The `westendAssetHub` chain is already defined.
    *   Ensure your MetaMask is connected to the "Asset-Hub Westend Testnet" when using the application.

## 🚀 Running the Project Locally

```bash
npm run dev
# OR
# yarn dev
```
This will start the development server, typically on `http://localhost:3002`. You can change the port in `package.json` under the `scripts.dev` command if needed.

## 🏗️ Building for Production

```bash
npm run build
# OR
# yarn build
```
This command builds the application for production usage, outputting to the `.next` folder. You can then start it with `npm run start`.

## 📖 How to Use the Frontend

1.  **Navigate to the Application:** Open your browser to `http://localhost:3002` (or the deployed URL).
2.  **Connect Wallet:**
    *   Click the "Connect Wallet" button.
    *   Select MetaMask (or another compatible wallet if configured).
    *   Ensure your wallet is set to the "Asset-Hub Westend Testnet".
3.  **Token Vesting Page (`/token-vesting`):**
    *   This page should be the main interface for the vesting contract.
    *   **If you are the admin/owner of a vesting contract instance (or the deployer of the ERC20 token):**
        *   You might see options to create a new vesting schedule. This involves:
            *   Approving the `TokenVesting` contract to spend the required amount of your ERC20 tokens.
            *   Calling the function on your `TokenVesting` contract (or a factory) to set up the schedule with beneficiary, amount, start, cliff, and duration.
    *   **If you are a beneficiary:**
        *   The UI should allow you to query your vesting status (e.g., by connecting your wallet or entering your address).
        *   It will display:
            *   Total tokens vested to you.
            *   Tokens already released.
            *   Tokens currently releasable.
            *   Cliff end date.
            *   Vesting end date.
        *   A "Release Tokens" button will appear if you have releasable tokens. Clicking it will prompt a transaction in your wallet.

*(Specific UI elements and flow depend on the exact implementation in `app/token-vesting/page.tsx` and `components/token-vesting.tsx`)*

## 🏆 Hackathon Submission Notes
*   This frontend is designed to interact with the Token Vesting contract from Challenge 1.
*   Ensure contract addresses in `lib/abi.ts` (or your config solution) are updated to your deployed instances on Westend Asset Hub.
*   A live deployment URL will be provided if applicable.

---

## Documentation & Contributing (from original template)

Please see [`docs`](docs) for more information and guidelines for contributing to DotUI (the base template).
We welcome contributions to DotUI! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for more information and guidelines for contributing to DotUI.

