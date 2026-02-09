import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { integerOverflowDetector } from "../../src/analyzers/static/detectors/integer-overflow";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-006: Integer Overflow Detector", () => {
  it("should detect overflow risk in pre-0.8.0 without SafeMath", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "IntegerOverflow.sol"), "utf-8");
    const findings = integerOverflowDetector.detect(source, "IntegerOverflow.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
    expect(findings[0].id).toBe("CF-006");
  });

  it("should NOT flag 0.8.x contracts (built-in overflow)", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = integerOverflowDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
