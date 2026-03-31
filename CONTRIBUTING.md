# Contributing

We welcome contributions to the 0G Voice Assistant.

## Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5.3+
- 0G Galileo Testnet access ([faucet](https://faucet.0g.ai))

### Getting Started

```bash
git clone https://github.com/your-org/0g-voice-assistant
cd 0g-voice-assistant
npm install
npm run build
```

### Environment

```bash
cp .env.example .env
```

Required variables:
- `ZERO_G_PRIVATE_KEY` — Wallet private key for testnet
- `CHAIN_ID` — 16602 (0G Galileo Testnet)
- `RPC_URL` — Primary RPC endpoint
- `STORAGE_RPC_URL` — 0G Storage indexer
- `API_PORT` — API server port (default: 3001)

### Running

```bash
# API Server
npm run start:api

# MCP Server (separate terminal)
npm run start:mcp

# Watch mode for development
npm run dev

# Run tests
npm test
node test-kv-ai-system.js
```

## Project Structure

```
src/                            # TypeScript backend
  api-server.ts                 # REST API + WebSocket server
  mcp-server.ts                 # MCP server (29 tools)
  network-client.ts             # 0G network connection
  storage-client.ts             # 0G Storage integration
  kv-storage-client.ts          # 0G KV storage
  ai-state-manager.ts           # AI learning & memory
  contract-analysis-engine.ts   # Contract analysis
  dynamic-tool-generator.ts     # Auto-generates MCP tools
  contract-workflow-engine.ts   # Multi-step contract ops
  contract-testing-framework.ts # Automated contract testing
  knowledge-ingestion.ts        # Knowledge base pipeline
  task-interpreter.ts           # Natural language interpreter
  ...

frontend/                       # React web interface
  src/
    components/                 # UI components
    pages/                      # Page views
    styles/                     # CSS

fine-tuning-service/            # AI model fine-tuning service
training-data/                  # Training datasets (JSONL)
scripts/                        # Utility scripts
dist/                           # Compiled output
```

## Priority Areas

Where contributions are most needed:

- **Web interface** — Dashboard analytics, developer tools UI, real-time metrics
- **Voice integration** — Whisper STT, TTS, WebSocket streaming
- **Contract intelligence** — Additional pattern recognition, deeper security analysis
- **Testing** — Expanding test coverage, integration tests, edge cases
- **Documentation** — Tutorials, API docs, usage examples

## Guidelines

- Write TypeScript (ES modules)
- Follow existing code patterns and file organization
- Test against 0G Galileo Testnet before submitting
- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
