var Split = artifacts.require("./Split.sol"); 
require("./utils/utils.js");

contract("Split contract", (accounts) => {

    var owner = accounts[0]; 
    var account_one = accounts[1]; 
    var account_two = accounts[2]; 
    var owner_balance_start, owner_balance_end;
    var account_one_wei_balance_start, account_two_wei_balance_start; 
    var account_one_wei_balance_end, account_two_wei_balance_end;
    var account_one_contract_balance_start, account_two_contract_balance_start;
    var account_one_contract_balance_start, account_two_contract_balance_start;       
    
    var split_address;
    var events; 
    let split;    

    before("Split contract must be deployed", () =>{
        return Split.new({ from: owner })
            .then(instance => {
                split = instance; 
                split_address = instance.contract.address;      
                console.log("Split contract deployed at: " + split_address);           
            })
            .catch(console.error);
    }); 

    it("Split contract should start with zero balance", () => {
        web3.eth.getBalance(split_address, (err, _balance) => {
            balance = _balance;
            assert.equal(balance, 0, "Starting balance of contract should be zero"); 
        });
    });

    it("Beneficiary accounts should start with zero balance", () => {
        return split.getAccountBalance.call(account_one)
            .then(balance => {
                account_one_contract_balance_start = balance; 
                assert.equal(account_one_contract_balance_start, 0, "Account one starting contract balance should be zero.");
                return split.getAccountBalance.call(account_two)
            })
            .then(balance => {
                account_two_contract_balance_start = balance; 
                assert.equal(account_two_contract_balance_start, 0, "Account two starting contract balance should be zero.");
            })
    })

    it("Should throw if amount to distribute is invalid", () => {
        var invalid_amount1 = 0;
        var invalid_amount2 = -1; 
        var gas_to_use = 30000;

        web3.eth.getBalance(owner, (err, _balance) => {
            owner_balance_start = _balance.toNumber();
        });

        return web3.eth.expectedExceptionPromise(() => {
            return split.distribute(account_one, account_two, {
                from: owner, 
                value: invalid_amount1
            });
        }, gas_to_use)
        .then(() => {
            return web3.eth.expectedExceptionPromise(() =>{
                return split.distribute(account_one, account_two, {
                    from: owner, 
                    value: invalid_amount2
                });
            }, gas_to_use)
        })
        .then(() => {
            web3.eth.getBalance(owner, (err, _balance) => {
                owner_balance_end = _balance.toNumber();
                console.log("owner balance. start: " + owner_balance_start + " end: " + owner_balance_end + '\n');   
            });            
        })    
    });

    it("Should throw if address to distribute to is invalid", () => {
        var invalid_address1 = "0x0"; 
        var gas_to_use = 30000; 
        var wei_to_distribute = 2;       
        
        web3.eth.getBalance(owner, (err, _balance) => {
            owner_balance_start = _balance.toNumber();
        });         

        return web3.eth.expectedExceptionPromise(() => {
            return split.distribute(account_one, invalid_address1, {
                from: owner, 
                value: web3.toWei(wei_to_distribute, "ether")
            });
        }, gas_to_use)
        .then(() => {
            return web3.eth.expectedExceptionPromise(() => {
                return split.distribute(account_one, undefined, {
                    from: owner, 
                    value: web3.toWei(wei_to_distribute, "ether")
                    });
                }, gas_to_use);
        })         
        .then(() => {
            web3.eth.getBalance(owner, (err, _balance) => {
                owner_balance_end = _balance.toNumber();
                console.log("owner balance. start: " + owner_balance_start + " end: " + owner_balance_end + '\n');   
            });                
        })                          
    });

    it("Should throw if value to distribute cannot be evenly split", () => {
        var gas_to_use = 300000; 
        var wei_to_distribute = 1001;       

        web3.eth.getBalance(owner, (err, _balance) => {
            owner_balance_start = _balance.toNumber();
        });                  

        return web3.eth.expectedExceptionPromise(() => {
            return split.distribute(account_one, account_two, {
                from: owner, 
                value: wei_to_distribute
            });
        }, gas_to_use)
        .then(() => {
            web3.eth.getBalance(owner, (err, _balance) => {
                owner_balance_end = _balance.toNumber();
                console.log("owner balance. start: " + owner_balance_start + " end: " + owner_balance_end + '\n');   
            });                
        })      
    });

    it("Should distribute funds correctly and correct amounts should be withdrawn successfully.", () => {     
        var wei_to_distribute = 4000000000000000000;
        var split_amount = wei_to_distribute / 2; 
        var distribute_gas_used;
        var withdrawal_gas_used;

        web3.eth.getBalance(owner, (err, _balance) =>{
            owner_balance_start = _balance.toNumber();
        }); 

        web3.eth.getBalance(account_one, (err, _balance) =>{
            account_one_wei_balance_start = _balance;
        }); 

        web3.eth.getBalance(account_two, (err, _balance) =>{
            account_two_wei_balance_start = _balance;
        });                 

        return split.getAccountBalance.call(account_one)
            .then(balance => {
                account_one_contract_balance_start = balance; 
                assert.equal(account_one_contract_balance_start, 0, "Account one starting contract balance should be zero.");
                return split.getAccountBalance.call(account_two)
            })
            .then(balance => {
                account_two_contract_balance_start = balance; 
                assert.equal(account_two_contract_balance_start, 0, "Account two starting contract balance should be zero.");
                return split.distribute(account_one, account_two, { 
                    from: owner, 
                    value: wei_to_distribute
                })
            })
            .then(txObj => {
                return web3.eth.getTransactionReceiptMined(txObj.tx)
            })
            .then(receipt => {
                distribute_gas_used = receipt.gasUsed;
                events = split.Distributed().formatter(receipt.logs[0]).args;
                assert.isTrue(events.result, "Distribution event should report successful operation."); 
                assert.equal(account_one, events.accountA, "AccountA address should match account_one address"); 
                assert.equal(account_two, events.accountB, "AccountB address should match account_two address."); 
                assert.equal(events.amountA, split_amount, "Logged split amount and expected split amount should match for account 1.");
                assert.equal(events.amountB, split_amount, "Logged split amount and expected split amount should match for account 2.");

                // Contract balance for accounts 1 and 2 are checked.
                return split.getAccountBalance.call(account_one)
            })
            .then(balance => {
                account_one_contract_balance_end = balance; 
                assert.equal(account_one_contract_balance_end, split_amount, "Account one contract balance does not equal split amount.");
                return split.getAccountBalance.call(account_two)
            })
            .then(balance => {
                account_two_contract_balance_end = balance; 
                assert.equal(account_two_contract_balance_end, split_amount, "Account two contract balance does not equal split amount.");
                web3.eth.getBalance(account_one, (err, _balance) => {
                    account_one_wei_balance_start = _balance; 
                })
                // Withdrawal for Account 1
                return split.withdraw({from: account_one});
            })
            .then(txObj => {
                return web3.eth.getTransactionReceiptMined(txObj.tx);
            })
            .then(receipt => {
                events = split.BalanceWithdrawn().formatter(receipt.logs[0]).args; 
                withdrawal_gas_used = receipt.gasUsed; 

                assert.isTrue(events.result, "Event log does not indicate successful withdrawal for account one.");
                assert.equal(events.account, account_one, "Account one does not match account address that made withdrawal.");
                assert.equal(events.amountWithdrawn.valueOf(), account_one_contract_balance_end.valueOf(), "Amount withdrawn for account 1 does not match amount expected from contract balance.");
                
                web3.eth.getBalance(account_one, (err, _balance) => {
                    account_one_wei_balance_end = _balance;
                    var balance_increase_account_one = (account_one_wei_balance_end.valueOf() - account_one_wei_balance_start.valueOf()) 
                    var balance_increase_and_gas_used_acc1 = balance_increase_account_one + distribute_gas_used + withdrawal_gas_used;
                    assert.equal(Number(web3.fromWei(split_amount - balance_increase_and_gas_used_acc1, "ether")).toFixed(2), 0, "Amount withdrawn for account 1 does not equal split amount.");
                });

                return split.withdraw({ from: account_two })                    
            })
            .then(txObj => {
                return web3.eth.getTransactionReceiptMined(txObj.tx);
            })
            .then(receipt => {
                withdrawal_gas_used = receipt.gasUsed; 

                events = split.BalanceWithdrawn().formatter(receipt.logs[0]).args; 
                assert.equal(events.account, account_two, "Account two does not match account address that made withdrawal.");
                assert.isTrue(events.result, "Event log does not indicate successful withdrawal for account two.");
                assert.equal(events.amountWithdrawn.valueOf(), account_two_contract_balance_end.valueOf(), "Amount withdrawn for account 2 does not match amount expected from contract balance.");

                web3.eth.getBalance(account_two, (err, _balance) => {
                    account_two_wei_balance_end = _balance; 
                    var balance_increase_account_two = (account_two_wei_balance_end.valueOf() - account_two_wei_balance_start.valueOf())
                    var balance_increase_and_gas_used_acc2 = balance_increase_account_two + distribute_gas_used + withdrawal_gas_used; 
                    assert.equal(Number(web3.fromWei(split_amount - balance_increase_and_gas_used_acc2, "ether")).toFixed(2), 0, "Amount withdrawn for account 2 does not equal split amount.");
                });
            })
    });

    it("Should self destruct contract", () => {
        return split.killMe({ from: owner })
            .then(txObj => {
                return web3.eth.getTransactionReceiptMined(txObj.tx)
            })
            .then(receipt => {
                events = split.SplitDestroyed().formatter(receipt.logs[0]).args; 
                assert.isTrue(events.result, "Self destruct attempt should return true."); 
                assert.equal(events.destroyer.valueOf(), owner, "Contract self-destruct caller should be owner");
                return split.owner()
            })
            .then(result => {
                assert.equal(result, '0x', "The contract owner should have been deleted");
            })
    })

    describe("Individual balance request test", () => {
        let split;
        before("Ensure that contract balances are refreshed", () => {
            return Split.new({ from: owner })
                .then(instance => {
                    split = instance; 
                })
        })
        it("Should execute an individual balance request correctly", () => {
            var split_amount = 2000000000000000000; 
            var wei_to_distribute = 4000000000000000000;
            return split.distribute(account_one, account_two, { from: owner, value: wei_to_distribute })
                .then(txObj => {
                    return web3.eth.getTransactionReceiptMined(txObj.tx);
                })
                .then(receipt => {
                    return split.getMyBalance.call({ from: account_one })
                })
                .then(balance => {
                    assert.equal(balance, split_amount, "Individual balance query for account one retreived unexpected amount: " + balance);
                    return split.getMyBalance.call({from: account_two})
                })
                .then(balance => {
                    assert.equal(balance, split_amount, "Individual blance query for account two retreived unexpected amount: " + balance);
                })                
        });
    });
});