require("file-loader?name=../index.html!../index.html");

var ko = require("knockout"); 
const Web3 = require("web3");
const Promise = require("bluebird"); 
const truffleContract = require("truffle-contract"); 
const $ = require("jquery");
const splitJson = require("../../build/contracts/Split.json");

if(typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
} else {
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

require("./utils/utils.js"); 

Promise.promisifyAll(web3.eth, {suffix: "Promise"}); 

const Split = truffleContract(splitJson);
Split.setProvider(web3.currentProvider);
window.accountData = [];
let split; 

window.addEventListener('load', () => {
    var accounts; 
 
    return Split.deployed()
        .then(instance => {
            split = instance; 
            return web3.eth.getAccountsPromise();
        })
        .then(accounts => {
            window.coinbase = accounts[0];
            if (accounts.length == 0) {
                throw new Error("No accounts detected.");
            } else {
                window.accounts = accounts;
            }      
            return getAccountData(true);      
        }) 
        .catch(e => {
            window.error = e.message;
            console.log(e.message);            
        })
}); 

const getAccountData = (bind) => {
    window.accountData = []; 
    var promises = [];

    $.each(window.accounts, function( i, address ) {
        promises.push(getAccountDataByAddress(address))
    });    
    return Promise.all(promises).then(function () {
        if(bind)
            bindData();
    }); 
}

const getAccountDataByAddress = (address) => {    
    var contractBalance; 
    var accountBalance; 

    return web3.eth.getBalancePromise(address)
        .then(balance => {
            accountBalance = balance;
            return split.getAccountBalance.call(address);
        })
        .then(balance => {
            contractBalance = balance;
            window.accountData.push({
                address: address,
                accountBalance: accountBalance,
                contractBalance: contractBalance
            });
        });   
}

const bindData = () => {    
    function AccountData(data){
        this.address = ko.observable(data.address);
        this.contractBalance = ko.observable(data.contractBalance);
        this.accountBalance = ko.observable(data.accountBalance);       
        this.amountToSplit = ko.observable();
        this.accountA = ko.observable(); 
        this.accountB = ko.observable(); 
        this.processing = ko.observable(false);
    }

    function AccountDataViewModel() {
        var self = this; 
        self.accounts = ko.observableArray(window.accounts);
        self.accountData = ko.observableArray([]);                

        self.mapData = (data) => {
            return $.map(data, function(item){ return new AccountData(item)}); 
        }

        self.withdraw = (data) => {
            return split.withdraw.sendTransaction({ from: data.address() })
                .then(txHash => {
                    data.processing(true);
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    console.log(receipt); 
                    return getAccountData(false);
                })
                .then(() => {
                    self.accountData(self.mapData(window.accountData));
                });
        }
  
        self.split = (data) => {
            return split.distribute.sendTransaction(data.accountA(), data.accountB(), { from: data.address(), value: data.amountToSplit()})
                .then(txHash => {
                    data.processing(true);
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(receipt => {
                    console.log(receipt);
                    return getAccountData(false);
                })
                .then(() => {
                    self.accountData(self.mapData(window.accountData));
                    data.processing(false);
                });
        }       
        self.accountData(self.mapData(window.accountData));
    }    
    ko.applyBindings(new AccountDataViewModel());    
}

