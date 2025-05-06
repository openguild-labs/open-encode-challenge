// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarm is ReentrancyGuard, Ownable {
    IERC20 public lpToken;
    IERC20 public rewardToken;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    struct UserInfo {
        uint256 amount;
        uint256 startTime;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }

    mapping(address => UserInfo) public userInfo;

    uint256 public constant BOOST_THRESHOLD_1 = 7 days;
    uint256 public constant BOOST_THRESHOLD_2 = 30 days;
    uint256 public constant BOOST_THRESHOLD_3 = 90 days;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    constructor(
        address _lpToken,
        address _rewardToken,
        uint256 _rewardRate
    ) Ownable(msg.sender) {
        lpToken = IERC20(_lpToken);
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
        if (totalStaked == 0) return rewardPerTokenStored;
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        return rewardPerTokenStored + (timeElapsed * rewardRate * 1e18) / totalStaked;
    }

    function earned(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 rewardDifference = currentRewardPerToken - user.rewardDebt;
        uint256 newRewards = (user.amount * rewardDifference) / 1e18;
        uint256 boost = calculateBoostMultiplier(_user);
        return user.pendingRewards + (newRewards * boost) / 100;
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        updateReward(msg.sender);
        
        UserInfo storage user = userInfo[msg.sender];
        lpToken.transferFrom(msg.sender, address(this), _amount);

        if (user.amount == 0) {
            user.startTime = block.timestamp;
        }
        user.amount += _amount;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Insufficient balance");
        updateReward(msg.sender);

        lpToken.transfer(msg.sender, _amount);
        user.amount -= _amount;
        totalStaked -= _amount;

        if (user.amount == 0) {
            user.startTime = 0;
        }

        emit Withdrawn(msg.sender, _amount);
    }

    function claimRewards() external nonReentrant {
        updateReward(msg.sender);
        UserInfo storage user = userInfo[msg.sender];
        
        uint256 rewards = user.pendingRewards;
        require(rewards > 0, "No rewards to claim");

        user.pendingRewards = 0;
        rewardToken.transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        require(amount > 0, "No stake to withdraw");

        user.amount = 0;
        user.startTime = 0;
        user.pendingRewards = 0;
        user.rewardDebt = 0;
        totalStaked -= amount;

        lpToken.transfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    function calculateBoostMultiplier(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        if (user.amount == 0) return 100;

        uint256 stakingDuration = block.timestamp - user.startTime;
        if (stakingDuration >= BOOST_THRESHOLD_3) return 200;
        if (stakingDuration >= BOOST_THRESHOLD_2) return 150;
        if (stakingDuration >= BOOST_THRESHOLD_1) return 120;
        return 100;
    }

    function updateRewardRate(uint256 _newRate) external onlyOwner {
        updateReward(address(0));
        rewardRate = _newRate;
    }

    function pendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }
}