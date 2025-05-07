# 🌾 OpenHack Yield Farming Challenge 💰

![image](./public/assets/OpenHack_Yield_Farming_Challenge.png)

Welcome to the OpenGuild x Encode Club Yield Farming Challenge! This project implements a yield farming smart contract where users can stake Liquidity Provider (LP) tokens and earn reward tokens over time.

## 🌟 Project Overview

The `YieldFarm.sol` contract allows users to deposit (stake) one type of ERC20 token (LP token) and earn another type of ERC20 token (reward token) as an incentive. The reward rate can be configured by the admin, and users can claim their earned rewards. This contract demonstrates fundamental DeFi mechanics.

**Key Features:**
*   **Staking:** Users can stake their LP tokens into the farm.
*   **Reward Distribution:** Rewards are calculated based on the amount staked and the duration of the stake.
*   **Time-Based Bonuses:** The contract implements a tiered bonus system:
    *   Staking for >= 7 days: 1.2x reward multiplier.
    *   Staking for >= 30 days: 1.5x reward multiplier.
    *   Staking for >= 90 days: 2.0x reward multiplier.
*   **Claiming Rewards:** Users can withdraw their earned rewards.
*   **Withdrawal:** Users can withdraw their staked LP tokens.
*   **Admin Controls:** The contract admin can update the reward rate (`r`) and change the admin address.

## 🧬 How It Works

1.  **Initialization:** The contract is deployed with addresses for the LP token (`_L`), reward token (`_R`), and an initial reward rate (`_r` - rewards per second).
2.  **Staking (`stake(uint72 a)`):**
    *   A user approves the `YieldFarm` contract to spend their LP tokens.
    *   The user calls `stake` with the amount `a` of LP tokens.
    *   Any pending rewards for the user are first claimed and transferred.
    *   The user's staked amount (`x.a`) is increased.
    *   The stake start time (`x.s`) is recorded.
    *   The user's reward debt (`x.d`) is updated to reflect the current state.
    *   Total staked tokens (`t`) in the farm are increased.
    *   LP tokens are transferred from the user to the contract.
3.  **Calculating Rewards (`pending(address a)`, `_update(address a)`):**
    *   Rewards accrue proportionally to the user's share of the total staked tokens.
    *   The `_rt()` function calculates the reward per token based on the current time, last update time, reward rate, and total staked amount.
    *   The `_b(address a)` function calculates the time-based bonus multiplier for a user based on their `startTime`.
    *   `pending(address a)` shows the outstanding rewards for a user.
    *   `_update(address a)` updates the global reward per token stored (`p`) and calculates earned rewards for a specific user.
4.  **Withdrawing (`withdraw(uint72 a)`):**
    *   A user calls `withdraw` with the amount `a` of LP tokens they wish to retrieve.
    *   Any pending rewards are first claimed.
    *   The user's staked amount (`x.a`) is decreased.
    *   Reward debt is updated.
    *   Total staked tokens (`t`) are decreased.
    *   LP tokens are transferred from the contract back to the user.
5.  **Claiming (Implicit):** Rewards are automatically claimed and transferred to the user during `stake` and `withdraw` operations if there are pending rewards. There isn't a separate `claim()` function; rewards are bundled with these actions.
6.  **Admin Functions:**
    *   `updateRate(uint72 _r)`: Allows the admin to change the reward rate.
    *   `changeAdmin(address newAdmin)`: Allows the current admin to transfer admin rights.

**Token Details:**
*   `L (IERC20)`: The LP token that users stake (e.g., `token.sol` in this project, which is a mock `TestToken`).
*   `R (IERC20)`: The reward token that users earn (e.g., `test/ERC20Mock.sol` can be used as a mock reward token for deployment).

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
    cd open-encode-challenge/challenge-2-yield-farm
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ⚙️ Contract Development & Testing

### Directory Structure
*   `contracts/`:
    *   `yeild.sol`: The main `YieldFarm` contract. (Note: filename is `yeild.sol`, consider renaming to `YieldFarm.sol` for consistency).
    *   `token.sol`: A mock ERC20 token (`TestToken`) used as the LP token (`L`).
    *   `test/ERC20Mock.sol`: A mock ERC20 token that can be used as the reward token (`R`).
*   `test/`:
    *   `YieldFarm.test.ts`: Hardhat test suite for the `YieldFarm` contract.
*   `ignition/modules/`:
    *   `Lock.ts`: (This seems to be a default Hardhat Ignition example, you'll need to create a new module for deploying the YieldFarm, LP token, and Reward token).
*   `hardhat.config.ts`: Hardhat configuration file.

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```
Ensure all tests in `YieldFarm.test.ts` pass.

## 🚀 Deployment to Westend Asset Hub

This contract is intended to be deployed on the **Westend Asset Hub**.

### 1. Setup MetaMask for Westend Asset Hub
(Same as Challenge 1 - see above or general project README)
*   Network Name: `Asset-Hub Westend Testnet`
*   RPC URL: `https://westend-asset-hub-eth-rpc.polkadot.io`
*   Chain ID: `420420421`
*   Currency Symbol: `WND`

### 2. Get Test WND Tokens
From the [Westend faucet](https://faucet.polkadot.io/westend?parachain=1000).

### 3. Deploying

**Using Hardhat Ignition (Recommended):**

1.  **Create a deployment module** (e.g., `ignition/modules/yield-farm.ts`):
    ```typescript
    // Example: ignition/modules/yield-farm.ts
    import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
    import { ethers } from "hardhat";

    const YieldFarmModule = buildModule("YieldFarmModule", (m) => {
      const initialOwner = m.getAccount(0); // Deployer account

      // Deploy LP Token (L)
      const lpToken = m.contract("TestToken", ["LP Token", "LPT", 18, ethers.parseUnits("10000000", 18)], { from: initialOwner });
      // Deploy Reward Token (R)
      const rewardToken = m.contract("ERC20Mock", ["Reward Token", "RWT", 18, ethers.parseUnits("100000000", 18)], { from: initialOwner });
      // const rewardToken = m.contractAt("IERC20", "0xDeployedRewardTokenAddress"); // If using an existing reward token

      const initialRewardRate = m.getParameter("initialRewardRate", 1000); // Example: 1000 units of R per second (adjust based on decimals)

      const yieldFarm = m.contract("YieldFarm", [
        lpToken,
        rewardToken,
        initialRewardRate,
      ], { from: initialOwner });

      // IMPORTANT: Transfer a significant amount of Reward Tokens (R) to the YieldFarm contract
      // This is the pool from which rewards will be paid.
      // The amount should be enough to sustain rewards for a considerable period.
      const totalRewardSupply = ethers.parseUnits("50000000", 18); // Example: 50M reward tokens
      m.call(rewardToken, "transfer", [yieldFarm, totalRewardSupply], { from: initialOwner });
      
      // For testing, you might want to approve the YieldFarm to spend the deployer's LP tokens
      // and mint some LP tokens to other test accounts.
      // m.call(lpToken, "approve", [yieldFarm, ethers.MaxUint256], { from: initialOwner });


      return { lpToken, rewardToken, yieldFarm };
    });

    export default YieldFarmModule;
    ```
2.  **Update `hardhat.config.ts`** (similar to Challenge 1, ensure Westend Asset Hub network is configured).
3.  **Run the deployment script:**
    ```bash
    npx hardhat ignition deploy ./ignition/modules/yield-farm.ts --network westendAssetHub --parameters '{"initialRewardRate": "YOUR_RATE"}'
    ```

**Using Remix (Alternative):**
1.  Go to [Remix for Polkadot](https://remix.polkadot.io/).
2.  Copy/paste `yeild.sol`, `token.sol` (as LP token), and `test/ERC20Mock.sol` (as Reward token).
3.  Compile all three contracts.
4.  Deploy the LP token contract (e.g., `TestToken` from `token.sol`). Note its address.
5.  Deploy the Reward token contract (e.g., `ERC20Mock`). Note its address.
6.  Deploy `YieldFarm.sol`:
    *   Environment: "Injected Provider - MetaMask" (connected to Westend Asset Hub).
    *   Constructor arguments:
        *   `_L (address)`: Address of your deployed LP token.
        *   `_R (address)`: Address of your deployed Reward token.
        *   `_r (uint72)`: Initial reward rate (e.g., if your reward token has 18 decimals, a rate of `10^16` would be 0.01 RWT per second. Adjust based on your tokenomics).
    *   Click "Deploy" and confirm.
7.  **Crucial Step:** After deploying `YieldFarm`, you **MUST transfer a substantial amount of the Reward Tokens (`R`) to the deployed `YieldFarm` contract's address**. This is the reserve pool for paying out rewards.

## 🤝 Interacting with the Deployed Contract

Use Remix, Subscan, or a custom frontend.

**Key User Functions:**

*   **`stake(uint72 a)`:**
    *   **Prerequisite:** User must first `approve` the `YieldFarm` contract address to spend their LP tokens (`L`). This is a standard ERC20 step.
    *   Stakes `a` amount of LP tokens. Claims any pending rewards first.
*   **`withdraw(uint72 a)`:**
    *   Withdraws `a` amount of staked LP tokens. Claims any pending rewards first.
*   **`pending(address a) view returns (uint256)`:**
    *   View function to check the amount of rewards accrued but not yet claimed for address `a`.
*   **`u(address user) view returns (uint72 a, uint40 s, uint72 d)`:**
    *   View function to get user-specific data:
        *   `a`: current staked amount.
        *   `s`: stake start time (timestamp).
        *   `d`: reward debt.

**Admin Functions:**

*   **`updateRate(uint72 _r)`:**
    *   Called by the `admin`. Updates the reward rate.
*   **`changeAdmin(address newAdmin)`:**
    *   Called by the current `admin`. Transfers admin privileges.

**Typical User Flow:**
1.  **User A:** Obtains LP tokens (`L`).
2.  **User A:** Approves the `YieldFarm` contract to spend their LP tokens (e.g., `lpToken.approve(yieldFarmAddress, amount)`).
3.  **User A:** Calls `stake(amount)` on the `YieldFarm` contract.
4.  Time passes...
5.  **User A:** Calls `pending(userA_address)` to see accumulated rewards.
6.  **User A:** Calls `withdraw(portionOrAllAmount)` to take out LP tokens. This action will also automatically transfer any pending rewards to User A.
    *   Alternatively, if User A wants to claim rewards but continue staking the same amount, they can `stake(0)`. This triggers the reward claim mechanism.

## 🏆 Hackathon Submission Notes
*   This contract fulfills the requirements for Challenge 2.
*   It has been tested locally using Hardhat.
*   Deployment instructions for Westend Asset Hub are provided.
*   Deployed contract addresses (LP Token, Reward Token, YieldFarm) on Westend Asset Hub will be provided in the final submission.

---

### 🙋‍♂️ How to claim the bounty?

Complete the challenge on your fork repository <br/>
⭐ Star Open Guild repository <br/>
👥 Follow OpenGuild Lab Github <br/>
💬 Join OpenGuild Discord <br/>
📝 Submit the proof-of-work (your challenge repository, including deployed contract addresses) to OpenGuild Discord <br/>
