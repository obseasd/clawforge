// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title ReentrancyVault - Vulnerable to reentrancy attack
/// @notice DO NOT USE IN PRODUCTION - Educational example for ClawForge demo
contract ReentrancyVault {
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // VULNERABILITY: State update after external call (reentrancy)
    function withdraw() external {
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // Bug: state updated AFTER external call
        deposits[msg.sender] = 0;
        totalDeposits -= amount;
        emit Withdrawn(msg.sender, amount);
    }

    // VULNERABILITY: No access control on emergency function
    function emergencyDrain(address payable to) external {
        to.transfer(address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
