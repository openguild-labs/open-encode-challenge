// This line brings in tools we need for testing.
// 'expect' is like saying "we expect this to happen".
// 'ethers' helps us work with the Ethereum blockchain and smart contracts.
// 'time' helps us simulate the passage of time in our tests.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// This block groups all the tests for the "TokenVesting" smart contract.
// It's like saying "Here are all the checks we're doing for the token release safe."
describe("TokenVesting", function () {
  // We set up some variables we'll use in our tests.
  // 'token': Represents the digital token itself (like a specific cryptocurrency).
  // 'vesting': Represents our smart contract safe that manages the token release.
  // 'owner': Represents the person who created and controls the safe (usually the company).
  // 'beneficiary': Represents the person who will receive the tokens over time.
  // 'addr2': Represents another random person, used to check if things work only for the right people.
  // 'startTime': When the token release plan officially begins.
  // 'amount': The total number of tokens the beneficiary is supposed to get.
  // 'cliffDuration': A waiting period at the beginning where *no* tokens can be claimed, even if time has passed.
  // 'vestingDuration': The total time over which all tokens will be released, starting after the cliff.
  let token: any;
  let vesting: any;
  let owner: any;
  let beneficiary: any;
  let addr2: any;
  let startTime: any;
  const amount = ethers.parseEther("1000"); // We define the total amount of tokens (1000 in this case)
  const cliffDuration = 365 * 24 * 60 * 60; // 1 year in seconds. This is the initial waiting period.
  const vestingDuration = 730 * 24 * 60 * 60; // 2 years in seconds. This is the period the tokens unlock gradually.

  // This block of code runs *before* every single test below.
  // It's like setting up the stage for each test:
  // 1. Get our main actors (owner, beneficiary, addr2).
  // 2. Create a fake digital token for testing.
  // 3. Create our token vesting smart contract safe.
  // 4. Give the owner a bunch of fake tokens to put in the safe.
  // 5. The owner allows the safe contract to move their tokens.
  // 6. Set the starting time for the vesting schedule (about 1 minute from now).
  beforeEach(async function () {
    [owner, beneficiary, addr2] = await ethers.getSigners();

    // Deploy Mock Token - Create a simple test token.
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock Token", "MTK");
    await token.waitForDeployment(); // Wait for the token to be ready on our test network.

    // Deploy Vesting Contract - Create the safe that will hold and release tokens.
    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    vesting = await TokenVesting.deploy(await token.getAddress()); // Tell the safe which token it will manage.
    await vesting.waitForDeployment(); // Wait for the safe contract to be ready.

    // Mint tokens to owner - Give the owner some tokens to use.
    await token.mint(owner.address, ethers.parseEther("10000")); // The owner gets 10000 fake tokens.

    // Approve vesting contract - The owner allows the safe to take tokens from them.
    await token.approve(await vesting.getAddress(), ethers.parseEther("10000")); // Owner approves the safe to spend up to 10000 tokens on their behalf.

    startTime = (await time.latest()) + 60; // Set the start time for the vesting schedule (current time + 60 seconds).
  });

  // This group of tests checks if the smart contract safe was set up correctly.
  describe("Deployment", function () {
    // Test: Check if the contract correctly identifies its owner.
    it("Should set the right owner", async function () {
      // We expect that the owner recorded in the contract is the same as the person who deployed it.
      expect(await vesting.owner()).to.equal(owner.address);
    });

    // Test: Check if the contract correctly remembers which token it's managing.
    it("Should set the right token", async function () {
      // We expect that the token address stored in the contract is the same as the fake token we created.
      expect(await vesting.token()).to.equal(await token.getAddress());
    });
  });

  // This group of tests checks the 'whitelist' feature, which determines who is allowed to have a vesting schedule.
  describe("Whitelist", function () {
    // Test: Check if the owner can add someone to the approved list.
    it("Should allow owner to whitelist beneficiary", async function () {
      // The owner adds the beneficiary to the approved list.
      await vesting.addToWhitelist(beneficiary.address);
      // We indirectly check this worked by trying to create a vesting schedule for them.
      // If creating the schedule doesn't cause an error, the whitelisting worked.
      await expect(
        vesting.createVestingSchedule(
          beneficiary.address, // For this person
          amount, // This many tokens
          cliffDuration, // With this waiting period
          vestingDuration, // Over this release period
          startTime // Starting at this time
        )
      ).to.not.be.reverted; // We expect this action NOT to fail.
    });

    // Test: Check if someone who is NOT the owner *cannot* add people to the approved list.
    it("Should not allow non-owner to whitelist", async function () {
      // We try to add someone to the whitelist using the beneficiary's identity (not the owner).
      // We expect this action to fail with a specific error message showing it was an unauthorized account.
      await expect(
        vesting.connect(beneficiary).addToWhitelist(beneficiary.address) // 'connect(beneficiary)' means we are acting as the beneficiary.
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount"); // Expecting a specific error related to not being the owner.
    });
  });

  // This group of tests checks the process of setting up a token release plan for someone.
  describe("Creating vesting schedule", function () {
    // Before each test in *this* group, we first add the beneficiary to the whitelist.
    beforeEach(async function () {
      await vesting.addToWhitelist(beneficiary.address);
    });

    // Test: Check if a vesting schedule can be created successfully for an approved person.
    it("Should create vesting schedule", async function () {
      // The owner creates a vesting schedule for the beneficiary.
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );

      // We indirectly check this by simulating time passing and seeing how many tokens *should* be available.
      // We fast-forward time past the entire vesting period.
      await time.increaseTo(startTime + cliffDuration + vestingDuration);
      // We expect that the total amount of tokens that have become available (vested) is the full amount.
      expect(await vesting.calculateVestedAmount(beneficiary.address)).to.equal(amount);
    });

    // Test: Check if creating a schedule fails for someone who is NOT on the approved list.
    it("Should fail for non-whitelisted beneficiary", async function () {
      // We try to create a schedule for 'addr2', who is not on the whitelist.
      // We expect this action to fail with the error message "Not whitelisted".
      await expect(
        vesting.createVestingSchedule(
          addr2.address, // For addr2, who is not whitelisted.
          amount,
          cliffDuration,
          vestingDuration,
          startTime
        )
      ).to.be.revertedWith("Not whitelisted"); // Expecting this specific error message.
    });

    // Test: Check if you cannot create a second vesting schedule for the same person.
    it("Should fail if schedule already exists", async function () {
      // First, we create a schedule for the beneficiary successfully.
      await vesting.createVestingSchedule(
        beneficiary.address,
        amount,
        cliffDuration,
        vestingDuration,
        startTime
      );

      // Then, we try to create another schedule for the *same* beneficiary.
      // We expect this second attempt to fail with the error message "Schedule exists".
      await expect(
        vesting.createVestingSchedule(
          beneficiary.address, // Trying to create another for the same person.
          amount,
          cliffDuration,
          vestingDuration,
          startTime
        )
      ).to.be.revertedWith("Schedule exists"); // Expecting this specific error message.
    });
  });

  // This group of tests checks the process of the beneficiary claiming their unlocked tokens.
  describe("Claiming tokens", function () {
    // Before each test in *this* group, we set up the whitelist and create a vesting schedule.
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

    // Test: Check if the beneficiary cannot claim tokens before the waiting period (cliff) is over.
    it("Should not allow claiming before cliff", async function () {
      // We fast-forward time just a little bit, past the start time but *before* the cliff ends.
      await time.increase(60); // Simulate 60 seconds passing after the start time.
      // The beneficiary tries to claim tokens.
      // We expect this action to fail with a message indicating no tokens are available to claim yet.
      await expect(
        vesting.connect(beneficiary).claimVestedTokens() // Beneficiary tries to claim.
      ).to.be.revertedWith("No vested tokens"); // Expecting this specific error message.
    });

    // Test: Check if the beneficiary *can* claim tokens after the waiting period (cliff) is over.
    it("Should allow claiming after cliff", async function () {
      // We fast-forward time past the cliff and partway into the vesting period.
      await time.increaseTo(startTime + cliffDuration + vestingDuration / 4); // Simulate passing the cliff + 1/4 of the vesting duration.
      // The beneficiary claims the tokens that have unlocked by this time.
      await vesting.connect(beneficiary).claimVestedTokens(); // Beneficiary claims.
      // We expect the beneficiary's token balance to now be greater than 0, meaning they received some tokens.
      expect(await token.balanceOf(beneficiary.address)).to.be.above(0);
    });

    // Test: Check if the beneficiary can claim the full amount of tokens once the entire vesting period is over.
    it("Should vest full amount after vesting duration", async function () {
      // We fast-forward time past the entire vesting duration.
      await time.increaseTo(startTime + vestingDuration + 1); // Simulate passing the entire vesting duration plus a little bit extra.
      // The beneficiary claims all the tokens that have unlocked.
      await vesting.connect(beneficiary).claimVestedTokens(); // Beneficiary claims.
      // We expect the beneficiary's token balance to be exactly the total amount that was supposed to be vested.
      expect(await token.balanceOf(beneficiary.address)).to.equal(amount);
    });
  });

  // This group of tests checks the feature where the owner can stop the vesting plan early.
  describe("Revoking vesting", function () {
    // Before each test in *this* group, we set up the whitelist and create a vesting schedule.
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

    // Test: Check if the owner can successfully stop the vesting plan for a beneficiary.
    it("Should allow owner to revoke vesting", async function () {
      // The owner stops the vesting plan for the beneficiary.
      await vesting.revokeVesting(beneficiary.address); // Owner revokes.
      // We indirectly check this by simulating time passing until the original end time
      // and then checking how many tokens *could* be claimed.
      await time.increaseTo(startTime + vestingDuration); // Fast-forward to the original end time.
      const vested = await vesting.calculateVestedAmount(beneficiary.address); // Calculate how much vested up to the point of revocation.
      // We expect the amount that vested (up to the revocation time) to be less than the original total amount.
      expect(vested).to.be.lessThan(amount);
    });

    // Test: Check if someone who is NOT the owner *cannot* stop a vesting plan.
    it("Should not allow non-owner to revoke vesting", async function () {
      // Someone who is not the owner (the beneficiary in this case) tries to stop the plan.
      // We expect this action to fail with an error showing it was an unauthorized account.
      await expect(
        vesting.connect(beneficiary).revokeVesting(beneficiary.address) // Beneficiary tries to revoke.
      ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount"); // Expecting a specific error related to not being the owner.
    });

    // Test: Check if any tokens that hadn't been released yet are returned to the owner when a plan is stopped early.
    it("Should return unvested tokens to owner when revoking", async function () {
      // We record the owner's token balance before we start.
      const initialOwnerBalance = await token.balanceOf(owner.address);
      // We fast-forward time partway through the vesting period (e.g., 50% of the way).
      await time.increaseTo(startTime + vestingDuration / 2); // Simulate time passing to the halfway point.
      // The owner stops the vesting plan at this halfway point.
      await vesting.revokeVesting(beneficiary.address); // Owner revokes.
      // We record the owner's token balance after the revocation.
      const finalOwnerBalance = await token.balanceOf(owner.address);
      // We expect that the difference between the owner's final and initial balance
      // is close to the amount of tokens that had *not* yet vested (approximately 50% in this case).
      expect(finalOwnerBalance - initialOwnerBalance).to.be.closeTo(
        amount / BigInt(2), // Roughly half the total amount.
        ethers.parseEther("1") // Allow for a small difference due to calculations.
      );
    });
  });
});