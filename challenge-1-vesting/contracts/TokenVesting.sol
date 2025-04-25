// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenVesting is Ownable {
    error EnforcedPause();
    
    struct VestingSchedule {
        uint128 totalAmount;
        uint64 startTime;
        uint32 cliffDuration;
        uint32 vestingDuration;
        uint128 amountClaimed;
        bool revoked;
    }

    IERC20 public immutable token;
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public whitelist;
    bool public paused;

    event VestingScheduleCreated(address indexed beneficiary, uint128 amount);
    event TokensClaimed(address indexed beneficiary, uint128 amount);
    event VestingRevoked(address indexed beneficiary);
    event Whitelisted(address indexed beneficiary);
    event Unwhitelisted(address indexed beneficiary);
    event Paused();
    event Unpaused();

    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0));
        token = IERC20(tokenAddress);
    }

    modifier onlyWhitelisted(address beneficiary) {
        require(whitelist[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert EnforcedPause();
        _;
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0));
        whitelist[beneficiary] = true;
        emit Whitelisted(beneficiary);
    }

    function removeFromWhitelist(address beneficiary) external onlyOwner {
        whitelist[beneficiary] = false;
        emit Unwhitelisted(beneficiary);
    }

    function createVestingSchedule(
        address beneficiary,
        uint128 amount,
        uint32 cliffDuration,
        uint32 vestingDuration,
        uint64 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(beneficiary != address(0) && amount > 0 && vestingDuration > 0 && cliffDuration <= vestingDuration);
        require(vestingSchedules[beneficiary].totalAmount == 0);
        require(token.transferFrom(msg.sender, address(this), amount));

        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: startTime == 0 ? uint64(block.timestamp) : startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaimed: 0,
            revoked: false
        });

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory s = vestingSchedules[beneficiary];
        if (s.totalAmount == 0 || s.revoked || block.timestamp < s.startTime + s.cliffDuration) return 0;
        if (block.timestamp >= s.startTime + s.vestingDuration) return s.totalAmount - s.amountClaimed;
        return ((s.totalAmount * (block.timestamp - s.startTime)) / s.vestingDuration) - s.amountClaimed;
    }

    function claimVestedTokens() external whenNotPaused {
        uint256 claimable = calculateVestedAmount(msg.sender);
        require(claimable > 0, "No tokens to claim");

        vestingSchedules[msg.sender].amountClaimed += uint128(claimable);
        require(token.transfer(msg.sender, claimable));
        emit TokensClaimed(msg.sender, uint128(claimable));
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage s = vestingSchedules[beneficiary];
        require(s.totalAmount > 0 && !s.revoked);

        uint256 claimable = calculateVestedAmount(beneficiary);
        uint256 unvested = s.totalAmount - s.amountClaimed - claimable;
        s.revoked = true;

        if (unvested > 0) require(token.transfer(owner(), unvested));
        emit VestingRevoked(beneficiary);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }
}