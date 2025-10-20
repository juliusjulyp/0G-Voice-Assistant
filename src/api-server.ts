import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { OGNetworkClient } from './network-client.js';
import { OG_CONFIG } from './config.js';
import OGStorageClient from './storage-client.js';
import ZeroGKVStorageClient from './kv-storage-client.js';
import AIStateManager from './ai-state-manager.js';
import KnowledgeIngestionEngine from './knowledge-ingestion.js';
import TaskInterpreter from './task-interpreter.js';
import ContractAnalysisEngine from './contract-analysis-engine.js';
import DynamicToolGenerator from './dynamic-tool-generator.js';
import ContractExplorer from './contract-explorer.js';
import ContractTestingFramework from './contract-testing-framework.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Extend Express Request type for multer
declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
  }
}

export interface VoiceRequest {
  userId: string;
  audioData?: string; // Base64 encoded audio
  textInput?: string; // Direct text input
  sessionId: string;
  timestamp: number;
}

export interface VoiceResponse {
  success: boolean;
  response: string;
  audioResponse?: string; // Base64 encoded audio response
  actionTaken?: string;
  transactionHash?: string;
  gasUsed?: string;
  suggestions: string[];
  learningInsights?: any[];
}

export interface APIConfig {
  port: number;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  enableSocketIO: boolean;
  enableVoiceProcessing: boolean;
}

export class ZeroGAPIServer {
  private app: Express;
  private server: any;
  private io: SocketIOServer | null = null;
  private networkClient: OGNetworkClient;
  private storageClient: OGStorageClient;
  private kvStorageClient: ZeroGKVStorageClient;
  private aiStateManager: AIStateManager;
  private knowledgeEngine: KnowledgeIngestionEngine;
  private taskInterpreter: TaskInterpreter;
  private contractAnalysisEngine: ContractAnalysisEngine;
  private dynamicToolGenerator: DynamicToolGenerator;
  private contractExplorer: ContractExplorer;
  private testingFramework: ContractTestingFramework;
  private activeSessions: Map<string, any> = new Map();
  
  private readonly config: APIConfig = {
    port: parseInt(process.env.API_PORT || '3001'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    enableSocketIO: false,
    enableVoiceProcessing: true
  };

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    // Initialize 0G components
    this.networkClient = new OGNetworkClient();
    this.storageClient = new OGStorageClient();
    this.kvStorageClient = new ZeroGKVStorageClient();
    this.knowledgeEngine = new KnowledgeIngestionEngine(OG_CONFIG.rpcUrl);
    this.aiStateManager = new AIStateManager(
      this.kvStorageClient,
      this.networkClient,
      this.knowledgeEngine
    );
    this.taskInterpreter = new TaskInterpreter(
      this.knowledgeEngine,
      this.networkClient,
      this.storageClient
    );
    
    // Initialize contract intelligence components
    this.contractAnalysisEngine = new ContractAnalysisEngine(this.networkClient);
    this.dynamicToolGenerator = new DynamicToolGenerator(this.networkClient);
    this.contractExplorer = new ContractExplorer(this.networkClient);
    this.testingFramework = new ContractTestingFramework(this.networkClient, this.contractExplorer);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.initializeServices();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' })); // Large limit for audio data
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          network: this.networkClient ? 'connected' : 'disconnected',
          kvStorage: this.kvStorageClient ? 'initialized' : 'not initialized',
          aiLearning: this.aiStateManager ? 'active' : 'inactive'
        }
      });
    });

    // API version info
    this.app.get('/api/version', (req: Request, res: Response) => {
      res.json({
        version: '1.0.0',
        apiVersion: 'v1',
        features: [
          'voice-processing',
          'ai-learning',
          'blockchain-integration',
          '0g-storage',
          'real-time-websockets'
        ]
      });
    });

    // Voice processing endpoint
    this.app.post('/api/v1/voice/process', async (req: Request, res: Response) => {
      try {
        const voiceRequest: VoiceRequest = req.body;
        const response = await this.processVoiceRequest(voiceRequest);
        res.json(response);
      } catch (error) {
        console.error('Voice processing error:', error);
        res.status(500).json({
          success: false,
          error: 'Voice processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // User initialization
    this.app.post('/api/v1/user/initialize', async (req: Request, res: Response) => {
      try {
        const { userId, walletAddress } = req.body;
        
        if (!userId || !walletAddress) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: userId, walletAddress'
          });
        }

        await this.aiStateManager.initializeUser(userId);
        
        res.json({
          success: true,
          message: 'User initialized successfully',
          userId,
          features: ['ai-learning', 'personalization', 'cross-session-memory']
        });
      } catch (error) {
        console.error('User initialization error:', error);
        res.status(500).json({
          success: false,
          error: 'User initialization failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get user insights
    this.app.get('/api/v1/user/:userId/insights', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        
        // Initialize user if needed
        await this.aiStateManager.initializeUser(userId);
        
        const insights = await this.aiStateManager.generateLearningInsights();
        const memoryStats = this.aiStateManager.getMemoryStats();
        
        res.json({
          success: true,
          insights,
          memoryStats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Insights retrieval error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve insights',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get personalized suggestions
    this.app.post('/api/v1/user/:userId/suggestions', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { context } = req.body;
        
        if (!context) {
          return res.status(400).json({
            success: false,
            error: 'Context is required for suggestions'
          });
        }

        // Initialize user if needed
        await this.aiStateManager.initializeUser(userId);
        
        const suggestions = this.aiStateManager.getPersonalizedSuggestions(context);
        
        res.json({
          success: true,
          suggestions,
          context,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate suggestions',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Network status
    this.app.get('/api/v1/network/status', async (req: Request, res: Response) => {
      try {
        const isConnected = await this.networkClient.isConnected();
        let networkInfo = null;
        
        if (isConnected) {
          networkInfo = await this.networkClient.getNetworkInfo();
        }
        
        res.json({
          success: true,
          connected: isConnected,
          networkInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Network status error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get network status',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Blockchain operations
    this.app.post('/api/v1/blockchain/execute', async (req: Request, res: Response) => {
      try {
        const { userId, userInput, privateKey } = req.body;
        
        if (!userId || !userInput) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: userId, userInput'
          });
        }

        // Connect wallet if private key provided
        if (privateKey) {
          this.networkClient.connectWallet(privateKey);
          this.kvStorageClient.connectWallet(privateKey);
        }

        // Initialize user
        await this.aiStateManager.initializeUser(userId);

        // Interpret and execute task
        const action = await this.taskInterpreter.interpretTask({
          userInput,
          priority: 'medium'
        });

        const result = await this.taskInterpreter.executeAction(action);

        // Record conversation for learning
        await this.aiStateManager.recordConversation(
          userInput,
          `Action: ${action.description}`,
          action.type,
          result.success,
          result.gasUsed,
          result.transactionHash
        );

        res.json({
          success: result.success,
          action: action.description,
          result: result.result,
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          warnings: result.warnings,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Blockchain execution error:', error);
        res.status(500).json({
          success: false,
          error: 'Blockchain execution failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Export user data
    this.app.get('/api/v1/user/:userId/export', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        
        const exportData = await this.kvStorageClient.exportUserData(userId);
        
        res.json({
          success: true,
          exportData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Data export error:', error);
        res.status(500).json({
          success: false,
          error: 'Data export failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Setup file upload middleware
    const upload = multer({
      dest: 'uploads/',
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });

    // Contract Intelligence Routes
    this.app.post('/api/v1/contract/analyze', async (req: Request, res: Response) => {
      try {
        const { address } = req.body;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Contract address is required'
          });
        }

        const result = await this.contractAnalysisEngine.analyzeContract(address);
        res.json(result);
      } catch (error) {
        console.error('Contract analysis error:', error);
        res.status(500).json({
          success: false,
          error: 'Contract analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/contract/explore', async (req: Request, res: Response) => {
      try {
        const { address, includeTools = false } = req.body;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Contract address is required'
          });
        }

        const result = await this.contractExplorer.exploreContracts({ address, includeTools });
        res.json(result);
      } catch (error) {
        console.error('Contract exploration error:', error);
        res.status(500).json({
          success: false,
          error: 'Contract exploration failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/contract/generate-tools', async (req: Request, res: Response) => {
      try {
        const { address } = req.body;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Contract address is required'
          });
        }

        // First analyze the contract
        const analysisResult = await this.contractAnalysisEngine.analyzeContract(address);
        if (!analysisResult.success || !analysisResult.contractInfo) {
          return res.status(400).json({
            success: false,
            error: analysisResult.error || 'Contract analysis failed'
          });
        }
        
        // Generate tools
        const result = await this.dynamicToolGenerator.generateToolsForContract(
          analysisResult.contractInfo,
          {
            includeReadFunctions: true,
            includeWriteFunctions: true,
            maxToolsPerContract: 25
          }
        );
        res.json(result);
      } catch (error) {
        console.error('Tool generation error:', error);
        res.status(500).json({
          success: false,
          error: 'Tool generation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/contract/test', async (req: Request, res: Response) => {
      try {
        const { address } = req.body;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Contract address is required'
          });
        }

        const result = await this.testingFramework.testContract(address, {
          includeFunctionTests: true,
          includeSecurityTests: true,
          includeGasAnalysis: true
        });
        res.json(result);
      } catch (error) {
        console.error('Contract testing error:', error);
        res.status(500).json({
          success: false,
          error: 'Contract testing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/contract/stats', async (req: Request, res: Response) => {
      try {
        const analysisStats = this.contractAnalysisEngine.getStats();
        const toolStats = this.dynamicToolGenerator.getStats();
        const explorationStats = this.contractExplorer.getExplorationStats();
        
        const result = {
          success: true,
          analysisStats,
          toolStats,
          explorationStats
        };
        res.json(result);
      } catch (error) {
        console.error('Contract stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get contract stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Storage Routes
    this.app.post('/api/v1/storage/upload', upload.single('file'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded'
          });
        }

        const result = await this.storageClient.uploadFile(req.file.path);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          ...result,
          success: true
        });
      } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
          success: false,
          error: 'File upload failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/storage/download', async (req: Request, res: Response) => {
      try {
        const { rootHash, outputPath } = req.body;
        
        if (!rootHash) {
          return res.status(400).json({
            success: false,
            error: 'Root hash is required'
          });
        }

        const defaultOutputPath = outputPath || `downloads/${rootHash}`;
        const result = await this.storageClient.downloadFile(rootHash, defaultOutputPath);
        res.json({
          ...result,
          success: true
        });
      } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({
          success: false,
          error: 'File download failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/storage/info', async (req: Request, res: Response) => {
      try {
        const { rootHash } = req.body;
        
        if (!rootHash) {
          return res.status(400).json({
            success: false,
            error: 'Root hash is required'
          });
        }

        const result = await this.storageClient.getFileInfo(rootHash);
        res.json({
          ...result,
          success: true
        });
      } catch (error) {
        console.error('File info error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get file info',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/storage/merkle', async (req: Request, res: Response) => {
      try {
        const { filePath } = req.body;
        
        if (!filePath) {
          return res.status(400).json({
            success: false,
            error: 'File path is required'
          });
        }

        const result = await this.storageClient.calculateMerkleRoot(filePath);
        res.json({
          success: true,
          rootHash: result
        });
      } catch (error) {
        console.error('Merkle calculation error:', error);
        res.status(500).json({
          success: false,
          error: 'Merkle calculation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // AI Routes
    this.app.post('/api/v1/ai/initialize', async (req: Request, res: Response) => {
      try {
        const { userId } = req.body;
        
        if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'User ID is required'
          });
        }

        await this.aiStateManager.initializeUser(userId);
        res.json({
          success: true,
          message: `AI initialized for user: ${userId}`
        });
      } catch (error) {
        console.error('AI initialization error:', error);
        res.status(500).json({
          success: false,
          error: 'AI initialization failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/ai/insights', async (req: Request, res: Response) => {
      try {
        const insights = await this.aiStateManager.generateLearningInsights();
        res.json({
          success: true,
          insights
        });
      } catch (error) {
        console.error('AI insights error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get AI insights',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/ai/suggestions', async (req: Request, res: Response) => {
      try {
        const { context } = req.body;
        
        if (!context) {
          return res.status(400).json({
            success: false,
            error: 'Context is required for suggestions'
          });
        }

        const suggestions = this.aiStateManager.getPersonalizedSuggestions(context);
        res.json({
          success: true,
          suggestions
        });
      } catch (error) {
        console.error('AI suggestions error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get AI suggestions',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/ai/memory-stats', async (req: Request, res: Response) => {
      try {
        const stats = this.aiStateManager.getMemoryStats();
        res.json({
          success: true,
          stats
        });
      } catch (error) {
        console.error('AI memory stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get memory stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Network Routes
    this.app.post('/api/v1/network/connect', async (req: Request, res: Response) => {
      try {
        const connected = await this.networkClient.connect();
        res.json({
          success: connected,
          message: connected ? 'Connected to 0G network' : 'Failed to connect to 0G network'
        });
      } catch (error) {
        console.error('Network connection error:', error);
        res.status(500).json({
          success: false,
          error: 'Network connection failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/blockchain/balance', async (req: Request, res: Response) => {
      try {
        const { address } = req.body;
        
        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'Address is required'
          });
        }

        const balance = await this.networkClient.getBalance(address);
        res.json({
          success: true,
          balance,
          address
        });
      } catch (error) {
        console.error('Balance check error:', error);
        res.status(500).json({
          success: false,
          error: 'Balance check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/wallet/connect', async (req: Request, res: Response) => {
      try {
        const { privateKey } = req.body;
        
        if (!privateKey) {
          return res.status(400).json({
            success: false,
            error: 'Private key is required'
          });
        }

        this.networkClient.connectWallet(privateKey);
        this.storageClient.connectWallet(privateKey);
        this.kvStorageClient.connectWallet(privateKey);
        
        const walletAddress = this.networkClient.getWalletAddress();
        
        res.json({
          success: true,
          message: 'Wallet connected successfully',
          walletAddress
        });
      } catch (error) {
        console.error('Wallet connection error:', error);
        res.status(500).json({
          success: false,
          error: 'Wallet connection failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Reject Socket.IO requests when disabled
    if (!this.config.enableSocketIO) {
      this.app.all('/socket.io/*', (req: Request, res: Response) => {
        res.status(404).json({
          error: 'WebSocket connections are disabled',
          message: 'Socket.IO is not available on this server'
        });
      });
    }

    // Static files (for web interface)
    this.app.use('/static', express.static('public'));
    
    // Default route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: '🚀 0G Voice Assistant API Server',
        version: '1.0.0',
        endpoints: [
          'GET /health - Health check',
          'GET /api/version - API version info',
          'POST /api/v1/voice/process - Process voice/text input',
          'POST /api/v1/user/initialize - Initialize user',
          'GET /api/v1/user/:userId/insights - Get learning insights',
          'POST /api/v1/user/:userId/suggestions - Get personalized suggestions',
          'GET /api/v1/network/status - Network status',
          'POST /api/v1/blockchain/execute - Execute blockchain operations',
          'GET /api/v1/user/:userId/export - Export user data'
        ]
      });
    });
  }

  /**
   * Setup Socket.IO for real-time communication
   */
  private setupSocketIO(): void {
    if (!this.config.enableSocketIO) return;

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle voice stream
      socket.on('voice_stream', async (data) => {
        try {
          const { userId, audioChunk, sessionId } = data;
          
          // Process audio chunk in real-time
          // This would integrate with speech-to-text service
          console.log(`🎤 Received audio chunk from user: ${userId}`);
          
          // Echo back for now (placeholder for real voice processing)
          socket.emit('voice_response', {
            success: true,
            message: 'Audio chunk received',
            timestamp: Date.now()
          });
        } catch (error) {
          socket.emit('voice_error', {
            error: 'Voice processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle text input
      socket.on('text_input', async (data) => {
        try {
          const voiceRequest: VoiceRequest = {
            ...data,
            timestamp: Date.now()
          };
          
          const response = await this.processVoiceRequest(voiceRequest);
          socket.emit('text_response', response);
        } catch (error) {
          socket.emit('text_error', {
            error: 'Text processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle session management
      socket.on('start_session', (data) => {
        const { userId, sessionId } = data;
        this.activeSessions.set(sessionId, {
          userId,
          socketId: socket.id,
          startTime: Date.now(),
          lastActivity: Date.now()
        });
        
        socket.emit('session_started', {
          sessionId,
          timestamp: Date.now()
        });
      });

      socket.on('end_session', (data) => {
        const { sessionId } = data;
        this.activeSessions.delete(sessionId);
        
        socket.emit('session_ended', {
          sessionId,
          timestamp: Date.now()
        });
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        
        // Clean up sessions for this socket
        for (const [sessionId, session] of this.activeSessions.entries()) {
          if (session.socketId === socket.id) {
            this.activeSessions.delete(sessionId);
          }
        }
      });
    });
  }

  /**
   * Process voice/text request
   */
  private async processVoiceRequest(request: VoiceRequest): Promise<VoiceResponse> {
    try {
      let textInput = request.textInput;
      
      // Convert audio to text if audio data provided
      if (request.audioData && !textInput) {
        textInput = await this.speechToText(request.audioData);
      }

      if (!textInput) {
        throw new Error('No text input or audio data provided');
      }

      // Initialize user if needed
      await this.aiStateManager.initializeUser(request.userId);

      // Interpret task
      const action = await this.taskInterpreter.interpretTask({
        userInput: textInput,
        priority: 'medium'
      });

      // Get personalized suggestions
      const suggestions = this.aiStateManager.getPersonalizedSuggestions(textInput);

      // For demo purposes, return structured response
      const response: VoiceResponse = {
        success: true,
        response: `I understand you want to: ${action.description}. ${action.steps.length} steps planned.`,
        actionTaken: action.type,
        suggestions,
        learningInsights: await this.aiStateManager.generateLearningInsights()
      };

      // Record conversation for learning
      await this.aiStateManager.recordConversation(
        textInput,
        response.response,
        action.type,
        true
      );

      return response;
    } catch (error) {
      console.error('Voice request processing error:', error);
      return {
        success: false,
        response: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Try rephrasing your request', 'Check your network connection']
      };
    }
  }

  /**
   * Convert speech to text (placeholder implementation)
   */
  private async speechToText(audioData: string): Promise<string> {
    // This would integrate with a real speech-to-text service
    // For now, return a placeholder
    return "Convert audio to text here";
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    try {
      console.log('🔧 Initializing 0G Voice Assistant services...');
      
      // Connect to 0G network
      const connected = await this.networkClient.connect();
      if (connected) {
        console.log('✅ Connected to 0G network');
      } else {
        console.warn('⚠️ Failed to connect to 0G network');
      }

      // Initialize knowledge engine
      console.log('🧠 Initializing knowledge engine...');
      // await this.knowledgeEngine.ingestAllKnowledge(); // This would be done asynchronously

      console.log('✅ All services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
    }
  }

  /**
   * Start the API server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log('🚀 0G Voice Assistant API Server Started');
        console.log('=' .repeat(50));
        console.log(`📡 Server running on port: ${this.config.port}`);
        console.log(`🌐 CORS origins: ${this.config.corsOrigins.join(', ')}`);
        console.log(`🔌 Socket.IO: ${this.config.enableSocketIO ? 'Enabled' : 'Disabled'}`);
        console.log(`🎤 Voice processing: ${this.config.enableVoiceProcessing ? 'Enabled' : 'Disabled'}`);
        console.log(`🔗 0G Network: ${OG_CONFIG.networkName}`);
        console.log('=' .repeat(50));
        console.log('📋 Available endpoints:');
        console.log('  GET  /health - Health check');
        console.log('  GET  /api/version - API version');
        console.log('  POST /api/v1/voice/process - Voice processing');
        console.log('  POST /api/v1/user/initialize - User initialization');
        console.log('  WebSocket /socket.io - Real-time communication');
        console.log('=' .repeat(50));
        resolve();
      });
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down 0G Voice Assistant API Server...');
    
    if (this.io) {
      this.io.close();
    }
    
    this.server.close(() => {
      console.log('✅ Server shutdown complete');
    });
  }
}

export default ZeroGAPIServer;