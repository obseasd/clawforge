// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

/// @title WeakToken - Vulnerable to integer overflow (pre-0.8.0)
/// @notice DO NOT USE IN PRODUCTION - Educational example for ClawForge demo
contract WeakToken {
    string public name = "WeakToken";
    string public symbol = "WEAK";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
    }

    // VULNERABILITY: Integer overflow (no SafeMath, solidity <0.8.0)
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value; // Can overflow in Solidity <0.8.0
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // VULNERABILITY: Integer overflow in transferFrom
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value; // Can overflow
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    // VULNERABILITY: No access control — anyone can mint
    function mint(address to, uint256 amount) public {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // VULNERABILITY: Selfdestruct allows draining contract
    function destroy() public {
        selfdestruct(payable(msg.sender));
    }
}
