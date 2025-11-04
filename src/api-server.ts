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
import OGComputeClient from './ai-compute-client.js';
import ZeroGPrecompiledContractsClient from './precompiled-contracts-client.js';
import AIVoiceCommandHandler from './ai-voice-commands.js';
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
  private computeClient: OGComputeClient;
  private precompiledClient: ZeroGPrecompiledContractsClient;
  private voiceCommandHandler: AIVoiceCommandHandler;
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
    this.computeClient = new OGComputeClient(this.networkClient);
    this.precompiledClient = new ZeroGPrecompiledContractsClient(this.networkClient);
    this.voiceCommandHandler = new AIVoiceCommandHandler(
      this.networkClient,
      this.storageClient,
      this.kvStorageClient,
      this.computeClient,
      this.precompiledClient
    );

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
          await this.computeClient.connectWallet(privateKey);
          this.precompiledClient.connectWallet(privateKey);
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

    this.app.post('/api/v1/storage/stream/upload', upload.single('file'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded'
          });
        }

        const { chunkSize = 1024 * 1024 } = req.body;

        const result = await this.storageClient.streamUpload(req.file.path, parseInt(chunkSize));
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          success: true,
          result,
          message: 'Stream upload completed successfully'
        });
      } catch (error) {
        console.error('Stream upload error:', error);
        res.status(500).json({
          success: false,
          error: 'Stream upload failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/storage/stream/download', async (req: Request, res: Response) => {
      try {
        const { rootHash, outputPath, chunkSize = 1024 * 1024 } = req.body;
        
        if (!rootHash) {
          return res.status(400).json({
            success: false,
            error: 'Root hash is required'
          });
        }

        const defaultOutputPath = outputPath || `downloads/stream_${rootHash}`;
        const result = await this.storageClient.streamDownload(rootHash, defaultOutputPath, parseInt(chunkSize));
        
        res.json({
          success: true,
          result,
          message: 'Stream download completed successfully'
        });
      } catch (error) {
        console.error('Stream download error:', error);
        res.status(500).json({
          success: false,
          error: 'Stream download failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/storage/stream/upload-chunks', async (req: Request, res: Response) => {
      try {
        const { chunks, streamId } = req.body;
        
        if (!Array.isArray(chunks) || chunks.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Chunks array is required'
          });
        }

        // Convert base64 chunks to buffers
        const bufferChunks = chunks.map(chunk => Buffer.from(chunk, 'base64'));
        
        const result = await this.storageClient.uploadFromStream(bufferChunks, streamId);
        
        res.json({
          success: true,
          result,
          message: 'Stream upload from chunks completed successfully'
        });
      } catch (error) {
        console.error('Stream upload from chunks error:', error);
        res.status(500).json({
          success: false,
          error: 'Stream upload from chunks failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/storage/stream/stats', async (req: Request, res: Response) => {
      try {
        const stats = this.storageClient.getStreamingStats();
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Streaming stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get streaming stats',
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

    // AI Compute Network Routes
    this.app.get('/api/v1/compute/providers', async (req: Request, res: Response) => {
      try {
        const providers = await this.computeClient.getComputeProviders();
        res.json({
          success: true,
          providers,
          count: providers.length
        });
      } catch (error) {
        console.error('Compute providers error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get compute providers',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/compute/deploy-model', upload.single('model'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No model file uploaded'
          });
        }

        const { name, type, description } = req.body;
        
        if (!name || !type) {
          return res.status(400).json({
            success: false,
            error: 'Model name and type are required'
          });
        }

        const modelBuffer = fs.readFileSync(req.file.path);
        
        const modelId = await this.computeClient.deployModel(modelBuffer, {
          name,
          type,
          description: description || `${type} model deployed via 0G Voice Assistant`
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          modelId,
          message: 'Model deployed successfully to 0G Compute Network',
          balance: this.computeClient.getAccountBalance()
        });
      } catch (error) {
        console.error('Model deployment error:', error);
        res.status(500).json({
          success: false,
          error: 'Model deployment failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/compute/inference', async (req: Request, res: Response) => {
      try {
        const { modelId, inputData, options = {} } = req.body;
        
        if (!modelId || !inputData) {
          return res.status(400).json({
            success: false,
            error: 'Model ID and input data are required'
          });
        }

        const inferenceJob = await this.computeClient.runInference(modelId, inputData, options);

        res.json({
          success: true,
          job: inferenceJob,
          output: inferenceJob.output_data,
          cost: inferenceJob.cost,
          latency: inferenceJob.latency_ms,
          balance: this.computeClient.getAccountBalance()
        });
      } catch (error) {
        console.error('Inference error:', error);
        res.status(500).json({
          success: false,
          error: 'Inference failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/compute/fine-tune', upload.single('dataset'), async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No dataset file uploaded'
          });
        }

        const { baseModelId, epochs, learning_rate, provider_id } = req.body;
        
        if (!baseModelId) {
          return res.status(400).json({
            success: false,
            error: 'Base model ID is required'
          });
        }

        const datasetBuffer = fs.readFileSync(req.file.path);
        
        const fineTuningJob = await this.computeClient.fineTuneModel(baseModelId, datasetBuffer, {
          epochs: epochs ? parseInt(epochs) : undefined,
          learning_rate: learning_rate ? parseFloat(learning_rate) : undefined,
          provider_id
        });

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          job: fineTuningJob,
          estimatedCost: fineTuningJob.estimated_cost,
          balance: this.computeClient.getAccountBalance()
        });
      } catch (error) {
        console.error('Fine-tuning error:', error);
        res.status(500).json({
          success: false,
          error: 'Fine-tuning failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/compute/stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.computeClient.getUsageStats();
        const balance = this.computeClient.getAccountBalance();
        const isConnected = this.computeClient.isWalletConnected();

        res.json({
          success: true,
          stats,
          balance,
          isConnected,
          walletAddress: this.computeClient.getWalletAddress()
        });
      } catch (error) {
        console.error('Compute stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get compute stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/compute/deposit', async (req: Request, res: Response) => {
      try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid amount is required'
          });
        }

        const txHash = await this.computeClient.depositFunds(parseFloat(amount));

        res.json({
          success: true,
          transactionHash: txHash,
          newBalance: this.computeClient.getAccountBalance(),
          message: `Deposited ${amount} 0G to compute account`
        });
      } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
          success: false,
          error: 'Deposit failed',
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
        await this.computeClient.connectWallet(privateKey);
        this.precompiledClient.connectWallet(privateKey);
        
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

    // Enhanced KV Storage Routes
    this.app.post('/api/v1/kv/set', async (req: Request, res: Response) => {
      try {
        const { key, value, ttl } = req.body;
        
        if (!key || value === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Key and value are required'
          });
        }

        const result = await this.kvStorageClient.setKV(key, value, ttl);
        res.json({
          success: true,
          result,
          key,
          message: 'Key-value pair stored successfully'
        });
      } catch (error) {
        console.error('KV set error:', error);
        res.status(500).json({
          success: false,
          error: 'KV set failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/kv/get/:key', async (req: Request, res: Response) => {
      try {
        const { key } = req.params;
        
        const value = await this.kvStorageClient.getKV(key);
        
        if (value === null) {
          return res.status(404).json({
            success: false,
            error: 'Key not found'
          });
        }

        res.json({
          success: true,
          key,
          value,
          message: 'Value retrieved successfully'
        });
      } catch (error) {
        console.error('KV get error:', error);
        res.status(500).json({
          success: false,
          error: 'KV get failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/kv/list', async (req: Request, res: Response) => {
      try {
        const { prefix, limit = 100, offset = 0, reverse = false } = req.query;
        
        const options = {
          prefix: prefix as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          reverse: reverse === 'true'
        };

        const keys = await this.kvStorageClient.listKeys(options);
        res.json({
          success: true,
          keys,
          count: keys.length,
          options
        });
      } catch (error) {
        console.error('KV list error:', error);
        res.status(500).json({
          success: false,
          error: 'KV list failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/kv/batch', async (req: Request, res: Response) => {
      try {
        const { operations } = req.body;
        
        if (!Array.isArray(operations) || operations.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Operations array is required'
          });
        }

        // Convert operations to proper format
        const batchOps = operations.map(op => ({
          key: op.key,
          value: Buffer.from(JSON.stringify(op.value)),
          operation: op.operation || 'set'
        }));

        const results = await this.kvStorageClient.batchSet(batchOps);
        res.json({
          success: true,
          results,
          operationsCount: operations.length,
          message: 'Batch operation completed'
        });
      } catch (error) {
        console.error('KV batch error:', error);
        res.status(500).json({
          success: false,
          error: 'KV batch failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.delete('/api/v1/kv/:key', async (req: Request, res: Response) => {
      try {
        const { key } = req.params;
        
        const success = await this.kvStorageClient.deleteKV(key);
        res.json({
          success,
          key,
          message: success ? 'Key deleted successfully' : 'Key not found'
        });
      } catch (error) {
        console.error('KV delete error:', error);
        res.status(500).json({
          success: false,
          error: 'KV delete failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/kv/stream/subscribe', async (req: Request, res: Response) => {
      try {
        const { streamId } = req.body;
        
        if (!streamId) {
          return res.status(400).json({
            success: false,
            error: 'Stream ID is required'
          });
        }

        const subscriptionId = await this.kvStorageClient.subscribeToStream(
          streamId,
          (data) => {
            // In a real implementation, this would use WebSocket to push data
            console.log('Stream update:', data);
          }
        );

        res.json({
          success: true,
          subscriptionId,
          streamId,
          message: 'Subscribed to stream successfully'
        });
      } catch (error) {
        console.error('Stream subscribe error:', error);
        res.status(500).json({
          success: false,
          error: 'Stream subscription failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/kv/stream/upload', async (req: Request, res: Response) => {
      try {
        const { streamId, chunks } = req.body;
        
        if (!streamId || !Array.isArray(chunks)) {
          return res.status(400).json({
            success: false,
            error: 'Stream ID and chunks array are required'
          });
        }

        // Convert chunks to Buffer array
        const dataStream = chunks.map(chunk => Buffer.from(chunk, 'base64'));
        
        const uploadId = await this.kvStorageClient.streamUpload(streamId, dataStream);
        res.json({
          success: true,
          uploadId,
          streamId,
          chunksCount: chunks.length,
          message: 'Stream upload completed successfully'
        });
      } catch (error) {
        console.error('Stream upload error:', error);
        res.status(500).json({
          success: false,
          error: 'Stream upload failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/kv/stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.kvStorageClient.getEnhancedStorageStats();
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('KV stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get KV stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // AI Voice Commands Routes
    this.app.post('/api/v1/ai/voice-command', async (req: Request, res: Response) => {
      try {
        const { command, userId } = req.body;
        
        if (!command) {
          return res.status(400).json({
            success: false,
            error: 'Voice command is required'
          });
        }

        // Auto-connect test wallet for AI operations if not already connected
        const testPrivateKey = process.env.ZERO_G_PRIVATE_KEY;
        if (testPrivateKey && !this.kvStorageClient.isWalletConnected()) {
          console.log('🔑 Auto-connecting test wallet for AI operations...');
          this.networkClient.connectWallet(testPrivateKey);
          this.kvStorageClient.connectWallet(testPrivateKey);
          await this.computeClient.connectWallet(testPrivateKey);
          this.precompiledClient.connectWallet(testPrivateKey);
        }

        // Initialize user if provided
        if (userId) {
          await this.aiStateManager.initializeUser(userId);
        }

        const result = await this.voiceCommandHandler.processVoiceCommand(command);
        
        // Record conversation for learning if user provided
        if (userId) {
          await this.aiStateManager.recordConversation(
            command,
            result.response,
            result.actionTaken || 'voice_command',
            result.success,
            undefined, // No gas used for voice commands
            undefined  // No transaction hash for voice commands
          );
        }

        res.json({
          success: result.success,
          response: result.response,
          data: result.data,
          actionTaken: result.actionTaken,
          suggestions: result.suggestions,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('AI voice command error:', error);
        res.status(500).json({
          success: false,
          error: 'AI voice command failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/ai/commands', async (req: Request, res: Response) => {
      try {
        const { category } = req.query;
        
        let commands;
        if (category) {
          commands = this.voiceCommandHandler.getCommandsByCategory(category as string);
        } else {
          commands = this.voiceCommandHandler.getAvailableCommands();
        }
        
        res.json({
          success: true,
          commands,
          count: commands.length,
          category: category || 'all'
        });
      } catch (error) {
        console.error('Get AI commands error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get AI commands',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/ai/commands/stats', async (req: Request, res: Response) => {
      try {
        const stats = this.voiceCommandHandler.getCommandStats();
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('AI command stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get AI command stats',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/ai/optimize', async (req: Request, res: Response) => {
      try {
        const { modelType, operation } = req.body;
        
        if (!operation) {
          return res.status(400).json({
            success: false,
            error: 'Operation type is required (e.g., "optimize model for 0G")'
          });
        }

        const result = await this.voiceCommandHandler.processVoiceCommand(`optimize ${modelType || 'model'} for 0G network`);
        
        res.json({
          success: result.success,
          optimization: result.data,
          recommendations: result.suggestions,
          message: result.response
        });
      } catch (error) {
        console.error('AI optimization error:', error);
        res.status(500).json({
          success: false,
          error: 'AI optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/ai/cost-estimate', async (req: Request, res: Response) => {
      try {
        const { operation, quantity, modelType } = req.body;
        
        if (!operation) {
          return res.status(400).json({
            success: false,
            error: 'Operation type is required (inference, training, deployment, storage)'
          });
        }

        const command = `estimate cost for ${quantity || 100} ${operation} operations`;
        const result = await this.voiceCommandHandler.processVoiceCommand(command);
        
        res.json({
          success: result.success,
          estimate: result.data,
          breakdown: {
            operation,
            quantity: quantity || 100,
            modelType: modelType || 'general'
          },
          message: result.response
        });
      } catch (error) {
        console.error('AI cost estimation error:', error);
        res.status(500).json({
          success: false,
          error: 'AI cost estimation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Precompiled Contracts Routes
    this.app.post('/api/v1/precompile/da/sign', async (req: Request, res: Response) => {
      try {
        const { data } = req.body;
        
        if (!data) {
          return res.status(400).json({
            success: false,
            error: 'Data to sign is required'
          });
        }

        const signature = await this.precompiledClient.signData(data);
        res.json({
          success: true,
          signature,
          message: 'Data signed successfully'
        });
      } catch (error) {
        console.error('DA signing error:', error);
        res.status(500).json({
          success: false,
          error: 'DA signing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/da/verify', async (req: Request, res: Response) => {
      try {
        const { dataHash, signature } = req.body;
        
        if (!dataHash || !signature) {
          return res.status(400).json({
            success: false,
            error: 'Data hash and signature are required'
          });
        }

        const isValid = await this.precompiledClient.verifySignature(dataHash, signature);
        res.json({
          success: true,
          isValid,
          dataHash,
          message: isValid ? 'Signature is valid' : 'Signature is invalid'
        });
      } catch (error) {
        console.error('DA verification error:', error);
        res.status(500).json({
          success: false,
          error: 'DA verification failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/da/multisig', async (req: Request, res: Response) => {
      try {
        const { data, requiredSigners, threshold, expirationTime } = req.body;
        
        if (!data) {
          return res.status(400).json({
            success: false,
            error: 'Data is required for multi-signature request'
          });
        }

        const signingRequest = {
          data,
          requiredSigners,
          threshold,
          expirationTime: expirationTime ? new Date(expirationTime) : undefined
        };

        const result = await this.precompiledClient.createSigningRequest(signingRequest);
        res.json({
          success: true,
          result,
          message: 'Multi-signature request created successfully'
        });
      } catch (error) {
        console.error('Multi-signature request error:', error);
        res.status(500).json({
          success: false,
          error: 'Multi-signature request failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/wrapped/wrap', async (req: Request, res: Response) => {
      try {
        const { amount } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid amount is required'
          });
        }

        const result = await this.precompiledClient.wrapTokens(amount);
        res.json({
          success: true,
          result,
          message: `Successfully wrapped ${amount} 0G tokens`
        });
      } catch (error) {
        console.error('Token wrapping error:', error);
        res.status(500).json({
          success: false,
          error: 'Token wrapping failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/wrapped/unwrap', async (req: Request, res: Response) => {
      try {
        const { amount } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid amount is required'
          });
        }

        const result = await this.precompiledClient.unwrapTokens(amount);
        res.json({
          success: true,
          result,
          message: `Successfully unwrapped ${amount} w0G tokens`
        });
      } catch (error) {
        console.error('Token unwrapping error:', error);
        res.status(500).json({
          success: false,
          error: 'Token unwrapping failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/wrapped/delegate', async (req: Request, res: Response) => {
      try {
        const { delegate, amount } = req.body;
        
        if (!delegate || !amount || parseFloat(amount) <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid delegate address and amount are required'
          });
        }

        const result = await this.precompiledClient.delegateTokens(delegate, amount);
        res.json({
          success: true,
          result,
          message: `Successfully delegated ${amount} w0G tokens to ${delegate}`
        });
      } catch (error) {
        console.error('Token delegation error:', error);
        res.status(500).json({
          success: false,
          error: 'Token delegation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/ai/deploy', async (req: Request, res: Response) => {
      try {
        const { modelHash, inferencePrice } = req.body;
        
        if (!modelHash || !inferencePrice) {
          return res.status(400).json({
            success: false,
            error: 'Model hash and inference price are required'
          });
        }

        const model = await this.precompiledClient.deployAIModel(modelHash, inferencePrice);
        res.json({
          success: true,
          model,
          message: 'AI model deployed successfully via precompile'
        });
      } catch (error) {
        console.error('AI model deployment error:', error);
        res.status(500).json({
          success: false,
          error: 'AI model deployment failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.post('/api/v1/precompile/ai/inference', async (req: Request, res: Response) => {
      try {
        const { modelId, inputData, maxTokens, temperature, priority } = req.body;
        
        if (!modelId || !inputData) {
          return res.status(400).json({
            success: false,
            error: 'Model ID and input data are required'
          });
        }

        const inferenceRequest = {
          modelId,
          inputData,
          maxTokens,
          temperature,
          priority
        };

        const result = await this.precompiledClient.runAIInference(inferenceRequest);
        res.json({
          success: true,
          result,
          message: 'AI inference completed successfully'
        });
      } catch (error) {
        console.error('AI inference error:', error);
        res.status(500).json({
          success: false,
          error: 'AI inference failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/precompile/ai/model/:modelId', async (req: Request, res: Response) => {
      try {
        const { modelId } = req.params;
        
        const model = await this.precompiledClient.getAIModelInfo(modelId);
        
        if (!model) {
          return res.status(404).json({
            success: false,
            error: 'Model not found'
          });
        }

        res.json({
          success: true,
          model,
          message: 'Model information retrieved successfully'
        });
      } catch (error) {
        console.error('Model info error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get model information',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.get('/api/v1/precompile/stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.precompiledClient.getPrecompileStats();
        res.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Precompile stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get precompile stats',
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