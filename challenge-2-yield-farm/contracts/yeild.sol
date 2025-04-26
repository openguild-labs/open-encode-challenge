// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract YieldFarm {
    IERC20 public lpToken;
    IERC20 public rewardToken;
    uint256 public rewardRate;
    uint64 public l; // lastUpdate
    uint256 public rPTS; // rewardPerTokenStored
    uint128 public totalStaked;
    address public owner;

    struct UserInfo {
        uint128 amount; // LP tokens staked
        uint64 startTime; // Staking start time
        uint256 rewardDebt; // Reward debt
        uint256 pendingRewards; // Unclaimed rewards
    }

    mapping(address => UserInfo) public userInfo;

    uint32 public constant BOOST_1 = 7 days;
    uint32 public constant BOOST_2 = 30 days;
    uint32 public constant BOOST_3 = 90 days;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    error OwnableUnauthorizedAccount(address account);

    modifier onlyOwner() {
        if (owner != msg.sender) revert OwnableUnauthorizedAccount(msg.sender);
        _;
    }

    constructor(address _lp, address _reward, uint256 _rate) {
        owner = msg.sender;
        lpToken = IERC20(_lp);
        rewardToken = IERC20(_reward);
        rewardRate = _rate;
        l = uint64(block.timestamp);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rPTS;
        unchecked {
            return rPTS + ((block.timestamp - l) * rewardRate) / totalStaked;
        }
    }

    function calculateBoostMultiplier(address _user) public view returns (uint256) {
        UserInfo memory u = userInfo[_user];
        if (u.amount == 0 || u.startTime == 0) return 100;
        uint64 duration = uint64(block.timestamp) - u.startTime;
        if (duration >= BOOST_3) return 200;
        if (duration >= BOOST_2) return 150;
        if (duration >= BOOST_1) return 125;
        return 100;
    }

    function _up(address _user) private {
        UserInfo storage u = userInfo[_user];
        uint256 rpt = rewardPerToken();
        u.pendingRewards = pendingRewards(_user);
        u.rewardDebt = (u.amount * rpt);
    }

    function stake(uint256 _amt) external {
        require(_amt > 0, "Cannot stake 0");
        _up(msg.sender);
        UserInfo storage u = userInfo[msg.sender];
        if (u.amount == 0) u.startTime = uint64(block.timestamp);
        u.amount += uint128(_amt);
        totalStaked += uint128(_amt);
        lpToken.transferFrom(msg.sender, address(this), _amt);
        emit Staked(msg.sender, _amt);
    }

    function withdraw(uint256 _amt) external {
        UserInfo storage u = userInfo[msg.sender];
        require(u.amount >= _amt, "Insufficient balance");
        _up(msg.sender);
        u.amount -= uint128(_amt);
        totalStaked -= uint128(_amt);
        lpToken.transfer(msg.sender, _amt);
        emit Withdrawn(msg.sender, _amt);
    }

    function claimRewards() external {
        _up(msg.sender);
        UserInfo storage u = userInfo[msg.sender];
        uint256 rewards = u.pendingRewards;
        if (rewards > 0) {
            u.pendingRewards = 0;
            rewardToken.transfer(msg.sender, rewards);
            emit RewardsClaimed(msg.sender, rewards);
        }
    }

    function emergencyWithdraw() external {
        UserInfo storage u = userInfo[msg.sender];
        uint256 amt = u.amount;
        if (amt > 0) {
            totalStaked -= uint128(amt);
            u.amount = 0;
            u.pendingRewards = 0;
            u.rewardDebt = 0;
            u.startTime = 0;
            lpToken.transfer(msg.sender, amt);
            emit EmergencyWithdrawn(msg.sender, amt);
        }
    }

    function updateRewardRate(uint256 _rate) external onlyOwner {
        rPTS = rewardPerToken();
        l = uint64(block.timestamp);
        rewardRate = _rate;
    }

    function pendingRewards(address _user) public view returns (uint256) {
        UserInfo memory u = userInfo[_user];
        if (u.amount == 0) return u.pendingRewards;
        uint256 rpt = rewardPerToken();
        uint256 r = (u.amount * (rpt - u.rewardDebt));
        unchecked {
            return u.pendingRewards + (r * calculateBoostMultiplier(_user)) / 100;
        }
    }
}