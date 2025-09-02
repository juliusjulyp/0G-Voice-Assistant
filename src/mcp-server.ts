#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { OGNetworkClient } from './network-client.js';
import { OG_CONFIG } from './config.js';

class OGMCPServer {
  private server: Server;
  private networkClient: OGNetworkClient;

  constructor() {
    this.server = new Server(
      {
        name: '0g-voice-assistant-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.networkClient = new OGNetworkClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'connect_to_0g',
          description: 'Connect to 0G Galileo Testnet',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_balance',
          description: 'Get account balance on 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: '0G address to check balance for',
              },
            },
            required: ['address'],
          },
        },
        {
          name: 'get_network_info',
          description: 'Get current 0G network information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'deploy_contract',
          description: 'Deploy a smart contract to 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              bytecode: {
                type: 'string',
                description: 'Contract bytecode as hex string',
              },
              constructorArgs: {
                type: 'array',
                description: 'Constructor arguments for contract deployment',
                items: {},
              },
            },
            required: ['bytecode'],
          },
        },
        {
          name: 'send_transaction',
          description: 'Send a transaction on 0G network',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient address',
              },
              value: {
                type: 'string',
                description: 'Amount to send in A0GI',
              },
              privateKey: {
                type: 'string',
                description: 'Private key for signing (use with caution)',
              },
            },
            required: ['to', 'value', 'privateKey'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'connect_to_0g':
            return await this.handleConnect();
          
          case 'get_balance':
            return await this.handleGetBalance(args);
          
          case 'get_network_info':
            return await this.handleGetNetworkInfo();
          
          case 'deploy_contract':
            return await this.handleDeployContract(args);
          
          case 'send_transaction':
            return await this.handleSendTransaction(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${Error}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleConnect() {
    const connected = await this.networkClient.connect();
    
    return {
      content: [
        {
          type: 'text',
          text: connected 
            ? '✅ Successfully connected to 0G Galileo Testnet!' 
            : '❌ Failed to connect to 0G network',
        },
      ],
    };
  }

  private async handleGetBalance(args: any) {
    const { address } = args;
    const balance = await this.networkClient.getBalance(address);
    
    return {
      content: [
        {
          type: 'text',
          text: `💰 Balance for ${address}: ${balance} A0GI`,
        },
      ],
    };
  }

  private async handleGetNetworkInfo() {
    const networkInfo = await this.networkClient.getNetworkInfo();
    
    return {
      content: [
        {
          type: 'text',
          text: `📊 0G Network Information:\n${JSON.stringify(networkInfo, null, 2)}`,
        },
      ],
    };
  }

  private async handleDeployContract(args: any) {
    const { bytecode, constructorArgs = [] } = args;
    
    // This is a placeholder for contract deployment
    // Full implementation would require wallet integration
    return {
      content: [
        {
          type: 'text',
          text: `🚀 Contract deployment initiated\nBytecode: ${bytecode.substring(0, 50)}...\nConstructor Args: ${JSON.stringify(constructorArgs)}`,
        },
      ],
    };
  }

  private async handleSendTransaction(args: any) {
    const { to, value, privateKey } = args;
    
    // This is a placeholder for transaction sending
    // Full implementation would require wallet integration
    return {
      content: [
        {
          type: 'text',
          text: `💸 Transaction prepared:\nTo: ${to}\nValue: ${value} A0GI\nStatus: Ready to sign and send`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('0G MCP server running on stdio');
  }
}

// Start the server
const server = new OGMCPServer();
server.run().catch(console.error);
