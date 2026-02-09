// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DelegatecallVuln {
    address public implementation;
    uint public value;

    function setImplementation(address _impl) public {
        implementation = _impl;
    }

    function execute(bytes memory data) public {
        // Delegatecall to user-controlled address
        implementation.delegatecall(data);
    }
}
