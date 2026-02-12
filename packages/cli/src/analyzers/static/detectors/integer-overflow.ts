import { Detector, Finding, Severity } from "../patterns";

export const integerOverflowDetector: Detector = {
  id: "CF-006",
  name: "Integer Overflow/Underflow",
  description: "Detects arithmetic operations in pre-0.8.0 contracts without SafeMath",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    // Check Solidity version
    let pragmaVersion = "";
    for (const line of lines) {
      const match = line.match(/pragma\s+solidity\s+[\^~>=]*\s*(0\.\d+\.\d+)/);
      if (match) {
        pragmaVersion = match[1];
        break;
      }
    }

    if (!pragmaVersion) return findings;

    const major = parseInt(pragmaVersion.split(".")[1]);
    if (major >= 8) return findings; // 0.8+ has built-in overflow checks

    // Pre-0.8.0: check for SafeMath usage
    const usesSafeMath = /using\s+SafeMath\s+for/.test(source);

    if (!usesSafeMath) {
      // Find arithmetic operations
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip non-code lines
        if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
        if (/^\s*(import|pragma)/.test(line)) continue;
        if (/^\s*$/.test(line)) continue;
        if (/^\s*(event|error|struct|enum)\b/.test(line)) continue;
        if (/\+\s*=|\-\s*=|\*\s*=/.test(line) || /[^=!<>]\s*[\+\-\*]\s*[^=]/.test(line)) {

          findings.push({
            id: "CF-006",
            title: "Potential Integer Overflow/Underflow",
            severity: Severity.Medium,
            description: `Arithmetic operation on line ${i + 1} in Solidity ${pragmaVersion} without SafeMath. Pre-0.8.0 contracts do not have built-in overflow protection.`,
            location: { line: i + 1, column: 0, length: line.length },
            snippet: line.trim(),
            recommendation: "Upgrade to Solidity ^0.8.0 for built-in overflow checks, or use OpenZeppelin SafeMath for older versions.",
            detector: "static",
            confidence: "medium",
          });
          break; // Report once per contract to avoid noise
        }
      }
    }

    return findings;
  },
};
