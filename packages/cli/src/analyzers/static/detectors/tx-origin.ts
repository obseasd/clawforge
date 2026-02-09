import { Detector, Finding, Severity } from "../patterns";

export const txOriginDetector: Detector = {
  id: "CF-003",
  name: "tx.origin Authentication",
  description: "Detects use of tx.origin for authentication, which is vulnerable to phishing",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/tx\.origin/.test(line)) {
        const context = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
        const isAuth = /require\(.*tx\.origin|if\s*\(.*tx\.origin|==\s*tx\.origin|tx\.origin\s*==/.test(context);

        findings.push({
          id: "CF-003",
          title: isAuth ? "tx.origin Used for Authentication" : "tx.origin Usage Detected",
          severity: isAuth ? Severity.High : Severity.Medium,
          description: `tx.origin on line ${i + 1} ${isAuth ? "is used for authentication, making this contract vulnerable to phishing attacks via intermediate contracts" : "detected — ensure it is not used for authorization"}.`,
          location: { line: i + 1, column: line.indexOf("tx.origin"), length: 9 },
          snippet: line.trim(),
          recommendation: "Replace tx.origin with msg.sender for authentication. tx.origin returns the original external account, not the immediate caller.",
          detector: "static",
          confidence: isAuth ? "high" : "medium",
        });
      }
    }

    return findings;
  },
};
