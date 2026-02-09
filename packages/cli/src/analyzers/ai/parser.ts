import { Finding, Severity } from "../static/patterns";

interface AIFinding {
  title: string;
  severity: string;
  description: string;
  line: number;
  snippet: string;
  recommendation: string;
  confidence: string;
}

interface AIResponse {
  findings: AIFinding[];
  summary: string;
  score: number;
}

export function parseAIResponse(text: string): { findings: Finding[]; summary: string; score: number } {
  try {
    // Strip markdown code blocks if present
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in the text
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }

    const parsed: AIResponse = JSON.parse(jsonStr);

    if (!parsed.findings || !Array.isArray(parsed.findings)) {
      return { findings: [], summary: parsed.summary || "", score: parsed.score || 0 };
    }

    const findings: Finding[] = parsed.findings.map((f: AIFinding, idx: number) => ({
      id: `AI-${String(idx + 1).padStart(3, "0")}`,
      title: f.title || "Unnamed Finding",
      severity: mapSeverity(f.severity),
      description: f.description || "",
      location: { line: f.line || 0, column: 0, length: 0 },
      snippet: f.snippet || "",
      recommendation: f.recommendation || "",
      detector: "ai" as const,
      confidence: (f.confidence as "high" | "medium" | "low") || "medium",
    }));

    return {
      findings,
      summary: parsed.summary || "",
      score: parsed.score || 0,
    };
  } catch (error) {
    return { findings: [], summary: "", score: 0 };
  }
}

function mapSeverity(s: string): Severity {
  const map: Record<string, Severity> = {
    critical: Severity.Critical,
    high: Severity.High,
    medium: Severity.Medium,
    low: Severity.Low,
    info: Severity.Info,
  };
  return map[(s || "").toLowerCase()] || Severity.Info;
}
