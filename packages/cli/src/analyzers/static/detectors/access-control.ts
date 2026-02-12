import { Detector, Finding, Severity } from "../patterns";

export const accessControlDetector: Detector = {
  id: "CF-007",
  name: "Missing Access Control",
  description: "Detects public/external state-changing functions without access control modifiers",

  detect(source: string, _fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    // Sensitive function patterns — only truly dangerous admin functions
    // Excludes mint/burn/withdraw which are often intentionally public (DEX, ERC-20, WETH)
    const sensitivePatterns = [
      /function\s+(pause|unpause|set\w+|update\w+|destroy|kill|upgrade)\s*\(/,
    ];

    // Detect interface blocks to skip their function signatures
    let inInterface = false;
    const interfaceRanges: [number, number][] = [];
    let braceDepth = 0;
    let interfaceStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*interface\s+/.test(lines[i])) { inInterface = true; interfaceStart = i; braceDepth = 0; }
      if (inInterface) {
        braceDepth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
        if (braceDepth <= 0 && i > interfaceStart && lines[i].includes("}")) {
          interfaceRanges.push([interfaceStart, i]);
          inInterface = false;
        }
      }
    }
    const isInInterface = (line: number) => interfaceRanges.some(([s, e]) => line >= s && line <= e);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(line)) {
          // Skip interface declarations (signatures ending with ;)
          if (isInInterface(i)) continue;
          if (/;\s*$/.test(line.trim()) && !/\{/.test(line)) continue;

          // Check if public or external
          const funcContext = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");
          const isPublicOrExternal = /\b(public|external)\b/.test(funcContext);
          if (!isPublicOrExternal) continue;

          // Check if has access control modifier or protection
          const hasModifier = /onlyOwner|onlyRole|onlyAdmin|nonReentrant|require\s*\(\s*msg\.sender\s*==|_checkRole|_checkOwner|hasRole/.test(funcContext);
          if (hasModifier) continue;

          // Check deeper body for msg.sender checks
          const bodyCtx = lines.slice(i, Math.min(i + 8, lines.length)).join(" ");
          if (/require\s*\([^)]*msg\.sender/.test(bodyCtx) || /if\s*\(\s*msg\.sender/.test(bodyCtx)) continue;

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
