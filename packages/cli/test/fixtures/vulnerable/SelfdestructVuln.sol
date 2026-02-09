// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SelfdestructVuln {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function destroy() public {
        require(msg.sender == owner);
        selfdestruct(payable(owner)); // Dangerous: can destroy contract
    }
}
