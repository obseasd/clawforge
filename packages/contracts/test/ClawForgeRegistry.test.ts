import { expect } from "chai";
import { ethers } from "hardhat";
import { ClawForgeRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ClawForgeRegistry", () => {
  let registry: ClawForgeRegistry;
  let owner: SignerWithAddress;
  let auditor1: SignerWithAddress;
  let auditor2: SignerWithAddress;

  const SAMPLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("contract source code"));
  const REPORT_HASH = ethers.keccak256(ethers.toUtf8Bytes("audit report json"));

  beforeEach(async () => {
    [owner, auditor1, auditor2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ClawForgeRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", () => {
    it("should set correct name and symbol", async () => {
      expect(await registry.name()).to.equal("ClawForge Audit Report");
      expect(await registry.symbol()).to.equal("CFAR");
    });

    it("should start with zero audits", async () => {
      expect(await registry.getAuditCount()).to.equal(0);
      expect(await registry.totalAudits()).to.equal(0);
    });

    it("should support ERC-721 interface", async () => {
      // ERC-721 interface ID
      expect(await registry.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });

  describe("submitAudit", () => {
    it("should mint NFT and store audit data", async () => {
      const tx = await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH,
        ethers.ZeroAddress,
        2, 3, 5, 1, 0,
        65,
        REPORT_HASH,
        "https://example.com/report",
        97
      );
      await tx.wait();

      expect(await registry.getAuditCount()).to.equal(1);
      expect(await registry.ownerOf(1)).to.equal(auditor1.address);
      expect(await registry.totalAudits()).to.equal(1);
    });

    it("should emit AuditSubmitted event", async () => {
      await expect(
        registry.connect(auditor1).submitAudit(
          SAMPLE_HASH, ethers.ZeroAddress,
          2, 3, 5, 1, 0, 65, REPORT_HASH, "", 97
        )
      ).to.emit(registry, "AuditSubmitted")
        .withArgs(1, SAMPLE_HASH, auditor1.address, 65, 2, 3);
    });

    it("should revert if score > 100", async () => {
      await expect(
        registry.connect(auditor1).submitAudit(
          SAMPLE_HASH, ethers.ZeroAddress,
          0, 0, 0, 0, 0, 101, REPORT_HASH, "", 97
        )
      ).to.be.revertedWith("Score must be 0-100");
    });

    it("should revert if contractHash is zero", async () => {
      await expect(
        registry.connect(auditor1).submitAudit(
          ethers.ZeroHash, ethers.ZeroAddress,
          0, 0, 0, 0, 0, 80, REPORT_HASH, "", 97
        )
      ).to.be.revertedWith("Contract hash required");
    });

    it("should revert if reportHash is zero", async () => {
      await expect(
        registry.connect(auditor1).submitAudit(
          SAMPLE_HASH, ethers.ZeroAddress,
          0, 0, 0, 0, 0, 80, ethers.ZeroHash, "", 97
        )
      ).to.be.revertedWith("Report hash required");
    });

    it("should increment global finding counters", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        3, 5, 0, 0, 0, 50, REPORT_HASH, "", 97
      );
      expect(await registry.totalCriticalFindings()).to.equal(3);
      expect(await registry.totalHighFindings()).to.equal(5);
    });
  });

  describe("getAudit", () => {
    it("should return complete audit data", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        1, 2, 3, 4, 5, 72, REPORT_HASH,
        "ipfs://QmTest", 56
      );

      const audit = await registry.getAudit(1);
      expect(audit.contractHash).to.equal(SAMPLE_HASH);
      expect(audit.criticalCount).to.equal(1);
      expect(audit.highCount).to.equal(2);
      expect(audit.mediumCount).to.equal(3);
      expect(audit.lowCount).to.equal(4);
      expect(audit.infoCount).to.equal(5);
      expect(audit.overallScore).to.equal(72);
      expect(audit.auditor).to.equal(auditor1.address);
      expect(audit.chainId).to.equal(56);
      expect(audit.reportHash).to.equal(REPORT_HASH);
    });

    it("should revert for non-existent audit", async () => {
      await expect(registry.getAudit(999)).to.be.revertedWith("Audit does not exist");
    });
  });

  describe("getAuditsByContract", () => {
    it("should return all audits for a contract hash", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        1, 0, 0, 0, 0, 80, REPORT_HASH, "", 97
      );
      await registry.connect(auditor2).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        0, 1, 0, 0, 0, 85, REPORT_HASH, "", 97
      );

      const ids = await registry.getAuditsByContract(SAMPLE_HASH);
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1);
      expect(ids[1]).to.equal(2);
    });

    it("should return empty array for unknown hash", async () => {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      const ids = await registry.getAuditsByContract(unknownHash);
      expect(ids.length).to.equal(0);
    });
  });

  describe("getAuditsByAuditor", () => {
    it("should return all audits by a specific auditor", async () => {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("contract2"));
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        0, 0, 0, 0, 0, 100, REPORT_HASH, "", 97
      );
      await registry.connect(auditor1).submitAudit(
        hash2, ethers.ZeroAddress,
        0, 0, 0, 0, 0, 95, REPORT_HASH, "", 97
      );

      const ids = await registry.getAuditsByAuditor(auditor1.address);
      expect(ids.length).to.equal(2);
    });
  });

  describe("updateReportURI", () => {
    it("should allow token owner to update URI", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        0, 0, 0, 0, 0, 100, REPORT_HASH, "old-uri", 97
      );

      await expect(
        registry.connect(auditor1).updateReportURI(1, "ipfs://updated")
      ).to.emit(registry, "AuditURIUpdated").withArgs(1, "ipfs://updated");

      expect(await registry.tokenURI(1)).to.equal("ipfs://updated");
    });

    it("should revert if caller is not token owner", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        0, 0, 0, 0, 0, 100, REPORT_HASH, "", 97
      );

      await expect(
        registry.connect(auditor2).updateReportURI(1, "ipfs://malicious")
      ).to.be.revertedWith("Not token owner");
    });
  });

  describe("ERC-721 transfers", () => {
    it("should allow transfer of audit NFTs", async () => {
      await registry.connect(auditor1).submitAudit(
        SAMPLE_HASH, ethers.ZeroAddress,
        0, 0, 0, 0, 0, 100, REPORT_HASH, "", 97
      );

      await registry.connect(auditor1).transferFrom(
        auditor1.address, auditor2.address, 1
      );
      expect(await registry.ownerOf(1)).to.equal(auditor2.address);
    });
  });
});
