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
        uint256 amount;
        uint256 startDate;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 amountClaim;
        bool revokeData;
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
        uint256 startDate
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be greather than 0");
        require(
            vestingDuration > 0,
            "Vesting duration must be greather than 0"
        );
        require(
            vestingDuration >= cliffDuration,
            "Vesting duration must be >= cliff"
        );
        require(
            vestingSchedules[beneficiary].amount == 0,
            "Vesting Schedule already exists"
        );
        require(
            startDate >= block.timestamp,
            "Start time must be in the future"
        );

        vestingSchedules[beneficiary] = VestingSchedule({
            amount: amount,
            startDate: startDate,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaim: 0,
            revokeData: false
        });

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer has failed"
        );
        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule memory scheduleByBeneficiary = vestingSchedules[
            beneficiary
        ];

        if (
            scheduleByBeneficiary.amount == 0 ||
            scheduleByBeneficiary.revokeData
        ) {
            return 0;
        }

        if (
            block.timestamp <
            scheduleByBeneficiary.startDate +
                scheduleByBeneficiary.cliffDuration
        ) {
            return 0;
        }

        if (
            block.timestamp >=
            scheduleByBeneficiary.startDate +
                scheduleByBeneficiary.vestingDuration
        ) {
            return scheduleByBeneficiary.amount;
        }

        uint256 timestampFromStart = block.timestamp -
            scheduleByBeneficiary.startDate;
        uint256 data = (scheduleByBeneficiary.amount * timestampFromStart) /
            scheduleByBeneficiary.vestingDuration;

        return data;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        VestingSchedule storage scheduleData = vestingSchedules[msg.sender];
        require(scheduleData.amount > 0, "No vesting schedule");
        require(!scheduleData.revokeData, "Vesting revoke data");

        uint256 vestedAmount = calculateVestedAmount(msg.sender);
        uint256 amountClaim = vestedAmount - scheduleData.amountClaim;
        require(amountClaim > 0, "No tokens to claim");

        scheduleData.amountClaim += amountClaim;
        require(token.transfer(msg.sender, amountClaim), "Transfer failed");

        emit TokensClaimed(msg.sender, amountClaim);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage scheduleData = vestingSchedules[beneficiary];
        require(scheduleData.amount > 0, "No data vesting schedule");
        require(!scheduleData.revokeData, "Already revoke vesting");

        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 amountClaim = scheduleData.amount - vestedAmount;

        scheduleData.revokeData = true;

        if (amountClaim > 0) {
            require(token.transfer(owner(), amountClaim), "Transfer failed");
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
