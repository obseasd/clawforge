import { Detector, Finding, Severity } from "../patterns";

export const uncheckedCallsDetector: Detector = {
  id: "CF-002",
  name: "Unchecked External Calls",
  description: "Detects low-level calls whose return values are not checked",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match .call( or .call{ patterns
      if (/\.call[{(]/.test(line)) {
        // Check if return value is captured on this line or the previous
        const context = lines.slice(Math.max(0, i - 1), i + 2).join(" ");
        const isChecked = /\(bool\s+\w+/.test(context) ||
                          /bool\s+\w+.*=.*\.call/.test(context) ||
                          /require\(/.test(lines[i + 1] || "");

        if (!isChecked) {
          findings.push({
            id: "CF-002",
            title: "Unchecked Low-Level Call",
            severity: Severity.High,
            description: `Low-level call on line ${i + 1} does not check the return value. Failed calls will silently continue execution.`,
            location: { line: i + 1, column: line.indexOf(".call"), length: 5 },
            snippet: line.trim(),
            recommendation: 'Capture and check the return value: (bool success, ) = addr.call{...}(""); require(success, "Call failed");',
            detector: "static",
            confidence: "medium",
          });
        }
      }
    }

    return findings;
  },
};
