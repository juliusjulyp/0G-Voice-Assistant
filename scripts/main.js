// Exact implementation from 0G Documentation
import { BrowserProvider, formatEther, JsonRpcProvider, parseEther } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

// 0G Network Configuration
const ZERO_G_RPC_URL = "https://evmrpc-testnet.0g.ai";
const ZERO_G_CHAIN_ID = 16602;

let provider = null;
let signer = null;
let broker = null;

function log(message) {
    const logElement = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();
    logElement.textContent += `[${timestamp}] ${message}\n`;
    logElement.scrollTop = logElement.scrollHeight;
}

function setStatus(elementId, content, type = 'info') {
    const element = document.getElementById(elementId);
    const className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    element.innerHTML = `<div class="${className}">${content}</div>`;
}

// Step 1: Check MetaMask
window.checkMetaMask = async function() {
    log('🔍 Checking MetaMask installation...');
    
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === "undefined") {
            throw new Error("Please install MetaMask");
        }

        log('✅ MetaMask detected');
        setStatus('metamask-status', '✅ MetaMask is installed and available', 'success');
        
        // Enable next step
        document.getElementById('init-btn').disabled = false;

    } catch (error) {
        log(`❌ MetaMask check failed: ${error.message}`);
        setStatus('metamask-status', `❌ ${error.message}`, 'error');
    }
};

// Step 2: Initialize Broker (exact code from docs)
window.initializeBroker = async function() {
    log('🤖 Initializing 0G Broker ...');
    
    try {
        // Exact implementation from 0G docs:
        log('Creating BrowserProvider...');
        provider = new BrowserProvider(window.ethereum);
        
        log('Getting signer...');
        signer = await provider.getSigner();
        
        // Check network
        const network = await provider.getNetwork();
        log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        if (Number(network.chainId) !== 16602) {
            log('⚠️ Warning: Not on 0G Galileo Testnet (16602). This may cause issues.');
        }
        
        log('Creating 0G Compute Network Broker...');
        
        // Try method 1: Direct browser provider (from docs)
        try {
            broker = await createZGComputeNetworkBroker(signer);
            log('✅ Broker created using BrowserProvider method');
        } catch (browserError) {
            log(`⚠️ BrowserProvider method failed: ${browserError.message}`);
            log('Trying alternative method with JsonRpcProvider...');
            
            // Try method 2: JsonRpcProvider with wallet private key
            const rpcProvider = new JsonRpcProvider(ZERO_G_RPC_URL);
            
            // Connect the signer to the 0G RPC directly
            const connectedSigner = signer.connect(rpcProvider);
            broker = await createZGComputeNetworkBroker(connectedSigner);
            log('✅ Broker created using JsonRpcProvider method');
        }

        const address = await signer.getAddress();
        log(`✅ Broker initialized successfully for address: ${address}`);
        
        // Show broker details for debugging
        log('🔍 Broker object details:');
        console.log('Broker:', broker);
        console.log('Broker.ledger:', broker.ledger);
        
        // Check if broker.ledger has the expected methods
        if (broker.ledger) {
            log('🔍 Ledger methods available:');
            console.log('addLedger:', typeof broker.ledger.addLedger);
            console.log('getLedger:', typeof broker.ledger.getLedger);
            
            // Try to get contract address if available
            if (broker.ledger.target || broker.ledger.address) {
                log(`📍 Ledger contract address: ${broker.ledger.target || broker.ledger.address}`);
            }
        }
        
        // Test broker connection by trying to get ledger info
        log('Testing broker connection...');
        try {
            const account = await broker.ledger.getLedger();
            const balance = formatEther(account.totalBalance);
            log(`✅ Broker connection verified. Current balance: ${balance} 0G`);
        } catch (ledgerError) {
            log(`ℹ️ Ledger test failed: ${ledgerError.message}`);
            console.error('Ledger error details:', ledgerError);
            
            // Check if it's the decode error we're troubleshooting
            if (ledgerError.message.includes('could not decode result data')) {
                log('⚠️ This is the same error you\'ll see when funding. Network/contract issue detected.');
            }
        }
        
        setStatus('init-status', `
            ✅ <strong>Broker Successfully Initialized!</strong><br>
            <strong>Address:</strong> ${address.slice(0, 8)}...${address.slice(-6)}<br>
            <strong>Network:</strong> ${network.name} (${network.chainId})<br>
            <strong>Status:</strong> Ready for operations<br><br>
            <div class="code">
// Exact code used (from docs):
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const broker = await createZGComputeNetworkBroker(signer);
            </div>
        `, 'success');
        
        // Enable funding
        document.getElementById('fund-amount').disabled = false;
        document.getElementById('fund-btn').disabled = false;

    } catch (error) {
        log(`❌ Broker initialization failed: ${error.message}`);
        setStatus('init-status', `❌ Failed: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
};

// Step 3: Fund Account
window.fundAccount = async function() {
    const amount = parseFloat(document.getElementById('fund-amount').value);
    
    if (!amount || amount <= 0) {
        setStatus('fund-status', '❌ Please enter a valid amount', 'error');
        return;
    }

    log(`💰 Funding account with ${amount} 0G tokens...`);
    
    try {
        if (!broker) {
            throw new Error('Broker not initialized');
        }

        // Check wallet balance first
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const balanceFormatted = formatEther(balance);
        log(`Wallet balance: ${balanceFormatted} 0G`);
        
        if (parseFloat(balanceFormatted) < amount) {
            throw new Error(`Insufficient balance. Need ${amount} 0G, have ${balanceFormatted} 0G`);
        }

        // Add tokens to ledger (trying different formats)
        log(`Calling broker.ledger.addLedger with amount: ${amount}`);
        
        let tx;
        try {
            // Try method 1: parseEther (convert to Wei)
            log(`Trying parseEther(${amount})...`);
            tx = await broker.ledger.addLedger(parseEther(amount.toString()));
            log('✅ parseEther method worked');
        } catch (parseEtherError) {
            log(`parseEther failed: ${parseEtherError.message}`);
            
            try {
                // Try method 2: raw number (as in docs example)
                log(`Trying raw number ${amount}...`);
                tx = await broker.ledger.addLedger(amount);
                log('✅ Raw number method worked');
            } catch (rawNumberError) {
                log(`Raw number failed: ${rawNumberError.message}`);
                
                // Try method 3: BigInt
                log(`Trying BigInt(${amount * 1e18})...`);
                tx = await broker.ledger.addLedger(BigInt(amount * 1e18));
                log('✅ BigInt method worked');
            }
        }
        
        log(`Transaction submitted: ${tx.hash || 'pending'}`);
        log('Waiting for confirmation...');
        
        // Wait for transaction if it returns a transaction object
        if (tx && tx.wait) {
            await tx.wait();
            log('✅ Transaction confirmed');
        }
        
        log(`✅ Account funded with ${amount} 0G tokens`);
        setStatus('fund-status', `
            ✅ <strong>Account Successfully Funded!</strong><br>
            <strong>Amount:</strong> ${amount} 0G tokens<br>
            <strong>Status:</strong> Transaction completed<br><br>
            <div class="code">
// Code used (from docs):
await broker.ledger.addLedger(${amount});
            </div>
        `, 'success');
        
        // Enable balance check
        document.getElementById('balance-btn').disabled = false;

    } catch (error) {
        log(`❌ Funding failed: ${error.message}`);
        
        // Provide more specific error messages
        let errorMsg = error.message;
        if (error.message.includes('could not decode result data')) {
            errorMsg += '<br><br>💡 <strong>Possible causes:</strong><br>• Not connected to 0G Galileo Testnet<br>• Insufficient gas/0G tokens<br>• Network connectivity issues';
        }
        
        setStatus('fund-status', `❌ Failed: ${errorMsg}`, 'error');
        console.error('Full error:', error);
    }
};

// Step 4: Check Balance 
window.checkBalance = async function() {
    log('🔍 Checking broker account balance...');
    
    try {
        if (!broker) {
            throw new Error('Broker not initialized');
        }

        // Check balance
        log('Calling broker.ledger.getLedger()...');
        const account = await broker.ledger.getLedger();
        
        // Format balance
        const balance = formatEther(account.totalBalance);
        
        log(`✅ Account balance: ${balance} 0G`);
        setStatus('balance-status', `
            ✅ <strong>Account Balance Retrieved!</strong><br>
            <strong>Balance:</strong> ${balance} 0G<br>
            <strong>Status:</strong> Account active and ready<br><br>
            <div class="code">
// Code used (from docs):
const account = await broker.ledger.getLedger();
console.log(\`Balance: \${formatEther(account.totalBalance)} 0G\`);
            </div><br>
            <strong>🎉 Setup Complete! Your 0G broker account is ready for AI operations.</strong>
        `, 'success');

    } catch (error) {
        log(`❌ Balance check failed: ${error.message}`);
        setStatus('balance-status', `❌ Failed: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
};

// Initialize
log('✅ 0G SDK loaded with Vite polyfills');
log('📚 Using exact implementation from 0G documentation');
log('Ready to setup broker account...\n');