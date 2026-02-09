"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".sol"] },
    maxFiles: 1,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <section className="text-center space-y-6 pt-12">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          ClawForge
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          AI-Powered Smart Contract Security Auditor for BNB Chain.
          <br />
          Detect vulnerabilities. Get proof-of-audit NFTs on-chain.
        </p>
        <div className="flex justify-center gap-4 text-sm text-gray-500">
          <span className="px-3 py-1 bg-gray-800 rounded-full">8 Static Detectors</span>
          <span className="px-3 py-1 bg-gray-800 rounded-full">Claude AI Analysis</span>
          <span className="px-3 py-1 bg-gray-800 rounded-full">On-Chain NFT Proof</span>
        </div>
      </section>

      {isAuditing ? (
        <div className="border border-gray-700 rounded-2xl p-16 text-center space-y-6 bg-gray-900/50">
          <div className="text-5xl animate-pulse">&#128269;</div>
          <p className="text-lg text-gray-300">{stage}</p>
          <div className="w-full bg-gray-800 rounded-full h-3 max-w-md mx-auto">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}%</p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-yellow-400 bg-yellow-400/5 scale-[1.02]"
              : "border-gray-600 hover:border-gray-400 hover:bg-gray-900/30"
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="text-6xl">&#128737;</div>
            <p className="text-xl text-gray-300">
              Drop your <span className="text-yellow-400 font-mono">.sol</span> file here
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
          <div className="text-3xl">&#9889;</div>
          <h3 className="font-semibold text-white">Static Analysis</h3>
          <p className="text-sm text-gray-400">
            8 detectors: reentrancy, unchecked calls, tx.origin, delegatecall,
            selfdestruct, integer overflow, access control, uninitialized storage.
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
          <div className="text-3xl">&#129504;</div>
          <h3 className="font-semibold text-white">AI Deep Audit</h3>
          <p className="text-sm text-gray-400">
            Claude AI: business logic flaws, flash loan vectors,
            MEV risks, oracle manipulation, BNB-specific issues.
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
          <div className="text-3xl">&#128279;</div>
          <h3 className="font-semibold text-white">On-Chain Proof</h3>
          <p className="text-sm text-gray-400">
            Mint your audit as an NFT on BNB Chain. Immutable, verifiable,
            transferable proof-of-audit.
          </p>
        </div>
      </section>
    </div>
  );
}
