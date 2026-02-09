// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IClawForgeRegistry.sol";

/// @title ClawForge Audit Registry
/// @notice On-chain registry of smart contract security audits as ERC-721 NFTs
/// @dev Each audit report is minted as an NFT with metadata stored on-chain
contract ClawForgeRegistry is ERC721URIStorage, Ownable, IClawForgeRegistry {
    uint256 private _nextTokenId;

    mapping(uint256 => AuditReport) private _audits;
    mapping(bytes32 => uint256[]) private _contractAudits;
    mapping(address => uint256[]) private _auditorAudits;

    uint256 public totalCriticalFindings;
    uint256 public totalHighFindings;
    uint256 public totalAudits;

    constructor() ERC721("ClawForge Audit Report", "CFAR") Ownable(msg.sender) {}

    /// @notice Submit a new audit report and mint it as an NFT
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
    ) external returns (uint256 tokenId) {
        require(overallScore <= 100, "Score must be 0-100");
        require(contractHash != bytes32(0), "Contract hash required");
        require(reportHash != bytes32(0), "Report hash required");

        _nextTokenId++;
        tokenId = _nextTokenId;

        _audits[tokenId] = AuditReport({
            contractHash: contractHash,
            auditedContract: auditedContract,
            criticalCount: criticalCount,
            highCount: highCount,
            mediumCount: mediumCount,
            lowCount: lowCount,
            infoCount: infoCount,
            overallScore: overallScore,
            reportHash: reportHash,
            reportURI: reportURI,
            auditor: msg.sender,
            timestamp: block.timestamp,
            chainId: chainId
        });

        _contractAudits[contractHash].push(tokenId);
        _auditorAudits[msg.sender].push(tokenId);

        totalCriticalFindings += criticalCount;
        totalHighFindings += highCount;
        totalAudits++;

        _mint(msg.sender, tokenId);
        if (bytes(reportURI).length > 0) {
            _setTokenURI(tokenId, reportURI);
        }

        emit AuditSubmitted(
            tokenId,
            contractHash,
            msg.sender,
            overallScore,
            criticalCount,
            highCount
        );

        return tokenId;
    }

    /// @notice Get audit report by token ID
    function getAudit(uint256 tokenId) external view returns (AuditReport memory) {
        require(_ownerOf(tokenId) != address(0), "Audit does not exist");
        return _audits[tokenId];
    }

    /// @notice Get all audit token IDs for a given contract hash
    function getAuditsByContract(bytes32 contractHash) external view returns (uint256[] memory) {
        return _contractAudits[contractHash];
    }

    /// @notice Get all audit token IDs by a specific auditor
    function getAuditsByAuditor(address auditor) external view returns (uint256[] memory) {
        return _auditorAudits[auditor];
    }

    /// @notice Get total number of audits
    function getAuditCount() external view returns (uint256) {
        return totalAudits;
    }

    /// @notice Update the report URI (only token owner)
    function updateReportURI(uint256 tokenId, string calldata newURI) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _setTokenURI(tokenId, newURI);
        emit AuditURIUpdated(tokenId, newURI);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
