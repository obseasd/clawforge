// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title ProxyWallet - Vulnerable proxy/wallet with multiple issues
/// @notice DO NOT USE IN PRODUCTION - Educational example for ClawForge demo
contract ProxyWallet {
    address public owner;
    address public implementation;
    mapping(address => bool) public authorized;
    mapping(address => uint256) public balances;

    event Executed(address indexed target, uint256 value, bytes data);
    event ImplementationUpdated(address indexed newImpl);

    constructor(address _impl) {
        owner = msg.sender;
        implementation = _impl;
        authorized[msg.sender] = true;
    }

    // VULNERABILITY: tx.origin for authentication
    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // VULNERABILITY: Reentrancy + unchecked call
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient");

        // Unchecked low-level call + reentrancy
        (bool success, ) = msg.sender.call{value: amount}("");
        // Return value checked but state updated after
        require(success);

        balances[msg.sender] -= amount;
    }

    // VULNERABILITY: Delegatecall to user-controlled address
    function execute(address target, bytes calldata data) external onlyOwner {
        (bool success, ) = target.delegatecall(data);
        require(success, "Execution failed");
        emit Executed(target, 0, data);
    }

    // VULNERABILITY: No access control on implementation update
    function setImplementation(address newImpl) external {
        implementation = newImpl;
        emit ImplementationUpdated(newImpl);
    }

    // VULNERABILITY: Delegatecall in fallback to mutable implementation
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    // VULNERABILITY: Selfdestruct — anyone can call if authorized
    function destroy() external {
        require(authorized[msg.sender], "Not authorized");
        selfdestruct(payable(owner));
    }

    receive() external payable {}
}
