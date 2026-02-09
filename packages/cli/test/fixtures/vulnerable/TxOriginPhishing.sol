// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TxOriginPhishing {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function sendTo(address payable to, uint amount) public {
        require(tx.origin == owner); // Vulnerable: tx.origin for auth
        to.transfer(amount);
    }
}
