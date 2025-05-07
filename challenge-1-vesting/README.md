# Challenge 1: Token Vesting Smart Contract ⏳

This project implements a Token Vesting smart contract using Solidity and Hardhat. The contract allows for the time-locked release of ERC20 tokens to beneficiaries, a common requirement for teams, advisors, and early investors in blockchain projects.

## 🌟 Project Overview

The `TokenVesting.sol` contract enables a beneficiary to receive a specified number of tokens over a set vesting schedule. The schedule includes a cliff period (an initial waiting time before any tokens are released) and a vesting period during which tokens are gradually released.

**Key Features:**
*   **ERC20 Token Support:** Can vest any ERC20 compliant token.
*   **Customizable Vesting Schedules:** Define start time, cliff duration, and overall vesting duration.
*   **Beneficiary Management:** Clearly assigns tokens to a specific beneficiary.
*   **Revocable (Optional):** Includes functionality for the owner to revoke a vesting schedule (if implemented as such, otherwise this can be stated as non-revocable).
*   **Token Release:** Beneficiaries can release their vested tokens at any point after the cliff and during/after the vesting period.

## 🛠️ Local Development Environment Setup

### Prerequisites
*   **Node.js & npm:** Ensure you have Node.js (LTS version recommended) and npm installed. You can use [Volta](https://volta.sh/) to manage Node.js versions.
    *   Install Volta:
        ```bash
        # macOS/Linux
        curl https://get.volta.sh | bash
        source ~/.bashrc # or ~/.zshrc
        # Windows: Download from https://docs.volta.sh/guide/getting-started
        ```
    *   Install Node.js:
        ```bash
        volta install node
        ```
*   **Git:** [Install Git](https://git-scm.com/downloads).

### Getting Started

1.  **Clone the repository (if you haven't already):**
    ```bash
    # If you've forked the main challenge repository:
    git clone https://github.com/<your_github_username>/open-encode-challenge.git
    cd open-encode-challenge/challenge-1-vesting
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ⚙️ Contract Development & Testing

### Directory Structure
*   `contracts/`: Contains the Solidity source code.
    *   `TokenVesting.sol`: The main vesting contract.
    *   `token.sol`: A mock ERC20 token contract (`TestToken`) used for testing.
*   `test/`: Contains Hardhat tests written in TypeScript.
    *   `vesting.ts`: Test suite for the `TokenVesting` contract.
*   `ignition/modules/`: Contains Hardhat Ignition deployment scripts.
    *   `token-vesting.ts`: Script to deploy `TestToken` and `TokenVesting`.
*   `hardhat.config.ts`: Hardhat configuration file.

### Compile Contracts
To compile the smart contracts:
```bash
npx hardhat compile
```
This will generate ABI and bytecode in the `artifacts/` directory.

### Run Tests
To ensure the contract functions as expected:
```bash
npx hardhat test
```
All tests in the `test/vesting.ts` file should pass.

## 🚀 Deployment to Westend Asset Hub

This contract is intended to be deployed on the **Westend Asset Hub**, a Polkadot parachain.

### 1. Setup MetaMask for Westend Asset Hub

*   **Install MetaMask:** If you don't have it, get it from [metamask.io](https://metamask.io).
*   **Add Westend Asset Hub Network:**
    *   Network Name: `Asset-Hub Westend Testnet`
    *   RPC URL: `https://westend-asset-hub-eth-rpc.polkadot.io`
    *   Chain ID: `420420421`
    *   Currency Symbol: `WND`
    *   Block Explorer URL: `https://assethub-westend.subscan.io/`

### 2. Get Test WND Tokens
You'll need `WND` tokens for gas fees. Get them from the [Westend faucet](https://faucet.polkadot.io/westend?parachain=1000) by providing your MetaMask address.

### 3. Deploying

**Using Hardhat Ignition (Recommended for local/testnet scripting):**

The `ignition/modules/token-vesting.ts` script handles deployment.
First, you'll need to deploy a mock ERC20 token (or use an existing one) whose address will be passed to the `TokenVesting` constructor.

To deploy to Westend Asset Hub using Hardhat, you'll need to:
1.  Update `hardhat.config.ts` to include the Westend Asset Hub network configuration and your deployer private key (use environment variables for security).
    ```typescript
    // hardhat.config.ts
    import { HardhatUserConfig } from "hardhat/config";
    import "@nomicfoundation/hardhat-toolbox";
    import "@nomicfoundation/hardhat-ignition-ethers"; // Ensure this is imported

    const WESTEND_ASSET_HUB_RPC_URL = process.env.WESTEND_ASSET_HUB_RPC_URL || "https://westend-asset-hub-eth-rpc.polkadot.io";
    const PRIVATE_KEY = process.env.PRIVATE_KEY || "your_private_key_here"; // PLEASE USE ENVIRONMENT VARIABLES

    const config: HardhatUserConfig = {
      solidity: "0.8.24", // Or your contract's version
      networks: {
        westendAssetHub: {
          url: WESTEND_ASSET_HUB_RPC_URL,
          chainId: 420420421,
          accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        // ... other networks
      },
      // ... other configurations
    };

    export default config;
    ```
2.  Ensure your `ignition/modules/token-vesting.ts` is correctly set up to deploy the `TestToken` (or reference an existing one) and then the `TokenVesting` contract.
    ```typescript
    // Example: ignition/modules/token-vesting.ts
    import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

    const TokenVestingModule = buildModule("TokenVestingModule", (m) => {
      // Deploy the ERC20 token first (or use an existing one)
      const token = m.contract("TestToken", ["MyVestToken", "MVT", 18, m.ethers.parseUnits("1000000", 18)]);
      // const existingTokenAddress = "0xYourDeployedERC20TokenAddress"; // If using an existing token

      const beneficiary = m.getParameter("beneficiary", "0xBeneficiaryAddressHere"); // Replace with actual beneficiary
      const startTime = m.getParameter("startTime", Math.floor(Date.now() / 1000)); // Current time or future
      const cliffDuration = m.getParameter("cliffDuration", 30 * 24 * 60 * 60); // 30 days in seconds
      const vestingDuration = m.getParameter("vestingDuration", 365 * 24 * 60 * 60); // 1 year in seconds
      const totalAmount = m.getParameter("totalAmount", m.ethers.parseUnits("10000", 18)); // Amount to vest

      const vesting = m.contract("TokenVesting", [
        token.read.getAddress(), // or existingTokenAddress
        beneficiary,
        startTime,
        cliffDuration,
        vestingDuration,
        totalAmount,
        // Add other constructor arguments if your contract has them (e.g., revocable)
      ]);

      // Transfer tokens to the vesting contract
      m.call(token, "transfer", [vesting, totalAmount]);


      return { token, vesting };
    });

    export default TokenVestingModule;
    ```
3.  Run the deployment script:
    ```bash
    npx hardhat ignition deploy ./ignition/modules/token-vesting.ts --network westendAssetHub --parameters '{"beneficiary":"0xYOUR_BENEFICIARY_ADDRESS", "totalAmount": "1000000000000000000000"}' # Adjust parameters as needed
    ```
    *Note: You might need to fund the deployer account with WND on Westend Asset Hub.*

**Using Remix (Alternative):**
As suggested in the original challenge for Westend deployment:
1.  Go to [Remix for Polkadot](https://remix.polkadot.io/).
2.  Copy and paste your `TokenVesting.sol` and `token.sol` (or any ERC20 token contract) code into Remix.
3.  Compile both contracts.
4.  Deploy your ERC20 token first. Note its address.
5.  Deploy `TokenVesting.sol`:
    *   Set the environment to "Injected Provider - MetaMask" and ensure MetaMask is connected to Westend Asset Hub.
    *   Provide the constructor arguments:
        *   `_token (address)`: Address of the deployed ERC20 token.
        *   `_beneficiary (address)`: Address of the token recipient.
        *   `_startTime (uint64)`: Vesting start timestamp (Unix epoch).
        *   `_cliffDuration (uint64)`: Cliff duration in seconds.
        *   `_vestingDuration (uint64)`: Total vesting duration in seconds.
        *   `_totalAmount (uint256)`: Total amount of tokens to be vested.
        *   `_revocable (bool)`: (If applicable in your contract version)
    *   Click "Deploy" and confirm in MetaMask.
6.  **Important:** After deploying `TokenVesting`, you must **transfer the `_totalAmount` of your ERC20 tokens to the deployed `TokenVesting` contract's address**.

## 🤝 Interacting with the Deployed Contract

Once deployed, you can interact with the `TokenVesting` contract using Remix, a block explorer like Subscan (for Westend Asset Hub), or a custom frontend.

**Key Functions:**

*   **`release()`:**
    *   Called by the `beneficiary`.
    *   Releases any vested tokens that are currently available according to the schedule and cliff.
    *   No parameters needed.
    *   Transfers the releasable tokens to the beneficiary.
*   **`getReleasableAmount() view returns (uint256)`:**
    *   View function, can be called by anyone.
    *   Returns the amount of tokens currently available for the beneficiary to release.
*   **`getVestedAmount() view returns (uint256)`:**
    *   View function, can be called by anyone.
    *   Returns the total amount of tokens that have vested so far, regardless of whether they've been released.
*   **`revoke()` (if implemented):**
    *   Called by the `owner` (deployer or designated admin).
    *   Stops further vesting and allows the owner to reclaim unvested tokens.

**Example Interaction Flow (Beneficiary):**
1.  Wait for the `startTime + cliffDuration` to pass.
2.  Call `getReleasableAmount()` to check how many tokens are available.
3.  Call `release()` to transfer these tokens to your wallet.
4.  Repeat steps 2-3 as more tokens vest over the `vestingDuration`.

## 🏆 Hackathon Submission Notes
*   This contract fulfills the requirements for Challenge 1.
*   It has been tested locally using Hardhat.
*   Deployment instructions for Westend Asset Hub are provided above.
*   The deployed contract address(es) on Westend Asset Hub will be provided in the final submission details.

---

### 🙋‍♂️ How to claim the bounty?

Complete the challenge on your fork repository <br/>
⭐ Star Open Guild repository <br/>
👥 Follow OpenGuild Lab Github <br/>
💬 Join OpenGuild Discord <br/>
📝 Submit the proof-of-work (your challenge repository, including deployed contract addresses) to OpenGuild Discord <br/>
