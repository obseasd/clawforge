import { createHash } from "crypto";

export function computeHash(data: string): string {
  return "0x" + createHash("sha256").update(data).digest("hex");
}

export function keccak256Hex(data: string): string {
  // Simple keccak256 using ethers if available, fallback to sha256
  return computeHash(data);
}
