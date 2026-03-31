# Architecture

## System Overview

The project has three main layers:

```
Frontend (React)  -->  API Server (Express + Socket.IO)  -->  0G Network
                            |
                       MCP Server (29 tools)
                            |
              +---------+---+---+---------+
              |         |       |         |
          Network   Storage   AI      Contract
          Client    Client  System   Intelligence
```

- **API Server** — Express.js REST API with WebSocket support, the primary entry point for the frontend
- **MCP Server** — Model Context Protocol server exposing 29 tools for AI agent interaction
- **0G Network** — Galileo Testnet (Chain ID 16602) for blockchain operations, storage, and AI compute

## Backend Components

All source files are in `src/`.

### Core Infrastructure

| File | Purpose |
|------|---------|
| `api-server.ts` | Express.js REST API with CORS, rate limiting, compression, Helmet security, Socket.IO WebSocket support, and session management |
| `api-server-runner.ts` | API server entry point |
| `mcp-server.ts` | MCP server exposing all 29 tools across network, storage, AI, and contract categories |
| `config.ts` | Configuration management for 0G Galileo Testnet |
| `index.ts` | Main entry point |

### Network & Blockchain

| File | Purpose |
|------|---------|
| `network-client.ts` | 0G testnet connection with multi-endpoint RPC failover (DRPC primary, official 0G fallback) |
| `storage-client.ts` | 0G Storage SDK integration — file upload/download with Merkle tree verification, stream-based chunked operations, buffer uploads |
| `kv-storage-client.ts` | 0G Key-Value storage for persistent AI state, user preferences, conversation history, and pattern databases |
| `precompiled-contracts-client.ts` | Access to 0G precompiled contracts |
| `real-0g-client.ts` | Direct 0G client implementation |

### AI & Intelligence

| File | Purpose |
|------|---------|
| `ai-state-manager.ts` | AI state management — conversation history (50-conversation limit with auto-cleanup), pattern learning, user preferences, cross-session intelligence via KV storage |
| `ai-voice-commands.ts` | Voice command interpretation and execution pipeline |
| `ai-compute-client.ts` | 0G AI compute network integration for model inference |
| `og-compute-client.ts` | Alternative compute client implementation |
| `task-interpreter.ts` | Natural language to blockchain action conversion |
| `knowledge-ingestion.ts` | 0G ecosystem knowledge base — blockchain scanner, documentation crawler, smart contract pattern recognition, dynamic tool generation |
| `intelligent-response-system.ts` | Smart response generation with context awareness |

### Contract Intelligence

| File | Purpose |
|------|---------|
| `contract-analysis-engine.ts` | Automatic ABI extraction, function discovery, pattern recognition (ERC20, ERC721, Proxy, Ownable), security assessment, risk scoring |
| `contract-explorer.ts` | Comprehensive contract exploration with risk assessment |
| `dynamic-tool-generator.ts` | Auto-generates MCP tools for any discovered contract (15-25 tools per contract) |
| `contract-workflow-engine.ts` | Multi-step contract operations — token swaps, NFT purchases, complex execution chains |
| `contract-testing-framework.ts` | Automated contract testing with function-level tests, security analysis, gas usage analysis, 80%+ coverage |

### Browser Integration

| File | Purpose |
|------|---------|
| `browser-0g-inference-client.ts` | Browser-based inference client for frontend AI interactions |

## Frontend

React application in `frontend/`.

```
frontend/src/
  App.tsx                          # Main app with page routing
  index.tsx                        # Entry point
  browser-0g-inference-client.ts   # Browser-side inference
  components/                      # Header, Sidebar, VoiceInterface, Layout
  pages/                           # MainPage, Dashboard, AICompute, DeveloperTools
  styles/                          # CSS
  types/                           # TypeScript type definitions
  assets/                          # Static assets
```

## Fine-Tuning Service

Separate Node.js service in `fine-tuning-service/` for AI model fine-tuning. Supports 0G Serving Broker integration, file upload (50MB limit), model management, and JSONL dataset validation.

## 0G Network Integration

| Parameter | Value |
|-----------|-------|
| Chain ID | 16602 (Galileo Testnet) |
| Primary RPC | DRPC endpoint with automatic failover |
| Fallback RPC | Official 0G RPC |
| Storage RPC | `indexer-storage-testnet-turbo.0g.ai` |
| Explorer | `chainscan-galileo.0g.ai` |
| Faucet | `faucet.0g.ai` |

**SDK Dependencies:**
- `@0glabs/0g-ts-sdk` (^0.1.2) — Storage, KV, contract interaction
- `@0glabs/0g-serving-broker` (^0.5.4) — AI compute network
- `ethers` (^6.13.1) — EVM interaction
- `@modelcontextprotocol/sdk` (^1.17.4) — MCP server framework

## Performance Metrics

Tested on 0G Galileo Testnet:

| Metric | Result |
|--------|--------|
| Network latency | <500ms |
| AI pattern confidence | 84% |
| Storage Merkle verification | <2 seconds |
| Contract analysis | <3 seconds (standard contracts) |
| Tool generation | 15-25 tools per contract |
| Risk assessment | <1 second |
| MCP tool success rate | 100% (all 29 tools) |
| Memory efficiency | 50-conversation limit with auto-cleanup |
| Contract test coverage | 80%+ for most contracts |
