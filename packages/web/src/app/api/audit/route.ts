import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// Inline static analysis to avoid cross-package dependency issues in Next.js
// This mirrors the CLI's static analysis engine

interface Finding {
  id: string;
  title: string;
  severity: string;
  description: string;
  location: { line: number; column: number; length: number };
  snippet: string;
  recommendation: string;
  detector: string;
  confidence: string;
}

function computeHash(data: string): string {
  return "0x" + createHash("sha256").update(data).digest("hex");
}

function detectReentrancy(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  let inFunction = false, braceDepth = 0, functionStart = -1, externalCallLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/function\s+\w+/.test(line) && !/;\s*$/.test(line)) {
      inFunction = true; functionStart = i; externalCallLine = -1; braceDepth = 0;
    }
    if (inFunction) {
      braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (/\.call\{value:|\.call\(|\.transfer\(|\.send\(/.test(line)) externalCallLine = i;
      if (externalCallLine >= 0 && i > externalCallLine &&
          /\b(balances|balance|_balances|amounts|deposits)\[.*\]\s*[-+]?=/.test(line)) {
        findings.push({
          id: "CF-001", title: "Potential Reentrancy Vulnerability", severity: "critical",
          description: `External call on line ${externalCallLine + 1} precedes state change on line ${i + 1}.`,
          location: { line: externalCallLine + 1, column: 0, length: lines[externalCallLine].length },
          snippet: lines[externalCallLine].trim(),
          recommendation: "Apply checks-effects-interactions pattern. Use OpenZeppelin ReentrancyGuard.",
          detector: "static", confidence: "high"
        });
        externalCallLine = -1;
      }
      if (braceDepth <= 0 && i > functionStart) { inFunction = false; externalCallLine = -1; }
    }
  }
  return findings;
}

function detectTxOrigin(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/tx\.origin/.test(lines[i])) {
      const ctx = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
      const isAuth = /require\(.*tx\.origin|==\s*tx\.origin|tx\.origin\s*==/.test(ctx);
      findings.push({
        id: "CF-003", title: isAuth ? "tx.origin Used for Authentication" : "tx.origin Usage",
        severity: isAuth ? "high" : "medium",
        description: `tx.origin on line ${i + 1} ${isAuth ? "used for authentication — vulnerable to phishing" : "detected"}.`,
        location: { line: i + 1, column: lines[i].indexOf("tx.origin"), length: 9 },
        snippet: lines[i].trim(),
        recommendation: "Replace tx.origin with msg.sender for authentication.",
        detector: "static", confidence: isAuth ? "high" : "medium"
      });
    }
  }
  return findings;
}

function detectSelfdestruct(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/selfdestruct\s*\(/.test(lines[i])) {
      findings.push({
        id: "CF-005", title: "Selfdestruct Can Destroy Contract", severity: "high",
        description: `selfdestruct on line ${i + 1} can permanently destroy the contract.`,
        location: { line: i + 1, column: lines[i].indexOf("selfdestruct"), length: 12 },
        snippet: lines[i].trim(),
        recommendation: "Avoid selfdestruct. Use withdrawal patterns or pausable contracts.",
        detector: "static", confidence: "high"
      });
    }
  }
  return findings;
}

function detectDelegatecall(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\.delegatecall\(/.test(lines[i])) {
      findings.push({
        id: "CF-004", title: "Delegatecall Usage", severity: "high",
        description: `delegatecall on line ${i + 1} — ensure the target address is trusted.`,
        location: { line: i + 1, column: lines[i].indexOf(".delegatecall"), length: 13 },
        snippet: lines[i].trim(),
        recommendation: "Avoid delegatecall to user-supplied addresses. Use a trusted whitelist.",
        detector: "static", confidence: "medium"
      });
    }
  }
  return findings;
}

function detectAccessControl(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  const sensitivePattern = /function\s+(pause|unpause|set\w+|update\w+|destroy|kill|upgrade)\s*\(/;

  // Detect if we're inside an interface block (no implementations, just signatures)
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
    if (sensitivePattern.test(lines[i])) {
      // Skip interface declarations (function signatures ending with ;)
      if (isInInterface(i)) continue;
      if (/;\s*$/.test(lines[i].trim()) && !/\{/.test(lines[i])) continue;

      const ctx = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");
      if (!/\b(public|external)\b/.test(ctx)) continue;
      if (/onlyOwner|onlyRole|onlyAdmin|nonReentrant|require\s*\(\s*msg\.sender\s*==|hasRole|_checkOwner|_checkRole/.test(ctx)) continue;

      // Skip if the function body has a require/if checking msg.sender
      const bodyCtx = lines.slice(i, Math.min(i + 8, lines.length)).join(" ");
      if (/require\s*\([^)]*msg\.sender/.test(bodyCtx) || /if\s*\(\s*msg\.sender/.test(bodyCtx)) continue;

      const fn = lines[i].match(/function\s+(\w+)/)?.[1] || "unknown";
      findings.push({
        id: "CF-007", title: `Missing Access Control on ${fn}()`, severity: "medium",
        description: `Function '${fn}' on line ${i + 1} is public without access control.`,
        location: { line: i + 1, column: 0, length: lines[i].length },
        snippet: lines[i].trim(),
        recommendation: `Add onlyOwner or role-based access control to '${fn}'.`,
        detector: "static", confidence: "medium"
      });
    }
  }
  return findings;
}

function detectUncheckedCalls(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\.call[{(]/.test(line)) {
      const ctx = lines.slice(Math.max(0, i - 1), i + 2).join(" ");
      const isChecked = /\(bool\s+\w+/.test(ctx) || /bool\s+\w+.*=.*\.call/.test(ctx) || /require\(/.test(lines[i + 1] || "");
      if (!isChecked) {
        findings.push({
          id: "CF-002", title: "Unchecked Low-Level Call", severity: "high",
          description: `Low-level call on line ${i + 1} does not check the return value. Failed calls will silently continue execution.`,
          location: { line: i + 1, column: line.indexOf(".call"), length: 5 },
          snippet: line.trim(),
          recommendation: 'Capture and check the return value: (bool success, ) = addr.call{...}(""); require(success);',
          detector: "static", confidence: "medium"
        });
      }
    }
  }
  return findings;
}

function detectIntegerOverflow(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  let pragmaVersion = "";
  for (const line of lines) {
    const match = line.match(/pragma\s+solidity\s+[\^~>=]*\s*(0\.\d+\.\d+)/);
    if (match) { pragmaVersion = match[1]; break; }
  }
  if (!pragmaVersion) return findings;
  const minor = parseInt(pragmaVersion.split(".")[1]);
  if (minor >= 8) return findings;
  const usesSafeMath = /using\s+SafeMath\s+for/.test(source);
  if (!usesSafeMath) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip non-code lines
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      if (/^\s*(import|pragma|\/\/)/.test(line)) continue;
      if (/^\s*$/.test(line)) continue;
      // Skip string literals, event/error declarations
      if (/^\s*(event|error|struct|enum)\b/.test(line)) continue;
      if (/\+\s*=|\-\s*=|\*\s*=/.test(line) || /[^=!<>]\s*[\+\-\*]\s*[^=]/.test(line)) {
        findings.push({
          id: "CF-006", title: "Potential Integer Overflow/Underflow", severity: "medium",
          description: `Arithmetic operation on line ${i + 1} in Solidity ${pragmaVersion} without SafeMath.`,
          location: { line: i + 1, column: 0, length: line.length },
          snippet: line.trim(),
          recommendation: "Upgrade to Solidity ^0.8.0 for built-in overflow checks, or use OpenZeppelin SafeMath.",
          detector: "static", confidence: "medium"
        });
        break;
      }
    }
  }
  return findings;
}

function detectUninitializedStorage(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const storageMatch = lines[i].match(/^\s*(\w+(?:\[\])?)\s+storage\s+(\w+)\s*;/);
    if (storageMatch) {
      findings.push({
        id: "CF-008", title: "Uninitialized Storage Pointer", severity: "medium",
        description: `Storage pointer '${storageMatch[2]}' on line ${i + 1} declared without initialization — may overwrite critical state.`,
        location: { line: i + 1, column: 0, length: lines[i].length },
        snippet: lines[i].trim(),
        recommendation: "Initialize storage pointers by assigning to an existing state variable.",
        detector: "static", confidence: "medium"
      });
    }
  }
  return findings;
}

function detectStorageCollision(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  let hasProxy = false;
  let hasDelegatecall = false;
  const storageVarLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(delegatecall|Proxy|ERC1967|TransparentUpgradeable|UUPSUpgradeable)\b/.test(line)) hasProxy = true;
    if (/\.delegatecall\(/.test(line)) hasDelegatecall = true;
    // State variable declarations (not inside functions)
    if (/^\s*(uint|int|bool|address|bytes|string|mapping|struct)\b/.test(line) && !/function|event|error|modifier/.test(line)) {
      storageVarLines.push(i);
    }
  }

  if ((hasProxy || hasDelegatecall) && storageVarLines.length > 0) {
    // Check for storage gaps
    const hasStorageGap = /uint256\[\d+\]\s+(private\s+)?__gap/.test(source) || /__storage_gap/.test(source);
    if (!hasStorageGap) {
      findings.push({
        id: "CF-009", title: "Upgradeable Contract Without Storage Gap", severity: "high",
        description: "This contract uses proxy/upgradeable patterns but lacks a __gap storage variable. Adding new state variables in upgrades will corrupt storage layout of derived contracts.",
        location: { line: storageVarLines[0] + 1, column: 0, length: lines[storageVarLines[0]].length },
        snippet: lines[storageVarLines[0]].trim(),
        recommendation: "Add 'uint256[50] private __gap;' at the end of the contract to reserve storage slots for future upgrades.",
        detector: "static", confidence: "high"
      });
    }

    // Check for inherited storage order issues in contracts with delegatecall
    if (hasDelegatecall) {
      const inheritanceMatch = source.match(/contract\s+\w+\s+is\s+([^{]+)/);
      if (inheritanceMatch) {
        const parents = inheritanceMatch[1].split(",").map(s => s.trim());
        if (parents.length > 2) {
          findings.push({
            id: "CF-009b", title: "Complex Inheritance with Delegatecall", severity: "medium",
            description: `Contract inherits from ${parents.length} parents and uses delegatecall. Complex inheritance chains increase storage collision risk during upgrades.`,
            location: { line: 1, column: 0, length: lines[0].length },
            snippet: `is ${parents.join(", ")}`,
            recommendation: "Use a flat inheritance hierarchy for proxy implementations. Consider using ERC-7201 namespaced storage.",
            detector: "static", confidence: "medium"
          });
        }
      }
    }
  }

  return findings;
}

function detectPrecisionLoss(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  const usesSafeMath = /using\s+SafeMath\s+for/.test(source);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

    // Detect division before multiplication: a / b * c
    // But skip if SafeMath .mul() or .div() is used (already handled correctly)
    const divBeforeMul = line.match(/(\w+)\s*\/\s*(\w+)\s*\*\s*(\w+)/);
    if (divBeforeMul && !usesSafeMath && !/\.mul\(|\.div\(/.test(line)) {
      findings.push({
        id: "CF-010", title: "Precision Loss: Division Before Multiplication", severity: "medium",
        description: `On line ${i + 1}, division is performed before multiplication ('${divBeforeMul[0]}'). In Solidity, integer division truncates — this causes permanent precision loss.`,
        location: { line: i + 1, column: line.indexOf(divBeforeMul[0]), length: divBeforeMul[0].length },
        snippet: line.trim(),
        recommendation: "Reorder to multiply before dividing: (a * c) / b. Use higher precision intermediates (multiply by 1e18 first).",
        detector: "static", confidence: "high"
      });
    }

    // Detect division that may lose precision in financial calculations
    // Skip when: SafeMath .mul() is used before /, or scaling constants present
    if (/\b(fee|reward|share|rate|ratio|price|amount)\w*\s*=\s*[^;]*\//.test(line)) {
      // Skip if multiplication already precedes division on this line (correct pattern)
      if (/\.mul\([^)]*\)\s*\/|\.mul\([^)]*\)\s*\.div\(/.test(line)) continue;
      if (/\*[^/]*\//.test(line)) continue; // raw a * b / c is fine
      if (/\*\s*1e\d+|\*\s*10\*\*/.test(line)) continue;

      const ctx = lines.slice(Math.max(0, i - 1), i + 1).join(" ");
      if (/\*\s*1e\d+|\*\s*10\*\*|\*\s*PRECISION|\*\s*WAD|\*\s*RAY|\.mul\(/.test(ctx)) continue;

      findings.push({
        id: "CF-010b", title: "Potential Precision Loss in Financial Calculation", severity: "low",
        description: `Line ${i + 1} computes a financial value (fee/reward/share) using division without scaling. Small amounts may round to zero.`,
        location: { line: i + 1, column: 0, length: line.length },
        snippet: line.trim(),
        recommendation: "Scale up by a precision factor (e.g., 1e18) before dividing to preserve precision for small values.",
        detector: "static", confidence: "medium"
      });
    }
  }

  // Deduplicate findings on the same line
  const seen = new Set<number>();
  return findings.filter(f => {
    if (seen.has(f.location.line)) return false;
    seen.add(f.location.line);
    return true;
  });
}

function runStaticAnalysis(source: string): Finding[] {
  return [
    ...detectReentrancy(source),
    ...detectUncheckedCalls(source),
    ...detectTxOrigin(source),
    ...detectDelegatecall(source),
    ...detectSelfdestruct(source),
    ...detectIntegerOverflow(source),
    ...detectAccessControl(source),
    ...detectUninitializedStorage(source),
    ...detectStorageCollision(source),
    ...detectPrecisionLoss(source),
  ];
}

function calculateScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    // AI findings get half penalty — static detectors are more reliable
    const weight = f.detector === "ai" ? 0.5 : 1;
    switch (f.severity) {
      case "critical": score -= 25 * weight; break;
      case "high": score -= 15 * weight; break;
      case "medium": score -= 8 * weight; break;
      case "low": score -= 3 * weight; break;
      case "info": score -= 1 * weight; break;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const source = await file.text();
    const contractHash = computeHash(source);

    // Run static analysis
    const findings = runStaticAnalysis(source);

    // Try AI analysis if API key is set
    let aiSummary = "";
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2048,
            system: `You are an expert smart contract security auditor. Analyze the contract and return ONLY valid JSON.

CRITICAL RULES:
- If the code is an interface or abstract contract with NO implementation logic, return very few findings (0-2 max, info/low only). Interfaces CANNOT have vulnerabilities — do not flag missing validation, access control, or reentrancy on interfaces.
- Only flag REAL exploitable vulnerabilities in actual implementation code. Do not flag design trade-offs, theoretical concerns, or best-practice suggestions as medium/high.
- severity "critical" = funds can be stolen now. "high" = funds at serious risk. "medium" = conditional exploit. "low" = minor issue. "info" = informational only.
- Well-known audited production contracts (PancakeSwap, Uniswap, Venus, OpenZeppelin) should score 75-95. Do NOT give them low scores for theoretical issues.
- Each finding MUST have: title, severity, description, recommendation (actionable fix), snippet (relevant code line).
- Return 3-8 findings max. Quality over quantity.`,
            messages: [{ role: "user", content: `Audit this Solidity contract:\n\n${source}\n\nReturn JSON: { "findings": [{ "title": "...", "severity": "...", "description": "...", "recommendation": "...", "snippet": "..." }], "summary": "...", "score": N }` }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.content?.[0]?.text || "";
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.findings) {
                parsed.findings.forEach((f: Record<string, unknown>, idx: number) => {
                  findings.push({
                    id: `AI-${String(idx + 1).padStart(3, "0")}`,
                    title: (f.title as string) || "AI Finding",
                    severity: ((f.severity as string) || "info").toLowerCase().replace("informational", "info"),
                    description: (f.description as string) || "",
                    location: { line: (f.line as number) || 0, column: 0, length: 0 },
                    snippet: (f.snippet as string) || "",
                    recommendation: (f.recommendation as string) || (f.fix as string) || (f.remediation as string) || (f.suggestion as string) || "",
                    detector: "ai",
                    confidence: (f.confidence as string) || "medium",
                  });
                });
              }
              aiSummary = parsed.summary || "";
            }
          } catch {}
        }
      } catch {}
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = findings.filter((f) => {
      const key = `${f.title}:${f.location.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const contractAddress = (formData.get("contractAddress") as string) || "";

    const summary = {
      contractName: file.name.replace(".sol", ""),
      contractHash,
      contractAddress,
      totalFindings: deduped.length,
      critical: deduped.filter((f) => f.severity === "critical").length,
      high: deduped.filter((f) => f.severity === "high").length,
      medium: deduped.filter((f) => f.severity === "medium").length,
      low: deduped.filter((f) => f.severity === "low").length,
      info: deduped.filter((f) => f.severity === "info").length,
      overallScore: calculateScore(deduped),
      reportHash: computeHash(JSON.stringify(deduped)),
    };

    return NextResponse.json({ summary, findings: deduped, aiSummary, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
