import { Detector, Finding, Severity } from "../patterns";

export const uninitializedStorageDetector: Detector = {
  id: "CF-008",
  name: "Uninitialized Storage Pointer",
  description: "Detects local storage variables that may point to unexpected storage slots",

  detect(source: string, fileName: string): Finding[] {
    const findings: Finding[] = [];
    const lines = source.split("\n");

    // Check Solidity version (this is mainly a pre-0.5.0 issue, but still worth flagging)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match: Type storage varName; (without assignment)
      const storageMatch = line.match(/^\s*(\w+(?:\[\])?)\s+storage\s+(\w+)\s*;/);
      if (storageMatch) {
        findings.push({
          id: "CF-008",
          title: "Uninitialized Storage Pointer",
          severity: Severity.Medium,
          description: `Storage pointer '${storageMatch[2]}' on line ${i + 1} is declared without initialization. It may inadvertently point to storage slot 0, potentially overwriting critical state variables.`,
          location: { line: i + 1, column: 0, length: line.length },
          snippet: line.trim(),
          recommendation: "Always initialize storage pointers by assigning them to an existing state variable. In newer Solidity versions, use memory or assign directly.",
          detector: "static",
          confidence: "medium",
        });
      }
    }

    return findings;
  },
};
