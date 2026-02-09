"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/lib/contract";
import { BSC_TESTNET } from "@/lib/wagmi";

interface OnChainAudit {
  tokenId: number;
  contractHash: string;
  auditor: string;
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  timestamp: number;
  chainId: number;
}

export default function ExplorePage() {
  const [stats, setStats] = useState({ audits: "--", critical: "--", high: "--" });
  const [audits, setAudits] = useState<OnChainAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const provider = new ethers.JsonRpcProvider(BSC_TESTNET.rpc);
        const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
        const count = await contract.getAuditCount();
        const countNum = Number(count);

        // Fetch stats
        const [c, h] = await Promise.all([
          contract.totalCriticalFindings(),
          contract.totalHighFindings(),
        ]);
        setStats({ audits: countNum.toString(), critical: c.toString(), high: h.toString() });

        // Fetch individual audits (last 20 max)
        const start = Math.max(1, countNum - 19);
        const fetches = [];
        for (let i = countNum; i >= start; i--) {
          fetches.push(
            contract.getAudit(i).then((a: { contractHash: string; auditor: string; overallScore: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; infoCount: number; timestamp: bigint; chainId: bigint }) => ({
              tokenId: i,
              contractHash: a.contractHash,
              auditor: a.auditor,
              score: Number(a.overallScore),
              critical: Number(a.criticalCount),
              high: Number(a.highCount),
              medium: Number(a.mediumCount),
              low: Number(a.lowCount),
              info: Number(a.infoCount),
              timestamp: Number(a.timestamp),
              chainId: Number(a.chainId),
            })).catch(() => null)
          );
        }
        const results = (await Promise.all(fetches)).filter(Boolean) as OnChainAudit[];
        setAudits(results);
      } catch {}
      setLoading(false);
    }
    if (REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000") load();
    else setLoading(false);
  }, []);

  const statCards = [
    {
      label: "Total Audits",
      value: stats.audits,
      color: "#f5a623",
      icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    },
    {
      label: "Critical Findings",
      value: stats.critical,
      color: "#f87171",
      icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    },
    {
      label: "High Findings",
      value: stats.high,
      color: "#fb923c",
      icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    },
  ];

  const scoreColor = (score: number) => score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white mb-2">On-Chain Explorer</h1>
        <p className="text-sm text-[#6b6b80]">Browse security audits recorded on BNB Chain</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass glass-hover rounded-2xl p-6 text-center group transition-all">
            <div className="w-10 h-10 mx-auto mb-4 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: `${card.color}15` }}>
              <svg className="w-5 h-5" style={{ color: card.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {card.icon}
              </svg>
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-[#6b6b80]">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Audit History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Audit History</h2>
          <span className="text-xs text-[#555566]">{audits.length > 0 ? `${audits.length} records` : ""}</span>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#f5a623]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#f5a623] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-xs text-[#6b6b80]">Loading on-chain data...</p>
          </div>
        ) : audits.length > 0 ? (
          <div className="space-y-2">
            {audits.map((a) => (
              <a key={a.tokenId}
                href={`${BSC_TESTNET.explorer}/token/${REGISTRY_ADDRESS}?a=${a.tokenId}`}
                target="_blank" rel="noopener noreferrer"
                className="glass glass-hover rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group block">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Score circle */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${scoreColor(a.score)}15` }}>
                    <span className="text-sm font-bold" style={{ color: scoreColor(a.score) }}>{a.score}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">NFT #{a.tokenId}</span>
                      <span className="text-[10px] text-[#555566] font-mono truncate">{a.contractHash.substring(0, 18)}...</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[#6b6b80]">by {a.auditor.substring(0, 6)}...{a.auditor.substring(38)}</span>
                      <span className="w-1 h-1 rounded-full bg-[#333344]" />
                      <span className="text-[10px] text-[#6b6b80]">{new Date(a.timestamp * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.critical > 0 && <span className="pill pill-critical">{a.critical}</span>}
                  {a.high > 0 && <span className="pill pill-high">{a.high}</span>}
                  {a.medium > 0 && <span className="pill pill-medium">{a.medium}</span>}
                  {a.low > 0 && <span className="pill pill-low">{a.low}</span>}
                  <svg className="w-4 h-4 text-[#555566] group-hover:text-[#f5a623] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#555566]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm text-[#6b6b80] mb-1">No audits published yet</p>
            <p className="text-xs text-[#555566]">Be the first to publish an audit on-chain!</p>
          </div>
        )}
      </div>

      {/* Registry Info */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-white">Registry Contract</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-xs text-[#6b6b80]">Address</span>
            <a href={`${BSC_TESTNET.explorer}/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#f5a623] hover:text-[#fbbf24] font-mono transition-colors">{REGISTRY_ADDRESS}</a>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-xs text-[#6b6b80]">Network</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span className="text-xs text-white">BSC Testnet (97)</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#6b6b80]">Standard</span>
            <span className="text-xs text-white">ERC-721 (CFAR)</span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div>
        <p className="text-xs text-[#555566] text-center mb-4 uppercase tracking-wider">How It Works</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { num: "01", title: "Upload", desc: "Drop .sol or paste address", icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></> },
            { num: "02", title: "Analyze", desc: "8 detectors + Claude AI", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2m-7.07-3.93l1.41-1.41m9.9-9.9l1.41-1.41M2 12h2m16 0h2m-3.93 7.07l-1.41-1.41M7.05 7.05L5.64 5.64" /></> },
            { num: "03", title: "Review", desc: "Score, chart, PDF export", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></> },
            { num: "04", title: "Mint NFT", desc: "On-chain proof of audit", icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
          ].map((step) => (
            <div key={step.num} className="glass glass-hover rounded-2xl p-5 text-center group transition-all">
              <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#f5a623]/10 flex items-center justify-center group-hover:bg-[#f5a623]/15 transition-colors">
                <svg className="w-5 h-5 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {step.icon}
                </svg>
              </div>
              <span className="text-[10px] text-[#f5a623] font-mono">{step.num}</span>
              <h3 className="text-sm font-medium text-white mt-1">{step.title}</h3>
              <p className="text-[11px] text-[#6b6b80] mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
