// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract YieldFarm {
    // Immutable state (1 slot)
    IERC20 public immutable L;
    IERC20 public immutable R;
    address public admin;
    
    // Packed state (1 slot)
    uint72 public r;  // rate (supports up to 4.7M tokens/year)
    uint40 public l;  // lastUpdate (works until year 34,000)
    uint72 public p;  // rewardPerTokenStored
    uint72 public t;  // totalStaked

    // User storage (1 slot)
    struct U {
        uint72 a;  // amount (4.7M max)
        uint40 s;  // startTime
        uint72 d;  // rewardDebt
    }
    mapping(address => U) public u;

    event Staked(address indexed x, uint72 a);
    event Withdrawn(address indexed x, uint72 a);
    event Claimed(address indexed x, uint72 a);

    constructor(address _L, address _R, uint72 _r) {
        L = IERC20(_L);
        R = IERC20(_R);
        r = _r;
        l = uint40(block.timestamp);
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    function stake(uint72 a) external {
        U storage x = u[msg.sender];
        uint72 c = uint72(_update(msg.sender));
        if (c > 0) {
            R.transfer(msg.sender, c);
            emit Claimed(msg.sender, c);
        }
        x.a += a;
        x.s = uint40(block.timestamp);
        x.d = uint72((x.a*p)/1e18);
        t += a;
        L.transferFrom(msg.sender, address(this), a);
        emit Staked(msg.sender, a);
    }

    function withdraw(uint72 a) external {
        U storage x = u[msg.sender];
        require(x.a >= a);
        uint72 c = uint72(_update(msg.sender));
        if (c > 0) {
            R.transfer(msg.sender, c);
            emit Claimed(msg.sender, c);
        }
        x.a -= a;
        x.d = uint72((x.a*p)/1e18);
        t -= a;
        L.transfer(msg.sender, a);
        emit Withdrawn(msg.sender, a);
    }

    function _update(address a) private returns(uint256) {
        p = uint72(_rt());
        l = uint40(block.timestamp);
        if (a != address(0)) {
            U storage x = u[a];
            uint256 e = (x.a*(p-x.d)*_b(a))/1e20;
            x.d = uint72((x.a*p)/1e18);
            return e;
        }
        return 0;
    }

    function _rt() private view returns(uint256) {
        return t == 0 ? p : p + ((block.timestamp-l)*r*1e18)/t;
    }

    function _b(address a) private view returns(uint256) {
        U memory x = u[a];
        uint256 d = block.timestamp-x.s;
        return d >= 90 days ? 200 : d >= 30 days ? 150 : d >= 7 days ? 120 : 100;
    }

    function pending(address a) external view returns(uint256) {
        U memory x = u[a];
        return (x.a*(_rt()-x.d)*_b(a))/1e20;
    }

    function updateRate(uint72 _r) external onlyAdmin {
        _update(address(0));
        r = _r;
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}