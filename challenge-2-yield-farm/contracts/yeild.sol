// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldFarm
 * @notice Challenge: Implement a yield farming contract with the following requirements:
 *
 * 1. Users can stake LP tokens and earn reward tokens
 * 2. Rewards are distributed based on time and amount staked
 * 3. Implement reward boosting mechanism for long-term stakers
 * 4. Add emergency withdrawal functionality
 * 5. Implement reward rate adjustment mechanism
 */

contract YieldFarm is ReentrancyGuard, Ownable {
    // LP token that users can stake
    IERC20 public lpToken;

    // Token given as reward
    IERC20 public rewardToken;

    // Reward rate per second
    uint256 public rewardRate;

    // Last update time
    uint256 public lastUpdateTime;

    // Reward per token stored
    uint256 public rewardPerTokenStored;

    // Total staked amount
    uint256 public totalStaked;

    // User struct to track staking info
    struct UserInfo {
        uint256 amount; // Amount of LP tokens staked
        uint256 startTime; // Time when user started staking
        uint256 rewardDebt; // Reward debt
        uint256 pendingRewards; // Unclaimed rewards
    }

    // Mapping of user address to their info
    mapping(address => UserInfo) public userInfo;

    // Boost multiplier thresholds (in seconds)
    uint256 public constant BOOST_THRESHOLD_1 = 7 days;
    uint256 public constant BOOST_THRESHOLD_2 = 30 days;
    uint256 public constant BOOST_THRESHOLD_3 = 90 days;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);

    /**
     * @notice Initialize the contract with the LP token and reward token addresses
     * @param _lpToken Address of the LP token
     * @param _rewardToken Address of the reward token
     * @param _rewardRate Initial reward rate per second
     */
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
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        uint256 rewardAccrued = (timeElapsed * rewardRate * 1e18) / totalStaked;
        return rewardPerTokenStored + rewardAccrued;
    }

    function earned(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        if (user.amount == 0) {
            return user.pendingRewards;
        }
        
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 newRewards = (user.amount * (currentRewardPerToken - user.rewardDebt / user.amount)) / 1e18;
        uint256 totalRewards = user.pendingRewards + newRewards;
        
        uint256 multiplier = calculateBoostMultiplier(_user);
        return (totalRewards * multiplier) / 100;
    }

    /**
     * @notice Stake LP tokens into the farm
     * @param _amount Amount of LP tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        
        updateReward(msg.sender);
        
        lpToken.transferFrom(msg.sender, address(this), _amount);
        
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount == 0) {
            user.startTime = block.timestamp;
        }
        
        user.amount += _amount;
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }

    /**
     * @notice Withdraw staked LP tokens
     * @param _amount Amount of LP tokens to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Insufficient balance");
        
        updateReward(msg.sender);
        
        lpToken.transfer(msg.sender, _amount);
        
        user.amount -= _amount;
        totalStaked -= _amount;
        
        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        updateReward(msg.sender);
        
        UserInfo storage user = userInfo[msg.sender];
        uint256 reward = user.pendingRewards;
        
        if (reward > 0) {
            user.pendingRewards = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    /**
     * @notice Emergency withdraw without caring about rewards
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        
        totalStaked -= amount;
        
        // Reset user info
        user.amount = 0;
        user.startTime = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        
        // Return LP tokens to user
        lpToken.transfer(msg.sender, amount);
        
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Calculate boost multiplier based on staking duration
     * @param _user Address of the user
     * @return Boost multiplier (100 = 1x, 125 = 1.25x, 150 = 1.5x, 200 = 2x)
     */
    function calculateBoostMultiplier(
        address _user
    ) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        if (user.amount == 0 || user.startTime == 0) {
            return 100; // Base multiplier (1x)
        }
        
        uint256 stakingDuration = block.timestamp - user.startTime;
        
        if (stakingDuration >= BOOST_THRESHOLD_3) {
            return 200; // 2x multiplier
        } else if (stakingDuration >= BOOST_THRESHOLD_2) {
            return 150; // 1.5x multiplier
        } else if (stakingDuration >= BOOST_THRESHOLD_1) {
            return 125; // 1.25x multiplier
        } else {
            return 100; // Base multiplier (1x)
        }
    }

    /**
     * @notice Update reward rate
     * @param _newRate New reward rate per second
     */
    function updateRewardRate(uint256 _newRate) external onlyOwner {
        updateReward(address(0)); // Update rewards for all users before changing rate
        rewardRate = _newRate;
    }

    /**
     * @notice View function to see pending rewards for a user
     * @param _user Address of the user
     * @return Pending reward amount
     */
    function pendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }
}