import * as dotenv from "dotenv";
import * as path from "path";

export interface Config {
  anthropicApiKey: string;
  privateKey: string;
  rpcUrl: string;
  registryAddress: string;
  bscscanApiKey: string;
}

export function loadConfig(): Config {
  // Try loading .env from multiple locations
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    privateKey: process.env.PRIVATE_KEY || "",
    rpcUrl: process.env.RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    registryAddress: process.env.REGISTRY_ADDRESS || "",
    bscscanApiKey: process.env.BSCSCAN_API_KEY || "",
  };
}
