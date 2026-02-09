import { describe, it, expect } from "vitest";
import { parseAIResponse } from "../../src/analyzers/ai/parser";

describe("AI Response Parser", () => {
  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      findings: [
        {
          title: "Reentrancy in withdraw",
          severity: "critical",
          description: "The withdraw function is vulnerable to reentrancy",
          line: 10,
          snippet: "msg.sender.call{value: amount}",
          recommendation: "Use ReentrancyGuard",
          confidence: "high",
        },
      ],
      summary: "Contract has critical issues",
      score: 40,
    });

    const result = parseAIResponse(response);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].severity).toBe("critical");
    expect(result.findings[0].detector).toBe("ai");
    expect(result.summary).toBe("Contract has critical issues");
    expect(result.score).toBe(40);
  });

  it("should handle markdown-wrapped JSON", () => {
    const response =
      "```json\n" +
      JSON.stringify({
        findings: [
          { title: "Test", severity: "low", description: "d", line: 1, snippet: "", recommendation: "r", confidence: "low" },
        ],
        summary: "ok",
        score: 90,
      }) +
      "\n```";

    const result = parseAIResponse(response);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].severity).toBe("low");
  });

  it("should return empty array on malformed response", () => {
    const result = parseAIResponse("This is not JSON at all");
    expect(result.findings).toEqual([]);
  });

  it("should handle response with no findings", () => {
    const response = JSON.stringify({
      findings: [],
      summary: "No issues found",
      score: 100,
    });

    const result = parseAIResponse(response);
    expect(result.findings.length).toBe(0);
    expect(result.score).toBe(100);
  });

  it("should map all severity levels correctly", () => {
    const response = JSON.stringify({
      findings: [
        { title: "A", severity: "critical", description: "", line: 1, snippet: "", recommendation: "", confidence: "high" },
        { title: "B", severity: "high", description: "", line: 2, snippet: "", recommendation: "", confidence: "high" },
        { title: "C", severity: "medium", description: "", line: 3, snippet: "", recommendation: "", confidence: "medium" },
        { title: "D", severity: "low", description: "", line: 4, snippet: "", recommendation: "", confidence: "low" },
        { title: "E", severity: "info", description: "", line: 5, snippet: "", recommendation: "", confidence: "low" },
      ],
      summary: "",
      score: 50,
    });

    const result = parseAIResponse(response);
    expect(result.findings.map((f) => f.severity)).toEqual([
      "critical", "high", "medium", "low", "info",
    ]);
  });
});
