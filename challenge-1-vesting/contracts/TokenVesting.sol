// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable, Pausable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 amountClaimed;
        bool revoked;
    }

    IERC20 public token;
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public whitelist;

    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
    }

    modifier onlyWhitelisted(address beneficiary) {
        require(whitelist[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(cliffDuration <= vestingDuration, "Cliff exceeds duration");
        require(vestingDuration > 0, "Duration must be positive");
        require(startTime >= block.timestamp, "Start time in past");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule exists");

        token.transferFrom(msg.sender, address(this), amount);
        
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

    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;

        uint256 currentTime = block.timestamp;
        if (currentTime < schedule.startTime) return 0;

        uint256 elapsed = currentTime - schedule.startTime;
        if (elapsed < schedule.cliffDuration) return 0;

        if (elapsed >= schedule.vestingDuration || schedule.revoked) {
            return schedule.totalAmount - schedule.amountClaimed;
        }

        uint256 vested = (schedule.totalAmount * elapsed) / schedule.vestingDuration;
        return vested - schedule.amountClaimed;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");

        uint256 vestedAmount = calculateVestedAmount(msg.sender);
        require(vestedAmount > 0, "No tokens to claim");

        schedule.amountClaimed += vestedAmount;
        token.transfer(msg.sender, vestedAmount);

        emit TokensClaimed(msg.sender, vestedAmount);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Already revoked");

        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 unvested = schedule.totalAmount - vestedAmount;

        schedule.totalAmount = vestedAmount;
        schedule.revoked = true;
        
        if (unvested > 0) {
            token.transfer(owner(), unvested);
        }

        emit VestingRevoked(beneficiary);
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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}