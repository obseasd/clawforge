import { Detector, Finding, Severity } from "../patterns";

export const selfdestructDetector: Detector = {
  id: "CF-005",
  name: "Selfdestruct Usage",
  description: "Detects usage of selfdestruct which can permanently destroy the contract",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/selfdestruct\s*\(/.test(line) || /SELFDESTRUCT/.test(line)) {
        findings.push({
          id: "CF-005",
          title: "Selfdestruct Can Destroy Contract",
          severity: Severity.High,
          description: `selfdestruct on line ${i + 1} can permanently destroy the contract and send remaining Ether to a specified address. This is irreversible and deprecated since EIP-6049.`,
          location: { line: i + 1, column: line.indexOf("selfdestruct"), length: 12 },
          snippet: line.trim(),
          recommendation: "Avoid selfdestruct. Use withdrawal patterns or pausable contracts instead. Note: selfdestruct behavior changed after the Dencun upgrade (EIP-6780).",
          detector: "static",
          confidence: "high",
        });
      }
    }

    return findings;
  },
};
