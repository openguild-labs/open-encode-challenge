// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarm is ReentrancyGuard, Ownable {

    IERC20 public LPToken;
    IERC20 public rewardToken;

    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    struct UserInfo {
        uint256 amount;         // Amount of LP tokens staked by user
        uint256 startTime;      // Timestamp when user started staking or last reset
        uint256 rewardDebt;     // Reward debt to track already accounted rewards
        uint256 pendingRewards; // Rewards accrued but not yet claimed
    }

    mapping(address => UserInfo) public userInfo;

    uint256 public constant BOOST_THRESHOLD_1 = 7 days;
    uint256 public constant BOOST_THRESHOLD_2 = 30 days;
    uint256 public constant BOOST_THRESHOLD_3 = 90 days;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    // LP Tokens [LP] -> 0x0474b473a1c7bcf9a5706e71e894033157e85248
    // Reward [RD] -> 0xcd961fde084836941e6f6470d70b5bddfb2739bd

    constructor(
        address _lpToken,
        address _rewardToken,
        uint256 _rewardRate
    ) {
        require(_lpToken != address(0), "LP token address zero");
        require(_rewardToken != address(0), "Reward token address zero");
        require(_rewardRate > 0, "Reward rate must be > 0");

        LPToken = IERC20(_lpToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    function updateReward(address _user) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (_user != address(0)) {
            UserInfo storage user = userInfo[_user];
            user.pendingRewards = earned(_user);
            user.rewardDebt = (user.amount * rewardPerTokenStored) / 1e18;
        }
    }

    function rewardPerToken() public view returns (uint256) {
    if (totalStaked == 0) {
        return rewardPerTokenStored;
    }
    uint256 timeElapsed = block.timestamp - lastUpdateTime;
    uint256 rewardAccrued = timeElapsed * rewardRate * 1e18 / totalStaked;
    return rewardPerTokenStored + rewardAccrued;
}




    function earned(address _user) public view returns (uint256) {
    UserInfo storage user = userInfo[_user];
    uint256 currentRewardPerToken = rewardPerToken();
    uint256 baseReward = (user.amount * (currentRewardPerToken - user.rewardDebt)) / 1e18;
    uint256 totalReward = user.pendingRewards + baseReward;

    uint256 boostMultiplier = calculateBoostMultiplier(_user);
    return (totalReward * boostMultiplier) / 100;
}


    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake zero");

        updateReward(msg.sender);

        UserInfo storage user = userInfo[msg.sender];

        // If first time staking or after emergency withdraw, reset startTime
        if (user.amount == 0) {
            user.startTime = block.timestamp;
        }

        // Transfer LP tokens from user to contract
        require(LPToken.transferFrom(msg.sender, address(this), _amount), "LP transfer failed");

        user.amount += _amount;
        totalStaked += _amount;

        // Update reward debt after stake
        user.rewardDebt = (user.amount * rewardPerTokenStored) / 1e18;

        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(_amount > 0, "Cannot withdraw zero");
        require(user.amount >= _amount, "Withdraw amount exceeds balance");

        updateReward(msg.sender);

        user.amount -= _amount;
        totalStaked -= _amount;

        require(LPToken.transfer(msg.sender, _amount), "LP transfer failed");

        if (user.amount == 0) {
            user.startTime = 0;
        }

        user.rewardDebt = (user.amount * rewardPerTokenStored) / 1e18;

        emit Withdrawn(msg.sender, _amount);
    }

    function claimRewards() external nonReentrant {
        updateReward(msg.sender);

        UserInfo storage user = userInfo[msg.sender];
        uint256 reward = user.pendingRewards;
        require(reward > 0, "No rewards to claim");

        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * rewardPerTokenStored) / 1e18;

        require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        require(amount > 0, "Nothing to withdraw");

        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        user.startTime = 0;

        totalStaked -= amount;

        require(LPToken.transfer(msg.sender, amount), "LP transfer failed");

        emit EmergencyWithdrawn(msg.sender, amount);
    }

    function calculateBoostMultiplier(address _user) public view returns (uint256) {
           UserInfo storage user = userInfo[_user];
        if (user.startTime == 0 || user.amount == 0) {
            return 100; // No boost if not staking
        }

        uint256 stakingDuration = block.timestamp - user.startTime;

        if (stakingDuration >= BOOST_THRESHOLD_3) {
            return 150; // 1.5x boost
        } else if (stakingDuration >= BOOST_THRESHOLD_2) {
            return 130; // 1.3x boost
        } else if (stakingDuration >= BOOST_THRESHOLD_1) {
            return 110; // 1.1x boost
        } else {
            return 100; // No boost
        }
    }

    function updateRewardRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "Reward rate must be > 0");
        updateReward(address(0)); // Update global rewards before changing rate
        uint256 oldRate = rewardRate;
        rewardRate = _newRate;
        emit RewardRateUpdated(oldRate, _newRate);
    }

    function pendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }
}
