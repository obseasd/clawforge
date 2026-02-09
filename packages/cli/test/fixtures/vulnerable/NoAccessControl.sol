// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NoAccessControl {
    uint public price;
    bool public paused;
    mapping(address => uint) public balances;

    function setPrice(uint newPrice) external {
        // Missing access control! Anyone can set the price
        price = newPrice;
    }

    function mint(address to, uint amount) public {
        // Missing access control! Anyone can mint
        balances[to] += amount;
    }

    function pause() external {
        paused = true;
    }
}
