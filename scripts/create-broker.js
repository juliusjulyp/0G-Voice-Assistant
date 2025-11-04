#!/usr/bin/env node

/**
 *  0G Broker Account Creation Script
 * Uses actual @0glabs/0g-serving-broker package
 * 
 * Prerequisites:
 * 1. npm install in the main project directory
 * 2. Have a private key or use environment variables
 * 3. Be connected to 0G Galileo Testnet
 * 
 * Usage:
 * node scripts/create-real-broker.js
 */

import { JsonRpcProvider, Wallet, formatEther, parseEther } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '/home/julypjulius/0G-Voice-Assistant/.env' });

// 0G Galileo Testnet Configuration
const ZERO_G_RPC_URLS = [
    'https://evmrpc-testnet.0g.ai',
    'https://0g-galileo-testnet.drpc.org',
    'https://rpc-testnet.0g.ai'
];
const ZERO_G_CHAIN_ID = 16602;

class RealBrokerSetup {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.broker = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    async setupProvider() {
        this.log('Setting up 0G Galileo Testnet provider...');
        
        // Try multiple RPC URLs
        for (const rpcUrl of ZERO_G_RPC_URLS) {
            try {
                this.log(`Trying RPC: ${rpcUrl}`);
                
                // Connect to 0G Galileo Testnet
                this.provider = new JsonRpcProvider(rpcUrl);
                
                // Verify network with timeout
                const networkPromise = this.provider.getNetwork();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('RPC timeout')), 5000)
                );
                
                const network = await Promise.race([networkPromise, timeoutPromise]);
                
                if (Number(network.chainId) !== ZERO_G_CHAIN_ID) {
                    throw new Error(`Connected to wrong network. Expected ${ZERO_G_CHAIN_ID}, got ${Number(network.chainId)}`);
                }
                
                this.log(`✅ Connected to 0G Galileo Testnet (Chain ID: ${Number(network.chainId)})`, 'success');
                this.log(`✅ Using RPC: ${rpcUrl}`, 'success');
                return true;
                
            } catch (error) {
                this.log(`❌ Failed with ${rpcUrl}: ${error.message}`);
                continue;
            }
        }
        
        this.log('❌ All RPC endpoints failed. Check your internet connection.', 'error');
        return false;
    }

    async setupWallet() {
        this.log('Setting up wallet...');
        
        try {
            // Check for environment variable first
            let privateKey = process.env.PRIVATE_KEY || process.env.ZERO_G_PRIVATE_KEY;
            
            if (!privateKey) {
                console.log('\n💡 To get your MetaMask private key:');
                console.log('1. Open MetaMask → Click your account → Account details');
                console.log('2. Click "Export private key" → Enter password');
                console.log('3. Copy the private key\n');
                
                privateKey = await this.prompt('Paste your MetaMask private key (starts with 0x): ');
                if (!privateKey.startsWith('0x')) {
                    privateKey = '0x' + privateKey;
                }
                
                if (privateKey.length !== 66) {
                    this.log('Invalid private key format. Should be 64 characters after 0x', 'error');
                    return false;
                }
            }
            
            // Create wallet with provider
            this.signer = new Wallet(privateKey, this.provider);
            const address = await this.signer.getAddress();
            
            // Check balance
            const balance = await this.provider.getBalance(address);
            const balanceFormatted = formatEther(balance);
            
            this.log(`Wallet address: ${address}`, 'success');
            this.log(`Wallet balance: ${balanceFormatted} 0G`);
            
            if (Number(balanceFormatted) < 0.1) {
                this.log('⚠️  Low balance. You may need more testnet tokens for gas fees.', 'error');
                this.log('Get testnet tokens from: https://faucet.0g.ai', 'error');
            }
            
            return true;
            
        } catch (error) {
            this.log(`Wallet setup failed: ${error.message}`, 'error');
            return false;
        }
    }

    async createBroker() {
        this.log('Creating 0G Compute Network Broker...');
        
        try {
            // Use  createZGComputeNetworkBroker function
            this.broker = await createZGComputeNetworkBroker(this.signer);
            
            this.log('Broker created successfully!', 'success');
            return true;
            
        } catch (error) {
            this.log(`Broker creation failed: ${error.message}`, 'error');
            this.log('Make sure you have the latest @0glabs/0g-serving-broker package', 'error');
            return false;
        }
    }

    async checkExistingAccount() {
        this.log('Checking for existing broker account...');
        
        try {
            const account = await this.broker.ledger.getLedger();
            const balance = formatEther(account.totalBalance);
            
            if (Number(balance) > 0) {
                this.log(`Existing account found with balance: ${balance} 0G`, 'success');
                return true;
            } else {
                this.log('No existing funded account found');
                return false;
            }
            
        } catch (error) {
            this.log('No existing account found. Will create new account...');
            return false;
        }
    }

    async fundAccount() {
        this.log('Setting up account funding...');
        
        try {
            // Get funding amount
            const defaultAmount = '1.0';
            let amountInput;
            try {
                amountInput = await this.prompt(`Enter funding amount in 0G (default: ${defaultAmount}): `);
            } catch (error) {
                // If prompt fails (non-interactive), use default
                this.log(`Using default amount: ${defaultAmount} 0G`);
                amountInput = defaultAmount;
            }
            const amount = amountInput.trim() || defaultAmount;
            const amountFloat = parseFloat(amount);
            
            if (isNaN(amountFloat) || amountFloat <= 0) {
                this.log('Invalid amount entered', 'error');
                return false;
            }

            this.log(`Funding broker account with ${amountFloat} 0G...`);
            
            // Check wallet balance
            const walletBalance = await this.provider.getBalance(await this.signer.getAddress());
            const walletBalanceFloat = Number(formatEther(walletBalance));
            
            if (walletBalanceFloat < amountFloat) {
                this.log(`Insufficient wallet balance. Required: ${amountFloat} 0G, Available: ${walletBalanceFloat} 0G`, 'error');
                return false;
            }

            // Fund the broker account  API
            const tx = await this.broker.ledger.addLedger(parseEther(amount.toString()));
            this.log(`Transaction submitted: ${tx.hash}`);
            this.log('Waiting for confirmation...');
            
            const receipt = await tx.wait();
            this.log(`Transaction confirmed in block: ${receipt.blockNumber}`, 'success');
            this.log(`Account successfully funded with ${amountFloat} 0G!`, 'success');
            
            return true;
            
        } catch (error) {
            this.log(`Account funding failed: ${error.message}`, 'error');
            return false;
        }
    }

    async verifyAccount() {
        this.log('Verifying broker account...');
        
        try {
            const account = await this.broker.ledger.getLedger();
            const balance = formatEther(account.totalBalance);
            const address = await this.signer.getAddress();
            
            console.log('\n' + '='.repeat(60));
            this.log('🎉 BROKER ACCOUNT SETUP COMPLETE! 🎉', 'success');
            console.log('='.repeat(60));
            this.log(`Wallet Address: ${address}`);
            this.log(`Broker Balance: ${balance} 0G`);
            this.log(`Account Status: Active and Ready for AI Operations`);
            console.log('='.repeat(60));
            
            this.log('Your broker account is ready for the 0G Voice Assistant!', 'success');
            this.log('You can now delete this script if desired.', 'success');
            
            return true;
            
        } catch (error) {
            this.log(`Account verification failed: ${error.message}`, 'error');
            return false;
        }
    }

    async cleanup() {
        this.rl.close();
    }

    async run() {
        console.log('\n🚀  0G Broker Account Setup\n');
        console.log('This script creates an actual broker account using the 0G SDK.\n');
        
        try {
            // Step 1: Setup provider
            if (!await this.setupProvider()) {
                await this.cleanup();
                return;
            }

            // Step 2: Setup wallet
            if (!await this.setupWallet()) {
                await this.cleanup();
                return;
            }

            // Step 3: Create broker
            if (!await this.createBroker()) {
                await this.cleanup();
                return;
            }

            // Step 4: Check existing account
            if (await this.checkExistingAccount()) {
                await this.verifyAccount();
                await this.cleanup();
                return;
            }

            // Step 5: Fund account
            if (!await this.fundAccount()) {
                await this.cleanup();
                return;
            }

            // Step 6: Verify setup
            await this.verifyAccount();

        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'error');
        } finally {
            await this.cleanup();
        }
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new RealBrokerSetup();
    setup.run().catch(console.error);
}

export default RealBrokerSetup;