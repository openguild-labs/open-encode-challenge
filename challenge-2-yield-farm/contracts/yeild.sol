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
        return
            rewardPerTokenStored +
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
                totalStaked);
    }

    function earned(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];

        uint256 newReward = (user.amount *
            (rewardPerToken() - user.rewardDebt)) / 1e18;

        uint256 boost = calculateBoostMultiplier(_user);
        newReward = (newReward * boost) / 100;
        return user.pendingRewards + newReward;
    }

    /**
     * @notice Stake LP tokens into the farm
     * @param _amount Amount of LP tokens to stake
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");

        // Update the reward information for the user
        updateReward(msg.sender);

        // If the user has no previous stake, set the start time
        if (userInfo[msg.sender].amount == 0) {
            userInfo[msg.sender].startTime = block.timestamp;
        }

        // Transfer LP tokens from the user to this contract
        lpToken.transferFrom(msg.sender, address(this), _amount);

        // Increase the user's staked amount and update the global total
        userInfo[msg.sender].amount += _amount;
        totalStaked += _amount;

        // Update reward debt to the new total amount
        userInfo[msg.sender].rewardDebt =
            (userInfo[msg.sender].amount * rewardPerTokenStored) /
            1e18;

        // Emit the staking event
        emit Staked(msg.sender, _amount);
    }

    /**
     * @notice Withdraw staked LP tokens
     * @param _amount Amount of LP tokens to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        updateReward(msg.sender);

        require(userInfo[msg.sender].amount >= _amount, "Insufficient balance");

        userInfo[msg.sender].amount -= _amount;
        totalStaked -= _amount;

        userInfo[msg.sender].rewardDebt =
            (userInfo[msg.sender].amount * rewardPerTokenStored) /
            1e18;

        lpToken.transfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        updateReward(msg.sender);

        uint256 rewards = userInfo[msg.sender].pendingRewards;
        require(rewards > 0, "No rewards to claim");

        userInfo[msg.sender].pendingRewards = 0;

        rewardToken.transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @notice Emergency withdraw without caring about rewards
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        require(amount > 0, "No tokens to withdraw");

        user.amount = 0;
        user.pendingRewards = 0;
        user.rewardDebt = 0;

        totalStaked -= amount;

        lpToken.transfer(msg.sender, amount);

        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Calculate boost multiplier based on staking duration
     * @param _user Address of the user
     * @return Boost multiplier (100 = 1x, 150 = 1.5x, etc.)
     */
    function calculateBoostMultiplier(
        address _user
    ) public view returns (uint256) {
        uint256 stakedDuration = block.timestamp - userInfo[_user].startTime;
        if (stakedDuration >= BOOST_THRESHOLD_3) {
            return 200; // 2x boost
        } else if (stakedDuration >= BOOST_THRESHOLD_2) {
            return 150; // 1.5x boost
        } else if (stakedDuration >= BOOST_THRESHOLD_1) {
            return 125; // 1.25x boost
        }
        return 100; // 1x boost (no boost)
    }

    /**
     * @notice Update reward rate
     * @param _newRate New reward rate per second
     */
    function updateRewardRate(uint256 _newRate) external onlyOwner {
        updateReward(address(0));

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
