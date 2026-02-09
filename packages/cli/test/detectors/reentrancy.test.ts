import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { reentrancyDetector } from "../../src/analyzers/static/detectors/reentrancy";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-001: Reentrancy Detector", () => {
  it("should detect reentrancy in vulnerable contract", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "ReentrancyVuln.sol"), "utf-8");
    const findings = reentrancyDetector.detect(source, "ReentrancyVuln.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].id).toBe("CF-001");
  });

  it("should NOT flag safe contract (state update before call)", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = reentrancyDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
