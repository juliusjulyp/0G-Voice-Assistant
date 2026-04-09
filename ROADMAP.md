# Roadmap

## Current Status

The core backend is operational on 0G Galileo Testnet with 13 MCP tools 

**What's working today:**

- MCP server with network operations (connect, transact, deploy, gas estimation)
- 0G Storage integration with Merkle tree verification, upload/download, buffer uploads
- Contract analysis engine with bytecode retrieval and pattern recognition (ERC20, ERC721, Proxy, Ownable)
- Dynamic tool generation — auto-creates 13 MCP tools per discovered contract
- REST API server with WebSocket support, rate limiting, CORS, and security headers
- React-based frontend with dashboard, developer tools, and AI compute pages

## In Progress

- **0G KV Storage** — Client exists but all store/retrieve methods return placeholders. Needs real 0G KV persistence
- **AI learning persistence** — Pattern recognition works in-memory but state is lost on restart. Needs functional KV storage
- **AI compute integration** — Client scaffolded but `deployModel()`, `runInference()`, and `depositFunds()` throw "not implemented"
- **Frontend refinement** — Dashboard analytics, real-time performance metrics, and developer tools UI polish
- **Fine-tuning service** — Dedicated service for AI model fine-tuning with 0G Serving Broker integration
- Contract workflows for multi-step operations (token swaps, NFT purchases)
- Automated contract testing framework with security analysis and gas optimization
- Knowledge ingestion pipeline (blockchain scanner, documentation crawler, task interpreter)

## Up Next

**Web Interface & Developer Experience**
- Complete dashboard with real-time analytics and cost tracking
- Interactive contract explorer and transaction history UI
- Guided tutorials for 0G development

**Voice Integration**
- Speech-to-text 
- Text-to-speech for natural voice responses
- WebSocket-based voice streaming
- Response caching and optimization

**Enterprise & Production**
- Multi-user support with team workspaces
- Role-based access control
- Audit logging and compliance
- Load balancing and high availability

## Future Vision
- **Mobile application** — 0G Voice Assistant on mobile devices
- **Multi-model orchestration** — Deploy and coordinate ensembles of AI models on 0G
- **AI model marketplace** — List, discover, and monetize trained models
- **Federated learning** — Train models across multiple 0G nodes with privacy preservation
- **Community platform** — Model sharing, workflow templates, and interactive voice tutorials
