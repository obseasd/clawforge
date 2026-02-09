import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { txOriginDetector } from "../../src/analyzers/static/detectors/tx-origin";

const fixtures = path.join(__dirname, "..", "fixtures");

describe("CF-003: tx.origin Detector", () => {
  it("should detect tx.origin in authentication context", () => {
    const source = fs.readFileSync(path.join(fixtures, "vulnerable", "TxOriginPhishing.sol"), "utf-8");
    const findings = txOriginDetector.detect(source, "TxOriginPhishing.sol");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].id).toBe("CF-003");
  });

  it("should NOT flag contracts without tx.origin", () => {
    const source = fs.readFileSync(path.join(fixtures, "safe", "SafeContract.sol"), "utf-8");
    const findings = txOriginDetector.detect(source, "SafeContract.sol");
    expect(findings.length).toBe(0);
  });
});
