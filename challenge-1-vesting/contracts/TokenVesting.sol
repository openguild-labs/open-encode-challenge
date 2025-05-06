// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TokenVesting is Ownable(msg.sender), Pausable, ReentrancyGuard {

    address Owner;
   
    // Token being vested
    IERC20 public Vestings;
    IERC20 internal Staked;
    IERC20 internal Vested;

    //Vesting schedule for each beneficiary
    struct VestingSchedule {
    uint256 totalAmount;
    uint256 startTime;
    uint256 cliffDuration;
    uint256 vestingDuration;
    uint256 amountClaimed;
    string  Token;
    bool revokedStatus;
    }

    //Mapping from beneficiary to vesting schedule created
    mapping(address=>VestingSchedule) public beneficiaryScheduled;

    //Whitelist of beneficiaries
    mapping(address=>bool) public beneficiaryWhitelist;

    // Events
    event VestingScheduleCreated(address indexed beneficiary, string token, uint256 amount); 
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event BeneficiaryWhitelisted(address indexed beneficiary); 
    event BeneficiaryRemovedFromWhitelist(address indexed beneficiary); 

    //constructor functions assigns the actual token addresses to the instances created
    constructor(address _vst, address _stk, address _ves){
        Vestings = IERC20(_vst);
        Staked = IERC20(_stk);
        Vested = IERC20(_ves);

        Owner = msg.sender;
    }

    // Modifier to check if beneficiary is whitelisted
    modifier onlyWhitelisted(address beneficiary) {
        require(beneficiaryWhitelist[beneficiary], "Beneficiary not whitelisted");
        _;
    }

    function addToWhitelist(address beneficiary) external onlyOwner {
        require(beneficiary != address(0), "Invalid address");
        beneficiaryWhitelist[beneficiary] = true;
        emit BeneficiaryWhitelisted(beneficiary);
    }

    function removeFromWhitelist(address beneficiary) external onlyOwner {
        beneficiaryWhitelist[beneficiary] = false;
        emit BeneficiaryRemovedFromWhitelist(beneficiary);
    }


    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime,
        string calldata tokenChoice
    ) external onlyOwner onlyWhitelisted(beneficiary) whenNotPaused {
        //Validation
        require(amount > 0,'Stake amount greater than 0');
        require( beneficiary != address(0), 'Enter correct address');
        require( vestingDuration > cliffDuration, "Enter a valid Vesting duration [Vesting duration must be greater than Cliff duration]");
        require(vestingDuration > 0,"Vesting duration must be greater that 0");

        //Effects
        if(startTime == 0 || startTime <= block.timestamp){
            startTime = block.timestamp;
        }

        //Interactions
         //For mutiple token transfer I used an implict references for each token => ['USDT','USDC','DAI']. They could be picked fron a list on the 
        //  interface and then a transaction is senn to this function with that string in calldata, to enable with the conditional logic of calling 
        // the trasferFrom method from the correct ERC20 contract 
        if(bytes32(bytes(tokenChoice)) == bytes32('VST')) {
            Vestings.transferFrom(msg.sender, address(this),amount);
        }else if(bytes32(bytes(tokenChoice)) == bytes32('STK')){
            Staked.transferFrom(msg.sender, address(this), amount);
        } else if(bytes32(bytes(tokenChoice)) == bytes32('VES')) {
            Vested.transferFrom(msg.sender, address(this),amount);
        } else {
            revert('Please choose one of these ["VST","STK","VES"]');
        }

        //Note: This is an effect (simply a state mutability statemet) but it is necessary that it comes after an interaction of the contract with external 
        // signers, because its records determine how much tokens to a particular beneficiary is released later on. Even though it might jeopardise the 
        // reentracy guard of the contract coming after transfer, the risk of registering a Schedule and not sending actual tokens is just as high. So just incase a 
        // wrong token's transfer is attempted or somehow the transfer fails, the contract shouldn't create a Vesting Schedule, instead it should revert without the line below being executed.
       
        beneficiaryScheduled[beneficiary] = VestingSchedule(amount,startTime,cliffDuration,vestingDuration,0,tokenChoice,false);

        emit VestingScheduleCreated(beneficiary, tokenChoice, amount);
    }

    function calculateVestedAmount() public view returns (uint256) {
        require(beneficiaryWhitelist[msg.sender],"Please connect with the vesting address");
        require(!beneficiaryScheduled[msg.sender].revokedStatus,"Please initiate a vesting schedule");
        
        address beneficiary = msg.sender;

        if(block.timestamp <= beneficiaryScheduled[beneficiary].startTime + beneficiaryScheduled[beneficiary].cliffDuration){
                return 0;
            }

        if(block.timestamp >= beneficiaryScheduled[beneficiary].startTime + beneficiaryScheduled[beneficiary].vestingDuration){
                return beneficiaryScheduled[beneficiary].totalAmount;

            }
        
        uint timeCount =  block.timestamp - beneficiaryScheduled[beneficiary].cliffDuration;

        return (beneficiaryScheduled[beneficiary].totalAmount * timeCount) / beneficiaryScheduled[beneficiary].vestingDuration;
            
    }

    function claimVestedTokens() external nonReentrant whenNotPaused {
        require(beneficiaryWhitelist[msg.sender],"Please connect with the vesting address");
        require(!beneficiaryScheduled[msg.sender].revokedStatus,"Please initiate a vesting schedule");
        require(beneficiaryScheduled[msg.sender].amountClaimed < beneficiaryScheduled[msg.sender].totalAmount ,"All claimable amount has been withdrawn");

        uint claimableAmount = calculateVestedAmount() - beneficiaryScheduled[msg.sender].amountClaimed;
        beneficiaryScheduled[msg.sender].amountClaimed = claimableAmount;

        require(claimableAmount > 0,"All claimble tokens have been claimed");

        string memory VestedToken =  beneficiaryScheduled[msg.sender].Token;

        if(bytes32(bytes(VestedToken)) == bytes32('VST')){
            require(Vestings.transfer(msg.sender,claimableAmount),'Transaction failed');

        } else if(bytes32(bytes(VestedToken)) == bytes32('STK')){
            require(Staked.transfer(msg.sender,claimableAmount),'Transaction failed');

        } else {
            require(Vested.transfer(msg.sender,claimableAmount),'Transaction failed');

        }

        emit TokensClaimed(msg.sender, claimableAmount);
    }

    function revokeVesting() external onlyOwner {
        require(beneficiaryWhitelist[msg.sender],"Please connect with the vesting address");
        require(!beneficiaryScheduled[msg.sender].revokedStatus,"No vesting schedule found");
        
        uint Unvested = beneficiaryScheduled[msg.sender].totalAmount - calculateVestedAmount();
        string memory VestedToken =  beneficiaryScheduled[msg.sender].Token;
        
        if (Unvested > 0){
              if(bytes32(bytes(VestedToken)) == bytes32('VST')){
            require(Vestings.transfer(msg.sender,Unvested),'Transaction failed');

             } else if(bytes32(bytes(VestedToken)) == bytes32('STK')){
            require(Staked.transfer(msg.sender,Unvested),'Transaction failed');

            } else {
            require(Vested.transfer(msg.sender,Unvested),'Transaction failed'); }
   }

        beneficiaryScheduled[msg.sender].revokedStatus = true;

        emit VestingRevoked(msg.sender);
    }

    function Pause() external onlyOwner {
        _pause();
    }

    function Unpause() external onlyOwner {
        _unpause();
    }

}

