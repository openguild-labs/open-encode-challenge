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

    // token given as reward
    IERC20 public rewardToken;

    uint256 public rewardRate;             // reward rate per second
    uint256 public lastUpdateTime;         // last update time
    uint256 public rewardPerTokenStored;   // reward per token stored 
    uint256 public totalStaked;            // total staked amount

    // user struct to track staking info
    struct UserInfo {
        uint256 amount;                   // amount of LP tokens staked
        uint256 startTime;                // time when user started staking
        uint256 rewardDebt;               // reward debt
        uint256 pendingRewards;           // unclaimed rewards
    }

    // mapping of user address to their info
    mapping(address => UserInfo) public userInfo;

    // boost multiplier thresholds
    uint256 public constant BOOST_THRESHOLD_1 = 7 days;
    uint256 public constant BOOST_THRESHOLD_2 = 30 days;
    uint256 public constant BOOST_THRESHOLD_3 = 90 days;

    // Events for staking, withdrawing, claiming rewards, and emergency withdrawal
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

    // constructor to set the LP token, reward token addresses and reward rate
    constructor(address _lpToken, address _rewardToken, uint256 _rewardRate) Ownable(msg.sender) {

        require(_lpToken != address(0), "LP token address cannot be zero");           // checks if LP token address is valid
        require(_rewardToken != address(0), "reward token address cannot be zero");   // checks if reward token address is valid
        
        lpToken = IERC20(_lpToken);            // initializes the LP token variable
        rewardToken = IERC20(_rewardToken);    // initializes the reward token variable
        rewardRate = _rewardRate;              // sets the initial reward rate
        lastUpdateTime = block.timestamp;      // sets the last update time to current block timestamp
    }

     // function to update the reward for a user
    function updateReward(address _user) internal {
        rewardPerTokenStored = rewardPerToken();       // calculate the reward per token
        lastUpdateTime = block.timestamp;              // update the last update time

        if (_user != address(0)) {                      // checks if user is not zero address
            UserInfo storage user = userInfo[_user];    // get the user info
            user.pendingRewards = earned(_user);        // calculate the earned rewards
            user.rewardDebt = (user.amount * rewardPerTokenStored) / 1e18;        // update the reward debt
        }
    }

     // function to calculate the reward per token
    function rewardPerToken() public view returns (uint256) {

        if (totalStaked == 0) {                 // checks if total staked amount is zero
            return rewardPerTokenStored;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;             // calculate the time elapsed since last update
        uint256 reward = (timeElapsed * rewardRate * 1e18) / totalStaked;   // calculate the reward based on time elapsed and total staked amount
        return rewardPerTokenStored + reward;                               // return the updated reward per token
    }

     // function to calculate the earned rewards for a user
    function earned(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];                          // get the user info
        
        if (user.amount == 0) {
            return user.pendingRewards;
        }
        
        uint256 currentRewardPerToken = rewardPerToken();                // get the current reward per token
        uint256 newRewards = (user.amount * (currentRewardPerToken - user.rewardDebt / user.amount)) / 1e18;    // calculate the new rewards
        
        // apply boost multiplier
        uint256 boostMultiplier = calculateBoostMultiplier(_user);       // calculate the boost multiplier based on staking duration
        newRewards = (newRewards * boostMultiplier) / 100;               // apply the boost multiplier
        return user.pendingRewards + newRewards;                         // return the total earned rewards
    }

    /**
     * @notice Stake LP tokens into the farm
     * @param _amount Amount of LP tokens to stake
     */

     // function to stake LP tokens
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "cannot stake zero amount");     // checks if amount is greater than zero
         
        updateReward(msg.sender);                             // update the reward for the user
        
        // transfer LP tokens from user to contract
        require(lpToken.transferFrom(msg.sender, address(this), _amount), "LP token transfer failed");
        
        UserInfo storage user = userInfo[msg.sender];        // get the user info
        
        // if first time staking, set start time
        if (user.amount == 0) {
            user.startTime = block.timestamp;
        }
        
        // update user info and total staked amount
        user.amount += _amount;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);                   // emit event for staking
    }

    /**
     * @notice Withdraw staked LP tokens
     * @param _amount Amount of LP tokens to withdraw
     */

     // function to withdraw staked LP tokens
    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw amount exceeds balance");
        
        updateReward(msg.sender);
        
        // transfer LP tokens back to user
        require(lpToken.transfer(msg.sender, _amount), "LP token transfer failed");
        
        // update user info and total staked amount
        user.amount -= _amount;
        totalStaked -= _amount;
        
        // if user withdraws everything, reset start time
        if (user.amount == 0) {
            user.startTime = 0;
        }

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @notice Claim pending rewards
     */

    // function to claim pending rewards
    function claimRewards() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        
        updateReward(msg.sender);
        
        uint256 rewardsToSend = user.pendingRewards;              // get the pending rewards
        require(rewardsToSend > 0, "no rewards to claim");        // checks if there are rewards to claim
        
        // reset pending rewards
        user.pendingRewards = 0;         
        
        // transfer rewards to user
        require(rewardToken.transfer(msg.sender, rewardsToSend), "reward transfer failed");
        
        emit RewardsClaimed(msg.sender, rewardsToSend);         // emit event for claiming rewards
    }

    /**
     * @notice Emergency withdraw without caring about rewards
     */

    // function for emergency withdrawal
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        
        require(amount > 0, "no LP tokens to withdraw");           // checks if there are LP tokens to withdraw
        
        // reset user info 
        totalStaked -= amount;              // update total staked amount
        user.amount = 0;                    // reset user amount
        user.startTime = 0;                 // reset start time
        user.rewardDebt = 0;                // reset reward debt
        user.pendingRewards = 0;            // reset pending rewards
        
        // transfer LP tokens back to user
        require(lpToken.transfer(msg.sender, amount), "LP token transfer failed");
        
        emit EmergencyWithdrawn(msg.sender, amount);       // emit event for emergency withdrawal
    }

    /**
     * @notice Calculate boost multiplier based on staking duration
     * @param _user Address of the user
     * @return Boost multiplier (100 = 1x, 150 = 1.5x, etc.)
     */

     // function to calculate boost multiplier based on staking duration
    function calculateBoostMultiplier(address _user) public view returns (uint256) {

        UserInfo storage user = userInfo[_user];               // get the user info
        
        // if user hasn't staked, return base multiplier
        if (user.startTime == 0) {
            return 100; // 1x multiplier                    
        }
        
        uint256 stakingDuration = block.timestamp - user.startTime;    // calculate staking duration
        
        // apply boost based on duration thresholds
        if (stakingDuration >= BOOST_THRESHOLD_3) {
            return 200; // 2x boost for 90+ days

        } else if (stakingDuration >= BOOST_THRESHOLD_2) {
            return 150; // 1.5x boost for 30+ days

        } else if (stakingDuration >= BOOST_THRESHOLD_1) {
            return 120; // 1.2x boost for 7+ days
        } else {

            return 100; // 1x (no boost) for less than 7 days
        }
    }

    /**
     * @notice Update reward rate
     * @param _newRate New reward rate per second
     */

     // function to update the reward rate
    function updateRewardRate(uint256 _newRate) external onlyOwner {
        // update rewards for all users before changing the rate
        updateReward(address(0));
        
        // set new reward rate
        rewardRate = _newRate;
    }

    /**
     * @notice View function to see pending rewards for a user
     * @param _user Address of the user
     * @return Pending reward amount
     */

     // function to view pending rewards for a user
    function pendingRewards(address _user) external view returns (uint256) {
        return earned(_user);
    }
}
