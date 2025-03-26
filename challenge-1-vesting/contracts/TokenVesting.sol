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
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 totalAmount;
        uint256 claimed;
        uint256 revokedTime;
        address token;
    }

    // Token being vested
    mapping(address => bool) public tokens;

    // Mapping from beneficiary to vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;

    // Whitelist of beneficiaries
    mapping(address => bool) public whitelist;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary);
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary);

    /* --------------------------------- ERRORS --------------------------------- */
    error ZeroAddress();
    error InvalidStartTime();
    error InvalidTotalAmount();
    error InvalidCliffDuration();
    error InvalidVestingDuration();
    error VestingScheduleNotExists();
    error VestingScheduleAlreadyExists();
    error VestingScheduleAlreadyRevoked();
    error VestingScheduleAlreadyEnded();
    error NoClaimableTokens();

    constructor(address tokenAddress) {
        require(tokenAddress != address(0));
        tokens[tokenAddress] = true;
    }

    // Modifier to check if beneficiary is whitelisted
    modifier onlyWhitelisted(address beneficiary) {
        require(whitelist[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    // Modifier to check whitelist token
    modifier onlyWhitelistedToken(address token) {
        require(tokens[token], "Token not whitelisted");
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

    // @dev control the status of whitelisted token
    function changeWhitelistedToken(
        address token,
        bool whitelisted
    ) external onlyOwner {
        require(token != address(0), "Invalid address");
        tokens[token] = whitelisted;
    }

    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime,
        address token // @bonus - support for multiple token types
    )
        external
        onlyOwner
        onlyWhitelisted(beneficiary)
        whenNotPaused
        onlyWhitelistedToken(token)
    {
        uint256 createdTime = block.timestamp;
        if (startTime < createdTime) {
            revert InvalidStartTime();
        }
        if (amount == 0) {
            revert InvalidTotalAmount();
        }
        if (vestingDuration == 0 && vestingDuration < cliffDuration) {
            revert InvalidVestingDuration();
        }

        VestingSchedule memory vestingSchedule = VestingSchedule({
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            totalAmount: amount,
            claimed: 0,
            revokedTime: 0,
            token: token
        });
        vestingSchedules[beneficiary] = vestingSchedule;

        // Transfer token
        _safeTransferFrom(token, msg.sender, address(this), amount);

        emit VestingScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(
        address beneficiary
    ) public view returns (uint256) {
        VestingSchedule memory vestingSchedule = vestingSchedules[beneficiary];
        uint256 currentTime = block.timestamp;
        if (
            vestingSchedule.startTime + vestingSchedule.cliffDuration >
            currentTime
        ) {
            return 0;
        }
        uint256 actualVestedTime = vestingSchedule.revokedTime == 0
            ? currentTime - vestingSchedule.startTime
            : vestingSchedule.revokedTime - vestingSchedule.startTime;

        // Linear vesting calculation
        uint256 actualVestingAmount = actualVestedTime >=
            vestingSchedule.vestingDuration
            ? vestingSchedule.totalAmount
            : (actualVestedTime * vestingSchedule.totalAmount) /
                vestingSchedule.vestingDuration;

        return
            actualVestingAmount > vestingSchedule.claimed
                ? actualVestingAmount - vestingSchedule.claimed
                : 0;
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        address beneficiary = msg.sender;
        uint256 vestedAmount = calculateVestedAmount(beneficiary);
        require(vestedAmount > 0, "No tokens to claim");
        VestingSchedule memory vestingSchedule = vestingSchedules[beneficiary];
        // Transfer token
        _safeTransfer(vestingSchedule.token, beneficiary, vestedAmount);
        vestingSchedules[beneficiary].claimed += vestedAmount;
        emit TokensClaimed(beneficiary, vestedAmount);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule memory vestingSchedule = vestingSchedules[beneficiary];
        if (vestingSchedule.startTime == 0) {
            revert VestingScheduleNotExists();
        }
        if (vestingSchedule.revokedTime > 0) {
            revert VestingScheduleAlreadyRevoked();
        }
        if (
            block.timestamp >
            vestingSchedule.startTime + vestingSchedule.vestingDuration
        ) {
            revert VestingScheduleAlreadyEnded();
        }
        // Mark as revoked
        vestingSchedules[beneficiary].revokedTime = block.timestamp;

        uint256 vestedToken = calculateVestedAmount(beneficiary);
        uint256 unvestedToken = vestingSchedule.totalAmount - vestedToken;
        // Transfer back
        if (unvestedToken > 0) {
            _safeTransfer(vestingSchedule.token, owner(), unvestedToken);
        }

        emit VestingRevoked(beneficiary);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /* ----------------------------- VIEW FUNCTIONS ----------------------------- */

    /* --------------------------- INTERNAL FUNCTIONS --------------------------- */
    // @dev support transfer token
    function _safeTransfer(address token, address to, uint256 amount) internal {
        require(token.code.length > 0);
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))));
    }
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        require(token.code.length > 0);
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                amount
            )
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))));
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
