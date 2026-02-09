// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract IntegerOverflow {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value; // No SafeMath in 0.6.0!
    }

    function transfer(address to, uint256 amount) external {
        balances[msg.sender] -= amount; // Can underflow!
        balances[to] += amount;
    }
}
