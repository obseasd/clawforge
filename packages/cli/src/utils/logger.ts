import chalk from "chalk";

export const logger = {
  banner() {
    console.log(chalk.yellow.bold("\n  ╔═══════════════════════════════════════════╗"));
    console.log(chalk.yellow.bold("  ║") + chalk.white.bold("   ClawForge — Smart Contract Auditor    ") + chalk.yellow.bold("║"));
    console.log(chalk.yellow.bold("  ║") + chalk.gray("   AI-Powered Security for BNB Chain      ") + chalk.yellow.bold("║"));
    console.log(chalk.yellow.bold("  ╚═══════════════════════════════════════════╝\n"));
  },

  info(msg: string) {
    console.log(chalk.blue("  ℹ ") + msg);
  },

  phase(name: string) {
    console.log(chalk.yellow("\n  ▸ ") + chalk.yellow.bold(name));
  },

  result(msg: string) {
    console.log(chalk.gray("    ") + msg);
  },

  success(msg: string) {
    console.log(chalk.green("\n  ✔ ") + chalk.green(msg));
  },

  error(msg: string) {
    console.log(chalk.red("  ✘ ") + chalk.red(msg));
  },

  warning(msg: string) {
    console.log(chalk.yellow("  ⚠ ") + chalk.yellow(msg));
  },

  summary(summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    overallScore: number;
  }) {
    console.log(chalk.white.bold("\n  ─── Audit Summary ───────────────────────\n"));

    const scoreColor = summary.overallScore >= 80 ? chalk.green :
                       summary.overallScore >= 60 ? chalk.yellow :
                       chalk.red;

    console.log(`  Safety Score: ${scoreColor.bold(summary.overallScore + "/100")}`);
    console.log(`  Total Findings: ${chalk.white.bold(String(summary.totalFindings))}`);
    console.log("");
    if (summary.critical > 0) console.log(`    ${chalk.red.bold("●")} Critical: ${chalk.red.bold(String(summary.critical))}`);
    if (summary.high > 0) console.log(`    ${chalk.rgb(255, 165, 0).bold("●")} High:     ${chalk.rgb(255, 165, 0).bold(String(summary.high))}`);
    if (summary.medium > 0) console.log(`    ${chalk.yellow.bold("●")} Medium:   ${chalk.yellow.bold(String(summary.medium))}`);
    if (summary.low > 0) console.log(`    ${chalk.blue.bold("●")} Low:      ${chalk.blue.bold(String(summary.low))}`);
    if (summary.info > 0) console.log(`    ${chalk.gray.bold("●")} Info:     ${chalk.gray.bold(String(summary.info))}`);
    console.log("");
  },
};
