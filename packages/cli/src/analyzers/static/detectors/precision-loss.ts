import { Detector, Finding, Severity } from "../patterns";

export const precisionLossDetector: Detector = {
  id: "CF-010",
  name: "Precision Loss",
  description: "Detects division before multiplication and unscaled financial calculations that cause precision loss",

  detect(source: string, _fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");
    const seenLines = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

      // Division before multiplication: a / b * c
      const divBeforeMul = line.match(/(\w+)\s*\/\s*(\w+)\s*\*\s*(\w+)/);
      if (divBeforeMul && !seenLines.has(i)) {
        seenLines.add(i);
        findings.push({
          id: "CF-010",
          title: "Precision Loss: Division Before Multiplication",
          severity: Severity.Medium,
          description: `On line ${i + 1}, division is performed before multiplication ('${divBeforeMul[0]}'). In Solidity, integer division truncates — this causes permanent precision loss.`,
          location: { line: i + 1, column: line.indexOf(divBeforeMul[0]), length: divBeforeMul[0].length },
          snippet: line.trim(),
          recommendation: "Reorder to multiply before dividing: (a * c) / b. Use higher precision intermediates (multiply by 1e18 first).",
          detector: "static",
          confidence: "high",
        });
      }

      // Financial calculations without scaling
      if (/\b(fee|reward|share|rate|ratio|price|amount)\w*\s*=\s*[^;]*\//.test(line) && !/\*\s*1e\d+|\*\s*10\*\*/.test(line) && !seenLines.has(i)) {
        const ctx = lines.slice(Math.max(0, i - 1), i + 1).join(" ");
        if (!/\*\s*1e\d+|\*\s*10\*\*|\*\s*PRECISION|\*\s*WAD|\*\s*RAY/.test(ctx)) {
          seenLines.add(i);
          findings.push({
            id: "CF-010b",
            title: "Potential Precision Loss in Financial Calculation",
            severity: Severity.Low,
            description: `Line ${i + 1} computes a financial value (fee/reward/share) using division without scaling. Small amounts may round to zero.`,
            location: { line: i + 1, column: 0, length: line.length },
            snippet: line.trim(),
            recommendation: "Scale up by a precision factor (e.g., 1e18) before dividing to preserve precision for small values.",
            detector: "static",
            confidence: "medium",
          });
        }
      }
    }

    return findings;
  },
};
