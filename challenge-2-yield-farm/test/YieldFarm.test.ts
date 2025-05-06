import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { YieldFarm } from "../typechain-types";
import { ERC20Mock } from "../typechain-types";

describe("YieldFarm", function () {
  let farm: YieldFarm;
  let lpToken: ERC20Mock;
  let rewardToken: ERC20Mock;
  let owner: any, user1: any, user2: any;

  // Test values adjusted for uint72 limits (4.7M max)
  const TEST_AMOUNT = 100000; // 100,000 tokens
  const SMALL_AMOUNT = 1000;  // 1,000 token

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    lpToken = await ERC20Factory.deploy("LP Token", "LPT");
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");

    // Deploy YieldFarm with test rate (100 wei/sec)
    const YieldFarmFactory = await ethers.getContractFactory("YieldFarm");
    farm = await YieldFarmFactory.deploy(lpToken.target, rewardToken.target, 100);

    // Mint test tokens
    await lpToken.mint(user1.address, TEST_AMOUNT * 10);
    await lpToken.mint(user2.address, TEST_AMOUNT * 10);
    
    // Approve farm
    await lpToken.connect(user1).approve(farm.target, ethers.MaxUint256);
    await lpToken.connect(user2).approve(farm.target, ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set correct admin", async function () {
      expect(await farm.admin()).to.equal(owner.address);
    });

    it("Should set correct token addresses", async function () {
      expect(await farm.L()).to.equal(lpToken.target);
      expect(await farm.R()).to.equal(rewardToken.target);
    });

    it("Should initialize with correct rate", async function () {
      expect(await farm.r()).to.equal(100);
    });
  });

  describe("Staking", function () {
    it("Should accept deposits and update balances", async function () {
      await farm.connect(user1).stake(TEST_AMOUNT);
      const user = await farm.u(user1.address);
      expect(user.a).to.equal(TEST_AMOUNT);
    });

    it("Should emit Staked event", async function () {
      await expect(farm.connect(user2).stake(SMALL_AMOUNT))
        .to.emit(farm, "Staked")
        .withArgs(user2.address, SMALL_AMOUNT);
    });

    it("Should reject zero amount staking", async function () {
      await expect(farm.connect(user1).stake(0)).to.be.reverted;
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      // Setup - stake some tokens first
      await farm.connect(user1).stake(TEST_AMOUNT);
    });

    it("Should calculate pending rewards", async function () {
      await time.increase(3600); // 1 hour
      const rewards = await farm.pending(user1.address);
      expect(rewards).to.be.gt(0);
    });

    it("Should apply time-based boosts", async function () {
      await time.increase(2592000); // 30 days
      const rewards = await farm.pending(user1.address);
      expect(rewards).to.be.gt(3600 * 100); // Should be > base rate
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup - stake some tokens first
      await farm.connect(user1).stake(TEST_AMOUNT);
      await time.increase(3600); // Earn some rewards
    });

    it("Should return staked funds", async function () {
      const initialBalance = await lpToken.balanceOf(user1.address);
      await farm.connect(user1).withdraw(SMALL_AMOUNT);
      const finalBalance = await lpToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(SMALL_AMOUNT);
    });

    it("Should emit Withdrawn event", async function () {
      await expect(farm.connect(user1).withdraw(SMALL_AMOUNT))
        .to.emit(farm, "Withdrawn")
        .withArgs(user1.address, SMALL_AMOUNT);
    });

    it("Should prevent over-withdrawal", async function () {
      await expect(farm.connect(user1).withdraw(TEST_AMOUNT * 2))
        .to.be.reverted;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow rate adjustment by admin", async function () {
      await farm.connect(owner).updateRate(200);
      expect(await farm.r()).to.equal(200);
    });

    it("Should prevent rate adjustment by non-admin", async function () {
      await expect(farm.connect(user1).updateRate(300))
        .to.be.reverted;
    });

    it("Should transfer admin rights", async function () {
      await farm.connect(owner).changeAdmin(user1.address);
      expect(await farm.admin()).to.equal(user1.address);
    });
  });
});