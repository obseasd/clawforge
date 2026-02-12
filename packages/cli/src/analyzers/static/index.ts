import { Finding, Detector, severityOrder } from "./patterns";
import { reentrancyDetector } from "./detectors/reentrancy";
import { uncheckedCallsDetector } from "./detectors/unchecked-calls";
import { txOriginDetector } from "./detectors/tx-origin";
import { delegatecallDetector } from "./detectors/delegatecall";
import { selfdestructDetector } from "./detectors/selfdestruct";
import { integerOverflowDetector } from "./detectors/integer-overflow";
import { accessControlDetector } from "./detectors/access-control";
import { uninitializedStorageDetector } from "./detectors/uninitialized-storage";
import { storageCollisionDetector } from "./detectors/storage-collision";
import { precisionLossDetector } from "./detectors/precision-loss";

const detectors: Detector[] = [
  reentrancyDetector,
  uncheckedCallsDetector,
  txOriginDetector,
  delegatecallDetector,
  selfdestructDetector,
  integerOverflowDetector,
  accessControlDetector,
  uninitializedStorageDetector,
  storageCollisionDetector,
  precisionLossDetector,
];

export function runStaticAnalysis(source: string, fileName: string): Finding[] {
  const allFindings: Finding[] = [];

  for (const detector of detectors) {
    try {
      const findings = detector.detect(source, fileName);
      allFindings.push(...findings);
    } catch (err) {
      // Don't let a single detector crash the entire analysis
      console.error(`Detector ${detector.id} failed:`, err);
    }
  }

  return allFindings.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
}

export { Finding, Severity } from "./patterns";
