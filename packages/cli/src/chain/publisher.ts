import { ethers } from "ethers";
import { loadConfig } from "../utils/config";

const REGISTRY_ABI = [
  "function submitAudit(bytes32 contractHash, address auditedContract, uint8 criticalCount, uint8 highCount, uint8 mediumCount, uint8 lowCount, uint8 infoCount, uint8 overallScore, bytes32 reportHash, string reportURI, uint256 chainId) external returns (uint256)",
  "function getAudit(uint256 tokenId) external view returns (tuple(bytes32 contractHash, address auditedContract, uint8 criticalCount, uint8 highCount, uint8 mediumCount, uint8 lowCount, uint8 infoCount, uint8 overallScore, bytes32 reportHash, string reportURI, address auditor, uint256 timestamp, uint256 chainId))",
  "function getAuditsByContract(bytes32 contractHash) external view returns (uint256[])",
  "function getAuditsByAuditor(address auditor) external view returns (uint256[])",
  "function getAuditCount() external view returns (uint256)",
  "event AuditSubmitted(uint256 indexed tokenId, bytes32 indexed contractHash, address indexed auditor, uint8 overallScore, uint8 criticalCount, uint8 highCount)",
];

export interface PublishParams {
  contractHash: string;
  auditedContract?: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  overallScore: number;
  reportHash: string;
  reportURI: string;
  chainId: number;
}

export async function publishAudit(params: PublishParams): Promise<{
  txHash: string;
  tokenId: number;
  explorerUrl: string;
}> {
  const config = loadConfig();

  if (!config.privateKey) throw new Error("PRIVATE_KEY not set in .env");
  if (!config.registryAddress) throw new Error("REGISTRY_ADDRESS not set in .env");

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const contract = new ethers.Contract(config.registryAddress, REGISTRY_ABI, wallet);

  const tx = await contract.submitAudit(
    params.contractHash,
    params.auditedContract || ethers.ZeroAddress,
    params.criticalCount,
    params.highCount,
    params.mediumCount,
    params.lowCount,
    params.infoCount,
    params.overallScore,
    params.reportHash,
    params.reportURI,
    params.chainId
  );

  const receipt = await tx.wait();

  // Extract tokenId from event
  let tokenId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === "AuditSubmitted") {
        tokenId = Number(parsed.args[0]);
      }
    } catch {}
  }

  const chainId = (await provider.getNetwork()).chainId;
  const explorerBase = chainId === 56n ? "https://bscscan.com" :
                       chainId === 97n ? "https://testnet.bscscan.com" :
                       "https://opbnbscan.com";

  return {
    txHash: receipt.hash,
    tokenId,
    explorerUrl: `${explorerBase}/tx/${receipt.hash}`,
  };
}

export async function getAuditCount(): Promise<number> {
  const config = loadConfig();
  if (!config.registryAddress) return 0;

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const contract = new ethers.Contract(config.registryAddress, REGISTRY_ABI, provider);
  const count = await contract.getAuditCount();
  return Number(count);
}
