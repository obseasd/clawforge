// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title BrokenStaking - Multiple vulnerabilities in a staking contract
/// @notice DO NOT USE IN PRODUCTION - Educational example for ClawForge demo
contract BrokenStaking {
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 rewardDebt;
    }

    address public admin;
    uint256 public rewardRate = 100; // basis points per day
    uint256 public totalStaked;
    mapping(address => Stake) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);

    constructor() {
        admin = msg.sender;
    }

    function stake() external payable {
        require(msg.value > 0, "Cannot stake 0");

        Stake storage s = stakes[msg.sender];
        if (s.amount > 0) {
            s.rewardDebt += _pendingReward(msg.sender);
        }

        s.amount += msg.value;
        s.startTime = block.timestamp;
        totalStaked += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    // VULNERABILITY: Reentrancy — external call before state update
    function unstake() external {
        Stake storage s = stakes[msg.sender];
        require(s.amount > 0, "Nothing staked");

        uint256 reward = _pendingReward(msg.sender) + s.rewardDebt;
        uint256 total = s.amount + reward;

        // External call BEFORE clearing state
        (bool success, ) = msg.sender.call{value: total}("");
        require(success, "Transfer failed");

        // State update after external call — reentrancy!
        totalStaked -= s.amount;
        s.amount = 0;
        s.startTime = 0;
        s.rewardDebt = 0;
        emit Unstaked(msg.sender, total, reward);
    }

    function _pendingReward(address user) internal view returns (uint256) {
        Stake memory s = stakes[user];
        if (s.amount == 0) return 0;
        uint256 duration = block.timestamp - s.startTime;
        return (s.amount * rewardRate * duration) / (10000 * 1 days);
    }

    // VULNERABILITY: No access control — anyone can change reward rate
    function setRewardRate(uint256 newRate) external {
        rewardRate = newRate;
    }

    // VULNERABILITY: tx.origin authentication
    function withdrawFees() external {
        require(tx.origin == admin, "Not admin");
        (bool sent, ) = payable(admin).call{value: address(this).balance}("");
        require(sent);
    }

    function pendingReward(address user) external view returns (uint256) {
        return _pendingReward(user) + stakes[user].rewardDebt;
    }

    receive() external payable {}
}
