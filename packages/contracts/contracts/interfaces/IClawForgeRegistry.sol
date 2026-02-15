// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IClawForgeRegistry — AI Security Agent Registry Interface
/// @notice Defines the interface for ClawForge's on-chain AI agent identity and audit system
/// @dev Inspired by BNB Chain NFA (Non-Fungible Agent) standards for AI agent on-chain identity
interface IClawForgeRegistry {
    enum Severity {
        Info,
        Low,
        Medium,
        High,
        Critical
    }

    /// @notice On-chain identity for an AI security agent
    struct AgentProfile {
        string name;
        string version;
        string capabilities;    // JSON-encoded list of agent capabilities
        uint256 totalAudits;
        uint256 avgScore;       // weighted average score across all audits
        uint256 registeredAt;
        bool active;
    }

    struct AuditReport {
        bytes32 contractHash;
        address auditedContract;
        uint8 criticalCount;
        uint8 highCount;
        uint8 mediumCount;
        uint8 lowCount;
        uint8 infoCount;
        uint8 overallScore;
        bytes32 reportHash;
        string reportURI;
        address auditor;
        uint256 timestamp;
        uint256 chainId;
    }

    event AgentRegistered(address indexed agent, string name, string version);
    event AgentProfileUpdated(address indexed agent, string name, string version);

    event AuditSubmitted(
        uint256 indexed tokenId,
        bytes32 indexed contractHash,
        address indexed auditor,
        uint8 overallScore,
        uint8 criticalCount,
        uint8 highCount
    );

    event AuditURIUpdated(uint256 indexed tokenId, string newURI);

    function registerAgent(
        string calldata name,
        string calldata version,
        string calldata capabilities
    ) external;

    function getAgentProfile(address agent) external view returns (AgentProfile memory);

    function submitAudit(
        bytes32 contractHash,
        address auditedContract,
        uint8 criticalCount,
        uint8 highCount,
        uint8 mediumCount,
        uint8 lowCount,
        uint8 infoCount,
        uint8 overallScore,
        bytes32 reportHash,
        string calldata reportURI,
        uint256 chainId
    ) external returns (uint256 tokenId);

    function getAudit(uint256 tokenId) external view returns (AuditReport memory);
    function getAuditsByContract(bytes32 contractHash) external view returns (uint256[] memory);
    function getAuditsByAuditor(address auditor) external view returns (uint256[] memory);
    function getAuditCount() external view returns (uint256);
    function updateReportURI(uint256 tokenId, string calldata newURI) external;
}
