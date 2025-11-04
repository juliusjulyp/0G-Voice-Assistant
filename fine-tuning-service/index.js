/**
 * 0G Fine-Tuning Service
 * Backend service for AI model fine-tuning operations using the full 0G SDK
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { Wallet, JsonRpcProvider } from 'ethers';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({ 
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// 0G Configuration
const ZG_CONFIG = {
  privateKey: process.env.ZG_PRIVATE_KEY,
  rpcUrl: process.env.ZG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
  chainId: parseInt(process.env.ZG_CHAIN_ID || '16602')
};

// Global broker instance
let zgBroker = null;
let wallet = null;

/**
 * Initialize 0G Broker with private key
 */
async function initializeZGBroker() {
  try {
    console.log('🤖 Initializing 0G Serving Broker...');
    
    if (!ZG_CONFIG.privateKey) {
      throw new Error('ZG_PRIVATE_KEY not configured in environment');
    }

    // Create wallet and provider with explicit network config
    const networkConfig = {
      name: '0G-Galileo-Testnet',
      chainId: ZG_CONFIG.chainId,
      ensAddress: null
    };
    
    const provider = new JsonRpcProvider(ZG_CONFIG.rpcUrl, networkConfig);
    wallet = new Wallet(ZG_CONFIG.privateKey, provider);
    
    console.log(`📱 Wallet Address: ${wallet.address}`);
    
    // Initialize broker
    zgBroker = await createZGComputeNetworkBroker(wallet);
    
    console.log('✅ 0G Serving Broker initialized successfully');
    
    // Check account balance
    try {
      const account = await zgBroker.ledger.getLedger();
      console.log(`💰 0G Account Balance: ${account.balance} tokens`);
    } catch (error) {
      console.warn('⚠️ Could not check account balance:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize 0G Broker:', error);
    return false;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '0G Fine-Tuning Service',
    brokerInitialized: !!zgBroker,
    walletAddress: wallet?.address
  });
});

/**
 * Get available models for fine-tuning
 */
app.get('/api/models', async (req, res) => {
  try {
    if (!zgBroker) {
      return res.status(503).json({ error: 'Broker not initialized' });
    }

    // Get available services/models
    const services = await zgBroker.inference.listService();
    
    // Filter for supported fine-tuning models
    const supportedModels = services.filter(service => 
      ['llama-3-8b-instruct', 'llama-3-70b-instruct', 'mistral-7b-v0.3'].includes(service.model)
    );
    
    res.json({
      models: supportedModels,
      total: supportedModels.length
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload dataset for fine-tuning
 */
app.post('/api/upload-dataset', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No dataset file uploaded' });
    }

    const { originalname, filename, path: filePath, size } = req.file;
    
    console.log(`📁 Dataset uploaded: ${originalname} (${size} bytes)`);
    
    // Validate JSONL format
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Validate each line is valid JSON
    const dataset = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        if (!entry.messages || !Array.isArray(entry.messages)) {
          throw new Error(`Invalid format at line ${i + 1}: missing 'messages' array`);
        }
        dataset.push(entry);
      } catch (error) {
        return res.status(400).json({ 
          error: `Invalid JSONL format at line ${i + 1}: ${error.message}` 
        });
      }
    }
    
    console.log(`✅ Validated dataset: ${dataset.length} training examples`);
    
    res.json({
      success: true,
      filename: originalname,
      size,
      examples: dataset.length,
      uploadId: filename
    });
    
  } catch (error) {
    console.error('Error uploading dataset:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload dataset to 0G Storage
 */
app.post('/api/upload-to-storage', async (req, res) => {
  try {
    const { uploadId } = req.body;
    
    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID required' });
    }
    
    if (!zgBroker) {
      return res.status(503).json({ error: 'Broker not initialized' });
    }
    
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', uploadId);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Upload file not found' });
    }
    
    console.log('📤 Uploading dataset to 0G Storage...');
    
    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Upload to 0G Storage
    // Note: This is a simplified version - actual implementation depends on 0G Storage API
    const uploadResult = await zgBroker.storage.upload({
      data: fileContent,
      filename: `fine-tune-dataset-${Date.now()}.jsonl`
    });
    
    console.log('✅ Dataset uploaded to 0G Storage');
    console.log(`📋 Storage Hash: ${uploadResult.hash}`);
    
    res.json({
      success: true,
      storageHash: uploadResult.hash,
      size: fileContent.length
    });
    
  } catch (error) {
    console.error('Error uploading to storage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create fine-tuning job
 */
app.post('/api/fine-tune', async (req, res) => {
  try {
    const { 
      baseModel, 
      datasetHash, 
      jobName,
      hyperparameters = {}
    } = req.body;
    
    if (!baseModel || !datasetHash) {
      return res.status(400).json({ 
        error: 'baseModel and datasetHash are required' 
      });
    }
    
    if (!zgBroker) {
      return res.status(503).json({ error: 'Broker not initialized' });
    }
    
    console.log(`🎯 Creating fine-tuning job for model: ${baseModel}`);
    
    const fineTuningParams = {
      model: baseModel,
      training_file: datasetHash,
      validation_file: datasetHash, // Using same file for validation
      suffix: jobName || `0g-assistant-${Date.now()}`,
      n_epochs: hyperparameters.epochs || 3,
      batch_size: hyperparameters.batchSize || 4,
      learning_rate_multiplier: hyperparameters.learningRate || 0.1
    };
    
    // Create fine-tuning job
    const job = await zgBroker.fineTuning.createJob(fineTuningParams);
    
    console.log('✅ Fine-tuning job created');
    console.log(`🆔 Job ID: ${job.id}`);
    
    res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      model: baseModel,
      datasetHash,
      parameters: fineTuningParams
    });
    
  } catch (error) {
    console.error('Error creating fine-tuning job:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get fine-tuning job status
 */
app.get('/api/fine-tune/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!zgBroker) {
      return res.status(503).json({ error: 'Broker not initialized' });
    }
    
    const job = await zgBroker.fineTuning.getJob(jobId);
    
    res.json({
      jobId: job.id,
      status: job.status,
      model: job.model,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
      hyperparameters: job.hyperparameters,
      resultFiles: job.result_files
    });
    
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all fine-tuning jobs
 */
app.get('/api/fine-tune-jobs', async (req, res) => {
  try {
    if (!zgBroker) {
      return res.status(503).json({ error: 'Broker not initialized' });
    }
    
    const jobs = await zgBroker.fineTuning.listJobs();
    
    res.json({
      jobs: jobs.data || [],
      total: jobs.data?.length || 0
    });
    
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start the server
 */
async function startServer() {
  // Ensure directories exist
  await fs.ensureDir(process.env.UPLOAD_DIR || './uploads');
  await fs.ensureDir(process.env.DATASET_DIR || './datasets');
  await fs.ensureDir(process.env.MODELS_DIR || './models');
  
  // Initialize 0G Broker
  const brokerInitialized = await initializeZGBroker();
  
  if (!brokerInitialized) {
    console.warn('⚠️ Broker initialization failed - some endpoints will not work');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 0G Fine-Tuning Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Broker status: ${brokerInitialized ? 'Ready' : 'Failed'}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down 0G Fine-Tuning Service...');
  process.exit(0);
});

// Start the service
startServer().catch(error => {
  console.error('❌ Failed to start service:', error);
  process.exit(1);
});