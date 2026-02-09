import { NextRequest, NextResponse } from "next/server";

// Etherscan V2 unified API with chainId parameter
const CHAIN_IDS: Record<string, number> = {
  mainnet: 56,
  testnet: 97,
};
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";

export async function POST(req: NextRequest) {
  try {
    const { address, network = "mainnet" } = await req.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid contract address" }, { status: 400 });
    }

    const apiKey = process.env.BSCSCAN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "BSCScan API key not configured" }, { status: 500 });
    }

    const chainId = CHAIN_IDS[network] || CHAIN_IDS.mainnet;
    const url = `${ETHERSCAN_V2}?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.result || !data.result[0]) {
      return NextResponse.json({ error: "Failed to fetch contract from BSCScan" }, { status: 502 });
    }

    const contract = data.result[0];

    if (!contract.SourceCode || contract.SourceCode === "") {
      return NextResponse.json(
        { error: "Contract is not verified on BSCScan. Only verified contracts can be audited." },
        { status: 404 }
      );
    }

    let sourceCode = contract.SourceCode;
    const contractName = contract.ContractName || "Unknown";

    // Handle multi-file JSON format (starts with {{ or {)
    if (sourceCode.startsWith("{{")) {
      try {
        const parsed = JSON.parse(sourceCode.slice(1, -1));
        const sources = parsed.sources || parsed;
        const entries = Object.entries(sources) as [string, { content: string }][];
        // Find the main contract file or concatenate all
        const mainEntry = entries.find(([name]) => name.includes(contractName)) || entries[entries.length - 1];
        sourceCode = mainEntry ? mainEntry[1].content : entries.map(([, v]) => v.content).join("\n\n");
      } catch {
        // If JSON parsing fails, use as-is
      }
    } else if (sourceCode.startsWith("{")) {
      try {
        const parsed = JSON.parse(sourceCode);
        if (parsed.sources) {
          const entries = Object.entries(parsed.sources) as [string, { content: string }][];
          const mainEntry = entries.find(([name]) => name.includes(contractName)) || entries[entries.length - 1];
          sourceCode = mainEntry ? mainEntry[1].content : entries.map(([, v]) => v.content).join("\n\n");
        }
      } catch {
        // Use as-is
      }
    }

    return NextResponse.json({
      name: contractName,
      source: sourceCode,
      compiler: contract.CompilerVersion || "",
      address,
      network,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
