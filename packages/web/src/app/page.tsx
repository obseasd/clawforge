"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Image from "next/image";

const EXAMPLES = [
  { name: "ReentrancyVault", label: "Reentrancy", file: "ReentrancyVault.sol" },
  { name: "UnsafeOracle", label: "Oracle Manipulation", file: "UnsafeOracle.sol" },
  { name: "WeakToken", label: "Overflow", file: "WeakToken.sol" },
  { name: "BrokenStaking", label: "Staking Bug", file: "BrokenStaking.sol" },
  { name: "ProxyWallet", label: "Delegatecall", file: "ProxyWallet.sol" },
];

type Tab = "upload" | "address";

function extractAddress(input: string): string | null {
  const trimmed = input.trim();
  // Direct address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed;
  // BSCScan URL
  const match = trimmed.match(/(?:bscscan\.com)\/address\/(0x[a-fA-F0-9]{40})/i);
  return match ? match[1] : null;
}

export default function Home() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [tab, setTab] = useState<Tab>("upload");
  const [addressInput, setAddressInput] = useState("");
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet");
  const [fetchError, setFetchError] = useState("");
  const router = useRouter();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !file.name.endsWith(".sol")) return;

      setIsAuditing(true);
      setProgress(10);
      setStage("Reading contract...");

      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);
      setStage("Running static analysis (8 detectors)...");

      try {
        const res = await fetch("/api/audit", { method: "POST", body: formData });
        setProgress(70);
        setStage("AI deep analysis (Claude)...");

        const data = await res.json();
        setProgress(95);
        setStage("Generating report...");

        sessionStorage.setItem("auditResult", JSON.stringify(data));
        setProgress(100);

        setTimeout(() => router.push("/audit"), 500);
      } catch {
        setIsAuditing(false);
        setStage("Error during audit");
      }
    },
    [router]
  );

  const handleAddressAudit = async () => {
    setFetchError("");
    const address = extractAddress(addressInput);
    if (!address) {
      setFetchError("Enter a valid contract address (0x...) or BSCScan URL");
      return;
    }

    setIsAuditing(true);
    setProgress(5);
    setStage("Fetching contract from BSCScan...");

    try {
      const res = await fetch("/api/fetch-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, network }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setIsAuditing(false);
        setFetchError(data.error || "Failed to fetch contract");
        return;
      }

      setProgress(15);
      setStage("Contract fetched. Starting audit...");

      const file = new File([data.source], `${data.name}.sol`, { type: "text/plain" });
      onDrop([file]);
    } catch {
      setIsAuditing(false);
      setFetchError("Network error. Please try again.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".sol"] },
    maxFiles: 1,
  });

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="text-center pt-16 pb-12 max-w-2xl">
        <div className="flex justify-center mb-8">
          <Image
            src="/clawforge.png"
            alt="ClawForge"
            width={88}
            height={88}
            priority
            className="drop-shadow-[0_0_40px_rgba(245,166,35,0.3)]"
          />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gold-gradient mb-4">
          ClawForge
        </h1>
        <p className="text-lg text-[#9999aa] leading-relaxed mb-8">
          AI-powered smart contract security auditor for BNB Chain.
          <br />
          Detect vulnerabilities. Mint proof-of-audit NFTs on-chain.
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {["8 Detectors", "Claude AI", "On-Chain NFT"].map((tag) => (
            <span key={tag} className="px-3 py-1.5 text-xs font-medium text-[#8888a0] bg-white/[0.03] border border-white/[0.06] rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Tab Toggle */}
      {!isAuditing && (
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
          <button
            onClick={() => { setTab("upload"); setFetchError(""); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-xl transition-all ${
              tab === "upload"
                ? "text-[#f5a623] bg-[#f5a623]/10"
                : "text-[#6b6b80] hover:text-[#9999aa]"
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => { setTab("address"); setFetchError(""); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-xl transition-all ${
              tab === "address"
                ? "text-[#f5a623] bg-[#f5a623]/10"
                : "text-[#6b6b80] hover:text-[#9999aa]"
            }`}
          >
            Contract Address
          </button>
        </div>
      )}

      {/* Main Card */}
      <section className="w-full max-w-lg">
        {isAuditing ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#f5a623] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white mb-4">{stage}</p>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #f5a623, #d97706)",
                }}
              />
            </div>
            <p className="text-xs text-[#555566]">{progress}%</p>
          </div>
        ) : tab === "upload" ? (
          <div
            {...getRootProps()}
            className={`glass glass-hover rounded-3xl p-10 text-center cursor-pointer group
              ${isDragActive ? "!border-[#f5a623]/40 !bg-[#f5a623]/[0.04] scale-[1.01]" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center group-hover:bg-[#f5a623]/15">
              <svg className="w-7 h-7 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Drop your <span className="text-[#f5a623] font-mono">.sol</span> file here
            </p>
            <p className="text-xs text-[#555566]">or click to browse</p>
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#f5a623]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                <polyline points="22 2 13 11 9 7" />
              </svg>
            </div>
            <div>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => { setAddressInput(e.target.value); setFetchError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddressAudit()}
                placeholder="0x... or BSCScan URL"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-sm text-white font-mono placeholder-[#444455] focus:border-[#f5a623]/40 focus:outline-none transition-colors"
              />
              {fetchError && (
                <p className="text-xs text-[#f87171] mt-2 px-1">{fetchError}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {(["mainnet", "testnet"] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all capitalize ${
                      network === n
                        ? "text-[#f5a623] bg-[#f5a623]/10"
                        : "text-[#555566] hover:text-[#8888a0]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddressAudit}
                disabled={!addressInput.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-black rounded-xl disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Audit
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Example Contracts */}
      {!isAuditing && (
        <section className="w-full max-w-lg mt-4">
          <p className="text-xs text-[#555566] text-center mb-3">or try an example</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.file}
                onClick={async () => {
                  const res = await fetch(`/examples/${ex.file}`);
                  const text = await res.text();
                  const file = new File([text], ex.file, { type: "text/plain" });
                  onDrop([file]);
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#8888a0] bg-white/[0.03] border border-white/[0.06] rounded-full hover:border-[#f5a623]/30 hover:text-[#f5a623]"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="w-full max-w-3xl mt-20 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
              title: "Static Analysis",
              desc: "8 detectors: reentrancy, unchecked calls, tx.origin, delegatecall, selfdestruct, overflow, access control.",
            },
            {
              icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2m-7.07-3.93l1.41-1.41m9.9-9.9l1.41-1.41M2 12h2m16 0h2m-3.93 7.07l-1.41-1.41M7.05 7.05L5.64 5.64" /></>,
              title: "AI Deep Audit",
              desc: "Claude AI analyzes business logic, flash loan vectors, MEV risks, oracle manipulation.",
            },
            {
              icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
              title: "On-Chain Proof",
              desc: "Mint your audit as an ERC-721 NFT on BNB Chain. Immutable, verifiable, transferable.",
            },
          ].map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-5 group">
              <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 flex items-center justify-center text-[#f5a623] mb-4 group-hover:bg-[#f5a623]/15">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-[#6b6b80] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
