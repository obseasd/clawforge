import { Detector, Finding, Severity } from "../patterns";

export const delegatecallDetector: Detector = {
  id: "CF-004",
  name: "Dangerous Delegatecall",
  description: "Detects delegatecall to user-controlled or variable addresses",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\.delegatecall\(/.test(line)) {
        // Check if target is a variable (not hardcoded address)
        const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
        const usesVariable = /\w+\.delegatecall/.test(line) && !/0x[0-9a-fA-F]{40}/.test(context);

        findings.push({
          id: "CF-004",
          title: usesVariable ? "Delegatecall to Variable Address" : "Delegatecall Usage",
          severity: usesVariable ? Severity.High : Severity.Medium,
          description: `delegatecall on line ${i + 1} ${usesVariable ? "targets a variable address. An attacker may control the target and execute arbitrary code in this contract's context" : "detected. Ensure the target address is trusted"}.`,
          location: { line: i + 1, column: line.indexOf(".delegatecall"), length: 13 },
          snippet: line.trim(),
          recommendation: "Avoid delegatecall to user-supplied addresses. If delegation is required, use a whitelist of trusted implementation contracts.",
          detector: "static",
          confidence: usesVariable ? "high" : "low",
        });
      }
    }

    return findings;
  },
};
