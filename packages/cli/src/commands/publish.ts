import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { publishAudit } from "../chain/publisher";
import { logger } from "../utils/logger";

export const publishCommand = new Command("publish")
  .description("Publish an audit report on-chain as an NFT on BNB Chain")
  .argument("<report>", "Path to the JSON audit report")
  .option("--chain-id <id>", "Target chain ID", "97")
  .option("--uri <uri>", "Report URI (IPFS or HTTPS)", "")
  .action(async (reportPath: string, options: any) => {
    logger.banner();

    const fullPath = path.resolve(reportPath);
    if (!fs.existsSync(fullPath)) {
      logger.error(`Report not found: ${fullPath}`);
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const summary = report.summary;

    logger.info(`Publishing audit for: ${summary.contractName}`);
    logger.info(`Contract hash: ${summary.contractHash}`);
    logger.info(`Score: ${summary.overallScore}/100`);
    logger.info(`Findings: ${summary.totalFindings} (${summary.critical}C ${summary.high}H ${summary.medium}M ${summary.low}L ${summary.info}I)`);

    logger.phase("Submitting to BNB Chain...");

    try {
      const result = await publishAudit({
        contractHash: summary.contractHash,
        criticalCount: summary.critical,
        highCount: summary.high,
        mediumCount: summary.medium,
        lowCount: summary.low,
        infoCount: summary.info,
        overallScore: summary.overallScore,
        reportHash: summary.reportHash,
        reportURI: options.uri || "",
        chainId: parseInt(options.chainId),
      });

      logger.success("Audit published on-chain!");
      logger.info(`Token ID: #${result.tokenId}`);
      logger.info(`TX Hash: ${result.txHash}`);
      logger.info(`Explorer: ${result.explorerUrl}`);
    } catch (error: any) {
      logger.error(`Failed to publish: ${error.message}`);
      process.exit(1);
    }
  });
