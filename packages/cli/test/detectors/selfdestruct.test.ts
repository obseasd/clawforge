import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { selfdestructDetector } from "../../src/analyzers/static/detectors/selfdestruct";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-005: Selfdestruct Detector", () => {
  it("should detect selfdestruct usage", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "SelfdestructVuln.sol"), "utf-8");
    const findings = selfdestructDetector.detect(source, "SelfdestructVuln.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].id).toBe("CF-005");
  });

  it("should NOT flag safe contracts", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = selfdestructDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
