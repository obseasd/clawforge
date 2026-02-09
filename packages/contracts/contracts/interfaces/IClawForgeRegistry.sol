// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IClawForgeRegistry {
    enum Severity {
        Info,
        Low,
        Medium,
        High,
        Critical
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

    event AuditSubmitted(
        uint256 indexed tokenId,
        bytes32 indexed contractHash,
        address indexed auditor,
        uint8 overallScore,
        uint8 criticalCount,
        uint8 highCount
    );

    event AuditURIUpdated(uint256 indexed tokenId, string newURI);

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
