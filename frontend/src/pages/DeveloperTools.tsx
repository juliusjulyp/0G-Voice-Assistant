import React, { useState } from 'react';
import { 
  Network, 
  Wallet, 
  FileText, 
  Settings, 
  ArrowRightLeft, 
  Database,
  Upload,
  Download,
  Search,
  Coins,
  Shield,
  Server,
  Zap,
  HardDrive
} from 'lucide-react';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  blockNumber: number;
  status: string;
  confirmations: number;
}

interface ContractAnalysis {
  address: string;
  name?: string;
  functions: string[];
  events: string[];
  isProxy: boolean;
  securityScore: number;
  riskFactors: string[];
}

export const DeveloperTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState('network');
  const [loading, setLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState('');
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState<Transaction | null>(null);

  const tabs = [
    { id: 'network', label: 'Network', icon: Network },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'ai-compute', label: 'AI Compute', icon: Zap }
  ];

  const checkNetworkStatus = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setNetworkInfo({
        connected: true,
        networkInfo: {
          blockNumber: 12847392,
          gasPrice: '20 Gwei',
          chainId: '16602'
        }
      });
      setLoading(false);
    }, 1500);
  };

  const checkBalance = async () => {
    if (!walletAddress) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setBalance('2.145');
      setLoading(false);
    }, 1000);
  };

  const analyzeContract = async () => {
    if (!contractAddress) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setContractAnalysis({
        address: contractAddress,
        name: 'Sample Contract',
        functions: ['transfer', 'approve', 'balanceOf'],
        events: ['Transfer', 'Approval'],
        isProxy: false,
        securityScore: 85,
        riskFactors: ['Centralized ownership', 'No timelock']
      });
      setLoading(false);
    }, 2000);
  };

  const checkTransactionStatus = async () => {
    if (!txHash) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setTxStatus({
        hash: txHash,
        from: '0x742d35Cc6634C0532925a3b8D0b4E9c2B5E2C3F7',
        to: '0x1234567890123456789012345678901234567890',
        value: '1.5',
        gasPrice: '20',
        gasUsed: '21000',
        blockNumber: 12847392,
        status: 'success',
        confirmations: 42
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="developer-tools">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Developer Tools</h1>
          <p className="page-subtitle">
            Interactive tools for 0G blockchain development and debugging
          </p>
        </div>
        <button className="btn btn-primary">
          <Settings size={16} />
          Tool Settings
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tools-tabs">
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="card">
            <div className="card-header">
              <h2>Network Information</h2>
              <p>Check 0G network status and connectivity</p>
            </div>
            <div className="tool-actions">
              <button
                onClick={checkNetworkStatus}
                disabled={loading}
                className="btn btn-primary"
              >
                <Search size={16} />
                {loading ? 'Checking...' : 'Check Network Status'}
              </button>
            </div>
            
            {networkInfo && (
              <div className="result-card">
                <h3>Network Status</h3>
                <div className="result-grid">
                  <div className="result-item">
                    <span className="label">Connected:</span>
                    <span className={`value ${networkInfo.connected ? 'success' : 'error'}`}>
                      {networkInfo.connected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="label">Block Number:</span>
                    <span className="value">{networkInfo.networkInfo.blockNumber}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Gas Price:</span>
                    <span className="value">{networkInfo.networkInfo.gasPrice}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Chain ID:</span>
                    <span className="value">{networkInfo.networkInfo.chainId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="card">
            <div className="card-header">
              <h2>Wallet Operations</h2>
              <p>Check balances and wallet information</p>
            </div>
            <div className="tool-form">
              <div className="input-group">
                <label>Wallet Address</label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="input"
                />
              </div>
              <button
                onClick={checkBalance}
                disabled={loading || !walletAddress}
                className="btn btn-primary"
              >
                <Coins size={16} />
                {loading ? 'Checking...' : 'Check Balance'}
              </button>
            </div>

            {balance !== null && (
              <div className="result-card">
                <h3>Balance Information</h3>
                <div className="balance-display">
                  <div className="balance-amount">
                    {balance} 0G
                  </div>
                  <div className="balance-address">
                    {walletAddress}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="card">
            <div className="card-header">
              <h2>Contract Analysis</h2>
              <p>Analyze smart contract security and functionality</p>
            </div>
            <div className="tool-form">
              <div className="input-group">
                <label>Contract Address</label>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                  className="input"
                />
              </div>
              <button
                onClick={analyzeContract}
                disabled={loading || !contractAddress}
                className="btn btn-primary"
              >
                <Shield size={16} />
                {loading ? 'Analyzing...' : 'Analyze Contract'}
              </button>
            </div>

            {contractAnalysis && (
              <div className="result-card">
                <h3>Contract Analysis</h3>
                <div className="contract-info">
                  <div className="security-score">
                    <span className="label">Security Score:</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ 
                          width: `${contractAnalysis.securityScore}%`,
                          backgroundColor: contractAnalysis.securityScore > 70 ? 'var(--accent-green)' : 
                                          contractAnalysis.securityScore > 40 ? 'var(--accent-orange)' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <span className="score-value">{contractAnalysis.securityScore}/100</span>
                  </div>
                  
                  <div className="contract-details">
                    <div className="detail-item">
                      <span className="label">Functions:</span>
                      <span className="value">{contractAnalysis.functions.length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Events:</span>
                      <span className="value">{contractAnalysis.events.length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Is Proxy:</span>
                      <span className={`value ${contractAnalysis.isProxy ? 'warning' : 'success'}`}>
                        {contractAnalysis.isProxy ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {contractAnalysis.riskFactors.length > 0 && (
                    <div className="risk-factors">
                      <h4>Risk Factors:</h4>
                      <ul>
                        {contractAnalysis.riskFactors.map((risk, index) => (
                          <li key={index}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="card">
            <div className="card-header">
              <h2>Transaction Tools</h2>
              <p>Check transaction status and details</p>
            </div>
            <div className="tool-form">
              <div className="input-group">
                <label>Transaction Hash</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="input"
                />
              </div>
              <button
                onClick={checkTransactionStatus}
                disabled={loading || !txHash}
                className="btn btn-primary"
              >
                <Search size={16} />
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {txStatus && (
              <div className="result-card">
                <h3>Transaction Status</h3>
                <div className="transaction-info">
                  <div className="status-badge">
                    <span className={`status ${txStatus.status}`}>
                      {txStatus.status === 'success' ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="tx-details">
                    <div className="detail-row">
                      <span className="label">From:</span>
                      <span className="value monospace">{txStatus.from}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">To:</span>
                      <span className="value monospace">{txStatus.to}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Value:</span>
                      <span className="value">{txStatus.value} 0G</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Gas Used:</span>
                      <span className="value">{txStatus.gasUsed}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Block:</span>
                      <span className="value">{txStatus.blockNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Confirmations:</span>
                      <span className="value">{txStatus.confirmations}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="storage-tools">
            <div className="tool-card">
              <Upload size={32} />
              <h3>File Upload</h3>
              <p>Upload files to 0G decentralized storage</p>
              <button className="btn btn-primary">
                Upload File
              </button>
            </div>
            <div className="tool-card">
              <Download size={32} />
              <h3>File Download</h3>
              <p>Download and verify files from 0G storage</p>
              <button className="btn btn-secondary">
                Download File
              </button>
            </div>
            <div className="tool-card">
              <Shield size={32} />
              <h3>Merkle Verification</h3>
              <p>Calculate and verify Merkle roots</p>
              <button className="btn btn-secondary">
                Verify Integrity
              </button>
            </div>
          </div>
        )}

        {/* AI Compute Tab */}
        {activeTab === 'ai-compute' && (
          <div className="ai-compute-tools">
            <div className="tool-card">
              <Zap size={32} />
              <h3>Model Deployment</h3>
              <p>Deploy AI models to 0G compute network</p>
              <button className="btn btn-primary">
                Deploy Model
              </button>
            </div>
            <div className="tool-card">
              <HardDrive size={32} />
              <h3>Inference Engine</h3>
              <p>Run AI inference on deployed models</p>
              <button className="btn btn-secondary">
                Run Inference
              </button>
            </div>
            <div className="tool-card">
              <Server size={32} />
              <h3>Provider Status</h3>
              <p>Check AI compute provider availability</p>
              <button className="btn btn-secondary">
                Check Providers
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};