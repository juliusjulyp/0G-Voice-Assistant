# 0G Voice/Text Assistant

A natural language development environment for the 0G blockchain. Build, deploy, and manage smart contracts and AI applications through text or voice commands — no deep blockchain expertise required.

The assistant bridges the gap between developers and 0G's infrastructure (AI compute, decentralized storage, EVM) by providing a unified interface powered by the Model Context Protocol (MCP). It's designed to be accessible to AI researchers, beginners, and developers  including those with motor disabilities alike.

## Key Features

**Network & Wallet Operations** — Connect to 0G Galileo testnet, manage wallets, send transactions, deploy contracts, estimate gas, and track transaction status with multi-endpoint RPC failover.

**Decentralized Storage** — Upload and download files via 0G Storage with Merkle tree verification, buffer uploads from memory, and file integrity checking.

**AI Learning System** — Persistent memory across sessions using 0G KV storage. The assistant learns from conversations, extracts patterns (84% confidence), and provides personalized suggestions.

**Contract Intelligence** — Automatically analyze any deployed contract: ABI extraction, function discovery, ERC20/ERC721/Proxy/Ownable pattern recognition, security risk scoring, and auto-generated MCP tools (15-25 per contract).

**Contract Workflows & Testing** — Execute multi-step operations (token swaps, NFT purchases) and run automated contract tests with security analysis and gas optimization.

**Knowledge Ingestion** — Blockchain scanner for contract discovery, documentation crawler, and natural language task interpretation that converts plain English to executable actions.

## MCP Tools (13)

| Category | Tools | Description |
|----------|-------|-------------|
| **Network** (4) | `connect_to_0g`, `connect_wallet`, `get_balance`, `send_transaction` | Connect to network, manage wallet (info when called with no args), balance + network info + gas price, send/estimate/check tx status |
| **Contracts** (3) | `deploy_contract`, `analyze_contract`, `run_workflow` | Deploy contracts, analyze/explore/test/generate tools (via `mode` param), list/execute workflows |
| **Storage** (2) | `upload_file`, `download_file` | Upload or dry-run Merkle hash, download or check availability |
| **KV Storage** (2) | `store_kv_data`, `retrieve_kv_data` | Read/write to 0G KV storage |
| **AI Memory** (1) | `ai_memory` | Init, record conversations, suggestions, insights, preferences, stats (via `action` param) |
| **Documentation** (1) | `0g_docs` | Updates, latest info, search docs, learning paths, code examples (via `action` param) |

## Quick Start

### Prerequisites

- Node.js 18+
- TypeScript 5.3+
- 0G Testnet access ([faucet](https://faucet.0g.ai))

### Install & Build
# Take note this guide will be updated since it's still in progress
```bash
git clone https://github.com/your-org/0g-voice-assistant
cd 0g-voice-assistant
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
# Set your ZERO_G_PRIVATE_KEY and other config values
```

### Run

```bash
# API Server (port 3001)
npm run start:api

# MCP Server (separate terminal)
npm run start:mcp
```

## Documentation

- [Roadmap](ROADMAP.md) — Current status, upcoming priorities, and long-term vision
- [Architecture](ARCHITECTURE.md) — System design, components, 0G integration details, and performance metrics
- [Contributing](CONTRIBUTING.md) — Development setup, project structure, and contribution guidelines

## License

MIT — see [LICENSE](LICENSE) for details.
