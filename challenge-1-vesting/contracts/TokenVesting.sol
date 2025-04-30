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


contract TokenVesting is Ownable, Pausable, ReentrancyGuard {
    struct VestingSchedule {
        address tokenAddress;
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 amountClaimed;
        bool revoked;
    }

   
    error InvalidAddress();
    error BeneficiaryNotWhitelisted(address beneficiary);
    error InvalidAmount();
    error InvalidDuration();
    error InvalidStartTime();
    error BeneficiaryAlreadyHasSchedule(address beneficiary, address token);
    error InsufficientAllowance(uint256 required, uint256 actual);
    error TokenTransferFailed();
    error NoVestingScheduleFound(address beneficiary, address token);
    error VestingScheduleRevoked();
    error NoVestedTokensAvailable();

    // Mapping from beneficiary to token address to vesting schedule
    // This allows one beneficiary to have multiple vesting schedules for different tokens
    mapping(address => mapping(address => VestingSchedule)) public vestingSchedules;
    
    // Track all tokens a beneficiary has schedules for
    mapping(address => address[]) public beneficiaryTokens;
    
    // Track if a beneficiary has a schedule for a specific token
    mapping(address => mapping(address => bool)) private hasScheduleForToken;

    // Whitelist of beneficiaries
    mapping(address => bool) public whitelist;

    // Events
    event VestingScheduleCreated(
        address indexed beneficiary,
        address indexed tokenAddress,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensClaimed(address indexed beneficiary, address indexed tokenAddress, uint256 amount);
    event VestingRevoked(address indexed beneficiary, address indexed tokenAddress, uint256 unvestedAmount);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    constructor() Ownable(msg.sender) {}

    // Modifier to check if beneficiary is whitelisted
    modifier onlyWhitelisted(address beneficiary) {
        if (!whitelist[beneficiary]) {
            revert BeneficiaryNotWhitelisted(beneficiary);
        }
        _;
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        if (beneficiary == address(0)) {
            revert InvalidAddress();
        }
        whitelist[beneficiary] = true;
        emit BeneficiaryWhitelisted(beneficiary);
    }

    function removeFromWhitelist(address beneficiary) external onlyOwner {
        whitelist[beneficiary] = false;
        emit BeneficiaryRemovedFromWhitelist(beneficiary);
    }

    function createVestingSchedule(
        address beneficiary,
        address tokenAddress,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        if (beneficiary == address(0)) {
            revert InvalidAddress();
        }
        if (tokenAddress == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (vestingDuration == 0) {
            revert InvalidDuration();
        }
        if (vestingDuration < cliffDuration) {
            revert InvalidDuration();
        }
        if (startTime < block.timestamp) {
            revert InvalidStartTime();
        }
        if (hasScheduleForToken[beneficiary][tokenAddress]) {
            revert BeneficiaryAlreadyHasSchedule(beneficiary, tokenAddress);
        }

        IERC20 token = IERC20(tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < amount) {
            revert InsufficientAllowance(amount, allowance);
        }

        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) {
            revert TokenTransferFailed();
        }

        vestingSchedules[beneficiary][tokenAddress] = VestingSchedule({
            tokenAddress: tokenAddress,
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaimed: 0,
            revoked: false
        });

        if (!hasScheduleForToken[beneficiary][tokenAddress]) {
            beneficiaryTokens[beneficiary].push(tokenAddress);
            hasScheduleForToken[beneficiary][tokenAddress] = true;
        }

        emit VestingScheduleCreated(
            beneficiary,
            tokenAddress,
            amount,
            startTime,
            cliffDuration,
            vestingDuration
        );
    }

    function calculateVestedAmount(
        address beneficiary,
        address tokenAddress
    ) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary][tokenAddress];
        if (schedule.totalAmount == 0) {
            return 0;
        }

        if (schedule.revoked) {
            return 0;
        }

        uint256 currentTime = block.timestamp;
        if (currentTime < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (currentTime >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount - schedule.amountClaimed;
        }

        uint256 elapsedTime = currentTime - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * elapsedTime) /
            schedule.vestingDuration;
        return vestedAmount - schedule.amountClaimed;
    }

   
    function claimVestedTokens(address tokenAddress) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[msg.sender][tokenAddress];
        if (schedule.totalAmount == 0) {
            revert NoVestingScheduleFound(msg.sender, tokenAddress);
        }
        if (schedule.revoked) {
            revert VestingScheduleRevoked();
        }

        uint256 vestedAmount = calculateVestedAmount(msg.sender, tokenAddress);
        if (vestedAmount == 0) {
            revert NoVestedTokensAvailable();
        }

        schedule.amountClaimed += vestedAmount;

        IERC20 token = IERC20(tokenAddress);
        bool success = token.transfer(msg.sender, vestedAmount);
        if (!success) {
            revert TokenTransferFailed();
        }

        emit TokensClaimed(msg.sender, tokenAddress, vestedAmount);
    }

    function revokeVesting(
        address beneficiary,
        address tokenAddress
    ) external onlyOwner nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[beneficiary][tokenAddress];
        if (schedule.totalAmount == 0) {
            revert NoVestingScheduleFound(beneficiary, tokenAddress);
        }
        if (schedule.revoked) {
            revert VestingScheduleRevoked();
        }

        // Calculate vested and unvested amounts
        uint256 vestedAmount = calculateVestedAmount(beneficiary, tokenAddress);
        uint256 unvestedAmount = schedule.totalAmount -
            schedule.amountClaimed -
            vestedAmount;

        schedule.revoked = true;
        schedule.totalAmount = schedule.amountClaimed + vestedAmount;

        if (unvestedAmount > 0) {
            IERC20 token = IERC20(tokenAddress);
            bool success = token.transfer(owner(), unvestedAmount);
            if (!success) {
                revert TokenTransferFailed();
            }
        }

        emit VestingRevoked(beneficiary, tokenAddress, unvestedAmount);
    }

    function getBeneficiaryTokens(address beneficiary) external view returns (address[] memory) {
        return beneficiaryTokens[beneficiary];
    }

    function getVestingSchedule(
        address beneficiary, 
        address tokenAddress
    ) external view returns (
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 amountClaimed,
        bool revoked
    ) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary][tokenAddress];
        return (
            schedule.totalAmount,
            schedule.startTime,
            schedule.cliffDuration,
            schedule.vestingDuration,
            schedule.amountClaimed,
            schedule.revoked
        );
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