// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenVesting is Ownable {
    struct VestingSchedule {
        uint128 amount;
        uint64 start;
        uint32 cliff;
        uint32 duration;
        uint128 claimed;
        bool revoked;
    }

    IERC20 public immutable token;
    mapping(address => VestingSchedule) private _schedules;
    mapping(address => bool) private _whitelist;

    event ScheduleCreated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "Invalid address");
        _whitelist[beneficiary] = true;
    }

    function createVestingSchedule(
        address beneficiary,
        uint128 amount,
        uint32 cliff,
        uint32 duration,
        uint64 startTime
    ) external onlyOwner {
        require(_whitelist[beneficiary], "Not whitelisted");
        require(amount > 0, "Amount must be positive");
        require(_schedules[beneficiary].amount == 0, "Schedule exists");
        
        _schedules[beneficiary] = VestingSchedule({
            amount: amount,
            start: startTime,
            cliff: cliff,
            duration: duration,
            claimed: 0,
            revoked: false
        });

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit ScheduleCreated(beneficiary, amount);
    }

    function calculateVestedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory s = _schedules[beneficiary];
        if (s.amount == 0) return 0;

        uint256 currentTime = block.timestamp;
        if (currentTime < s.start + s.cliff) return 0;
        if (currentTime >= s.start + s.duration) return s.amount - s.claimed;

        uint256 elapsed = currentTime - s.start;
        uint256 vested = (s.amount * elapsed) / s.duration;
        return vested > s.amount ? s.amount - s.claimed : vested - s.claimed;
    }

    function claimVestedTokens() external {
        uint256 vested = calculateVestedAmount(msg.sender);
        require(vested > 0, "No vested tokens");

        VestingSchedule storage s = _schedules[msg.sender];
        s.claimed += uint128(vested);

        require(token.transfer(msg.sender, vested), "Transfer failed");
        emit TokensClaimed(msg.sender, vested);
    }

    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage s = _schedules[beneficiary];
        require(s.amount > 0, "No schedule");
        require(!s.revoked, "Already revoked");

        uint256 vested = calculateVestedAmount(beneficiary);
        uint256 unvested = s.amount - vested - s.claimed;

        s.revoked = true;
        s.amount = uint128(vested + s.claimed);

        if (unvested > 0) {
            require(token.transfer(owner(), unvested), "Transfer failed");
        }
        emit VestingRevoked(beneficiary);
    }
}