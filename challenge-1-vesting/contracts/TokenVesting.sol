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
    // TODO: Define the vesting schedule struct

       uint256 totalAmount;        
        uint256 startTime;          
        uint256 cliffDuration;      
        uint256 vestingDuration;    
        uint256 amountClaimed;      
        bool revoked;               
    }

   
    // TODO: Add state variables

        IERC20 public token;


    
    // TODO: Add state variables

    mapping(address => VestingSchedule) public vestingSchedules;

  
    // TODO: Add state variables

      mapping(address => bool) public whitelist;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor(address tokenAddress) {
           // TODO: Initialize the contract

              require(tokenAddress != address(0), "Token address cannot be zero");
        token = IERC20(tokenAddress);

    }

    
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
        // TODO: Implement vesting schedule creation

         require(beneficiary != address(0), "Beneficiary cannot be zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(vestingDuration > 0, "Vesting duration must be greater than zero");
        require(vestingDuration >= cliffDuration, "Vesting duration must be greater than or equal to cliff duration");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting schedule already exists");
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        // TODO: Implement vested amount calculation

           VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        // If no schedule or revoked, return 0
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return 0;
        }
         // If current time is before cliff, nothing is vested
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        // If current time is after vesting duration, everything is vested
        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }
        
        // Otherwise, calculate vested amount based on linear vesting
        uint256 timeFromStart = block.timestamp - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * timeFromStart) / schedule.vestingDuration;
        
        return vestedAmount;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
           // TODO: Implement token claiming

            address beneficiary = msg.sender;
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Vesting schedule has been revoked");
        
        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 claimableAmount = vestedAmount - schedule.amountClaimed;
        
        require(claimableAmount > 0, "No tokens available to claim");
        
        // Update claimed amount
        schedule.amountClaimed += claimableAmount;
        
        // Transfer tokens to beneficiary
        require(token.transfer(beneficiary, claimableAmount), "Token transfer failed");
        
        emit TokensClaimed(beneficiary, claimableAmount);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        // TODO: Implement vesting revocation

          VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        require(schedule.totalAmount > 0, "No vesting schedule found");
        require(!schedule.revoked, "Vesting schedule already revoked");
        
        // Calculate vested amount
        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 claimedAmount = schedule.amountClaimed;
        
        // Calculate unvested amount to return to owner
        uint256 unvestedAmount = schedule.totalAmount - vestedAmount;
        
        // Mark schedule as revoked
        schedule.revoked = true;
        
        // Transfer unvested tokens back to owner
        if (unvestedAmount > 0) {
            require(token.transfer(owner(), unvestedAmount), "Token transfer failed");
        }
        
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