import { Detector, Finding, Severity } from "../patterns";

export const reentrancyDetector: Detector = {
  id: "CF-001",
  name: "Reentrancy",
  description: "Detects potential reentrancy where external calls precede state changes",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    let inFunction = false;
    let braceDepth = 0;
    let functionStart = -1;
    let externalCallLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/function\s+\w+/.test(line) && !(/;\s*$/.test(line))) {
        inFunction = true;
        functionStart = i;
        externalCallLine = -1;
        braceDepth = 0;
      }

      if (inFunction) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;

        // Detect external calls
        if (/\.call\{value:/.test(line) || /\.call\(/.test(line)) {
          externalCallLine = i;
        }
        if (/\.transfer\(/.test(line) || /\.send\(/.test(line)) {
          externalCallLine = i;
        }

        // Detect state change AFTER external call
        if (externalCallLine >= 0 && i > externalCallLine) {
          if (/\b(balances|balance|_balances|amounts|deposits)\[.*\]\s*[-+]?=/.test(line) ||
              /\b(balances|balance|_balances|amounts|deposits)\[.*\]\s*-=/.test(line)) {
            findings.push({
              id: "CF-001",
              title: "Potential Reentrancy Vulnerability",
              severity: Severity.Critical,
              description: `External call on line ${externalCallLine + 1} precedes state change on line ${i + 1}. An attacker can re-enter the function before state is updated.`,
              location: { line: externalCallLine + 1, column: 0, length: lines[externalCallLine].length },
              snippet: lines[externalCallLine].trim(),
              recommendation: "Apply checks-effects-interactions pattern: update state before making external calls. Consider using OpenZeppelin's ReentrancyGuard.",
              detector: "static",
              confidence: "high",
            });
            externalCallLine = -1; // Only report once per call
          }
        }

        if (braceDepth <= 0 && i > functionStart) {
          inFunction = false;
          externalCallLine = -1;
        }
      }
    }

    return findings;
  },
};
