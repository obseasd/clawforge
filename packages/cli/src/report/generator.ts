import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import { Finding, Severity } from "../analyzers/static/patterns";
import { computeHash } from "../utils/hash";
import { calculateScore, countBySeverity } from "./severity";

export type ReportFormat = "json" | "html" | "both";

export interface ReportInput {
  contractName: string;
  contractHash: string;
  source: string;
  findings: Finding[];
  format: ReportFormat;
  outputDir: string;
  aiSummary?: string;
  aiScore?: number;
}

export interface ReportSummary {
  contractName: string;
  contractHash: string;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  overallScore: number;
  reportHash: string;
}

export interface ReportOutput {
  outputPath: string;
  summary: ReportSummary;
  jsonPath?: string;
  htmlPath?: string;
}

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}:${f.location.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  fs.mkdirSync(input.outputDir, { recursive: true });

  const summary: ReportSummary = {
    contractName: input.contractName,
    contractHash: input.contractHash,
    totalFindings: input.findings.length,
    critical: countBySeverity(input.findings, Severity.Critical),
    high: countBySeverity(input.findings, Severity.High),
    medium: countBySeverity(input.findings, Severity.Medium),
    low: countBySeverity(input.findings, Severity.Low),
    info: countBySeverity(input.findings, Severity.Info),
    overallScore: calculateScore(input.findings),
    reportHash: "",
  };

  const reportData = {
    version: "1.0.0",
    tool: "ClawForge",
    timestamp: new Date().toISOString(),
    summary,
    findings: input.findings,
    aiSummary: input.aiSummary || "",
  };

  summary.reportHash = computeHash(JSON.stringify(reportData));

  const result: ReportOutput = { outputPath: input.outputDir, summary };

  // JSON report
  if (input.format === "json" || input.format === "both") {
    const jsonPath = path.join(input.outputDir, `${input.contractName}-audit.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
    result.jsonPath = jsonPath;
  }

  // HTML report
  if (input.format === "html" || input.format === "both") {
    const templatePath = path.join(__dirname, "templates", "report.html");
    let html: string;

    if (fs.existsSync(templatePath)) {
      const templateSrc = fs.readFileSync(templatePath, "utf-8");
      const template = Handlebars.compile(templateSrc);
      html = template({ ...reportData, summary });
    } else {
      html = generateFallbackHTML(reportData, summary);
    }

    const htmlPath = path.join(input.outputDir, `${input.contractName}-audit.html`);
    fs.writeFileSync(htmlPath, html);
    result.htmlPath = htmlPath;
  }

  return result;
}

function generateFallbackHTML(data: any, summary: ReportSummary): string {
  const severityBadge = (s: string) => {
    const colors: Record<string, string> = {
      critical: "#dc2626", high: "#ea580c", medium: "#eab308", low: "#3b82f6", info: "#6b7280"
    };
    return `<span style="background:${colors[s] || "#6b7280"};color:white;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;text-transform:uppercase">${s}</span>`;
  };

  const findingsHTML = data.findings.map((f: Finding, i: number) => `
    <div style="border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:12px;background:#1a1a2e">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="margin:0;color:#e0e0e0">${f.id} — ${f.title}</h3>
        ${severityBadge(f.severity)}
      </div>
      <p style="color:#aaa;margin:8px 0">${f.description}</p>
      ${f.snippet ? `<pre style="background:#0d0d1a;padding:12px;border-radius:4px;overflow-x:auto;color:#7dd3fc;font-size:13px"><code>Line ${f.location.line}: ${f.snippet}</code></pre>` : ""}
      <p style="color:#4ade80;margin:8px 0"><strong>Fix:</strong> ${f.recommendation}</p>
      <p style="color:#666;font-size:12px">Detector: ${f.detector} | Confidence: ${f.confidence}</p>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClawForge Audit — ${summary.contractName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0f0f23;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px;max-width:900px;margin:0 auto}h1{color:#facc15;margin-bottom:8px}h2{color:#facc15;margin:32px 0 16px;border-bottom:1px solid #333;padding-bottom:8px}</style></head>
<body>
<h1>ClawForge Audit Report</h1>
<p style="color:#888;margin-bottom:32px">${summary.contractName} — ${data.timestamp}</p>

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px">
  <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center">
    <div style="font-size:36px;font-weight:bold;color:${summary.overallScore >= 80 ? '#4ade80' : summary.overallScore >= 60 ? '#facc15' : '#ef4444'}">${summary.overallScore}</div>
    <div style="color:#888;font-size:14px">Safety Score</div>
  </div>
  <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center">
    <div style="font-size:36px;font-weight:bold;color:#e0e0e0">${summary.totalFindings}</div>
    <div style="color:#888;font-size:14px">Total Findings</div>
  </div>
  <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center">
    <div style="font-size:36px;font-weight:bold;color:#dc2626">${summary.critical + summary.high}</div>
    <div style="color:#888;font-size:14px">Critical + High</div>
  </div>
</div>

<div style="display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap">
  <span style="background:#dc2626;color:white;padding:4px 12px;border-radius:4px">Critical: ${summary.critical}</span>
  <span style="background:#ea580c;color:white;padding:4px 12px;border-radius:4px">High: ${summary.high}</span>
  <span style="background:#eab308;color:black;padding:4px 12px;border-radius:4px">Medium: ${summary.medium}</span>
  <span style="background:#3b82f6;color:white;padding:4px 12px;border-radius:4px">Low: ${summary.low}</span>
  <span style="background:#6b7280;color:white;padding:4px 12px;border-radius:4px">Info: ${summary.info}</span>
</div>

${data.aiSummary ? `<div style="background:#1a1a2e;padding:20px;border-radius:8px;margin-bottom:32px;border-left:4px solid #facc15"><h3 style="color:#facc15;margin-bottom:8px">AI Assessment</h3><p style="color:#ccc">${data.aiSummary}</p></div>` : ""}

<h2>Findings</h2>
${findingsHTML || '<p style="color:#4ade80">No vulnerabilities found.</p>'}

<p style="color:#555;margin-top:32px;font-size:12px;text-align:center">
  Generated by ClawForge v${data.version} | Contract Hash: ${summary.contractHash}
  <br>Report Hash: ${summary.reportHash}
</p>
</body></html>`;
}
