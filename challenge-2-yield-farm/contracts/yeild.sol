// SPDX-License-Identifier: MIT
// This license means anyone can use this code
pragma solidity ^0.8.20;

// Importing the standard token interface
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Main farming contract where users can stake tokens and earn rewards
contract YieldFarm {
    // These never change after deployment:
    IERC20 public immutable L;  // The token users stake (like LP tokens)
    IERC20 public immutable R;  // The reward token users earn
    address public admin;       // The contract manager
    
    // These numbers are packed together to save space:
    uint72 public r;  // Reward rate (how many tokens per second per staked token)
    uint40 public l;  // Last time rewards were calculated
    uint72 public p;  // Current reward per token
    uint72 public t;  // Total tokens currently staked

    // Information we store for each user:
    struct U {
        uint72 a;  // Amount they have staked
        uint40 s;  // When they started staking
        uint72 d;  // Reward debt (used for calculations)
    }
    mapping(address => U) public u;  // Tracks all users' data

    // Events that get logged when important things happen:
    event Staked(address indexed x, uint72 a);    // When someone stakes tokens
    event Withdrawn(address indexed x, uint72 a); // When someone withdraws
    event Claimed(address indexed x, uint72 a);   // When someone claims rewards

    // Setup the farm when deployed
    constructor(address _L, address _R, uint72 _r) {
        L = IERC20(_L);  // Set staking token
        R = IERC20(_R);  // Set reward token
        r = _r;          // Set reward rate
        l = uint40(block.timestamp);  // Set start time
        admin = msg.sender;  // Creator becomes admin
    }

    // Only the admin can call certain functions
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    // Let users lock up their tokens to earn rewards
    function stake(uint72 a) external {
        U storage x = u[msg.sender];
        
        // First calculate and send any pending rewards
        uint72 c = uint72(_update(msg.sender));
        if (c > 0) {
            R.transfer(msg.sender, c);
            emit Claimed(msg.sender, c);
        }
        
        // Then update their staking info:
        x.a += a;  // Add to their stake
        x.s = uint40(block.timestamp);  // Update their start time
        x.d = uint72((x.a*p)/1e18);    // Update their reward debt
        t += a;    // Add to total staked
        
        // Transfer their tokens to the farm
        L.transferFrom(msg.sender, address(this), a);
        emit Staked(msg.sender, a);
    }

    // Let users withdraw their staked tokens
    function withdraw(uint72 a) external {
        U storage x = u[msg.sender];
        require(x.a >= a);  // Can't withdraw more than they have
        
        // First calculate and send any pending rewards
        uint72 c = uint72(_update(msg.sender));
        if (c > 0) {
            R.transfer(msg.sender, c);
            emit Claimed(msg.sender, c);
        }
        
        // Then update their staking info:
        x.a -= a;  // Subtract from their stake
        x.d = uint72((x.a*p)/1e18);  // Update reward debt
        t -= a;    // Subtract from total staked
        
        // Return their tokens
        L.transfer(msg.sender, a);
        emit Withdrawn(msg.sender, a);
    }

    // Internal function to update reward calculations
    function _update(address a) private returns(uint256) {
        p = uint72(_rt());  // Update global reward rate
        l = uint40(block.timestamp);  // Update last calculation time
        
        if (a != address(0)) {
            U storage x = u[a];
            // Calculate how much this user has earned
            uint256 e = (x.a*(p-x.d)*_b(a))/1e20;
            x.d = uint72((x.a*p)/1e18);  // Update their reward debt
            return e;  // Return their earned amount
        }
        return 0;
    }

    // Calculate current reward rate per token
    function _rt() private view returns(uint256) {
        return t == 0 ? p : p + ((block.timestamp-l)*r*1e18)/t;
    }

    // Calculate bonus multiplier based on staking duration
    function _b(address a) private view returns(uint256) {
        U memory x = u[a];
        uint256 d = block.timestamp-x.s;  // How long they've staked
        
        // Longer staking = higher bonus:
        if (d >= 90 days) return 200;  // 2x bonus after 3 months
        if (d >= 30 days) return 150;  // 1.5x after 1 month
        if (d >= 7 days) return 120;   // 1.2x after 1 week
        return 100;                    // No bonus before 1 week
    }

    // Check how many rewards a user can claim
    function pending(address a) external view returns(uint256) {
        U memory x = u[a];
        return (x.a*(_rt()-x.d)*_b(a))/1e20;
    }

    // ADMIN: Change the reward rate
    function updateRate(uint72 _r) external onlyAdmin {
        _update(address(0));  // Update calculations first
        r = _r;  // Set new rate
    }

    // ADMIN: Transfer ownership
    function changeAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}