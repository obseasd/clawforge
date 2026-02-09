import { Finding, Severity } from "../analyzers/static/patterns";

export function calculateScore(findings: Finding[]): number {
  let score = 100;

  for (const f of findings) {
    switch (f.severity) {
      case Severity.Critical:
        score -= 25;
        break;
      case Severity.High:
        score -= 15;
        break;
      case Severity.Medium:
        score -= 8;
        break;
      case Severity.Low:
        score -= 3;
        break;
      case Severity.Info:
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function countBySeverity(findings: Finding[], severity: Severity): number {
  return findings.filter((f) => f.severity === severity).length;
}

export function severityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    [Severity.Critical]: "#dc2626",
    [Severity.High]: "#ea580c",
    [Severity.Medium]: "#eab308",
    [Severity.Low]: "#3b82f6",
    [Severity.Info]: "#6b7280",
  };
  return colors[severity];
}
