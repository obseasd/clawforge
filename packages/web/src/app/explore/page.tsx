"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { REGISTRY_ABI } from "@/lib/contract";

const NETWORKS = [
  {
    id: "bsc",
    label: "BNB Chain",
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
    registry: "0x5e3Fe22590C61818e13CB3F1f75a809A1b014BC3",
  },
  {
    id: "testnet",
    label: "Testnet",
    chainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
    registry: "0x6F862dA94ED6Af3De8ed90D6853C24E91d705879",
  },
  {
    id: "opbnb",
    label: "opBNB",
    chainId: 204,
    rpc: "https://opbnb-mainnet-rpc.bnbchain.org/",
    explorer: "https://opbnbscan.com",
    registry: "",
  },
];

interface OnChainAudit {
  tokenId: number;
  contractHash: string;
  auditedContract: string;
  reportURI: string;
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

const VISIBLE_LIMIT = 5;

export default function ExplorePage() {
  const [networkId, setNetworkId] = useState("bsc");
  const [stats, setStats] = useState({ audits: "--", critical: "--", high: "--" });
  const [audits, setAudits] = useState<OnChainAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const network = NETWORKS.find((n) => n.id === networkId)!;

  useEffect(() => {
    setStats({ audits: "--", critical: "--", high: "--" });
    setAudits([]);
    setLoading(true);
    setSearch("");
    setShowAll(false);

    if (!network.registry) {
      setStats({ audits: "0", critical: "0", high: "0" });
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const provider = new ethers.JsonRpcProvider(network.rpc);
        const contract = new ethers.Contract(network.registry, REGISTRY_ABI, provider);
        const count = await contract.getAuditCount();
        const countNum = Number(count);

        const [c, h] = await Promise.all([
          contract.totalCriticalFindings(),
          contract.totalHighFindings(),
        ]);
        setStats({ audits: countNum.toString(), critical: c.toString(), high: h.toString() });

        const start = Math.max(1, countNum - 49);
        const fetches = [];
        for (let i = countNum; i >= start; i--) {
          fetches.push(
            contract.getAudit(i).then((a: {
              contractHash: string; auditedContract: string; overallScore: number;
              criticalCount: number; highCount: number; mediumCount: number;
              lowCount: number; infoCount: number; timestamp: bigint; chainId: bigint;
              reportURI: string; auditor: string;
            }) => ({
              tokenId: i,
              contractHash: a.contractHash,
              auditedContract: a.auditedContract,
              reportURI: a.reportURI,
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

    load();
  }, [networkId, network]);

  // Derive display name for an audit
  const auditName = (a: OnChainAudit) => {
    if (a.reportURI) return a.reportURI;
    if (a.auditedContract && a.auditedContract !== ethers.ZeroAddress)
      return `${a.auditedContract.substring(0, 6)}...${a.auditedContract.substring(38)}`;
    return `${a.contractHash.substring(0, 10)}...${a.contractHash.substring(62)}`;
  };

  // Filter by search
  const filtered = search.trim()
    ? audits.filter((a) => {
        const q = search.toLowerCase();
        return (
          a.reportURI.toLowerCase().includes(q) ||
          a.auditedContract.toLowerCase().includes(q) ||
          a.contractHash.toLowerCase().includes(q) ||
          a.auditor.toLowerCase().includes(q)
        );
      })
    : audits;

  const displayed = showAll || search.trim() ? filtered : filtered.slice(0, VISIBLE_LIMIT);
  const hasMore = !showAll && !search.trim() && filtered.length > VISIBLE_LIMIT;

  const statCards = [
    { label: "Total Audits", value: stats.audits, color: "#f5a623",
      icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
    { label: "Critical Findings", value: stats.critical, color: "#f87171",
      icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></> },
    { label: "High Findings", value: stats.high, color: "#fb923c",
      icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
  ];

  const scoreColor = (score: number) => score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white mb-2">On-Chain Explorer</h1>
        <p className="text-sm text-[#6b6b80] mb-5">Browse security audits recorded on BNB Chain</p>

        {/* Network Selector */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          {NETWORKS.map((n) => (
            <button key={n.id} onClick={() => setNetworkId(n.id)}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${
                networkId === n.id ? "bg-[#f5a623]/15 text-[#f5a623]" : "text-[#6b6b80] hover:text-white"
              }`}>{n.label}</button>
          ))}
        </div>
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

      {/* Search Bar */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by contract name, address, or hash..."
          className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-sm text-white placeholder-[#444455] focus:border-[#f5a623]/40 focus:outline-none transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555566] hover:text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {/* Audit History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Audit History</h2>
          <span className="text-xs text-[#555566]">
            {search.trim() ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : audits.length > 0 ? `${audits.length} records` : ""}
          </span>
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
        ) : displayed.length > 0 ? (
          <div className="space-y-2">
            {displayed.map((a) => (
              <button key={a.tokenId}
                onClick={() => router.push(`/explore/audit?network=${networkId}&tokenId=${a.tokenId}`)}
                className="glass glass-hover rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group w-full text-left">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Score circle */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${scoreColor(a.score)}15` }}>
                    <span className="text-sm font-bold" style={{ color: scoreColor(a.score) }}>{a.score}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white truncate">{auditName(a)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#555566] shrink-0">#{a.tokenId}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {a.auditedContract && a.auditedContract !== ethers.ZeroAddress && (
                        <>
                          <span className="text-[10px] text-[#f5a623] font-mono">{a.auditedContract.substring(0, 6)}...{a.auditedContract.substring(38)}</span>
                          <span className="w-1 h-1 rounded-full bg-[#333344]" />
                        </>
                      )}
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
              </button>
            ))}

            {hasMore && (
              <button onClick={() => setShowAll(true)}
                className="w-full py-3 text-xs font-medium text-[#6b6b80] hover:text-[#f5a623] transition-colors">
                Show all {filtered.length} audits
              </button>
            )}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#555566]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm text-[#6b6b80] mb-1">
              {search.trim() ? "No audits match your search" : !network.registry ? "No registry deployed on this network yet" : "No audits published yet"}
            </p>
            <p className="text-xs text-[#555566]">
              {search.trim() ? "Try a different search term" : !network.registry ? "Coming soon!" : "Be the first to publish an audit on-chain!"}
            </p>
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
            {network.registry ? (
              <a href={`${network.explorer}/address/${network.registry}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#f5a623] hover:text-[#fbbf24] font-mono transition-colors">{network.registry}</a>
            ) : (
              <span className="text-xs text-[#555566]">Not deployed</span>
            )}
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
            <span className="text-xs text-[#6b6b80]">Network</span>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${network.registry ? "bg-[#4ade80] animate-pulse" : "bg-[#555566]"}`} />
              <span className="text-xs text-white">{network.label} ({network.chainId})</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#6b6b80]">Standard</span>
            <span className="text-xs text-white">ERC-721 (CFAR)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
