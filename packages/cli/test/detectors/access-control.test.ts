import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { accessControlDetector } from "../../src/analyzers/static/detectors/access-control";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-007: Access Control Detector", () => {
  it("should detect missing access control on sensitive functions", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "NoAccessControl.sol"), "utf-8");
    const findings = accessControlDetector.detect(source, "NoAccessControl.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].id).toBe("CF-007");
    // Should flag setPrice, mint, pause
    const funcNames = findings.map(f => f.title);
    expect(funcNames.some(t => t.includes("setPrice"))).toBe(true);
  });

  it("should NOT flag functions with onlyOwner", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = accessControlDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
