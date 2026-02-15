# ClawForge

**AI Security Agent for BNB Chain Smart Contracts**

ClawForge is an autonomous AI security agent that registers its on-chain identity, analyzes Solidity smart contracts through 10 static detectors + Claude AI deep scanning, and mints verifiable audit report NFTs (ERC-721) on BNB Chain. The agent builds on-chain reputation with every audit — inspired by BNB Chain NFA (Non-Fungible Agent) standards for AI agent identity.

**Live Demo**: [web-lake-eight-59.vercel.app](https://web-lake-eight-59.vercel.app)

---

## How It Works

```
Register Agent → Upload .sol / Paste Address → Static Analysis (10 detectors) → AI Deep Scan (Claude) → Review Findings → Mint Audit NFT → Update Agent Reputation
```

1. **Agent Registration** — The AI agent registers on-chain with its capabilities, version, and analysis modules (NFA-inspired identity)
2. **Upload** a Solidity file (.sol) or **paste a contract address** (BSCScan URL or `0x...`) via the web dashboard or CLI
3. **Static analysis** runs 10 vulnerability detectors (reentrancy, tx.origin, selfdestruct, delegatecall, unchecked calls, integer overflow, access control, uninitialized storage, storage collision, precision loss)
4. **AI analysis** via Claude API performs deep logic review (flash loans, MEV, oracle manipulation, business logic)
5. **Review** the consolidated report with safety score (0-100), severity breakdown, and remediation advice
6. **Publish** the audit on-chain as an ERC-721 NFT on BNB Chain — immutable proof of security assessment
7. **Reputation** — Agent's on-chain profile is automatically updated (total audits, average score)

![sc1](https://github.com/user-attachments/assets/fa05dcda-5834-4fe9-a89a-a08c839866ea)![scaudit](https://github.com/user-attachments/assets/86afdeb6-8ea3-45ec-acf1-4e12ef76c98d)

![sc2explore](https://github.com/user-attachments/assets/86aae45e-27aa-434a-8995-1c723c6f0307)

---

## Architecture

```
clawforge/
├── packages/
│   ├── contracts/       # Solidity smart contracts (Hardhat)
│   │   ├── contracts/
│   │   │   ├── ClawForgeRegistry.sol          # ERC-721 audit registry
│   │   │   └── interfaces/IClawForgeRegistry.sol
│   │   ├── test/        # 27 test cases
│   │   └── scripts/     # Deployment scripts
│   │
│   ├── cli/             # Node.js CLI (Commander.js)
│   │   ├── src/
│   │   │   ├── analyzers/static/detectors/    # 10 vulnerability detectors
│   │   │   ├── analyzers/ai/                  # Claude API integration
│   │   │   ├── report/                        # JSON + HTML report generator
│   │   │   ├── chain/                         # BSC on-chain publisher
│   │   │   └── commands/                      # audit, publish, explore
│   │   └── test/        # 17 test cases
│   │
│   └── web/             # Next.js 14 Dashboard
│       └── src/app/
│           ├── page.tsx               # Landing (file upload + address audit)
│           ├── audit/                 # Results (score, chart, findings)
│           ├── explore/               # On-chain audit explorer
│           ├── api/audit/             # Backend analysis endpoint
│           └── api/fetch-contract/    # BSCScan contract fetcher (Etherscan V2)
│
├── .env.example
└── README.md
```

---

## Static Analysis Detectors

| ID | Detector | Severity | Description |
|----|----------|----------|-------------|
| CF-001 | Reentrancy | Critical | External call before state update (checks-effects-interactions violation) |
| CF-002 | Unchecked Calls | High | Low-level `.call()` without return value check |
| CF-003 | tx.origin Auth | High | `tx.origin` used for authentication (phishing risk) |
| CF-004 | Delegatecall | High | `delegatecall` to potentially untrusted target |
| CF-005 | Selfdestruct | High | Contract can be permanently destroyed |
| CF-006 | Integer Overflow | Medium | Pre-0.8.0 contract without SafeMath |
| CF-007 | Access Control | Medium | Public state-changing function without modifier |
| CF-008 | Uninitialized Storage | Medium | Storage pointer declared without initialization |
| CF-009 | Storage Collision | High | Upgradeable contract storage slot collision risk |
| CF-010 | Precision Loss | Medium | Division before multiplication causes precision loss |

---

## Smart Contract

**ClawForgeRegistry.sol** — AI Agent Registry + ERC-721 Audit NFTs (inspired by BNB Chain NFA standards).

**AI Agent Identity:**
- `registerAgent(name, version, capabilities)` — Register an AI agent with on-chain identity
- `getAgentProfile(address)` — Query agent name, version, capabilities, total audits, avg score
- `isRegisteredAgent(address)` — Check if address is a registered agent
- `getRegisteredAgents()` — List all registered agents
- Agent reputation auto-updates after each audit (total audits, weighted average score)

**Audit Reports (ERC-721):**
- Each audit is minted as a transferable NFT (CFAR — ClawForge Audit Report)
- Stores: contract hash, severity counts, safety score, report hash, auditor address, timestamp, chain ID
- Query functions: `getAudit()`, `getAuditsByContract()`, `getAuditsByAuditor()`, `getAuditCount()`
- Network: BSC Testnet (Chain ID 97)
- Multi-chain contract fetching: BSC Mainnet (56), BSC Testnet (97), opBNB (204)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- MetaMask (for web dashboard)
- BNB Testnet faucet tokens ([faucet.bnbchain.org](https://www.bnbchain.org/en/testnet-faucet))

### Installation

```bash
git clone https://github.com/obseasd/clawforge.git
cd clawforge
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your keys:
#   PRIVATE_KEY       — BSC wallet private key (for deployment + publishing)
#   BSCSCAN_API_KEY   — BSCScan API key (for contract verification)
#   ANTHROPIC_API_KEY  — Claude API key (for AI analysis)
```

### Run Tests

```bash
# All tests (44 total)
npm test

# Contract tests only (27 tests)
npm run test:contracts

# CLI tests only (17 tests)
npm run test:cli
```

### Deploy Smart Contract

```bash
# Deploy to BSC Testnet
npm run deploy:testnet
```

### Use the CLI

```bash
cd packages/cli

# Audit a Solidity file
npx ts-node src/index.ts audit path/to/Contract.sol

# Publish audit on-chain
npx ts-node src/index.ts publish path/to/report.json

# Explore on-chain audits
npx ts-node src/index.ts explore
```

### Run Web Dashboard

```bash
npm run dev:web
# Open http://localhost:3000
```

1. Drag & drop a `.sol` file **or paste a contract address** on the landing page
2. Review the safety score, severity chart, and findings
3. Connect MetaMask and publish the audit on BNB Chain

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin, Hardhat |
| CLI | TypeScript, Commander.js, Vitest |
| AI Engine | Anthropic Claude API (claude-sonnet-4-5-20250929) |
| Blockchain | ethers.js v6, BSC Mainnet + Testnet + opBNB |
| Web Dashboard | Next.js 14, Tailwind CSS, Recharts |
| Contract Fetching | Etherscan V2 Unified API (BSCScan) |
| Wallet | ethers.js BrowserProvider + MetaMask |

---

## Test Results

```
Smart Contracts: 27/27 passing
CLI Detectors:   17/17 passing
Web Build:       ✓ Compiled successfully
─────────────────────────────────
Total:           44/44 tests passing
```

---

## Hackathon

Built for **Good Vibes Only: OpenClaw Edition** on BNB Chain — Builders' Tools track.

ClawForge is an **AI Security Agent** that addresses a critical gap in the BNB ecosystem: accessible, automated smart contract security auditing with on-chain agent identity and verifiable proof. The agent registers on-chain with its capabilities (inspired by BNB Chain NFA standards), performs audits through 10 static detectors + Claude AI, mints immutable NFT audit reports, and builds verifiable reputation with every interaction.

### Key Differentiators

- **AI Agent with On-Chain Identity** — The agent registers and builds reputation on-chain (NFA-inspired)
- **Audit by Address** — Paste any verified BSCScan contract address (or URL) to instantly fetch and audit the source code
- **Multi-Chain** — BSC Mainnet, BSC Testnet, and opBNB supported
- **On-Chain NFTs** — ERC-721 proof-of-audit minted on BNB Chain
- **Agent Reputation System** — Avg score, total audits tracked on-chain per agent
- **44+ Tests** — Full test coverage across contracts (with agent identity) and CLI
- **5 Example Contracts** — Pre-loaded vulnerable contracts for instant demo

---

## License

MIT
