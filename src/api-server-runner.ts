#!/usr/bin/env node

import dotenv from 'dotenv';
import ZeroGAPIServer from './api-server.js';

// Load environment variables
dotenv.config();

async function startServer() {
  console.log('🚀 Starting 0G Voice Assistant API Server...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  const server = new ZeroGAPIServer();
  
  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    await server.start();
    console.log('✅ 0G Voice Assistant API Server is ready!');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);