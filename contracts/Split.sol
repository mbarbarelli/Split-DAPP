pragma solidity ^0.4.8;

contract Split {
    address public owner;
    mapping (address => uint) private balances; 

    event LogDistributed(bool indexed result, address indexed accountA, address indexed accountB, uint amountA, uint amountB); 
    event LogBalanceWithdrawn(bool indexed result, address indexed account, uint indexed amountWithdrawn); 
    event LogSplitDestroyed(bool indexed result, address indexed destroyer);

    function Split() payable {
        owner = msg.sender;
    }

    modifier require(bool condition) {
        if (!condition) throw;
        _;
    }
    
    function distribute(address accountA, address accountB) 
        require(msg.value > 0)        
        require(((msg.value / 2) * 2) == msg.value)
        require((accountA != address(0x0)) && (accountB != address(0x0)))
        payable 
        returns (bool)
    {
        uint256 value = msg.value / 2; 
        balances[accountA] += value; 
        balances[accountB] += value; 
        LogDistributed(true, accountA, accountB, balances[accountA], balances[accountB]); 
        return true;
    }
    
    function withdraw() returns (bool) {
        uint amount = balances[msg.sender];
        balances[msg.sender] = 0; 
        if(msg.sender.send(amount)){
            LogBalanceWithdrawn(true, msg.sender, amount);
            return true;
        } else {
            balances[msg.sender] = amount;
            LogBalanceWithdrawn(false, msg.sender, 0);           
            return false; 
        }
    }

    function getAccountBalance(address account) returns (uint) {
         return balances[account];
    }

    function getMyBalance() returns (uint) {
         return balances[msg.sender];
    }

    function killMe() require (msg.sender == owner) returns (bool) {
        LogSplitDestroyed(true, owner);
        selfdestruct(owner);
        return true;        
    }

    function () {
        throw;
    }
}
