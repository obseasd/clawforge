export enum Severity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
  Info = "info",
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  location: { line: number; column: number; length: number };
  snippet: string;
  recommendation: string;
  detector: "static" | "ai";
  confidence: "high" | "medium" | "low";
}

export interface Detector {
  id: string;
  name: string;
  description: string;
  detect(source: string, fileName: string): Finding[];
}

export function severityOrder(s: Severity): number {
  const order: Record<Severity, number> = {
    [Severity.Critical]: 4,
    [Severity.High]: 3,
    [Severity.Medium]: 2,
    [Severity.Low]: 1,
    [Severity.Info]: 0,
  };
  return order[s];
}
