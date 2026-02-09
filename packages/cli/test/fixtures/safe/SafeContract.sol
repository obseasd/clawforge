// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeContract is Ownable, ReentrancyGuard {
    mapping(address => uint) public balances;

    constructor() Ownable(msg.sender) {}

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // Safe: uses checks-effects-interactions + ReentrancyGuard
    function withdraw() external nonReentrant {
        uint amount = balances[msg.sender];
        require(amount > 0, "No balance");
        balances[msg.sender] = 0; // State update BEFORE call
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Safe: has access control
    function setFee(uint newFee) external onlyOwner {
        require(newFee <= 100, "Fee too high");
    }
}
