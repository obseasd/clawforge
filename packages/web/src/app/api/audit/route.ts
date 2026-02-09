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
  const sensitivePattern = /function\s+(mint|burn|pause|unpause|set\w+|update\w+|withdraw|destroy|kill|upgrade)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    if (sensitivePattern.test(lines[i])) {
      const ctx = lines.slice(i, Math.min(i + 4, lines.length)).join(" ");
      if (!/\b(public|external)\b/.test(ctx)) continue;
      if (/onlyOwner|onlyRole|onlyAdmin|nonReentrant|require\s*\(\s*msg\.sender\s*==|hasRole/.test(ctx)) continue;
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

function runStaticAnalysis(source: string): Finding[] {
  return [
    ...detectReentrancy(source),
    ...detectTxOrigin(source),
    ...detectSelfdestruct(source),
    ...detectDelegatecall(source),
    ...detectAccessControl(source),
  ];
}

function calculateScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case "critical": score -= 25; break;
      case "high": score -= 15; break;
      case "medium": score -= 8; break;
      case "low": score -= 3; break;
      case "info": score -= 1; break;
    }
  }
  return Math.max(0, Math.min(100, score));
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
            system: "You are a smart contract security auditor. Analyze the contract and return JSON with findings array and summary string. Be concise.",
            messages: [{ role: "user", content: `Audit this Solidity contract:\n\n${source}\n\nReturn JSON: { "findings": [...], "summary": "...", "score": N }` }],
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
                    recommendation: (f.recommendation as string) || "",
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

    const summary = {
      contractName: file.name.replace(".sol", ""),
      contractHash,
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
