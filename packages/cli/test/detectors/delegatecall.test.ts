import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { delegatecallDetector } from "../../src/analyzers/static/detectors/delegatecall";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-004: Delegatecall Detector", () => {
  it("should detect delegatecall to variable address", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "DelegatecallVuln.sol"), "utf-8");
    const findings = delegatecallDetector.detect(source, "DelegatecallVuln.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].id).toBe("CF-004");
  });

  it("should NOT flag safe contracts", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = delegatecallDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
