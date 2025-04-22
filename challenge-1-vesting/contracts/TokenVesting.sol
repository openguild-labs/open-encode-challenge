// Challenge: Token Vesting Contract
/*
Create a token vesting contract with the following requirements:

1. The contract should allow an admin to create vesting schedules for different beneficiaries
2. Each vesting schedule should have:
   - Total amount of tokens to be vested
   - Cliff period (time before any tokens can be claimed)
   - Vesting duration (total time for all tokens to vest)
   - Start time
3. After the cliff period, tokens should vest linearly over time
4. Beneficiaries should be able to claim their vested tokens at any time
5. Admin should be able to revoke unvested tokens from a beneficiary

Bonus challenges:
- Add support for multiple token types
- Implement a whitelist for beneficiaries
- Add emergency pause functionality

Here's your starter code:
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable(msg.sender), Pausable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 claimedAmount;
        bool revoked;
    }

    IERC20 public token;

    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public whitelist;

    
    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Invalid token address");
        token = IERC20(tokenAddress);
    }

    // Modifier to check if beneficiary is whitelisted
    modifier onlyWhitelisted(address beneficiary) {
        require(whitelist[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "Invalid address");
        whitelist[beneficiary] = true;
        emit BeneficiaryWhitelisted(beneficiary);
    }

    function removeFromWhitelist(address beneficiary) external onlyOwner {
        whitelist[beneficiary] = false;
        emit BeneficiaryRemovedFromWhitelist(beneficiary);
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(vestingDuration >= cliffDuration, "Vesting duration must be >= cliff duration");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            claimedAmount: 0,
            revoked: false
        });

        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        uint256 currentTime = block.timestamp;
        uint256 vested;

        if (currentTime < schedule.startTime + schedule.cliffDuration) {
            vested = 0;
        } else if (currentTime >= schedule.startTime + schedule.vestingDuration) {
            vested = schedule.totalAmount;
        } else {
            uint256 timePassed = currentTime - schedule.startTime;
            vested = (schedule.totalAmount * timePassed) / schedule.vestingDuration;
        }

        if (vested < schedule.claimedAmount) {
            return 0;
        }

        return vested - schedule.claimedAmount;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];

        require(!schedule.revoked, "Vesting has been revoked");

        uint256 claimableAmount = calculateVestedAmount(msg.sender);
        require(claimableAmount > 0, "No tokens to claim");

        schedule.claimedAmount += claimableAmount;

        require(token.transfer(msg.sender, claimableAmount), "Token transfer failed");

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(!schedule.revoked, "Vesting already revoked");

        uint256 vestedSoFar;
        uint256 currentTime = block.timestamp;

        if (currentTime < schedule.startTime + schedule.cliffDuration) {
            vestedSoFar = 0;
        } else if (currentTime >= schedule.startTime + schedule.vestingDuration) {
            vestedSoFar = schedule.totalAmount;
        } else {
            vestedSoFar = (schedule.totalAmount * (currentTime - schedule.startTime)) / schedule.vestingDuration;
        }

        uint256 unvestedTokens = schedule.totalAmount - vestedSoFar;

        schedule.revoked = true;

        require(token.transfer(owner(), unvestedTokens), "Token transfer failed");

        emit VestingRevoked(beneficiary);   
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

/*
Solution template (key points to implement):



1. VestingSchedule struct should contain:
   - Total amount
   - Start time
   - Cliff duration
   - Vesting duration
   - Amount claimed
   - Revoked status

2. State variables needed:
   - Mapping of beneficiary address to VestingSchedule
   - ERC20 token reference
   - Owner/admin address

3. createVestingSchedule should:
   - Validate input parameters
   - Create new vesting schedule
   - Transfer tokens to contract
   - Emit event

4. calculateVestedAmount should:
   - Check if cliff period has passed
   - Calculate linear vesting based on time passed
   - Account for already claimed tokens
   - Handle revoked status

5. claimVestedTokens should:
   - Calculate claimable amount
   - Update claimed amount
   - Transfer tokens
   - Emit event

6. revokeVesting should:
   - Only allow admin
   - Calculate and transfer unvested tokens back
   - Mark schedule as revoked
   - Emit event
*/