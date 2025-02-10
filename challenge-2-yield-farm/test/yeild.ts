import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { YieldFarm, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("YieldFarm", function () {
  let yieldFarm: YieldFarm;
  let lpToken: MockERC20;
  let rewardToken: MockERC20;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const REWARD_RATE = ethers.parseEther("1"); // 1 token per second

  // Boost thresholds from the contract
  const BOOST_THRESHOLD_1 = 7 * 24 * 3600; // 7 days
  const BOOST_THRESHOLD_2 = 30 * 24 * 3600; // 30 days
  const BOOST_THRESHOLD_3 = 90 * 24 * 3600; // 90 days

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    lpToken = (await MockERC20Factory.deploy("LP Token", "LP")) as MockERC20;
    rewardToken = (await MockERC20Factory.deploy(
      "Reward Token",
      "RWD"
    )) as MockERC20;

    // Deploy YieldFarm contract
    const YieldFarmFactory = await ethers.getContractFactory("YieldFarm");
    yieldFarm = (await YieldFarmFactory.deploy(
      await lpToken.getAddress(),
      await rewardToken.getAddress(),
      REWARD_RATE
    )) as YieldFarm;

    // Mint tokens to users
    await lpToken.mint(user1.address, INITIAL_SUPPLY);
    await lpToken.mint(user2.address, INITIAL_SUPPLY);

    // Mint reward tokens to the YieldFarm contract
    await rewardToken.mint(await yieldFarm.getAddress(), INITIAL_SUPPLY);

    // Approve YieldFarm contract to spend LP tokens
    await lpToken
      .connect(user1)
      .approve(await yieldFarm.getAddress(), INITIAL_SUPPLY);
    await lpToken
      .connect(user2)
      .approve(await yieldFarm.getAddress(), INITIAL_SUPPLY);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await yieldFarm.owner()).to.equal(owner.address);
    });

    it("Should set the correct token addresses", async function () {
      expect(await yieldFarm.lpToken()).to.equal(await lpToken.getAddress());
      expect(await yieldFarm.rewardToken()).to.equal(
        await rewardToken.getAddress()
      );
    });

    it("Should set the correct reward rate", async function () {
      expect(await yieldFarm.rewardRate()).to.equal(REWARD_RATE);
    });
  });

  describe("Staking", function () {
    const stakeAmount = ethers.parseEther("100");

    it("Should allow users to stake LP tokens", async function () {
      await yieldFarm.connect(user1).stake(stakeAmount);

      const userInfo = await yieldFarm.userInfo(user1.address);
      expect(userInfo.amount).to.equal(stakeAmount);
      expect(await yieldFarm.totalStaked()).to.equal(stakeAmount);
    });

    it("Should not allow staking zero amount", async function () {
      await expect(yieldFarm.connect(user1).stake(0)).to.be.revertedWith(
        "Cannot stake 0"
      );
    });

    it("Should emit Staked event", async function () {
      await expect(yieldFarm.connect(user1).stake(stakeAmount))
        .to.emit(yieldFarm, "Staked")
        .withArgs(user1.address, stakeAmount);
    });
  });

  describe("Rewards", function () {
    const stakeAmount = ethers.parseEther("1000");

    it("Should calculate base rewards correctly", async function () {
      await yieldFarm.connect(user1).stake(stakeAmount);

      // Move forward 1 day
      await time.increase(86400);

      const pendingRewards = await yieldFarm.pendingRewards(user1.address);
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should apply boost multipliers correctly", async function () {
      await yieldFarm.connect(user1).stake(stakeAmount);

      // Test different boost thresholds
      const tests = [
        { days: 3, expectedMultiplier: 100n }, // No boost
        { days: 8, expectedMultiplier: 125n }, // 1.25x boost
        { days: 31, expectedMultiplier: 150n }, // 1.5x boost
        { days: 91, expectedMultiplier: 200n }, // 2x boost
      ];

      for (const test of tests) {
        await time.increase(test.days * 86400);
        const multiplier = await yieldFarm.calculateBoostMultiplier(
          user1.address
        );
        expect(multiplier).to.equal(test.expectedMultiplier);
      }
    });

    it("Should allow users to claim rewards", async function () {
      await yieldFarm.connect(user1).stake(stakeAmount);
      await time.increase(7 * 24 * 3600); // Forward 7 days

      const beforeBalance = await rewardToken.balanceOf(user1.address);
      await yieldFarm.connect(user1).claimRewards();
      const afterBalance = await rewardToken.balanceOf(user1.address);

      expect(afterBalance).to.be.gt(beforeBalance);
    });
  });

  describe("Withdrawals", function () {
    const stakeAmount = ethers.parseEther("100");

    beforeEach(async function () {
      await yieldFarm.connect(user1).stake(stakeAmount);
    });

    it("Should allow users to withdraw staked tokens", async function () {
      await yieldFarm.connect(user1).withdraw(stakeAmount);

      const userInfo = await yieldFarm.userInfo(user1.address);
      expect(userInfo.amount).to.equal(0);
      expect(await yieldFarm.totalStaked()).to.equal(0);
    });

    it("Should not allow withdrawing more than staked", async function () {
      const tooMuch = stakeAmount * 2n;
      await expect(
        yieldFarm.connect(user1).withdraw(tooMuch)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should allow emergency withdrawal", async function () {
      await yieldFarm.connect(user1).emergencyWithdraw();

      const userInfo = await yieldFarm.userInfo(user1.address);
      expect(userInfo.amount).to.equal(0);
      expect(userInfo.pendingRewards).to.equal(0);
      expect(await yieldFarm.totalStaked()).to.equal(0);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to update reward rate", async function () {
      const newRate = ethers.parseEther("2");
      await yieldFarm.connect(owner).updateRewardRate(newRate);
      expect(await yieldFarm.rewardRate()).to.equal(newRate);
    });

    it("Should not allow non-owner to update reward rate", async function () {
      const newRate = ethers.parseEther("2");
      // Using the correct custom error format from OpenZeppelin v5
      await expect(yieldFarm.connect(user1).updateRewardRate(newRate))
        .to.be.revertedWithCustomError(yieldFarm, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });
  });
});
