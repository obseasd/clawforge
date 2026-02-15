// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IClawForgeRegistry.sol";

/// @title ClawForge AI Security Agent Registry
/// @notice On-chain registry for AI security agents and their audit reports (ERC-721 NFTs)
/// @dev Implements AI agent on-chain identity inspired by BNB Chain NFA standards.
///      Each AI agent registers with capabilities and builds verifiable reputation
///      through audits. Audit reports are minted as NFTs for immutable proof.
contract ClawForgeRegistry is ERC721URIStorage, Ownable, IClawForgeRegistry {
    uint256 private _nextTokenId;

    // Agent identity registry
    mapping(address => AgentProfile) private _agents;
    address[] private _registeredAgents;

    // Audit data
    mapping(uint256 => AuditReport) private _audits;
    mapping(bytes32 => uint256[]) private _contractAudits;
    mapping(address => uint256[]) private _auditorAudits;

    uint256 public totalCriticalFindings;
    uint256 public totalHighFindings;
    uint256 public totalAudits;
    uint256 public totalAgents;

    constructor() ERC721("ClawForge Audit Report", "CFAR") Ownable(msg.sender) {}

    // ═══════════════════════════════════════════════════════════════
    //  AI AGENT IDENTITY
    // ═══════════════════════════════════════════════════════════════

    /// @notice Register an AI agent with on-chain identity and capabilities
    /// @param name Human-readable agent name (e.g. "ClawForge Security Agent")
    /// @param version Agent version string (e.g. "1.0.0")
    /// @param capabilities JSON-encoded capabilities (e.g. '["reentrancy","overflow","ai-logic"]')
    function registerAgent(
        string calldata name,
        string calldata version,
        string calldata capabilities
    ) external {
        require(bytes(name).length > 0, "Agent name required");
        require(bytes(version).length > 0, "Agent version required");

        bool isUpdate = _agents[msg.sender].registeredAt != 0;

        _agents[msg.sender] = AgentProfile({
            name: name,
            version: version,
            capabilities: capabilities,
            totalAudits: _agents[msg.sender].totalAudits,
            avgScore: _agents[msg.sender].avgScore,
            registeredAt: isUpdate ? _agents[msg.sender].registeredAt : block.timestamp,
            active: true
        });

        if (!isUpdate) {
            _registeredAgents.push(msg.sender);
            totalAgents++;
            emit AgentRegistered(msg.sender, name, version);
        } else {
            emit AgentProfileUpdated(msg.sender, name, version);
        }
    }

    /// @notice Get the on-chain profile of a registered AI agent
    function getAgentProfile(address agent) external view returns (AgentProfile memory) {
        require(_agents[agent].registeredAt != 0, "Agent not registered");
        return _agents[agent];
    }

    /// @notice Check if an address is a registered agent
    function isRegisteredAgent(address agent) external view returns (bool) {
        return _agents[agent].registeredAt != 0;
    }

    /// @notice Get all registered agent addresses
    function getRegisteredAgents() external view returns (address[] memory) {
        return _registeredAgents;
    }

    // ═══════════════════════════════════════════════════════════════
    //  AUDIT REPORTS (ERC-721 NFTs)
    // ═══════════════════════════════════════════════════════════════

    /// @notice Submit a new audit report and mint it as an NFT
    /// @dev If the caller is a registered agent, their reputation is updated automatically
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

        // Update agent reputation if caller is a registered agent
        if (_agents[msg.sender].registeredAt != 0) {
            AgentProfile storage agent = _agents[msg.sender];
            uint256 prevTotal = agent.totalAudits;
            agent.avgScore = (agent.avgScore * prevTotal + overallScore) / (prevTotal + 1);
            agent.totalAudits = prevTotal + 1;
        }

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
