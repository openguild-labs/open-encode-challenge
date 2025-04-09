// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable(msg.sender), Pausable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount; // Total amount of tokens to be vested
        uint256 startTime; // Start time of the vesting schedule
        uint256 cliffDuration; // Duration of cliff in seconds
        uint256 vestingDuration; // Duration of vesting in seconds
        uint256 claimedAmount; // Amount of tokens already claimed
        bool revoked; // Whether the vesting has been revoked
    }

    // Token being vested
    IERC20 public token;

    // Mapping from beneficiary to their vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;

    // Whitelist of beneficiaries
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
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Vesting amount must be greater than 0");
        require(vestingDuration > 0, "Vesting duration must be greater than 0");
        require(
            cliffDuration <= vestingDuration,
            "Cliff duration must be less than or equal to vesting duration"
        );

        // Use current time if startTime is 0 or in the past
        uint256 effectiveStartTime = startTime == 0 ||
            startTime < block.timestamp
            ? block.timestamp
            : startTime;

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: effectiveStartTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            claimedAmount: 0,
            revoked: false
        });

        // Transfer tokens from sender to contract
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];

        // Return 0 if the schedule has been revoked or doesn't exist
        if (schedule.revoked || schedule.totalAmount == 0) {
            return 0;
        }

        uint256 currentTime = block.timestamp;
        uint256 vestedAmount;
        uint256 cliffEndTime = schedule.startTime + schedule.cliffDuration;
        uint256 vestingEndTime = schedule.startTime + schedule.vestingDuration;

        // Return 0 if the cliff hasn't been reached
        if (currentTime < cliffEndTime) {
            vestedAmount = 0;
        }
        // If vesting is completed, return the total amount
        else if (currentTime >= vestingEndTime) {
            vestedAmount = schedule.totalAmount;
        }
        // Calculate linearly vested amount based on time passed
        else {
            uint256 timeFromStart = currentTime - schedule.startTime;
            vestedAmount =
                (schedule.totalAmount * timeFromStart) /
                schedule.vestingDuration;
        }

        // Return available amount to claim
        if (vestedAmount <= schedule.claimedAmount) {
            return 0;
        }

        return vestedAmount - schedule.claimedAmount;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(!schedule.revoked, "Vesting has been revoked");

        uint256 claimableAmount = calculateVestedAmount(msg.sender);
        require(claimableAmount > 0, "No tokens to claim");

        schedule.claimedAmount += claimableAmount;

        require(
            token.transfer(msg.sender, claimableAmount),
            "Token transfer failed"
        );

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(!schedule.revoked, "Vesting already revoked");
        require(schedule.totalAmount > 0, "No vesting schedule found");

        uint256 currentTime = block.timestamp;
        uint256 vestedAmount;
        uint256 cliffEndTime = schedule.startTime + schedule.cliffDuration;
        uint256 vestingEndTime = schedule.startTime + schedule.vestingDuration;

        if (currentTime < cliffEndTime) {
            vestedAmount = 0;
        } else if (currentTime >= vestingEndTime) {
            vestedAmount = schedule.totalAmount;
        } else {
            vestedAmount =
                (schedule.totalAmount * (currentTime - schedule.startTime)) /
                schedule.vestingDuration;
        }

        uint256 unvestedAmount = schedule.totalAmount - vestedAmount;

        // Mark schedule as revoked
        schedule.revoked = true;

        // Return unvested tokens to owner
        require(
            token.transfer(owner(), unvestedAmount),
            "Token transfer failed"
        );

        emit VestingRevoked(beneficiary);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
