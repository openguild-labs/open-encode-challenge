// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenVesting is Ownable, Pausable, ReentrancyGuard {
    struct VestingSchedule {
        // Total amount of tokens to vest
        uint256 totalAmount;
        // Vesting start timestamp
        uint256 startTime;
        // Cliff period in seconds
        uint256 cliffDuration;
        // Total vesting duration in seconds
        uint256 vestingDuration;
        // Amount of tokens already claimed
        uint256 amountClaimed;
        // Whether vesting has been revoked
        bool revoked;
    }

    // ERC20 token being vested
    IERC20 public token;

    // Mapping from beneficiary address to their vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;

    // Whitelist of beneficiaries allowed to have vesting schedules
    mapping(address => bool) public isWhitelisted;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    /// @notice Constructor sets the ERC20 token address
    /// @param _token Address of the ERC20 token to be vested
    constructor(address _token) {
        require(_token != address(0), "Token address cannot be zero");
        token = IERC20(_token);
    }

    /// @notice Modifier to restrict function to whitelisted beneficiaries
    modifier onlyWhitelisted(address beneficiary) {
        require(isWhitelisted[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    /// @notice Add an address to the whitelist
    /// @param beneficiary The address to whitelist
    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "Invalid address");
        isWhitelisted[beneficiary] = true;
        emit BeneficiaryWhitelisted(beneficiary);
    }

    /// @notice Remove an address from the whitelist
    /// @param beneficiary The address to remove from whitelist
    function removeFromWhitelist(address beneficiary) external onlyOwner {
        isWhitelisted[beneficiary] = false;
        emit BeneficiaryRemovedFromWhitelist(beneficiary);
    }

    /// @notice Create a vesting schedule for a beneficiary
    /// @param beneficiary Address of the beneficiary
    /// @param totalAmount Total tokens to vest
    /// @param cliffDuration Cliff period in seconds
    /// @param vestingDuration Total vesting duration in seconds
    /// @param startTime Vesting start timestamp (unix time)
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Total amount must be > 0");
        require(vestingDuration >= cliffDuration, "Vesting duration must be >= cliff duration");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting schedule already exists");

        // Transfer tokens from admin to contract for vesting
        require(token.transferFrom(msg.sender, address(this), totalAmount), "Token transfer failed");

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            startTime: startTime,
            amountClaimed: 0,
            revoked: false
        });

        emit VestingScheduleCreated(beneficiary, totalAmount);
    }

    /// @notice Calculate the amount of vested tokens for a beneficiary
    /// @param beneficiary Address of the beneficiary
    /// @return vested Amount of tokens vested and available to claim
    function calculateVestedAmount(address beneficiary) public view returns (uint256 vested) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

        if (schedule.revoked) {
            // After revocation, vested amount is fixed to amount already claimed
            return schedule.amountClaimed;
        }

        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            // Cliff period not reached yet
            return 0;
        } else if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            // Fully vested after vesting duration
            return schedule.totalAmount;
        } else {
            // Linear vesting calculation after cliff but before full vesting
            uint256 timeElapsed = block.timestamp - schedule.startTime;
            vested = (schedule.totalAmount * timeElapsed) / schedule.vestingDuration;
            return vested;
        }
    }

    /// @notice Claim vested tokens for the caller
    function claimVestedTokens() external nonReentrant whenNotPaused onlyWhitelisted(msg.sender) {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");

        uint256 vested = calculateVestedAmount(msg.sender);
        uint256 claimable = vested - schedule.amountClaimed;
        require(claimable > 0, "No tokens to claim");

        schedule.amountClaimed += claimable;

        require(token.transfer(msg.sender, claimable), "Token transfer failed");

        emit TokensClaimed(msg.sender, claimable);
    }

    /// @notice Revoke vesting schedule for a beneficiary and return unvested tokens to owner
    /// @param beneficiary Address of the beneficiary whose vesting is revoked
    function revokeVesting(address beneficiary) external onlyOwner whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Already revoked");

        uint256 vested = calculateVestedAmount(beneficiary);
        uint256 unvested = schedule.totalAmount - vested;

        schedule.revoked = true;

        if (unvested > 0) {
            require(token.transfer(owner(), unvested), "Token transfer failed");
        }

        emit VestingRevoked(beneficiary);
    }

    /// @notice Pause the contract (emergency stop)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
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
// token contract address - 0xa3Ff912076cD9Caa4ee2244C4a619D86b6E87a87