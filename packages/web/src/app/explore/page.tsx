"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS } from "@/lib/contract";
import { BSC_TESTNET } from "@/lib/wagmi";

const ABI = [
  "function getAuditCount() view returns (uint256)",
  "function totalCriticalFindings() view returns (uint256)",
  "function totalHighFindings() view returns (uint256)",
];

export default function ExplorePage() {
  const [stats, setStats] = useState({ audits: "--", critical: "--", high: "--" });

  useEffect(() => {
    async function load() {
      try {
        const provider = new ethers.JsonRpcProvider(BSC_TESTNET.rpc);
        const contract = new ethers.Contract(REGISTRY_ADDRESS, ABI, provider);
        const [a, c, h] = await Promise.all([
          contract.getAuditCount(), contract.totalCriticalFindings(), contract.totalHighFindings(),
        ]);
        setStats({ audits: a.toString(), critical: c.toString(), high: h.toString() });
      } catch {}
    }
    if (REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000") load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">On-Chain Audit Explorer</h1>
        <p className="text-gray-400 mt-2">Browse security audits recorded on BNB Chain.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-white">{stats.audits}</div>
          <div className="text-gray-400 text-sm mt-2">Total Audits</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-red-400">{stats.critical}</div>
          <div className="text-gray-400 text-sm mt-2">Critical Findings</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-orange-400">{stats.high}</div>
          <div className="text-gray-400 text-sm mt-2">High Findings</div>
        </div>
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Registry Contract</h2>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-400">Address: </span>
            <a href={`${BSC_TESTNET.explorer}/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-yellow-400 hover:underline font-mono">{REGISTRY_ADDRESS}</a></p>
          <p><span className="text-gray-400">Network: </span><span className="text-white">BSC Testnet (97)</span></p>
          <p><span className="text-gray-400">Standard: </span><span className="text-white">ERC-721 (CFAR)</span></p>
        </div>
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-gray-300">
          <div><div className="text-2xl font-bold text-yellow-400">1</div><p>Upload .sol</p></div>
          <div><div className="text-2xl font-bold text-yellow-400">2</div><p>Static + AI scan</p></div>
          <div><div className="text-2xl font-bold text-yellow-400">3</div><p>Review findings</p></div>
          <div><div className="text-2xl font-bold text-yellow-400">4</div><p>Mint audit NFT</p></div>
        </div>
      </div>
    </div>
  );
}
