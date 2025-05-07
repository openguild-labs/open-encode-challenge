// SPDX-License-Identifier: MIT
// This license means anyone can use this code freely
pragma solidity ^0.8.0;

// Importing standard token and ownership interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Main contract for locking tokens and releasing them over time
contract TokenVesting is Ownable {
    // Structure to store vesting details for each person
    struct VestingSchedule {
        uint128 amount;      // Total tokens they will receive
        uint64 start;        // When the vesting begins
        uint32 cliff;        // Initial lock period before any tokens release
        uint32 duration;    // Total time over which tokens gradually unlock
        uint128 claimed;    // How many tokens they've already taken
        bool revoked;       // Whether the admin canceled this vesting
    }

    // The token that will be locked and released
    IERC20 public immutable token;
    
    // Storage for all vesting plans
    mapping(address => VestingSchedule) private _schedules;
    
    // List of approved addresses that can receive tokens
    mapping(address => bool) private _whitelist;

    // Events that get logged when important things happen:
    event ScheduleCreated(address indexed beneficiary, uint256 amount); // When a new vesting plan is made
    event TokensClaimed(address indexed beneficiary, uint256 amount);  // When someone takes their tokens
    event VestingRevoked(address indexed beneficiary);                 // When an admin cancels a vesting

    // Set up the contract with the token we'll be using
    constructor(address tokenAddress) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
    }

    // ADMIN FUNCTION: Add someone to the approved list
    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "Invalid address"); // Can't use zero address
        _whitelist[beneficiary] = true; // Add to approved list
    }

    // ADMIN FUNCTION: Create a vesting plan for someone
    function createVestingSchedule(
        address beneficiary,  // Who gets the tokens
        uint128 amount,       // How many tokens
        uint32 cliff,         // Initial lock period (seconds)
        uint32 duration,      // Total vesting period (seconds)
        uint64 startTime      // When vesting starts
    ) external onlyOwner {
        require(_whitelist[beneficiary], "Not whitelisted"); // Must be approved
        require(amount > 0, "Amount must be positive"); // Can't vest zero tokens
        require(_schedules[beneficiary].amount == 0, "Schedule exists"); // No duplicate plans
        
        // Create the vesting plan
        _schedules[beneficiary] = VestingSchedule({
            amount: amount,
            start: startTime,
            cliff: cliff,
            duration: duration,
            claimed: 0,
            revoked: false
        });

        // Move the tokens into this contract for safekeeping
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit ScheduleCreated(beneficiary, amount);
    }

    // Calculate how many tokens someone can claim right now
    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory s = _schedules[beneficiary];
        if (s.amount == 0) return 0; // No plan = no tokens

        uint256 currentTime = block.timestamp;
        
        // Before cliff period ends = nothing available
        if (currentTime < s.start + s.cliff) return 0;
        
        // After full duration = everything available
        if (currentTime >= s.start + s.duration) return s.amount - s.claimed;

        // During vesting period = proportional amount available
        uint256 elapsed = currentTime - s.start;
        uint256 vested = (s.amount * elapsed) / s.duration;
        return vested > s.amount ? s.amount - s.claimed : vested - s.claimed;
    }

    // Let users claim their available tokens
    function claimVestedTokens() external {
        uint256 vested = calculateVestedAmount(msg.sender);
        require(vested > 0, "No vested tokens"); // Must have something to claim

        VestingSchedule storage s = _schedules[msg.sender];
        s.claimed += uint128(vested); // Track how much they've taken

        // Send the tokens to them
        require(token.transfer(msg.sender, vested), "Transfer failed");
        emit TokensClaimed(msg.sender, vested);
    }

    // ADMIN FUNCTION: Cancel someone's vesting plan
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage s = _schedules[beneficiary];
        require(s.amount > 0, "No schedule"); // Must have an existing plan
        require(!s.revoked, "Already revoked"); // Can't cancel twice

        // Calculate what they've earned so far
        uint256 vested = calculateVestedAmount(beneficiary);
        uint256 unvested = s.amount - vested - s.claimed;

        // Mark as canceled and adjust amounts
        s.revoked = true;
        s.amount = uint128(vested + s.claimed);

        // Return unvested tokens to admin
        if (unvested > 0) {
            require(token.transfer(owner(), unvested), "Transfer failed");
        }
        emit VestingRevoked(beneficiary);
    }
}