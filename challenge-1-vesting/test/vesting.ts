const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenVesting", function () {
  let Token;
  let token: any;
  let TokenVesting;
  let vesting: any;
  let owner: any;
  let beneficiary: any;
  let addr2: any;
  let startTime: any;
  const amount = ethers.parseEther("1000");
  const cliffDuration = 365 * 24 * 60 * 60; // 1 year
  const vestingDuration = 730 * 24 * 60 * 60; // 2 years

  beforeEach(async function () {
    [owner, beneficiary, addr2] = await ethers.getSigners();

    // Deploy Mock Token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock Token", "MTK");
    await token.waitForDeployment();

    // Deploy Vesting Contract
    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    vesting = await TokenVesting.deploy(await token.getAddress());
    await vesting.waitForDeployment();

    // Mint tokens to owner
    await token.mint(owner.address, ethers.parseEther("10000"));

    // Approve vesting contract
    await token.approve(await vesting.getAddress(), ethers.parseEther("10000"));

    startTime = (await time.latest()) + 60; // Start 1 minute from now
  });

  describe("Deployment", function () {
    it("Should set the right token", async function () {
      expect(await vesting.token()).to.equal(await token.getAddress());
    });

    it("Should set the right owner", async function () {
      expect(await vesting.owner()).to.equal(owner.address);
    });
  });

  describe("Whitelist", function () {
    it("Should allow owner to whitelist beneficiary", async function () {
      await vesting.addToWhitelist(beneficiary.address);
      expect(await vesting.whitelist(beneficiary.address)).to.be.true;
    });

    it("Should not allow non-owner to whitelist", async function () {
      await expect(
        vesting.connect(beneficiary).addToWhitelist(beneficiary.address)
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Creating vesting schedule", function () {
    beforeEach(async function () {
      await vesting.addToWhitelist(beneficiary.address);
    });

    it("Should create vesting schedule", async function () {
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );

      const schedule = await vesting.vestingSchedules(beneficiary.address);
      expect(schedule.amount).to.equal(amount);
    });

    it("Should fail for non-whitelisted beneficiary", async function () {
      await expect(
        vesting.createVestingSchedule(
          addr2.address,
          amount,
          cliffDuration,
          vestingDuration,
          startTime
        )
      ).to.be.revertedWith("Beneficiary not whitelisted");
    });
  });

  describe("Claiming tokens", function () {
    beforeEach(async function () {
      await vesting.addToWhitelist(beneficiary.address);
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );
    });

    it("Should not allow claiming before cliff", async function () {
      // Ensure we're past the start time but before cliff
      await time.increase(60); // Move past start time
      await expect(
        vesting.connect(beneficiary).claimVestedTokens()
      ).to.be.revertedWith("No tokens to claim");
    });

    it("Should allow claiming after cliff", async function () {
      await time.increaseTo(startTime + cliffDuration + vestingDuration / 4);
      await vesting.connect(beneficiary).claimVestedTokens();
      expect(await token.balanceOf(beneficiary.address)).to.be.above(0);
    });

    it("Should vest full amount after vesting duration", async function () {
      await time.increaseTo(startTime + vestingDuration + 1);
      await vesting.connect(beneficiary).claimVestedTokens();
      expect(await token.balanceOf(beneficiary.address)).to.equal(amount);
    });
  });

  describe("Revoking vesting", function () {
    beforeEach(async function () {
      await vesting.addToWhitelist(beneficiary.address);
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );
    });

    it("Should allow owner to revoke vesting", async function () {
      await vesting.revokeVesting(beneficiary.address);
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      expect(schedule.revokeData).to.be.true;
    });

    it("Should not allow non-owner to revoke vesting", async function () {
      await expect(
        vesting.connect(beneficiary).revokeVesting(beneficiary.address)
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
    });

    it("Should return unvested tokens to owner when revoking", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await time.increaseTo(startTime + vestingDuration / 2); // 50% vested
      await vesting.revokeVesting(beneficiary.address);
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.be.closeTo(
        amount / BigInt(2), // Approximately 50% of tokens should return to owner
        ethers.parseEther("1") // Allow for small rounding differences
      );
    });
  });

  describe("Pausing", function () {
    beforeEach(async function () {
      await vesting.addToWhitelist(beneficiary.address);
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );
    });

    it("Should not allow operations when paused", async function () {
      await vesting.pause();
      await expect(
        vesting.connect(beneficiary).claimVestedTokens()
      ).to.be.revertedWithCustomError(vesting, "EnforcedPause");
    });

    it("Should allow operations after unpause", async function () {
      await vesting.pause();
      await vesting.unpause();
      await time.increaseTo(startTime + vestingDuration);
      await expect(vesting.connect(beneficiary).claimVestedTokens()).to.not.be
        .reverted;
    });
  });
});
