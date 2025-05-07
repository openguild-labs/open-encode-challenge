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
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenVesting {
    using SafeERC20 for IERC20;
    
    struct VestingSchedule {
        address tokenAddress;
        uint96 totalAmount;
        uint32 startTime;
        uint32 cliffDuration;
        uint32 vestingDuration;
        uint96 amountClaimed;
        bool revoked;
    }
    
    error InvalidAddress();
    error BeneficiaryNotWhitelisted(address beneficiary);
    error InvalidAmount();
    error InvalidDuration();
    error InvalidStartTime();
    error BeneficiaryAlreadyHasSchedule(address beneficiary, address token);
    error InsufficientAllowance(uint256 required, uint256 actual);
    error NoVestingScheduleFound(address beneficiary, address token);
    error VestingScheduleRevoked();
    error NoVestedTokensAvailable();
    error OwnableUnauthorizedAccount(address account);
    error EnforcedPause();
    
    mapping(address => mapping(address => VestingSchedule)) private _schedules;
    mapping(address => bool) private _whitelist;
    address private immutable _owner;
    bool private _paused;

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
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != _owner) revert OwnableUnauthorizedAccount(msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (_paused) revert EnforcedPause();
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function pause() external onlyOwner {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        if (beneficiary == address(0)) revert InvalidAddress();
        _whitelist[beneficiary] = true;
        emit BeneficiaryWhitelisted(beneficiary);
    }

    function removeFromWhitelist(address beneficiary) external onlyOwner {
        _whitelist[beneficiary] = false;
        emit BeneficiaryRemovedFromWhitelist(beneficiary);
    }

    function createVestingSchedule(
        address beneficiary,
        address tokenAddress,
        uint96 amount,
        uint32 cliffDuration,
        uint32 vestingDuration,
        uint32 startTime
    ) external onlyOwner whenNotPaused {
        _validateVestingParams(beneficiary, tokenAddress, amount, cliffDuration, vestingDuration, startTime);
        
        IERC20 token = IERC20(tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < amount) revert InsufficientAllowance(amount, allowance);

        token.safeTransferFrom(msg.sender, address(this), amount);
        
        _schedules[beneficiary][tokenAddress] = VestingSchedule({
            tokenAddress: tokenAddress,
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaimed: 0,
            revoked: false
        });

        emit VestingScheduleCreated(
            beneficiary,
            tokenAddress,
            amount,
            startTime,
            cliffDuration,
            vestingDuration
        );
    }

    function _validateVestingParams(
        address beneficiary,
        address tokenAddress, 
        uint96 amount,
        uint32 cliffDuration,
        uint32 vestingDuration,
        uint32 startTime
    ) private view {
        if (beneficiary == address(0) || tokenAddress == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (vestingDuration == 0 || vestingDuration < cliffDuration) revert InvalidDuration();
        if (startTime < uint32(block.timestamp)) revert InvalidStartTime();
        if (_schedules[beneficiary][tokenAddress].totalAmount != 0) {
            revert BeneficiaryAlreadyHasSchedule(beneficiary, tokenAddress);
        }
        if (!_whitelist[beneficiary]) revert BeneficiaryNotWhitelisted(beneficiary);
    }

    function calculateVestedAmount(
        address beneficiary,
        address tokenAddress
    ) public view returns (uint256) {
        VestingSchedule storage schedule = _schedules[beneficiary][tokenAddress];
        
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return 0;
        }

        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount - schedule.amountClaimed;
        }

        uint256 elapsedTime = block.timestamp - schedule.startTime;
        uint256 vestedAmount = (uint256(schedule.totalAmount) * elapsedTime) / schedule.vestingDuration;
        return vestedAmount - schedule.amountClaimed;
    }

    function claimVestedTokens(address tokenAddress) external whenNotPaused {
        VestingSchedule storage schedule = _schedules[msg.sender][tokenAddress];
        
        if (schedule.totalAmount == 0) revert NoVestingScheduleFound(msg.sender, tokenAddress);
        if (schedule.revoked) revert VestingScheduleRevoked();

        uint256 vestedAmount = calculateVestedAmount(msg.sender, tokenAddress);
        if (vestedAmount == 0) revert NoVestedTokensAvailable();

        schedule.amountClaimed += uint96(vestedAmount);

        IERC20(tokenAddress).safeTransfer(msg.sender, vestedAmount);

        emit TokensClaimed(msg.sender, tokenAddress, vestedAmount);
    }

    function revokeVesting(address beneficiary, address tokenAddress) external onlyOwner {
        VestingSchedule storage schedule = _schedules[beneficiary][tokenAddress];
        
        if (schedule.totalAmount == 0) revert NoVestingScheduleFound(beneficiary, tokenAddress);
        if (schedule.revoked) revert VestingScheduleRevoked();

        uint256 vestedAmount = calculateVestedAmount(beneficiary, tokenAddress);
        uint256 unvestedAmount = schedule.totalAmount - schedule.amountClaimed - vestedAmount;

        schedule.revoked = true;
        schedule.totalAmount = uint96(schedule.amountClaimed + vestedAmount);

        if (unvestedAmount > 0) {
            IERC20(tokenAddress).safeTransfer(_owner, unvestedAmount);
        }

        emit VestingRevoked(beneficiary, tokenAddress, unvestedAmount);
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
        VestingSchedule storage schedule = _schedules[beneficiary][tokenAddress];
        return (
            schedule.totalAmount,
            schedule.startTime,
            schedule.cliffDuration,
            schedule.vestingDuration,
            schedule.amountClaimed,
            schedule.revoked
        );
    }

    function whitelist(address beneficiary) external view returns (bool) {
        return _whitelist[beneficiary];
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