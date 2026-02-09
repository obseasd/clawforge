// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title UnsafeOracle - Vulnerable to oracle manipulation & tx.origin auth
/// @notice DO NOT USE IN PRODUCTION - Educational example for ClawForge demo
contract UnsafeOracle {
    address public owner;
    mapping(address => uint256) public tokenPrices;
    mapping(address => uint256) public userBalances;

    event PriceUpdated(address token, uint256 price);
    event Swapped(address user, address token, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // VULNERABILITY: tx.origin for authentication
    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    function updatePrice(address token, uint256 price) external onlyOwner {
        tokenPrices[token] = price;
        emit PriceUpdated(token, price);
    }

    // VULNERABILITY: Single-source price oracle, no TWAP, easily manipulated
    function swap(address token, uint256 amount) external payable {
        uint256 price = tokenPrices[token];
        require(price > 0, "Price not set");

        uint256 tokensOut = (msg.value * 1e18) / price;
        require(tokensOut <= amount, "Slippage exceeded");

        userBalances[msg.sender] += tokensOut;
        emit Swapped(msg.sender, token, tokensOut);
    }

    // VULNERABILITY: Unchecked low-level call
    function withdrawFees(address payable recipient) external onlyOwner {
        (bool sent, ) = recipient.call{value: address(this).balance}("");
        // Missing: require(sent) — return value not checked
    }

    // VULNERABILITY: Delegatecall to user-supplied address
    function upgradeLogic(address newImpl, bytes calldata data) external onlyOwner {
        (bool success, ) = newImpl.delegatecall(data);
        require(success, "Upgrade failed");
    }
}
