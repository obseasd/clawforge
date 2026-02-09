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
  critical: "#dc2626", high: "#ea580c", medium: "#eab308", low: "#3b82f6", info: "#6b7280",
};

export default function AuditPage() {
  const [report, setReport] = useState<{ summary: Summary; findings: Finding[]; aiSummary?: string } | null>(null);
  const [wallet, setWallet] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    const s = sessionStorage.getItem("auditResult");
    if (s) setReport(JSON.parse(s));
  }, []);

  if (!report) return (
    <div className="text-center py-20">
      <p className="text-gray-400">No audit data.</p>
      <a href="/" className="text-yellow-400 hover:underline mt-4 inline-block">Upload a contract</a>
    </div>
  );

  const { summary: s, findings } = report;
  const chartData = [
    { name: "Critical", value: s.critical, color: COLORS.critical },
    { name: "High", value: s.high, color: COLORS.high },
    { name: "Medium", value: s.medium, color: COLORS.medium },
    { name: "Low", value: s.low, color: COLORS.low },
    { name: "Info", value: s.info, color: COLORS.info },
  ].filter(d => d.value > 0);

  const scoreColor = s.overallScore >= 80 ? "text-green-400" : s.overallScore >= 60 ? "text-yellow-400" : "text-red-400";

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const { signer } = await connectWallet();
      setWallet(await signer.getAddress());
      const c = new ethers.Contract(REGISTRY_ADDRESS, SUBMIT_ABI, signer);
      const tx = await c.submitAudit(s.contractHash, ethers.ZeroAddress, s.critical, s.high, s.medium, s.low, s.info, s.overallScore, s.reportHash, "", 97);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
    } catch (e: unknown) { alert("Failed: " + (e instanceof Error ? e.message : String(e))); }
    setPublishing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{s.contractName}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{s.contractHash}</p>
        </div>
        <button onClick={wallet ? handlePublish : async () => { const w = await connectWallet(); setWallet(w.address); }}
          disabled={publishing || !!txHash}
          className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl disabled:opacity-50 transition-all">
          {!wallet ? "Connect Wallet" : publishing ? "Publishing..." : txHash ? "Published!" : "Publish to BNB Chain"}
        </button>
      </div>

      {txHash && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
          <p className="text-green-400 font-semibold">Audit published on BNB Chain!</p>
          <a href={`${BSC_TESTNET.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="text-sm text-green-300 hover:underline break-all">View: {txHash}</a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <div className={`text-7xl font-bold ${scoreColor}`}>{s.overallScore}</div>
          <div className="text-gray-400 mt-2">Safety Score</div>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {s.critical > 0 && <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs">Critical: {s.critical}</span>}
            {s.high > 0 && <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs">High: {s.high}</span>}
            {s.medium > 0 && <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs">Medium: {s.medium}</span>}
            {s.low > 0 && <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">Low: {s.low}</span>}
            {s.info > 0 && <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">Info: {s.info}</span>}
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
          <h3 className="text-center text-gray-400 mb-4">Severity Distribution</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}>
                {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-[200px] text-green-400">No vulnerabilities!</div>}
        </div>
      </div>

      {report.aiSummary && (
        <div className="bg-gray-900/50 border-l-4 border-yellow-500 rounded-r-xl p-6">
          <h3 className="text-yellow-400 font-semibold mb-2">AI Assessment</h3>
          <p className="text-gray-300">{report.aiSummary}</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Findings ({s.totalFindings})</h2>
        {findings.map((f, i) => (
          <div key={i} className="border border-gray-800 rounded-xl p-5 bg-gray-900/30 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded text-xs font-bold uppercase"
                  style={{ backgroundColor: (COLORS[f.severity] || "#6b7280") + "33", color: COLORS[f.severity] || "#6b7280" }}>
                  {f.severity}</span>
                <h3 className="font-semibold text-white">{f.id} — {f.title}</h3>
              </div>
              <span className="text-xs text-gray-500">{f.detector} | {f.confidence}</span>
            </div>
            <p className="text-gray-400 text-sm">{f.description}</p>
            {f.snippet && <pre className="bg-gray-950 rounded-lg p-3 text-sm overflow-x-auto"><code className="text-sky-300">Line {f.location.line}: {f.snippet}</code></pre>}
            <p className="text-green-400 text-sm"><strong>Fix:</strong> {f.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
