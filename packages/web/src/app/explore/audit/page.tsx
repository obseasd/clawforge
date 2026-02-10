"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ethers } from "ethers";
import { REGISTRY_ABI } from "@/lib/contract";

const NETWORKS: Record<string, { label: string; rpc: string; explorer: string; registry: string }> = {
  bsc: {
    label: "BNB Chain",
    rpc: "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
    registry: "0x5e3Fe22590C61818e13CB3F1f75a809A1b014BC3",
  },
  testnet: {
    label: "Testnet",
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
    registry: "0x6F862dA94ED6Af3De8ed90D6853C24E91d705879",
  },
  opbnb: {
    label: "opBNB",
    rpc: "https://opbnb-mainnet-rpc.bnbchain.org/",
    explorer: "https://opbnbscan.com",
    registry: "",
  },
};

interface AuditDetail {
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
  reportHash: string;
}

export default function AuditDetailPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#f5a623] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-[#6b6b80]">Loading...</p>
      </div>
    }>
      <AuditDetailContent />
    </Suspense>
  );
}

function AuditDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const networkId = searchParams.get("network") || "bsc";
  const tokenId = Number(searchParams.get("tokenId") || "0");
  const network = NETWORKS[networkId] || NETWORKS.bsc;

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tokenId || !network.registry) {
      setError("Invalid audit reference");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const provider = new ethers.JsonRpcProvider(network.rpc);
        const contract = new ethers.Contract(network.registry, REGISTRY_ABI, provider);
        const a = await contract.getAudit(tokenId);
        setAudit({
          tokenId,
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
          reportHash: a.reportHash,
        });
      } catch {
        setError("Failed to load audit data");
      }
      setLoading(false);
    }

    load();
  }, [tokenId, network]);

  const scoreColor = (s: number) => s >= 80 ? "#4ade80" : s >= 60 ? "#facc15" : "#f87171";

  const displayName = audit
    ? audit.reportURI
      ? audit.reportURI
      : audit.auditedContract && audit.auditedContract !== ethers.ZeroAddress
        ? `${audit.auditedContract.substring(0, 10)}...${audit.auditedContract.substring(36)}`
        : `${audit.contractHash.substring(0, 14)}...`
    : "";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#f5a623] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-[#6b6b80]">Loading audit #{tokenId}...</p>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <div className="glass rounded-2xl p-8">
          <p className="text-sm text-[#f87171] mb-4">{error || "Audit not found"}</p>
          <button onClick={() => router.push("/explore")}
            className="text-xs text-[#f5a623] hover:text-[#fbbf24] transition-colors">
            Back to Explorer
          </button>
        </div>
      </div>
    );
  }

  const severities = [
    { label: "Critical", count: audit.critical, color: "#f87171" },
    { label: "High", count: audit.high, color: "#fb923c" },
    { label: "Medium", count: audit.medium, color: "#facc15" },
    { label: "Low", count: audit.low, color: "#4ade80" },
    { label: "Info", count: audit.info, color: "#60a5fa" },
  ];

  const totalFindings = audit.critical + audit.high + audit.medium + audit.low + audit.info;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <button onClick={() => router.push("/explore")}
        className="flex items-center gap-2 text-xs text-[#6b6b80] hover:text-[#f5a623] transition-colors pt-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Explorer
      </button>

      {/* Header Card */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#555566]">#{audit.tokenId}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5a623]/10 text-[#f5a623]">{network.label}</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1 truncate">{displayName}</h1>
            {audit.auditedContract && audit.auditedContract !== ethers.ZeroAddress && (
              <a href={`${network.explorer}/address/${audit.auditedContract}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#f5a623] hover:text-[#fbbf24] font-mono transition-colors">
                {audit.auditedContract}
              </a>
            )}
          </div>

          {/* Score Circle */}
          <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0"
            style={{ background: `${scoreColor(audit.score)}10`, border: `1px solid ${scoreColor(audit.score)}30` }}>
            <span className="text-2xl font-bold" style={{ color: scoreColor(audit.score) }}>{audit.score}</span>
            <span className="text-[9px] text-[#6b6b80]">/ 100</span>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {severities.map((s) => (
            <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: `${s.color}08` }}>
              <div className="text-lg font-bold mb-0.5" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10px] text-[#6b6b80]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Severity Bar */}
        {totalFindings > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
            {severities.filter(s => s.count > 0).map((s) => (
              <div key={s.label} style={{ width: `${(s.count / totalFindings) * 100}%`, background: s.color }} />
            ))}
          </div>
        )}
      </div>

      {/* Details Card */}
      <div className="glass rounded-3xl p-8">
        <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Audit Details
        </h2>

        <div className="space-y-0">
          {[
            {
              label: "Auditor",
              value: (
                <a href={`${network.explorer}/address/${audit.auditor}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[#f5a623] hover:text-[#fbbf24] font-mono transition-colors">
                  {audit.auditor}
                </a>
              ),
            },
            {
              label: "Date",
              value: <span className="text-white">{new Date(audit.timestamp * 1000).toLocaleString()}</span>,
            },
            {
              label: "Chain ID",
              value: <span className="text-white">{audit.chainId}</span>,
            },
            {
              label: "Contract Hash",
              value: <span className="text-white font-mono text-[11px] break-all">{audit.contractHash}</span>,
            },
            {
              label: "Report Hash",
              value: <span className="text-white font-mono text-[11px] break-all">{audit.reportHash}</span>,
            },
            {
              label: "Token ID",
              value: (
                <a href={`${network.explorer}/token/${network.registry}?a=${audit.tokenId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[#f5a623] hover:text-[#fbbf24] transition-colors">
                  #{audit.tokenId}
                </a>
              ),
            },
          ].map((row, i, arr) => (
            <div key={row.label}
              className={`flex items-start justify-between py-3 gap-4 ${i < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
              <span className="text-xs text-[#6b6b80] shrink-0">{row.label}</span>
              <div className="text-xs text-right min-w-0">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BSCScan Link */}
      <a href={`${network.explorer}/token/${network.registry}?a=${audit.tokenId}`}
        target="_blank" rel="noopener noreferrer"
        className="glass glass-hover rounded-2xl p-4 flex items-center justify-center gap-2 text-xs font-medium text-[#6b6b80] hover:text-[#f5a623] transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        View on {networkId === "opbnb" ? "opBNBScan" : "BSCScan"}
      </a>
    </div>
  );
}
