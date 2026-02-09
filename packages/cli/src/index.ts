import { Command } from "commander";
import { auditCommand } from "./commands/audit";
import { publishCommand } from "./commands/publish";
import { exploreCommand } from "./commands/explore";

export const program = new Command();

program
  .name("clawforge")
  .description("ClawForge — AI-Powered Smart Contract Security Auditor for BNB Chain")
  .version("1.0.0");

program.addCommand(auditCommand);
program.addCommand(publishCommand);
program.addCommand(exploreCommand);
