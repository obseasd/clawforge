import { Detector, Finding, Severity } from "../patterns";

export const storageCollisionDetector: Detector = {
  id: "CF-009",
  name: "Storage Collision",
  description: "Detects upgradeable/proxy contracts missing storage gaps that risk storage collision on upgrade",

  detect(source: string, _fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");
    let hasProxy = false;
    let hasDelegatecall = false;
    const storageVarLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\b(delegatecall|Proxy|ERC1967|TransparentUpgradeable|UUPSUpgradeable)\b/.test(line)) hasProxy = true;
      if (/\.delegatecall\(/.test(line)) hasDelegatecall = true;
      if (/^\s*(uint|int|bool|address|bytes|string|mapping|struct)\b/.test(line) && !/function|event|error|modifier/.test(line)) {
        storageVarLines.push(i);
      }
    }

    if ((hasProxy || hasDelegatecall) && storageVarLines.length > 0) {
      const hasStorageGap = /uint256\[\d+\]\s+(private\s+)?__gap/.test(source) || /__storage_gap/.test(source);
      if (!hasStorageGap) {
        findings.push({
          id: "CF-009",
          title: "Upgradeable Contract Without Storage Gap",
          severity: Severity.High,
          description: "This contract uses proxy/upgradeable patterns but lacks a __gap storage variable. Adding new state variables in upgrades will corrupt storage layout of derived contracts.",
          location: { line: storageVarLines[0] + 1, column: 0, length: lines[storageVarLines[0]].length },
          snippet: lines[storageVarLines[0]].trim(),
          recommendation: "Add 'uint256[50] private __gap;' at the end of the contract to reserve storage slots for future upgrades.",
          detector: "static",
          confidence: "high",
        });
      }

      if (hasDelegatecall) {
        const inheritanceMatch = source.match(/contract\s+\w+\s+is\s+([^{]+)/);
        if (inheritanceMatch) {
          const parents = inheritanceMatch[1].split(",").map(s => s.trim());
          if (parents.length > 2) {
            findings.push({
              id: "CF-009b",
              title: "Complex Inheritance with Delegatecall",
              severity: Severity.Medium,
              description: `Contract inherits from ${parents.length} parents and uses delegatecall. Complex inheritance chains increase storage collision risk during upgrades.`,
              location: { line: 1, column: 0, length: lines[0].length },
              snippet: `is ${parents.join(", ")}`,
              recommendation: "Use a flat inheritance hierarchy for proxy implementations. Consider using ERC-7201 namespaced storage.",
              detector: "static",
              confidence: "medium",
            });
          }
        }
      }
    }

    return findings;
  },
};
