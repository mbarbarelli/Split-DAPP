pragma solidity ^0.4.8;

contract Split {
    address public owner;
    uint256 public value;
    mapping (address => uint) public balances; 

    event Distributed(bool result, address accountA, address accountB, uint amountA, uint amountB); 
    event BalanceWithdrawn(bool result, address account, uint amountWithdrawn); 
    event SplitDestroyed(bool result, address destroyer);

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
        value = msg.value / 2; 
        balances[accountA] += value; 
        balances[accountB] += value; 
        Distributed(true, accountA, accountB, balances[accountA], balances[accountB]); 
        return true;
    }
    
    function withdraw() returns (bool) {
        var amount = balances[msg.sender];
        balances[msg.sender] = 0; 
        if(msg.sender.send(amount)){
            BalanceWithdrawn(true, msg.sender, amount);
            return true;
        } else {
            balances[msg.sender] = amount;
            BalanceWithdrawn(false, msg.sender, 0);           
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
        SplitDestroyed(true, owner);
        selfdestruct(owner);
        return true;        
    }

    function () {
        throw;
    }
}
