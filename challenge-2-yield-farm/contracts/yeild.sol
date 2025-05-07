// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarm is Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable lpToken;
    IERC20 public immutable rewardToken;
    uint96 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;
    
    struct UserInfo {
        uint96 amount;
        uint32 startTime;
        uint96 rewardDebt;
        uint96 pendingRewards;
    }
    
    mapping(address => UserInfo) public userInfo;
    
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _lpToken, address _rewardToken, uint96 _rewardRate) Ownable(msg.sender) {
        (lpToken, rewardToken, rewardRate, lastUpdateTime) = (IERC20(_lpToken), IERC20(_rewardToken), _rewardRate, block.timestamp);
    }

    function calculateBoostMultiplier(address account) public view returns (uint256) {
        UserInfo storage user = userInfo[account];
        return user.startTime == 0 ? 100 : 
               block.timestamp - user.startTime >= 90 days ? 200 : 
               block.timestamp - user.startTime >= 30 days ? 150 : 
               block.timestamp - user.startTime >= 7 days ? 125 : 100;
    }
    
    function _rewardPerToken() internal view returns (uint256) {
        return totalStaked == 0 ? rewardPerTokenStored : 
               rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalStaked;
    }
    
    function _updateReward(address account) internal {
        rewardPerTokenStored = _rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            UserInfo storage user = userInfo[account];
            (user.pendingRewards, user.rewardDebt) = (uint96(earned(account)), uint96((user.amount * rewardPerTokenStored) / 1e18));
        }
    }
    
    function earned(address account) public view returns (uint256) {
        UserInfo storage user = userInfo[account];
        if (user.amount == 0) return user.pendingRewards;
        return (user.pendingRewards + (user.amount * (_rewardPerToken() - (user.rewardDebt / user.amount))) / 1e18) * calculateBoostMultiplier(account) / 100;
    }

    function pendingRewards(address account) external view returns (uint256) { return earned(account); }
    
    function stake(uint96 amount) external {
        require(amount > 0, "Cannot stake 0");
        _updateReward(msg.sender);
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount == 0) user.startTime = uint32(block.timestamp);
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        (user.amount, totalStaked) = (user.amount + amount, totalStaked + amount);
        emit Staked(msg.sender, amount);
    }
    
    function withdraw(uint96 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient balance");
        _updateReward(msg.sender);
        (user.amount, totalStaked) = (user.amount - amount, totalStaked - amount);
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    function emergencyWithdraw() external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        (user.amount, user.startTime, user.rewardDebt, user.pendingRewards, totalStaked) = (0, 0, 0, 0, totalStaked - amount);
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    function claimRewards() external {
        _updateReward(msg.sender);
        UserInfo storage user = userInfo[msg.sender];
        uint256 reward = user.pendingRewards;
        if (reward > 0) {
            user.pendingRewards = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }
    }
    
    function updateRewardRate(uint96 newRate) external onlyOwner {
        _updateReward(address(0));
        rewardRate = newRate;
    }
}