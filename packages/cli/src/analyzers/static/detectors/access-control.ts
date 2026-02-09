import { Detector, Finding, Severity } from "../patterns";

export const accessControlDetector: Detector = {
  id: "CF-007",
  name: "Missing Access Control",
  description: "Detects public/external state-changing functions without access control modifiers",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    // Collect known modifiers and access control patterns
    const hasOwnable = /Ownable|onlyOwner/.test(source);
    const hasAccessControl = /AccessControl|hasRole/.test(source);

    // Sensitive function patterns (functions that shouldn't be unprotected)
    const sensitivePatterns = [
      /function\s+(mint|burn|pause|unpause|set\w+|update\w+|withdraw|transfer\w*|destroy|kill|upgrade)\s*\(/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(line)) {
          // Check if public or external
          const funcContext = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");
          const isPublicOrExternal = /\b(public|external)\b/.test(funcContext);
          if (!isPublicOrExternal) continue;

          // Check if has access control modifier or protection
          const hasModifier = /onlyOwner|onlyRole|onlyAdmin|nonReentrant|require\s*\(\s*msg\.sender\s*==|_checkRole|hasRole/.test(funcContext);
          if (hasModifier) continue;

          const funcMatch = line.match(/function\s+(\w+)/);
          const funcName = funcMatch ? funcMatch[1] : "unknown";

          findings.push({
            id: "CF-007",
            title: `Missing Access Control on ${funcName}()`,
            severity: Severity.Medium,
            description: `Sensitive function '${funcName}' on line ${i + 1} is public/external without access control. Anyone can call this function.`,
            location: { line: i + 1, column: 0, length: line.length },
            snippet: line.trim(),
            recommendation: `Add access control: use OpenZeppelin's Ownable (onlyOwner) or AccessControl (role-based) modifier on '${funcName}'.`,
            detector: "static",
            confidence: "medium",
          });
        }
      }
    }

    return findings;
  },
};
