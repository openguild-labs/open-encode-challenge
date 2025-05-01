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
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable(msg.sender), Pausable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;       // total amount of tokens to be vested
        uint256 startTime;         // when vesting begins
        uint256 cliffDuration;     // how long until first tokens can be claimed
        uint256 vestingDuration;   // total vesting period
        uint256 amountClaimed;     // how much has been claimed so far
        bool revoked;              // whether this schedule has been revoked
    }

    // ERC20 token to be vested
    IERC20 public token;

    // mapping of beneficiary address to VestingSchedule and whitelist
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public whitelist;

    // events for created vesting schedule, claimed tokens, revoked vesting, and whitelist management
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    // constructor to set the token address
    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "token adress cannot be zero");     // checks if token address is valid
        token = IERC20(tokenAddress);                                           // initializes the token variable
    }

    // modifier to check if beneficiary is whitelisted
    modifier onlyWhitelisted(address beneficiary) {
        require(whitelist[beneficiary], "beneficiary not whitelisted");
        _;
    }

    // function to add a beneficiary to the whitelist
    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "invalid address");                // checks if address is valid
        whitelist[beneficiary] = true;                                        // adds the address to the whitelist
        emit BeneficiaryWhitelisted(beneficiary);                             // emits event for whitelisting
    }

    // function to remove a beneficiary from the whitelist
    function removeFromWhitelist(address beneficiary) external onlyOwner {
        whitelist[beneficiary] = false;                                      // removes the address from the whitelist
        emit BeneficiaryRemovedFromWhitelist(beneficiary);                   // emits event for removal
    }

     // function to create a vesting schedule
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        require(beneficiary != address(0), "invalid beneficiary address");                  // checks if address is valid
        require(amount > 0, "vesting amount must be greather than 0");                      // checks if amount is valid
        require(vestingDuration > 0, "vesting duration must be greather than 0");           // checks if vesting duration is valid
        require(vestingDuration >= cliffDuration,"Vesting duration must be >= cliff");      // checks if cliff duration is valid
        VestingSchedule storage existing = vestingSchedules[beneficiary];                   // get the existing vesting schedule
        require(existing.totalAmount == 0 || existing.revoked, "schedule exists");          // checks if schedule exists

        // transfer tokens from sender to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        vestingSchedules[beneficiary] = VestingSchedule({                                   // creates a new vesting schedule
            totalAmount: amount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            amountClaimed: 0,
            revoked: false
        });

        require(token.transferFrom(msg.sender, address(this), amount),"token transfer failed");  // transfers tokens from the sender to contract
        emit VestingScheduleCreated(beneficiary, amount);                                        // emits event for created vesting schedule
    }

    // function to calculate the vested amount for a beneficiary
    function calculateVestedAmount(address beneficiary) public view returns (uint256) {

        VestingSchedule storage schedule = vestingSchedules[beneficiary];                       // get the vesting schedule for the beneficiary
        
        // return 0 if there's no schedule or it has been revoked
        if (schedule.totalAmount == 0 || schedule.revoked) {          
            return 0;
        }
        
        // if current time is before cliff, nothing is vested
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        // if vesting is complete, everything is vested
        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }
        
        // linear vesting calculation
        uint256 timePassedSinceStart = block.timestamp - schedule.startTime;                                // time passed since start
        uint256 vestedAmount = (schedule.totalAmount * timePassedSinceStart) / schedule.vestingDuration;    // linear vesting formula
        return vestedAmount;
    }

    // function to claim vested tokens
    function claimVestedTokens() external nonReentrant whenNotPaused {
        address beneficiary = msg.sender;                                      // get the address of the beneficiary
        VestingSchedule storage schedule = vestingSchedules[beneficiary];      // get the vesting schedule for the beneficiary
        
        require(schedule.totalAmount > 0, "no vesting schedule found");        // checks if schedule exists
        require(!schedule.revoked, "vesting schedule has been revoked");       // checks if schedule is revoked
        
        uint256 vestedAmount = calculateVestedAmount(beneficiary);             // calculate the vested amount
        uint256 claimableAmount = vestedAmount - schedule.amountClaimed;       // calculate the claimable amount
        
        require(claimableAmount > 0, "no tokens available to claim");          // checks if there are tokens to claim
        
        // update claimed amount before transfer to prevent reentrancy
        schedule.amountClaimed += claimableAmount;
        
        // transfer tokens to beneficiary
        require(token.transfer(beneficiary, claimableAmount), "token transfer failed");
        emit TokensClaimed(beneficiary, claimableAmount);                     // emit event for claimed tokens
    }

    // function to revoke vesting schedule
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];    // get the vesting schedule for the beneficiary
        
        require(schedule.totalAmount > 0, "no vesting schedule found");     // checks if schedule exists
        
        // calculate vested and unvested amounts
        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        uint256 unvestedAmount = schedule.totalAmount - vestedAmount;
        
        // mark as revoked
        schedule.revoked = true;
        
        // transfer unvested tokens back to owner
        if (unvestedAmount > 0) {
            require(token.transfer(owner(), unvestedAmount), "token transfer failed");
        }
        
        emit VestingRevoked(beneficiary);                              // emit event for revoked vesting
    }

    // function to pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    // function to unpause the contract
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
