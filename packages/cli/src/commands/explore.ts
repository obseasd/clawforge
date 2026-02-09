import { Command } from "commander";
import { getAuditCount } from "../chain/publisher";
import { logger } from "../utils/logger";

export const exploreCommand = new Command("explore")
  .description("Query on-chain audit data from ClawForge Registry")
  .option("--count", "Get total audit count", false)
  .action(async (options: any) => {
    logger.banner();

    if (options.count) {
      const count = await getAuditCount();
      logger.info(`Total audits on-chain: ${count}`);
    } else {
      const count = await getAuditCount();
      logger.info(`ClawForge Registry — ${count} audits on-chain`);
      logger.info(`Use --count to get the audit count`);
    }
  });
