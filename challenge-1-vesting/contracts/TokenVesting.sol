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
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable(msg.sender), Pausable, ReentrancyGuard {
    struct VestingSchedule {
        // Define the vesting schedule struct
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 amountClaimed;
        bool revoked;
    }

    // Token being vested
    // Add state variables
    IERC20 public immutable token;

    // Mapping from beneficiary to vesting schedule
    // Add state variables
    mapping(address => VestingSchedule) public vestingSchedules;

    // Whitelist of beneficiaries
    // Add state variables
    mapping(address => bool) public whitelist;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor(address tokenAddress) {
        // Initialize the contract
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
        // Implement vesting schedule creation
        require(amount > 0, "Amount must be > 0");
        require(vestingDuration > 0, "Vesting duration must be > 0");
        require(cliffDuration <= vestingDuration, "Cliff > duration");
        VestingSchedule storage existing = vestingSchedules[beneficiary];
        require(
            existing.totalAmount == 0 || existing.revoked,
            "Schedule exists"
        );

        require(
            token.transferFrom(_msgSender(), address(this), amount),
            "Token transfer failed"
        );

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaimed: 0,
            revoked: false
        });

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        // Implement vested amount calculation
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;

        uint256 currentTime = block.timestamp;

        if (currentTime < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        uint256 elapsed = currentTime - schedule.startTime;
        uint256 vested;

        if (elapsed >= schedule.vestingDuration) {
            vested = schedule.totalAmount;
        } else {
            vested =
                (schedule.totalAmount * elapsed) /
                schedule.vestingDuration;
        }

        if (vested <= schedule.amountClaimed) {
            return 0;
        }

        return vested - schedule.amountClaimed;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        // Implement token claiming
        uint256 claimable = calculateVestedAmount(_msgSender());
        require(claimable > 0, "No tokens to claim");

        VestingSchedule storage schedule = vestingSchedules[_msgSender()];
        schedule.amountClaimed += claimable;

        require(token.transfer(_msgSender(), claimable), "Transfer failed");
        emit TokensClaimed(_msgSender(), claimable);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        // Implement vesting revocation
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No schedule");
        require(!schedule.revoked, "Already revoked");

        uint256 vestedSoFar = _computeTotalVested(schedule);
        uint256 unvested = schedule.totalAmount - vestedSoFar;

        // Mark as revoked and update schedule so that only the vested portion
        // remains claimable by the beneficiary.
        schedule.revoked = true;
        schedule.totalAmount = vestedSoFar;
        schedule.vestingDuration = block.timestamp > schedule.startTime
            ? block.timestamp - schedule.startTime
            : 0;

        if (unvested > 0) {
            require(token.transfer(owner(), unvested), "Return failed");
        }

        emit VestingRevoked(beneficiary);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _computeTotalVested(
        VestingSchedule memory schedule
    ) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        uint256 elapsed = block.timestamp - schedule.startTime;
        if (elapsed >= schedule.vestingDuration) {
            return schedule.totalAmount;
        }
        return (schedule.totalAmount * elapsed) / schedule.vestingDuration;
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