"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { connectWallet, BSC_TESTNET } from "@/lib/wagmi";
import { REGISTRY_ADDRESS } from "@/lib/contract";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const SUBMIT_ABI = [
  "function submitAudit(bytes32,address,uint8,uint8,uint8,uint8,uint8,uint8,bytes32,string,uint256) returns (uint256)",
];

interface Finding {
  id: string; title: string; severity: string; description: string;
  location: { line: number }; snippet: string; recommendation: string;
  detector: string; confidence: string;
}

interface Summary {
  contractName: string; contractHash: string; totalFindings: number;
  critical: number; high: number; medium: number; low: number; info: number;
  overallScore: number; reportHash: string;
}

const COLORS: Record<string, string> = {
  critical: "#f87171", high: "#fb923c", medium: "#facc15", low: "#60a5fa", info: "#a1a1aa",
};

const BG_COLORS: Record<string, string> = {
  critical: "rgba(220,38,38,0.15)", high: "rgba(234,88,12,0.15)",
  medium: "rgba(234,179,8,0.15)", low: "rgba(59,130,246,0.15)", info: "rgba(107,107,128,0.15)",
};

export default function AuditPage() {
  const [report, setReport] = useState<{ summary: Summary; findings: Finding[]; aiSummary?: string } | null>(null);
  const [wallet, setWallet] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const s = sessionStorage.getItem("auditResult");
    if (s) setReport(JSON.parse(s));
  }, []);

  if (!report) return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="glass rounded-3xl p-12 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <svg className="w-7 h-7 text-[#555566]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p className="text-[#6b6b80] text-sm mb-4">No audit data found.</p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black rounded-2xl transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)" }}>
          Upload a contract
        </a>
      </div>
    </div>
  );

  const { summary: s, findings } = report;
  const chartData = [
    { name: "Critical", value: s.critical, color: "#f87171" },
    { name: "High", value: s.high, color: "#fb923c" },
    { name: "Medium", value: s.medium, color: "#facc15" },
    { name: "Low", value: s.low, color: "#60a5fa" },
    { name: "Info", value: s.info, color: "#a1a1aa" },
  ].filter(d => d.value > 0);

  const scoreColor = s.overallScore >= 80 ? "#4ade80" : s.overallScore >= 60 ? "#facc15" : "#f87171";
  const scoreLabel = s.overallScore >= 80 ? "Secure" : s.overallScore >= 60 ? "Moderate" : "At Risk";

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const { signer } = await connectWallet();
      setWallet(await signer.getAddress());
      const c = new ethers.Contract(REGISTRY_ADDRESS, SUBMIT_ABI, signer);
      const tx = await c.submitAudit(s.contractHash, ethers.ZeroAddress, s.critical, s.high, s.medium, s.low, s.info, s.overallScore, s.reportHash, "", 97);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : String(e), "error"); }
    setPublishing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{s.contractName}</h1>
          <p className="text-xs text-[#555566] font-mono mt-1.5 break-all">{s.contractHash}</p>
        </div>
        <button
          onClick={wallet ? handlePublish : async () => { const w = await connectWallet(); setWallet(w.address); }}
          disabled={publishing || !!txHash}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-black rounded-2xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: txHash ? "#4ade80" : "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)" }}
        >
          {txHash ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {!wallet ? "Connect Wallet" : publishing ? "Publishing..." : txHash ? "Published!" : "Publish to BNB Chain"}
        </button>
      </div>

      {/* TX Success */}
      {txHash && (
        <div className="glass rounded-2xl p-4 border-l-2 border-[#4ade80]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-sm font-medium text-[#4ade80]">Audit published on BNB Chain</p>
          </div>
          <a href={`${BSC_TESTNET.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#6b6b80] hover:text-[#f5a623] font-mono break-all transition-colors">{txHash}</a>
        </div>
      )}

      {/* Score + Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Card */}
        <div className="glass rounded-2xl p-8 text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg className="w-32 h-32" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${(s.overallScore / 100) * 327} 327`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: scoreColor }}>{s.overallScore}</span>
              <span className="text-[10px] text-[#6b6b80] uppercase tracking-wider mt-0.5">{scoreLabel}</span>
            </div>
          </div>
          <p className="text-xs text-[#6b6b80] mb-4">Safety Score</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {s.critical > 0 && <span className="pill pill-critical">Critical: {s.critical}</span>}
            {s.high > 0 && <span className="pill pill-high">High: {s.high}</span>}
            {s.medium > 0 && <span className="pill pill-medium">Medium: {s.medium}</span>}
            {s.low > 0 && <span className="pill pill-low">Low: {s.low}</span>}
            {s.info > 0 && <span className="pill pill-info">Info: {s.info}</span>}
          </div>
        </div>

        {/* Chart Card */}
        <div className="glass rounded-2xl p-8">
          <p className="text-xs text-[#6b6b80] text-center mb-4 uppercase tracking-wider">Severity Distribution</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3} strokeWidth={0}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#13131a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#e8e8ed" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px]">
              <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className="text-sm text-[#4ade80]">No vulnerabilities found</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <div className="glass rounded-2xl p-6 border-l-2 border-[#f5a623]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2m-7.07-3.93l1.41-1.41m9.9-9.9l1.41-1.41M2 12h2m16 0h2m-3.93 7.07l-1.41-1.41M7.05 7.05L5.64 5.64" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">AI Assessment</h3>
          </div>
          <p className="text-sm text-[#9999aa] leading-relaxed">{report.aiSummary}</p>
        </div>
      )}

      {/* Findings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Findings</h2>
          <span className="text-xs text-[#555566]">{s.totalFindings} total</span>
        </div>
        {findings.map((f, i) => (
          <div key={i} className="glass glass-hover rounded-2xl p-5 space-y-3 transition-all">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="pill shrink-0" style={{ backgroundColor: BG_COLORS[f.severity] || BG_COLORS.info, color: COLORS[f.severity] || COLORS.info }}>
                  {f.severity}
                </span>
                <h3 className="text-sm font-medium text-white truncate">{f.id} — {f.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-[#555566] font-mono">{f.detector}</span>
                <span className="w-1 h-1 rounded-full bg-[#333344]" />
                <span className="text-[10px] text-[#555566]">{f.confidence}</span>
              </div>
            </div>
            <p className="text-xs text-[#8888a0] leading-relaxed">{f.description}</p>
            {f.snippet && (
              <pre className="bg-[#0b0b0e] rounded-xl p-3 text-xs overflow-x-auto border border-white/[0.04]">
                <code className="text-[#60a5fa]">
                  <span className="text-[#555566] select-none">Line {f.location.line}  </span>{f.snippet}
                </code>
              </pre>
            )}
            <div className="flex items-start gap-2 bg-[#4ade80]/[0.04] rounded-xl p-3">
              <svg className="w-3.5 h-3.5 text-[#4ade80] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-xs text-[#4ade80]/80 leading-relaxed">{f.recommendation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg backdrop-blur-xl border transition-all animate-[slideUp_0.3s_ease-out] ${
          toast.type === "error"
            ? "bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]"
            : "bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80]"
        }`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === "error"
              ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
              : <polyline points="20 6 9 17 4 12" />}
          </svg>
          <p className="text-sm max-w-xs truncate">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
