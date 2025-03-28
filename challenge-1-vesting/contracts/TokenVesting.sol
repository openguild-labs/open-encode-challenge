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
    // TODO: Define the vesting schedule struct
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestDuration;
        uint256 amountClaimed;
        bool revoked;
    }

    // Token being vested
    // TODO: Add state variables
    address public token;

    // Mapping from beneficiary to vesting schedule
    // TODO: Add state variables
    mapping(address => VestingSchedule) public vestingSchedules;

    // Whitelist of beneficiaries
    // TODO: Add state variables
    mapping(address => bool) public whitelist;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor(address _tokenAddress) {
        // TODO: Initialize the contract
        token = _tokenAddress;
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
        uint256 vestDuration,
        uint256 startTime
    )
        external
        onlyOwner
        onlyWhitelisted(beneficiary)
        whenNotPaused
        nonReentrant
    {
        // TODO: Implement vesting schedule creation
        require(
            startTime > block.timestamp,
            "Vesting schedule must start in the future"
        );
        require(amount > 0, "What are you even trying to vest?");

        require(
            vestDuration > 0,
            "Vest duration must be greater than 0, or this contract will miserably fail, bro"
        );

        VestingSchedule memory schedule = VestingSchedule(
            amount,
            startTime,
            cliffDuration,
            vestDuration,
            0,
            false
        );

        vestingSchedules[beneficiary] = schedule;

        IERC20(token).transferFrom(owner(), address(this), amount);

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "Vesting schedule not found");

        uint256 currTimestamp = block.timestamp;
        uint256 cliffEndTimestamp = schedule.startTime + schedule.cliffDuration;

        // If current time is before the cliff, return 0
        if (currTimestamp <= cliffEndTimestamp) {
            return 0;
        }

        // If vesting is fully completed, return total vested amount
        if (currTimestamp >= schedule.startTime + schedule.vestDuration) {
            return schedule.totalAmount;
        }

        // Calculate vested amount
        uint256 vestedTime = currTimestamp - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * vestedTime) /
            schedule.vestDuration;

        return vestedAmount;
    }

    function claimVestedTokens() external whenNotPaused nonReentrant {
        // TODO: Implement token claiming
        address beneficiary = _msgSender();

        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        require(!schedule.revoked, "Vesting schedule revoked");

        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 claimableAmount = vestedAmount - schedule.amountClaimed;
        if (claimableAmount == 0) {
            revert("No tokens to claim");
        }

        vestingSchedules[beneficiary].amountClaimed = vestedAmount;
        emit TokensClaimed(beneficiary, claimableAmount);

        IERC20(token).transfer(beneficiary, claimableAmount);
    }

    function revokeVesting(
        address beneficiary
    ) external onlyOwner nonReentrant {
        // TODO: Implement vesting revocation
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        require(!schedule.revoked, "Already revoked");

        schedule.revoked = true;
        vestingSchedules[beneficiary] = schedule;
        emit VestingRevoked(beneficiary);

        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 unclaimedAmount = vestedAmount - schedule.amountClaimed;
        if (unclaimedAmount > 0) {
            IERC20(token).transfer(beneficiary, unclaimedAmount);
        }
        if (schedule.totalAmount - vestedAmount > 0) {
            IERC20(token).transfer(
                owner(),
                schedule.totalAmount - vestedAmount
            );
        }
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
