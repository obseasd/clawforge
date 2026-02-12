import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { runStaticAnalysis } from "../analyzers/static";
import { runAIAnalysis } from "../analyzers/ai";
import { generateReport, deduplicateFindings, ReportFormat } from "../report/generator";
import { computeHash } from "../utils/hash";
import { logger } from "../utils/logger";
import { Finding } from "../analyzers/static/patterns";

export const auditCommand = new Command("audit")
  .description("Analyze a Solidity contract for security vulnerabilities")
  .argument("<file>", "Path to .sol file")
  .option("-o, --output <dir>", "Output directory for reports", "./clawforge-reports")
  .option("-f, --format <type>", "Report format: json, html, both", "both")
  .option("--ai-only", "Skip static analysis, AI only", false)
  .option("--static-only", "Skip AI analysis, static only", false)
  .option("-v, --verbose", "Verbose output", false)
  .action(async (file: string, options: any) => {
    logger.banner();

    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    if (!filePath.endsWith(".sol")) {
      logger.error("Only .sol (Solidity) files are supported");
      process.exit(1);
    }

    const source = fs.readFileSync(filePath, "utf-8");
    const contractName = path.basename(filePath, ".sol");
    const contractHash = computeHash(source);

    logger.info(`Contract: ${contractName}`);
    logger.info(`File: ${filePath}`);
    logger.info(`Hash: ${contractHash}`);
    logger.info(`Lines: ${source.split("\n").length}`);

    const allFindings: Finding[] = [];
    let aiSummary = "";
    let aiScore = 0;

    // Phase 1: Static Analysis
    if (!options.aiOnly) {
      logger.phase("Phase 1 — Static Analysis (10 detectors)");
      const staticFindings = runStaticAnalysis(source, filePath);
      allFindings.push(...staticFindings);
      logger.result(`Found ${staticFindings.length} issue(s) via static analysis`);

      if (options.verbose) {
        staticFindings.forEach((f) => {
          logger.result(`  [${f.severity.toUpperCase()}] ${f.id}: ${f.title} (line ${f.location.line})`);
        });
      }
    }

    // Phase 2: AI Analysis
    if (!options.staticOnly) {
      logger.phase("Phase 2 — AI Deep Analysis (Claude)");
      const aiResult = await runAIAnalysis(source, filePath);
      allFindings.push(...aiResult.findings);
      aiSummary = aiResult.summary;
      aiScore = aiResult.score;
      logger.result(`Found ${aiResult.findings.length} issue(s) via AI analysis`);

      if (options.verbose && aiResult.findings.length > 0) {
        aiResult.findings.forEach((f) => {
          logger.result(`  [${f.severity.toUpperCase()}] ${f.id}: ${f.title} (line ${f.location.line})`);
        });
      }
    }

    // Phase 3: Deduplicate
    const merged = deduplicateFindings(allFindings);
    if (merged.length < allFindings.length) {
      logger.result(`Deduplicated: ${allFindings.length} → ${merged.length} unique findings`);
    }

    // Phase 4: Generate Report
    logger.phase("Phase 3 — Report Generation");
    const report = await generateReport({
      contractName,
      contractHash,
      source,
      findings: merged,
      format: options.format as ReportFormat,
      outputDir: options.output,
      aiSummary,
      aiScore,
    });

    if (report.jsonPath) logger.result(`JSON: ${report.jsonPath}`);
    if (report.htmlPath) logger.result(`HTML: ${report.htmlPath}`);

    // Summary
    logger.summary(report.summary);
    logger.success("Audit complete!");

    if (report.summary.critical > 0 || report.summary.high > 0) {
      logger.warning("Critical/High severity issues found — review before deploying!");
    }

    console.log(`\n  To publish this audit on-chain:`);
    console.log(`  ${path.basename(process.argv[1])} publish ${report.jsonPath}\n`);
  });
